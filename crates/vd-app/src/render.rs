//! Montaje de ventana y renderizado: winit + wgpu + egui.
//!
//! Concentra en un sitio todo lo que hay que hacer para tener una ventana que
//! dibuje egui, para que las pantallas de la aplicación solo tengan que escribir
//! su interfaz y no repetir la ceremonia de wgpu.
//!
//! El backend es Direct3D 12, decidido midiendo contra OpenGL; ver
//! `docs/MIGRACION-RUST.md`.

use std::sync::Arc;

use egui::ViewportId;
use winit::window::Window;

/// Una ventana lista para dibujar egui.
pub struct Lienzo {
    // `Arc` porque la superficie de wgpu toma prestada la ventana y necesita
    // mantenerla viva mientras exista.
    window: Arc<Window>,
    egui_ctx: egui::Context,
    egui_state: egui_winit::State,
    dispositivo: wgpu::Device,
    cola: wgpu::Queue,
    superficie: wgpu::Surface<'static>,
    config: wgpu::SurfaceConfiguration,
    renderer: egui_wgpu::Renderer,
}

impl Lienzo {
    pub fn nuevo(window: Arc<Window>) -> anyhow::Result<Self> {
        // Solo DX12: incluir Vulkan, Metal y GL multiplicaría el tamaño del
        // binario para plataformas que este proyecto no soporta.
        let instancia = wgpu::Instance::new(&wgpu::InstanceDescriptor {
            backends: wgpu::Backends::DX12,
            ..Default::default()
        });

        let superficie = instancia.create_surface(window.clone())?;
        let adaptador =
            pollster::block_on(instancia.request_adapter(&wgpu::RequestAdapterOptions {
                power_preference: wgpu::PowerPreference::LowPower,
                compatible_surface: Some(&superficie),
                // Si no hay GPU utilizable —sesión remota, máquina virtual,
                // driver roto— wgpu recurre al adaptador por software. Es la
                // razón principal por la que se eligió D3D12 sobre OpenGL.
                force_fallback_adapter: false,
            }))?;

        let (dispositivo, cola) =
            pollster::block_on(adaptador.request_device(&wgpu::DeviceDescriptor {
                label: Some("vd-app"),
                required_features: wgpu::Features::empty(),
                // Los límites del adaptador real, no `downlevel_defaults()`: ese
                // perfil topa las texturas en 2048 px y cualquier pantalla con
                // escalado ya pide más, con lo que la superficie falla al
                // configurarse. Verificado en vivo.
                required_limits: adaptador.limits(),
                ..Default::default()
            }))?;

        let tam = window.inner_size();
        let capacidades = superficie.get_capabilities(&adaptador);
        let formato = capacidades
            .formats
            .iter()
            .copied()
            .find(|f| f.is_srgb())
            .unwrap_or(capacidades.formats[0]);

        let config = wgpu::SurfaceConfiguration {
            usage: wgpu::TextureUsages::RENDER_ATTACHMENT,
            format: formato,
            width: tam.width.max(1),
            height: tam.height.max(1),
            present_mode: wgpu::PresentMode::AutoVsync,
            alpha_mode: capacidades.alpha_modes[0],
            view_formats: vec![],
            desired_maximum_frame_latency: 2,
        };
        superficie.configure(&dispositivo, &config);

        let egui_ctx = egui::Context::default();
        let egui_state = egui_winit::State::new(
            egui_ctx.clone(),
            ViewportId::ROOT,
            &window,
            None,
            None,
            None,
        );
        let renderer = egui_wgpu::Renderer::new(&dispositivo, formato, None, 1, false);

        Ok(Self {
            window,
            egui_ctx,
            egui_state,
            dispositivo,
            cola,
            superficie,
            config,
            renderer,
        })
    }

    pub fn window(&self) -> &Window {
        &self.window
    }

    /// Entrega un evento de ventana a egui.
    ///
    /// Hay que pasarle **todos** los eventos: es egui quien decide cuáles son
    /// entrada suya y cuáles no.
    pub fn evento(&mut self, evento: &winit::event::WindowEvent) {
        let _ = self.egui_state.on_window_event(&self.window, evento);
    }

    pub fn redimensionar(&mut self, ancho: u32, alto: u32) {
        // Minimizar la ventana da 0x0, y configurar una superficie de tamaño
        // cero es un error en wgpu.
        if ancho == 0 || alto == 0 {
            return;
        }
        self.config.width = ancho;
        self.config.height = alto;
        self.superficie.configure(&self.dispositivo, &self.config);
    }

    /// Dibuja un fotograma. `contenido` describe la interfaz con egui.
    pub fn dibujar(&mut self, contenido: impl FnMut(&egui::Context)) {
        let entrada = self.egui_state.take_egui_input(&self.window);
        let salida = self.egui_ctx.run(entrada, contenido);
        self.egui_state
            .handle_platform_output(&self.window, salida.platform_output);

        let escala = self.window.scale_factor() as f32;
        let mallas = self.egui_ctx.tessellate(salida.shapes, escala);

        let Ok(marco) = self.superficie.get_current_texture() else {
            // La superficie puede perderse al cambiar de resolución o al
            // bloquear la sesión; reconfigurar y esperar al siguiente fotograma.
            self.superficie.configure(&self.dispositivo, &self.config);
            return;
        };

        let vista = marco
            .texture
            .create_view(&wgpu::TextureViewDescriptor::default());
        let mut encoder = self
            .dispositivo
            .create_command_encoder(&wgpu::CommandEncoderDescriptor { label: None });

        for (id, imagen) in &salida.textures_delta.set {
            self.renderer
                .update_texture(&self.dispositivo, &self.cola, *id, imagen);
        }

        let descriptor = egui_wgpu::ScreenDescriptor {
            size_in_pixels: [self.config.width, self.config.height],
            pixels_per_point: escala,
        };
        self.renderer.update_buffers(
            &self.dispositivo,
            &self.cola,
            &mut encoder,
            &mallas,
            &descriptor,
        );

        {
            let pase = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                label: Some("egui"),
                color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                    view: &vista,
                    resolve_target: None,
                    ops: wgpu::Operations {
                        load: wgpu::LoadOp::Clear(wgpu::Color::BLACK),
                        store: wgpu::StoreOp::Store,
                    },
                })],
                ..Default::default()
            });
            self.renderer
                .render(&mut pase.forget_lifetime(), &mallas, &descriptor);
        }

        for id in &salida.textures_delta.free {
            self.renderer.free_texture(id);
        }

        self.cola.submit(Some(encoder.finish()));
        marco.present();
    }
}
