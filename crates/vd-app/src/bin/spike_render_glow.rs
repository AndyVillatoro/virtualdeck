//! Spike de renderer: egui sobre **glow** (OpenGL vía WGL).
//!
//! Dibuja la escena de [`vd_app::demo`], la misma que el spike de wgpu, para que
//! la comparación mida el backend y no la escena.
//!
//! La hipótesis a comprobar es que glow produce un binario bastante más pequeño
//! que wgpu, lo que importa con un objetivo de instalador por debajo de 20 MB. El
//! coste es este archivo: montar el contexto con glutin es notablemente más
//! trabajo que con wgpu, y ese coste también cuenta en la decisión.
//!
//! ```text
//! cargo run -p vd-app --features render-glow --bin spike_render_glow -- 5
//! ```

use std::ffi::CString;
use std::num::NonZeroU32;
use std::sync::Arc;
use std::time::{Duration, Instant};

use egui::ViewportId;
use glutin::config::ConfigTemplateBuilder;
use glutin::context::{ContextApi, ContextAttributesBuilder, PossiblyCurrentContext};
use glutin::display::GetGlDisplay;
use glutin::prelude::*;
use glutin::surface::{Surface, SurfaceAttributesBuilder, SwapInterval, WindowSurface};
use glutin_winit::{DisplayBuilder, GlWindow};
use raw_window_handle::HasWindowHandle;
use winit::application::ApplicationHandler;
use winit::event::WindowEvent;
use winit::event_loop::{ActiveEventLoop, ControlFlow, EventLoop};
use winit::window::{Window, WindowId};

fn main() -> anyhow::Result<()> {
    let segundos: Option<u64> = std::env::args().nth(1).and_then(|s| s.parse().ok());

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

struct Estado {
    window: Window,
    contexto: PossiblyCurrentContext,
    superficie: Surface<WindowSurface>,
    gl: Arc<glow::Context>,
    pintor: egui_glow::Painter,
    egui_ctx: egui::Context,
    egui_state: egui_winit::State,
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
                eprintln!("No se pudo inicializar OpenGL: {e}");
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
            WindowEvent::Resized(tam) => {
                if let (Some(a), Some(h)) =
                    (NonZeroU32::new(tam.width), NonZeroU32::new(tam.height))
                {
                    estado.superficie.resize(&estado.contexto, a, h);
                }
            }
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
        println!("\nBackend       : glow (OpenGL / WGL)");
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
            .with_title("VirtualDeck — spike glow")
            .with_inner_size(winit::dpi::LogicalSize::new(720.0, 480.0));

        // glutin necesita elegir una configuracion de pixel **antes** de que la
        // ventana exista del todo, porque en Windows el formato de pixel se fija
        // una sola vez por ventana. De ahi este baile en dos tiempos.
        let (ventana, config) = DisplayBuilder::new()
            .with_window_attributes(Some(atributos))
            .build(event_loop, ConfigTemplateBuilder::new(), |configs| {
                // La de mas muestras por pixel que haya; egui dibuja bordes
                // curvos y el antialiasing se nota en la rejilla.
                configs
                    .reduce(|mejor, c| {
                        if c.num_samples() > mejor.num_samples() {
                            c
                        } else {
                            mejor
                        }
                    })
                    .expect("ninguna configuracion GL disponible")
            })
            .map_err(|e| anyhow::anyhow!("glutin no pudo crear la ventana: {e}"))?;

        let window = ventana.ok_or_else(|| anyhow::anyhow!("glutin no devolvio ventana"))?;
        let handle = window.window_handle()?.as_raw();

        let display = config.display();
        let contexto = unsafe {
            display.create_context(
                &config,
                &ContextAttributesBuilder::new()
                    // OpenGL de escritorio; el proyecto es solo Windows y no
                    // hace falta el camino de GLES.
                    .with_context_api(ContextApi::OpenGl(None))
                    .build(Some(handle)),
            )?
        };

        let atributos_superficie =
            window.build_surface_attributes(SurfaceAttributesBuilder::<WindowSurface>::new())?;
        let superficie = unsafe { display.create_window_surface(&config, &atributos_superficie)? };
        let contexto = contexto.make_current(&superficie)?;

        // Sin esto la aplicacion dibujaria tan rapido como pueda, quemando GPU
        // para nada en una interfaz que casi siempre esta quieta.
        let _ = superficie
            .set_swap_interval(&contexto, SwapInterval::Wait(NonZeroU32::new(1).unwrap()));

        let gl = Arc::new(unsafe {
            glow::Context::from_loader_function(|s| {
                let nombre = CString::new(s).unwrap();
                display.get_proc_address(&nombre).cast()
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

        println!("OpenGL listo.");
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

    fn dibujar(&mut self, demo: &mut vd_app::demo::Demo) {
        use glow::HasContext as _;

        let entrada = self.egui_state.take_egui_input(&self.window);
        let salida = self.egui_ctx.run(entrada, |ctx| demo.ui(ctx));
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
            eprintln!("swap_buffers falló: {e}");
        }
    }
}
