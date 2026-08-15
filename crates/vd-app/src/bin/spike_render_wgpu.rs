//! Spike de renderer: egui sobre **wgpu** (Direct3D 12 en Windows).
//!
//! Dibuja la escena de [`vd_app::demo`], la misma que el spike de glow, para que
//! la comparación mida el backend y no la escena.
//!
//! Resultado de la medición, en release y con la misma escena:
//!
//! | Backend | Binario | Ritmo |
//! |---|---|---|
//! | glow (OpenGL) | 2,56 MB | 144 fps |
//! | wgpu (D3D12) | 4,77 MB | 144 fps |
//!
//! Ganó wgpu: la diferencia de tamaño se paga sin problema sobre un presupuesto
//! de 20 MB, y D3D12 tiene respaldo por software cuando no hay GPU utilizable.
//! El detalle está en `docs/MIGRACION-RUST.md`.
//!
//! ```text
//! cargo run -p vd-app --bin spike_render_wgpu             # hasta cerrar la ventana
//! cargo run -p vd-app --bin spike_render_wgpu -- 5        # 5 s y sale con informe
//! cargo run -p vd-app --bin spike_render_wgpu -- respaldo # ¿hay adaptador por software?
//! ```

use std::sync::Arc;
use std::time::{Duration, Instant};

use vd_app::render::Lienzo;
use winit::application::ApplicationHandler;
use winit::event::WindowEvent;
use winit::event_loop::{ActiveEventLoop, ControlFlow, EventLoop};
use winit::window::{Window, WindowId};

fn main() -> anyhow::Result<()> {
    let args: Vec<String> = std::env::args().skip(1).collect();

    // `respaldo` comprueba si existe un adaptador por software (WARP). Importa
    // para la decisión de backend: es el camino cuando no hay GPU utilizable
    // —sesión remota, máquina virtual, driver roto— y OpenGL en Windows no tiene
    // equivalente fiable.
    if args.iter().any(|a| a == "respaldo") {
        return comprobar_respaldo();
    }

    let event_loop = EventLoop::new()?;
    event_loop.set_control_flow(ControlFlow::Poll);

    let mut app = App {
        lienzo: None,
        demo: vd_app::demo::Demo::default(),
        inicio: Instant::now(),
        limite: args
            .first()
            .and_then(|s| s.parse().ok())
            .map(Duration::from_secs),
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

struct App {
    lienzo: Option<Lienzo>,
    demo: vd_app::demo::Demo,
    inicio: Instant,
    limite: Option<Duration>,
}

impl ApplicationHandler for App {
    fn resumed(&mut self, event_loop: &ActiveEventLoop) {
        if self.lienzo.is_some() {
            return;
        }
        let atributos = Window::default_attributes()
            .with_title("VirtualDeck — spike wgpu")
            .with_inner_size(winit::dpi::LogicalSize::new(720.0, 480.0));

        let window = match event_loop.create_window(atributos) {
            Ok(w) => Arc::new(w),
            Err(e) => {
                eprintln!("No se pudo crear la ventana: {e}");
                event_loop.exit();
                return;
            }
        };

        match Lienzo::nuevo(window) {
            Ok(l) => self.lienzo = Some(l),
            Err(e) => {
                eprintln!("No se pudo inicializar wgpu: {e}");
                event_loop.exit();
                return;
            }
        }
        self.inicio = Instant::now();
    }

    fn window_event(&mut self, event_loop: &ActiveEventLoop, _id: WindowId, event: WindowEvent) {
        let Some(lienzo) = self.lienzo.as_mut() else {
            return;
        };
        lienzo.evento(&event);

        match event {
            WindowEvent::CloseRequested => event_loop.exit(),
            WindowEvent::Resized(tam) => lienzo.redimensionar(tam.width, tam.height),
            WindowEvent::RedrawRequested => {
                let demo = &mut self.demo;
                lienzo.dibujar(|ctx| demo.ui(ctx));
            }
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
        if let Some(lienzo) = self.lienzo.as_ref() {
            lienzo.window().request_redraw();
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
