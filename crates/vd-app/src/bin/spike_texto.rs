//! Spike: ¿egui acepta bien texto en español?
//!
//! Es la primera tarea de la Fase 2 y va antes que cualquier otra cosa **a
//! propósito**. Toda la interfaz se apoya en la elección de egui + winit; si la
//! entrada de texto no maneja acentos, ñ o IME, esa elección se cae y conviene
//! descubrirlo ahora y no después de portar catorce pantallas.
//!
//! La versión Electron heredaba el manejo de texto del navegador y ahí esto no
//! era una pregunta. Aquí sí: winit entrega los caracteres y egui los acumula, y
//! entre medias hay teclas muertas, composición e IME.
//!
//! # Qué comprueba, y cómo
//!
//! Se abre una ventana y se le envían los caracteres con `WM_CHAR`, que es
//! exactamente el mensaje que Windows genera al traducir una pulsación de tecla.
//! El recorrido probado es `WM_CHAR` → winit → egui-winit → `TextEdit`, que es
//! donde vive el riesgo real: la conversión de UTF-16 a UTF-8, los pares
//! suplentes y el manejo de caracteres fuera de ASCII.
//!
//! **Por qué no `SendInput`**, que sería más realista: `SendInput` va a la
//! ventana con el foco del sistema, y Windows no deja que un proceso que no está
//! en primer plano se lo quede. Un spike que depende de ganar el foco falla por
//! una razón que no tiene nada que ver con lo que quiere medir.
//!
//! # Lo que se aprendió
//!
//! 1. **Acentos y ñ por teclado: funcionan.** winit entrega el carácter ya
//!    compuesto en `KeyEvent::text` y egui lo inserta tal cual.
//! 2. **Los pares suplentes NO llegan por teclado.** Un emoji enviado con
//!    `SendInput` viaja como dos mitades UTF-16 y winit las entrega con
//!    `text: None`, porque ninguna mitad es un carácter válida por separado y
//!    winit no las recombina. En la práctica no importa: nadie teclea un emoji
//!    carácter a carácter, se pega.
//! 3. **La feature `clipboard` de `egui-winit` es imprescindible.** Sin ella,
//!    egui ignora Ctrl+V en silencio y no se puede pegar en ningún campo. Se
//!    descubrió aquí, no en producción.
//!
//! Lo que **no** cubre: el IME de verdad (teclado chino/japonés, panel de emoji
//! de Windows) y las teclas muertas del driver de teclado. Eso necesita una
//! persona, y para eso está el modo manual.
//!
//! ```text
//! cargo run -p vd-app --bin spike_texto            # automático
//! cargo run -p vd-app --bin spike_texto -- manual  # para probar el IME a mano
//! ```

use std::time::{Duration, Instant};

use egui::ViewportId;
use winit::application::ApplicationHandler;
use winit::event::WindowEvent;
use winit::event_loop::{ActiveEventLoop, ControlFlow, EventLoop};
use winit::raw_window_handle::{HasWindowHandle, RawWindowHandle};
use winit::window::{Window, WindowId};

/// Caso 1: lo que tiene que funcionar sí o sí. Acentos, ñ, apertura de
/// interrogación y exclamación, diéresis y un símbolo fuera de ASCII.
const TEXTO_ESPANOL: &str = "áéíóú ñÑ ¿¡ üÜ €";

/// Caso 2: un carácter fuera del plano básico, que en UTF-16 viaja como par
/// suplente. Se prueba **pegándolo**, que es como se introduce un emoji en la
/// práctica: nadie lo teclea carácter a carácter.
const EMOJI: &str = "🎛";

/// Margen antes de rendirse en el modo automático.
const LIMITE: Duration = Duration::from_secs(10);

fn main() -> anyhow::Result<()> {
    let manual = std::env::args().any(|a| a == "manual");

    let event_loop = EventLoop::new()?;
    event_loop.set_control_flow(ControlFlow::Poll);

    let mut app = Spike {
        window: None,
        egui_ctx: egui::Context::default(),
        egui_state: None,
        buffer: String::new(),
        manual,
        fase: Fase::Esperando,
        enfocado: false,
        al_frente: false,
        inicio: Instant::now(),
        resultado: None,
    };

    event_loop.run_app(&mut app)?;

    match app.resultado {
        Some(true) => {
            println!("\nRESULTADO: egui recibe correctamente acentos, ñ y símbolos.");
            println!("La elección de egui + winit se sostiene; se puede seguir con la Fase 2.");
            Ok(())
        }
        Some(false) => {
            anyhow::bail!("la entrada de texto NO llegó intacta — ver el detalle de arriba")
        }
        None if manual => Ok(()),
        None => {
            anyhow::bail!("el spike terminó sin veredicto (¿se cerró la ventana antes de tiempo?)")
        }
    }
}

