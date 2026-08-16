// En release no se abre consola: una aplicación de bandeja con una ventana negra
// detrás se ve rota. En depuración sí, porque ahí es donde salen los mensajes.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

//! VirtualDeck — aplicación.
//!
//! Bucle de eventos de winit sobre el [`Lienzo`] de wgpu. El estado vive en
//! [`vd_app::app::App`] y el dibujo en [`vd_app::pantallas`].

use vd_app::app::App;
use vd_app::atajos::Atajos;
use vd_app::bandeja::{Bandeja, Orden};
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

    let mut vd = VirtualDeck {
        lienzo: None,
        app,
        bandeja: None,
        atajos: None,
        oculta: false,
    };
    event_loop.run_app(&mut vd)?;
    Ok(())
}

struct VirtualDeck {
    lienzo: Option<Lienzo>,
    app: App,
    /// `None` si la bandeja no se pudo crear. No es motivo para no arrancar: la
    /// aplicacion sigue siendo usable con su ventana.
    bandeja: Option<Bandeja>,
    atajos: Option<Atajos>,
    /// La ventana esta escondida pero el proceso sigue vivo.
    oculta: bool,
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

        match Lienzo::nuevo(event_loop, atributos) {
            Ok(l) => self.lienzo = Some(l),
            Err(e) => {
                eprintln!("No se pudo inicializar el renderizado: {e}");
                event_loop.exit();
                return;
            }
        }

        // La bandeja y los atajos se montan **despues** de la ventana: los dos
        // registran cosas en el sistema y conviene que exista algo que mostrar
        // antes de aparecer en la barra de tareas.
        match Bandeja::nueva(self.app.acento()) {
            Ok(b) => self.bandeja = Some(b),
            // Sin bandeja la aplicacion sigue siendo usable con su ventana, asi
            // que se avisa y se continua en vez de abortar.
            Err(e) => eprintln!("No se pudo crear el icono de bandeja: {e}"),
        }

        match Atajos::nuevos() {
            Ok(mut a) => {
                if let Some(cfg) = self.app.config.as_ref() {
                    let n = a.registrar_desde(cfg);
                    if n > 0 {
                        println!("Atajos globales activos: {n}");
                    }
                    for (combo, motivo) in &a.fallidos {
                        eprintln!("Atajo {combo:?} no registrado: {motivo}");
                    }
                }
                self.atajos = Some(a);
            }
            Err(e) => eprintln!("No se pudieron registrar atajos globales: {e}"),
        }
    }

    fn window_event(&mut self, event_loop: &ActiveEventLoop, _id: WindowId, event: WindowEvent) {
        let Some(lienzo) = self.lienzo.as_mut() else {
            return;
        };
        lienzo.evento(&event);

        match event {
            // Cerrar la ventana **no** cierra la aplicacion: VirtualDeck vive en
            // la bandeja y se vuelve desde ahi. Si no hay bandeja no habria forma
            // de recuperarla, asi que en ese caso si se sale.
            WindowEvent::CloseRequested => {
                if self.bandeja.is_some() {
                    self.ocultar();
                } else {
                    event_loop.exit();
                }
            }
            WindowEvent::Resized(tam) => lienzo.redimensionar(tam.width, tam.height),
            WindowEvent::RedrawRequested => {
                let app = &mut self.app;
                lienzo.dibujar(|ctx| vd_app::pantallas::principal::ui(app, ctx));
            }
            _ => {}
        }
    }

    fn about_to_wait(&mut self, event_loop: &ActiveEventLoop) {
        self.app.recoger_resultados();

        // `tray-icon` y `global-hotkey` publican en canales globales propios,
        // ajenos al bucle de winit, asi que hay que sondearlos una vez por
        // vuelta. Es exactamente el bombeo que `eframe` no permitiria hacer, y
        // la razon de haber elegido winit directo.
        self.atender_bandeja(event_loop);
        self.atender_atajos();

        // Escondida no hay nada que dibujar, y seguir pidiendo fotogramas
        // gastaria GPU para nadie.
        if !self.oculta {
            if let Some(lienzo) = self.lienzo.as_ref() {
                lienzo.window().request_redraw();
            }
        }
    }
}

impl VirtualDeck {
    fn mostrar(&mut self) {
        let Some(lienzo) = self.lienzo.as_ref() else {
            return;
        };
        let ventana = lienzo.window();
        ventana.set_visible(true);
        self.oculta = false;

        // Traerla al frente de verdad: `set_visible` sola la deja detras de lo
        // que hubiera encima, y el usuario acaba de pedirla explicitamente.
        if let Some(h) = hwnd_de(ventana) {
            vd_core::launcher::force_foreground(h);
        }
    }

    fn ocultar(&mut self) {
        if let Some(lienzo) = self.lienzo.as_ref() {
            lienzo.window().set_visible(false);
        }
        self.oculta = true;
    }

    fn atender_bandeja(&mut self, event_loop: &ActiveEventLoop) {
        let Some(bandeja) = self.bandeja.as_ref() else {
            return;
        };
        for orden in bandeja.recoger() {
            match orden {
                Orden::Mostrar => self.mostrar(),
                Orden::Ocultar => self.ocultar(),
                Orden::Alternar => {
                    if self.oculta {
                        self.mostrar();
                    } else {
                        self.ocultar();
                    }
                }
                Orden::Salir => {
                    event_loop.exit();
                    return;
                }
            }
        }
    }

    fn atender_atajos(&mut self) {
        let Some(atajos) = self.atajos.as_ref() else {
            return;
        };
        for id in atajos.recoger() {
            // El boton se busca por id en toda la configuracion, no solo en la
            // pagina visible: un atajo global tiene que funcionar aunque su
            // boton este en otra pagina.
            let boton = self
                .app
                .config
                .as_ref()
                .and_then(|c| c.button(&id))
                .cloned();
            if let Some(b) = boton {
                self.app.pulsar(&b);
            }
        }
    }
}

/// Saca el `HWND` de una ventana de winit.
fn hwnd_de(window: &Window) -> Option<isize> {
    use winit::raw_window_handle::{HasWindowHandle, RawWindowHandle};
    match window.window_handle().ok()?.as_raw() {
        RawWindowHandle::Win32(h) => Some(h.hwnd.get()),
        _ => None,
    }
}
