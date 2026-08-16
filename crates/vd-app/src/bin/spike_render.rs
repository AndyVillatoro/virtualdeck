//! Spike de renderizado: mide el backend **activo** dibujando la escena de
//! [`vd_app::demo`].
//!
//! Sirve para repetir la comparación que decidió el backend. Es el mismo binario
//! para los dos, cambiando solo la feature, de modo que la escena y el código de
//! medición son idénticos y la diferencia medida es el backend y nada más:
//!
//! ```text
//! cargo run --release -p vd-app --bin spike_render -- 5
//! cargo run --release -p vd-app --no-default-features --features render-wgpu --bin spike_render -- 5
//! ```
//!
//! Resultado que llevó a elegir glow (misma escena, 525 círculos por fotograma):
//!
//! | Backend | Binario | Fotogramas | Residente | Privados |
//! |---|---|---|---|---|
//! | glow (OpenGL) | 2,56 MB | 144 fps | 121 MB | 215 MB |
//! | wgpu (D3D12) | 4,76 MB | 144 fps | 170 MB | 454 MB |
//!
//! Medir el proceso **demasiado pronto** da cifras mucho mas bajas y falsas: hay
//! que dejar pasar unos segundos a que el contexto grafico y el atlas de fuentes
//! terminen de inicializarse.

use std::time::{Duration, Instant};

use vd_app::render::Lienzo;
use winit::application::ApplicationHandler;
use winit::event::WindowEvent;
use winit::event_loop::{ActiveEventLoop, ControlFlow, EventLoop};
use winit::window::{Window, WindowId};

/// Nombre del backend compilado, para que el informe no dependa de recordar qué
/// features se pasaron.
const BACKEND: &str = if cfg!(feature = "render-glow") {
    "glow (OpenGL / WGL)"
} else {
    "wgpu (Direct3D 12)"
};

fn main() -> anyhow::Result<()> {
    let segundos: Option<u64> = std::env::args().nth(1).and_then(|s| s.parse().ok());

    let event_loop = EventLoop::new()?;
    event_loop.set_control_flow(ControlFlow::Poll);

    let mut app = App {
        lienzo: None,
        demo: vd_app::demo::Demo::default(),
        inicio: Instant::now(),
        limite: segundos.map(Duration::from_secs),
    };
    event_loop.run_app(&mut app)?;

    let s = app.inicio.elapsed().as_secs_f64();
    println!("\nBackend    : {BACKEND}");
    println!("Fotogramas : {} en {s:.1} s", app.demo.fotogramas);
    if s > 0.0 {
        println!(
            "Ritmo      : {:.0} fotogramas/s",
            app.demo.fotogramas as f64 / s
        );
    }
    println!(
        "Primitivas : {} círculos por fotograma, más la rejilla",
        vd_app::demo::Demo::primitivas_por_fotograma()
    );
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
            .with_title(format!("VirtualDeck — spike {BACKEND}"))
            .with_inner_size(winit::dpi::LogicalSize::new(720.0, 480.0));

        match Lienzo::nuevo(event_loop, atributos) {
            Ok(l) => self.lienzo = Some(l),
            Err(e) => {
                eprintln!("No se pudo inicializar el renderizado: {e}");
                event_loop.exit();
                return;
            }
        }
        println!("{BACKEND} listo.");
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
