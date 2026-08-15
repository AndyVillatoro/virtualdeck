//! VirtualDeck — aplicación.
//!
//! Bucle de eventos de winit sobre el [`Lienzo`] de wgpu. El estado vive en
//! [`vd_app::app::App`] y el dibujo en [`vd_app::pantallas`].

use std::sync::Arc;

use vd_app::app::App;
use vd_app::render::Lienzo;
use winit::application::ApplicationHandler;
use winit::event::WindowEvent;
use winit::event_loop::{ActiveEventLoop, ControlFlow, EventLoop};
use winit::window::{Window, WindowId};

fn main() -> anyhow::Result<()> {
    let event_loop = EventLoop::new()?;
    // `Poll` y no `Wait` porque hay trabajo que llega de fuera del bucle de
    // eventos: los resultados de las acciones que corren en segundo plano. Con
    // `Wait` la ventana no se redibujaria hasta que el usuario la tocara.
    event_loop.set_control_flow(ControlFlow::Poll);

    let app = App::nueva();
    // Resumen de arranque: sirve para ver de un vistazo, sin abrir la ventana,
    // que la configuracion real se cargo y con que.
    match app.config.as_ref() {
        Some(c) => println!(
            "Configuracion cargada: {} pagina(s), {} boton(es), {} variable(s).",
            c.pages.len(),
            c.buttons.iter().filter(|b| !b.is_empty()).count(),
            app.estado.len()
        ),
        None => match &app.error_carga {
            Some(e) => println!("No se pudo leer la configuracion: {e}"),
            None => println!("Sin configuracion previa: se abre un deck vacio."),
        },
    }

    let mut vd = VirtualDeck { lienzo: None, app };
    event_loop.run_app(&mut vd)?;
    Ok(())
}

struct VirtualDeck {
    lienzo: Option<Lienzo>,
    app: App,
}

impl ApplicationHandler for VirtualDeck {
    fn resumed(&mut self, event_loop: &ActiveEventLoop) {
        if self.lienzo.is_some() {
            return;
        }
        let atributos = Window::default_attributes()
            .with_title("VirtualDeck")
            .with_inner_size(winit::dpi::LogicalSize::new(760.0, 560.0))
            .with_min_inner_size(winit::dpi::LogicalSize::new(320.0, 240.0));

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
                eprintln!("No se pudo inicializar el renderizado: {e}");
                event_loop.exit();
            }
        }
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
                let app = &mut self.app;
                lienzo.dibujar(|ctx| vd_app::pantallas::principal::ui(app, ctx));
            }
            _ => {}
        }
    }

    fn about_to_wait(&mut self, _event_loop: &ActiveEventLoop) {
        self.app.recoger_resultados();
        if let Some(lienzo) = self.lienzo.as_ref() {
            lienzo.window().request_redraw();
        }
    }
}
