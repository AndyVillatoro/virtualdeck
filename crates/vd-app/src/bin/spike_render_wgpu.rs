//! Spike de renderer: egui sobre **wgpu** (Direct3D 12 en Windows).
//!
//! Dibuja la escena de [`vd_app::demo`], la misma que el spike de glow, para que
//! la comparación mida el backend y no la escena.
//!
//! Lo que se quiere saber:
//! - **Tamaño del binario en release**, contra el objetivo de instalador < 20 MB.
//! - Que la rejilla dot-matrix se dibuje sin artefactos y a ritmo estable.
//!
//! ```text
//! cargo run -p vd-app --features render-wgpu --bin spike_render_wgpu
//! cargo run -p vd-app --features render-wgpu --bin spike_render_wgpu -- 5   # 5 s y sale
//! ```

use std::sync::Arc;
use std::time::{Duration, Instant};

use egui::ViewportId;
use winit::application::ApplicationHandler;
use winit::event::WindowEvent;
use winit::event_loop::{ActiveEventLoop, ControlFlow, EventLoop};
use winit::window::{Window, WindowId};

fn main() -> anyhow::Result<()> {
    let args: Vec<String> = std::env::args().skip(1).collect();

    // `respaldo` comprueba si existe un adaptador por software (WARP). Importa
    // para la decision de backend: es el camino cuando no hay GPU utilizable
    // —sesion RDP, maquina virtual, driver roto— y OpenGL en Windows no tiene
    // equivalente fiable.
    if args.iter().any(|a| a == "respaldo") {
        return comprobar_respaldo();
    }

    let segundos: Option<u64> = args.first().and_then(|s| s.parse().ok());

    let event_loop = EventLoop::new()?;
    event_loop.set_control_flow(ControlFlow::Poll);

    let mut app = App {
        estado: None,
        demo: vd_app::demo::Demo::default(),
        inicio: Instant::now(),
        limite: segundos.map(Duration::from_secs),
    };
    event_loop.run_app(&mut app)?;

    app.informe();
    Ok(())
}

/// Informa si hay un adaptador por software disponible.
fn comprobar_respaldo() -> anyhow::Result<()> {
    let instancia = wgpu::Instance::new(&wgpu::InstanceDescriptor {
        backends: wgpu::Backends::DX12,
        ..Default::default()
    });

    for (etiqueta, forzar) in [("normal", false), ("por software", true)] {
        let r = pollster::block_on(instancia.request_adapter(&wgpu::RequestAdapterOptions {
            power_preference: wgpu::PowerPreference::LowPower,
            compatible_surface: None,
            force_fallback_adapter: forzar,
        }));
        match r {
            Ok(a) => {
                let info = a.get_info();
                println!(
                    "  adaptador {etiqueta:<13}: {} ({:?})",
                    info.name, info.device_type
                );
            }
            Err(e) => println!("  adaptador {etiqueta:<13}: no disponible ({e})"),
        }
    }
    Ok(())
}

/// Todo lo que solo existe una vez creada la ventana.
struct Estado {
    // `Arc` porque la superficie de wgpu toma prestada la ventana y tiene que
    // mantenerla viva mientras exista.
    window: Arc<Window>,
    egui_state: egui_winit::State,
    egui_ctx: egui::Context,
    dispositivo: wgpu::Device,
    cola: wgpu::Queue,
    superficie: wgpu::Surface<'static>,
    config: wgpu::SurfaceConfiguration,
    renderer: egui_wgpu::Renderer,
}

struct App {
    estado: Option<Estado>,
    demo: vd_app::demo::Demo,
    inicio: Instant,
    limite: Option<Duration>,
}

impl ApplicationHandler for App {
    fn resumed(&mut self, event_loop: &ActiveEventLoop) {
        if self.estado.is_some() {
            return;
        }
        match Estado::nuevo(event_loop) {
            Ok(e) => self.estado = Some(e),
            Err(e) => {
                eprintln!("No se pudo inicializar wgpu: {e}");
                event_loop.exit();
            }
        }
        self.inicio = Instant::now();
    }