/// Saca el `HWND` de una ventana de winit.
fn hwnd_de(window: &Window) -> Option<isize> {
    match window.window_handle().ok()?.as_raw() {
        RawWindowHandle::Win32(h) => Some(h.hwnd.get()),
        _ => None,
    }
}

/// En qué punto del guion automático estamos.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Fase {
    /// Aún no se ganó el primer plano.
    Esperando,
    /// Se tecleó el texto en español; falta comprobarlo.
    Tecleado,
    /// Se pegó el emoji; falta comprobarlo.
    Pegado,
}

struct Spike {
    window: Option<Window>,
    egui_ctx: egui::Context,
    egui_state: Option<egui_winit::State>,
    buffer: String,
    manual: bool,
    fase: Fase,
    /// Si ya se le pidió el foco al campo de texto.
    enfocado: bool,
    /// Si la ventana consiguió el primer plano del sistema.
    al_frente: bool,
    inicio: Instant,
    resultado: Option<bool>,
}

impl ApplicationHandler for Spike {
    fn resumed(&mut self, event_loop: &ActiveEventLoop) {
        if self.window.is_some() {
            return;
        }
        let atributos = Window::default_attributes()
            .with_title("VirtualDeck — spike de entrada de texto")
            .with_inner_size(winit::dpi::LogicalSize::new(560.0, 220.0));

        let window = event_loop.create_window(atributos).expect("crear ventana");

        self.egui_state = Some(egui_winit::State::new(
            self.egui_ctx.clone(),
            ViewportId::ROOT,
            &window,
            None,
            None,
            None,
        ));
        // Sin foco del sistema, `SendInput` escribiría en la ventana que
        // estuviera activa — casi seguro la terminal desde la que se lanzó esto.
        // `focus_window()` de winit no basta: Windows impide que un proceso que
        // no está en primer plano robe el foco, así que hace falta la maniobra
        // de `force_foreground`.
        window.focus_window();
        self.window = Some(window);

        println!("Ventana abierta.");
        if self.manual {
            println!("Modo manual: escribí en el campo. Probá acentos, ñ y el IME.");
            println!("Cerrá la ventana para terminar.");
        } else {
            println!("Modo automático: dos casos, teclado y pegado.");
        }
    }

    fn window_event(&mut self, event_loop: &ActiveEventLoop, _id: WindowId, event: WindowEvent) {
        let (Some(window), Some(state)) = (self.window.as_ref(), self.egui_state.as_mut()) else {
            return;
        };

        // egui necesita ver **todos** los eventos de ventana: es quien decide qué
        // es entrada de texto y qué no.
        let respuesta = state.on_window_event(window, &event);

        // Diagnóstico opcional: sin esto, un fallo del spike no dice en qué
        // eslabón de la cadena se perdió el texto.
        if std::env::var_os("VD_SPIKE_DIAG").is_some() {
            match &event {
                WindowEvent::KeyboardInput { event: ke, .. } => println!(
                    "[diag] tecla: estado={:?} texto={:?} consumido={}",
                    ke.state, ke.text, respuesta.consumed
                ),
                WindowEvent::Ime(ime) => println!("[diag] IME: {ime:?}"),
                WindowEvent::Focused(f) => println!("[diag] foco de ventana: {f}"),
                _ => {}
            }
        }

        if matches!(event, WindowEvent::CloseRequested) {
            event_loop.exit();
            return;
        }

        self.dibujar();
    }

