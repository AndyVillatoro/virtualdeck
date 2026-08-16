//! Mide el **suelo** de memoria: una ventana de winit y nada más.
//!
//! Sirve para saber cuánto de los 128 MB de la aplicación es cosa nuestra y
//! cuánto viene de abrir una ventana en Windows. El driver de vídeo y la pila de
//! interfaz del sistema se mapean enteros dentro del proceso, y eso cuenta en el
//! conjunto residente aunque no sea memoria que la aplicación haya pedido.
//!
//! ```text
//! cargo run --release -p vd-app --bin spike_ventana -- 8
//! ```

use std::time::{Duration, Instant};

use winit::application::ApplicationHandler;
use winit::event::WindowEvent;
use winit::event_loop::{ActiveEventLoop, ControlFlow, EventLoop};
use winit::window::{Window, WindowId};

fn main() -> anyhow::Result<()> {
    let segundos: u64 = std::env::args()
        .nth(1)
        .and_then(|s| s.parse().ok())
        .unwrap_or(8);

    let event_loop = EventLoop::new()?;
    // `Wait` y no `Poll`: sin nada que dibujar, sondear en bucle solo gastaria
    // CPU y falsearia la medicion.
    event_loop.set_control_flow(ControlFlow::Wait);

    let mut app = App {
        _window: None,
        inicio: Instant::now(),
        limite: Duration::from_secs(segundos),
    };
    event_loop.run_app(&mut app)?;
    Ok(())
}

struct App {
    _window: Option<Window>,
    inicio: Instant,
    limite: Duration,
}

impl ApplicationHandler for App {
    fn resumed(&mut self, event_loop: &ActiveEventLoop) {
        if self._window.is_some() {
            return;
        }
        let atributos = Window::default_attributes()
            .with_title("VirtualDeck — suelo de memoria")
            .with_inner_size(winit::dpi::LogicalSize::new(760.0, 560.0));
        match event_loop.create_window(atributos) {
            Ok(w) => self._window = Some(w),
            Err(e) => {
                eprintln!("No se pudo crear la ventana: {e}");
                event_loop.exit();
            }
        }
        println!("Ventana pelada abierta (sin OpenGL, sin egui).");
    }

    fn window_event(&mut self, event_loop: &ActiveEventLoop, _id: WindowId, event: WindowEvent) {
        if matches!(event, WindowEvent::CloseRequested) {
            event_loop.exit();
        }
    }

    fn new_events(&mut self, event_loop: &ActiveEventLoop, _c: winit::event::StartCause) {
        if self.inicio.elapsed() > self.limite {
            event_loop.exit();
            return;
        }
        // Con `Wait`, hay que pedir explicitamente que despierte para poder
        // comprobar el limite de tiempo.
        event_loop.set_control_flow(ControlFlow::WaitUntil(
            std::time::Instant::now() + Duration::from_millis(200),
        ));
    }
}