    fn window_event(&mut self, event_loop: &ActiveEventLoop, _id: WindowId, event: WindowEvent) {
        let Some(estado) = self.estado.as_mut() else {
            return;
        };
        let _ = estado.egui_state.on_window_event(&estado.window, &event);

        match event {
            WindowEvent::CloseRequested => event_loop.exit(),
            WindowEvent::Resized(tam) => estado.redimensionar(tam.width, tam.height),
            WindowEvent::RedrawRequested => estado.dibujar(&mut self.demo),
            _ => {}
        }
    }

    fn about_to_wait(&mut self, event_loop: &ActiveEventLoop) {
        if let Some(limite) = self.limite {
            if self.inicio.elapsed() > limite {
                event_loop.exit();
                return;
            }
        }
        if let Some(estado) = self.estado.as_ref() {
            estado.window.request_redraw();
        }
    }
}

impl App {
    fn informe(&self) {
        let segundos = self.inicio.elapsed().as_secs_f64();
        let f = self.demo.fotogramas;
        println!("\nBackend       : wgpu (Direct3D 12)");
        println!("Fotogramas    : {f} en {segundos:.1} s");
        if segundos > 0.0 {
            println!("Ritmo         : {:.0} fotogramas/s", f as f64 / segundos);
        }
        println!(
            "Primitivas    : {} círculos por fotograma, más la rejilla",
            vd_app::demo::Demo::primitivas_por_fotograma()
        );
    }
}

impl Estado {
    fn nuevo(event_loop: &ActiveEventLoop) -> anyhow::Result<Self> {
        let atributos = Window::default_attributes()
            .with_title("VirtualDeck — spike wgpu")
            .with_inner_size(winit::dpi::LogicalSize::new(720.0, 480.0));
        let window = Arc::new(event_loop.create_window(atributos)?);

        // Solo el backend DX12: incluir Vulkan, Metal y GL multiplicaria el
        // tamaño del binario para plataformas que este proyecto no soporta.
        let instancia = wgpu::Instance::new(&wgpu::InstanceDescriptor {
            backends: wgpu::Backends::DX12,
            ..Default::default()
        });

        let superficie = instancia.create_surface(window.clone())?;
        let adaptador =
            pollster::block_on(instancia.request_adapter(&wgpu::RequestAdapterOptions {
                power_preference: wgpu::PowerPreference::LowPower,
                compatible_surface: Some(&superficie),
                force_fallback_adapter: false,
            }))?;

        let (dispositivo, cola) =
            pollster::block_on(adaptador.request_device(&wgpu::DeviceDescriptor {
                label: Some("vd-app"),
                required_features: wgpu::Features::empty(),
                // Los limites del adaptador real, no `downlevel_defaults()`:
                // ese perfil topa las texturas en 2048 px y una pantalla
                // moderna con escalado ya pide mas que eso, asi que la
                // superficie falla al configurarse. Verificado en vivo.
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

        println!("wgpu listo: adaptador {:?}", adaptador.get_info().name);
        Ok(Self {
            window,
            egui_state,
            egui_ctx,
            dispositivo,
            cola,
            superficie,
            config,
            renderer,
        })
    }

    fn redimensionar(&mut self, ancho: u32, alto: u32) {
        // Minimizar la ventana da 0x0, y configurar una superficie de tamaño
        // cero es un error en wgpu.
        if ancho == 0 || alto == 0 {
            return;
        }
        self.config.width = ancho;
        self.config.height = alto;
        self.superficie.configure(&self.dispositivo, &self.config);
    }

    fn dibujar(&mut self, demo: &mut vd_app::demo::Demo) {
        let entrada = self.egui_state.take_egui_input(&self.window);
        let salida = self.egui_ctx.run(entrada, |ctx| demo.ui(ctx));
        self.egui_state
            .handle_platform_output(&self.window, salida.platform_output);

        let escala = self.window.scale_factor() as f32;
        let mallas = self.egui_ctx.tessellate(salida.shapes, escala);

        let Ok(marco) = self.superficie.get_current_texture() else {
            // La superficie puede perderse al cambiar de resolución o bloquear
            // la sesión; reconfigurar y esperar al siguiente fotograma.
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
