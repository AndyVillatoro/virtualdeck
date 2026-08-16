//! Backend de renderizado sobre **OpenGL** (glow + glutin).
//!
//! Es el backend por defecto. El motivo está en [`super`]: consume 121 MB de
//! memoria residente frente a los 170 MB de wgpu, con el mismo rendimiento.

use std::ffi::CString;
use std::num::NonZeroU32;
use std::sync::Arc;

use egui::ViewportId;
use glow::HasContext as _;
use glutin::config::ConfigTemplateBuilder;
use glutin::context::{ContextApi, ContextAttributesBuilder, PossiblyCurrentContext};
use glutin::display::GetGlDisplay;
use glutin::prelude::*;
use glutin::surface::{Surface, SurfaceAttributesBuilder, SwapInterval, WindowSurface};
use glutin_winit::{DisplayBuilder, GlWindow};
use raw_window_handle::HasWindowHandle;
use winit::event_loop::ActiveEventLoop;
use winit::window::{Window, WindowAttributes};

/// Una ventana lista para dibujar egui.
pub struct Lienzo {
    // `Arc` para poder prestar la ventana a quien la necesite sin ceder la
    // propiedad, que es de este lienzo.
    window: Arc<Window>,
    contexto: PossiblyCurrentContext,
    superficie: Surface<WindowSurface>,
    gl: Arc<glow::Context>,
    pintor: egui_glow::Painter,
    egui_ctx: egui::Context,
    egui_state: egui_winit::State,
}

impl Lienzo {
    /// Crea la ventana **y** su contexto de OpenGL.
    ///
    /// La ventana se crea aquí y no fuera porque glutin necesita elegir el
    /// formato de píxel a la vez: en Windows ese formato se fija una sola vez por
    /// ventana y no se puede cambiar después.
    pub fn nuevo(
        event_loop: &ActiveEventLoop,
        atributos: WindowAttributes,
    ) -> anyhow::Result<Self> {
        let (ventana, config) = DisplayBuilder::new()
            .with_window_attributes(Some(atributos))
            .build(event_loop, ConfigTemplateBuilder::new(), |configs| {
                // La de más muestras por píxel que haya: egui dibuja bordes
                // curvos y el suavizado se nota en la rejilla de puntos.
                configs
                    .reduce(|mejor, c| {
                        if c.num_samples() > mejor.num_samples() {
                            c
                        } else {
                            mejor
                        }
                    })
                    .expect("ninguna configuracion de OpenGL disponible")
            })
            .map_err(|e| anyhow::anyhow!("glutin no pudo crear la ventana: {e}"))?;

        let window =
            Arc::new(ventana.ok_or_else(|| anyhow::anyhow!("glutin no devolvio ventana"))?);
        let handle = window.window_handle()?.as_raw();

        let display = config.display();
        let contexto = unsafe {
            display.create_context(
                &config,
                &ContextAttributesBuilder::new()
                    // OpenGL de escritorio: el proyecto es solo Windows y no
                    // hace falta el camino de GLES.
                    .with_context_api(ContextApi::OpenGl(None))
                    .build(Some(handle)),
            )?
        };

        let atributos_superficie =
            window.build_surface_attributes(SurfaceAttributesBuilder::<WindowSurface>::new())?;
        let superficie = unsafe { display.create_window_surface(&config, &atributos_superficie)? };
        let contexto = contexto.make_current(&superficie)?;

        // Sin esto la aplicación dibujaría tan rápido como pueda, quemando GPU
        // para nada en una interfaz que casi siempre está quieta.
        let _ = superficie.set_swap_interval(
            &contexto,
            SwapInterval::Wait(NonZeroU32::new(1).expect("1 no es cero")),
        );

        let gl = Arc::new(unsafe {
            glow::Context::from_loader_function(|s| {
                match CString::new(s) {
                    Ok(nombre) => display.get_proc_address(&nombre).cast(),
                    // Un nombre con un cero dentro no es una función de OpenGL;
                    // devolver null hace que glow la marque como ausente.
                    Err(_) => std::ptr::null(),
                }
            })
        });

        let pintor = egui_glow::Painter::new(gl.clone(), "", None, false)
            .map_err(|e| anyhow::anyhow!("egui_glow no pudo iniciar: {e}"))?;

        let egui_ctx = egui::Context::default();
        let egui_state = egui_winit::State::new(
            egui_ctx.clone(),
            ViewportId::ROOT,
            &window,
            None,
            None,
            None,
        );

        Ok(Self {
            window,
            contexto,
            superficie,
            gl,
            pintor,
            egui_ctx,
            egui_state,
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
        // Minimizar la ventana da 0x0, y glutin exige dimensiones no nulas.
        let (Some(a), Some(h)) = (NonZeroU32::new(ancho), NonZeroU32::new(alto)) else {
            return;
        };
        self.superficie.resize(&self.contexto, a, h);
    }

    /// Dibuja un fotograma. `contenido` describe la interfaz con egui.
    pub fn dibujar(&mut self, contenido: impl FnMut(&egui::Context)) {
        let entrada = self.egui_state.take_egui_input(&self.window);
        let salida = self.egui_ctx.run(entrada, contenido);
        self.egui_state
            .handle_platform_output(&self.window, salida.platform_output);

        let escala = self.window.scale_factor() as f32;
        let mallas = self.egui_ctx.tessellate(salida.shapes, escala);
        let tam = self.window.inner_size();

        unsafe {
            self.gl.clear_color(0.0, 0.0, 0.0, 1.0);
            self.gl.clear(glow::COLOR_BUFFER_BIT);
        }

        self.pintor.paint_and_update_textures(
            [tam.width, tam.height],
            escala,
            &mallas,
            &salida.textures_delta,
        );

        if let Err(e) = self.superficie.swap_buffers(&self.contexto) {
            eprintln!("No se pudo presentar el fotograma: {e}");
        }
    }
}

impl Drop for Lienzo {
    fn drop(&mut self) {
        // El pintor tiene recursos de OpenGL (texturas, shaders) que hay que
        // liberar con el contexto todavía activo. Sin esto, el driver los da por
        // filtrados al cerrar.
        self.pintor.destroy();
    }
}