    fn about_to_wait(&mut self, event_loop: &ActiveEventLoop) {
        if self.window.is_none() {
            return;
        }
        self.dibujar();

        if self.manual || self.resultado.is_some() {
            return;
        }

        if self.inicio.elapsed() > LIMITE {
            println!(
                "
Se agotó el tiempo de espera esperando el primer plano."
            );
            self.resultado = Some(false);
            event_loop.exit();
            return;
        }

        let Some(hwnd) = self.window.as_ref().and_then(hwnd_de) else {
            return;
        };

        // Se reintenta el primer plano en cada fotograma: justo despues de crear
        // la ventana el sistema aun no la considera lista, y el primer intento
        // falla por eso, no por la restriccion de foco de Windows.
        if !self.al_frente {
            self.al_frente = vd_core::launcher::force_foreground(hwnd);
            if !self.al_frente {
                return;
            }
        }

        match self.fase {
            Fase::Esperando => {
                println!(
                    "
[1/2] Tecleando texto en español..."
                );
                if let Err(e) = vd_core::launcher::type_text(TEXTO_ESPANOL) {
                    eprintln!("No se pudo teclear: {e}");
                    self.resultado = Some(false);
                    event_loop.exit();
                    return;
                }
                self.fase = Fase::Tecleado;
            }
            Fase::Tecleado => {
                // Se espera a que hayan llegado todos los caracteres.
                if self.buffer.chars().count() < TEXTO_ESPANOL.chars().count() {
                    return;
                }
                let ok = comparar(
                    "texto en español tecleado",
                    TEXTO_ESPANOL,
                    self.buffer.trim(),
                );
                if !ok {
                    self.resultado = Some(false);
                    event_loop.exit();
                    return;
                }

                println!(
                    "
[2/2] Pegando un emoji desde el portapapeles..."
                );
                self.buffer.clear();
                if let Err(e) = vd_core::launcher::set_clipboard(EMOJI) {
                    eprintln!("No se pudo escribir en el portapapeles: {e}");
                    self.resultado = Some(false);
                    event_loop.exit();
                    return;
                }
                if let Err(e) = vd_core::launcher::send_hotkey("Ctrl+V") {
                    eprintln!("No se pudo enviar Ctrl+V: {e}");
                    self.resultado = Some(false);
                    event_loop.exit();
                    return;
                }
                self.fase = Fase::Pegado;
                self.inicio = Instant::now();
            }
            Fase::Pegado => {
                // El pegado no es instantáneo; se le da un margen antes de juzgar.
                if self.buffer.trim().is_empty() && self.inicio.elapsed() < Duration::from_secs(3) {
                    return;
                }
                let ok = comparar("emoji pegado (par suplente)", EMOJI, self.buffer.trim());
                self.resultado = Some(ok);
                event_loop.exit();
            }
        }
    }
}

impl Spike {
    /// Corre un fotograma de egui.
    ///
    /// No se dibuja nada en pantalla: este spike prueba la **entrada**, y montar
    /// un renderer (wgpu o glow) para responder a la pregunta sería trabajo que
    /// no cambia la respuesta. La ventana se ve en blanco y es correcto.
    fn dibujar(&mut self) {
        let (Some(window), Some(state)) = (self.window.as_ref(), self.egui_state.as_mut()) else {
            return;
        };

        let entrada = state.take_egui_input(window);
        let pedir_foco = !self.enfocado;
        let salida = self.egui_ctx.run(entrada, |ctx| {
            egui::CentralPanel::default().show(ctx, |ui| {
                ui.label("Escribí texto con acentos, ñ e IME:");
                let campo = ui.text_edit_singleline(&mut self.buffer);
                // En egui el foco de teclado es explícito: un `TextEdit` recién
                // creado no lo tiene, y sin foco descarta la entrada en silencio.
                // Hay que pedirlo, no basta con que la ventana esté activa.
                if pedir_foco {
                    campo.request_focus();
                }
            });
        });
        self.enfocado = true;
        state.handle_platform_output(window, salida.platform_output);
    }
}

/// Compara lo recibido con lo esperado y explica la diferencia si la hay.
///
/// Señalar el primer carácter divergente es lo que distingue "no funciona" de
/// saber si el problema son los pares suplentes, la composición o el mapa de
/// teclado.
fn comparar(caso: &str, esperado: &str, obtenido: &str) -> bool {
    let ok = obtenido == esperado;
    println!("  caso     : {caso}");
    println!("  esperado : {esperado:?}");
    println!("  obtenido : {obtenido:?}");
    println!("  veredicto: {}", if ok { "correcto" } else { "FALLO" });

    if !ok {
        for (i, (a, b)) in esperado.chars().zip(obtenido.chars()).enumerate() {
            if a != b {
                println!(
                    "    posición {i}: se esperaba {a:?} (U+{:04X}) y llegó {b:?} (U+{:04X})",
                    a as u32, b as u32
                );
                break;
            }
        }
        if obtenido.chars().count() != esperado.chars().count() {
            println!(
                "    longitudes distintas: {} vs {} caracteres",
                esperado.chars().count(),
                obtenido.chars().count()
            );
        }
    }
    ok
}
