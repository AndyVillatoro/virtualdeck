//! Spike: ¿egui acepta bien texto en español?
//!
//! Es la primera tarea de la Fase 2 y va antes que cualquier otra cosa **a
//! propósito**. Toda la interfaz se apoya en la elección de egui + winit; si la
//! entrada de texto no maneja acentos, ñ o IME, esa elección se cae y conviene
//! descubrirlo ahora y no después de portar catorce pantallas.
//!
//! # Los dos modos
//!
//! **Automático** (por defecto): abre la ventana, se trae el primer plano y le
//! inyecta el texto con el mismo `SendInput` del módulo de macros. Recorre la
//! cadena real —Windows → winit → egui-winit → `TextEdit`— sin depender de que
//! una persona teclee, y compara lo recibido con lo esperado.
//!
//! **Manual**: para lo que no se puede automatizar, que es el IME de verdad
//! (teclado chino/japonés, panel de emoji de Windows con `Win + .`) y las teclas
//! muertas del driver de teclado.
//!
//! # Lo que se aprendió
//!
//! 1. **Acentos y ñ por teclado: funcionan.** winit entrega el carácter ya
//!    compuesto en `KeyEvent::text` y egui lo inserta tal cual.
//! 2. **Los pares suplentes NO llegan por teclado.** Un emoji enviado con
//!    `SendInput` viaja como dos mitades UTF-16 y winit las entrega con
//!    `text: None`, porque ninguna mitad es un carácter válido por separado y
//!    winit no las recombina. En la práctica no importa: nadie teclea un emoji
//!    carácter a carácter, se pega.
//! 3. **La feature `clipboard` de `egui-winit` es imprescindible.** Sin ella,
//!    egui ignora Ctrl+V en silencio y no se puede pegar en ningún campo. Se
//!    descubrió aquí, no en producción.
//!
//! ```text
//! cargo run -p vd-app --bin spike_texto            # automático
//! cargo run -p vd-app --bin spike_texto -- manual  # para probar el IME a mano
//! ```

use std::sync::Arc;
use std::time::{Duration, Instant};

use vd_app::render::Lienzo;
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
const LIMITE: Duration = Duration::from_secs(15);

fn main() -> anyhow::Result<()> {
    let manual = std::env::args().any(|a| a == "manual");

    let event_loop = EventLoop::new()?;
    event_loop.set_control_flow(ControlFlow::Poll);

    let mut app = Spike {
        lienzo: None,
        buffer: String::new(),
        pegado: String::new(),
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
            println!("\nRESULTADO: la entrada de texto de egui + winit sirve para el proyecto.");
            println!("Acentos y ñ por teclado; caracteres fuera del plano básico por pegado.");
            println!("\nFalta comprobar el IME a mano:");
            println!("  cargo run -p vd-app --bin spike_texto -- manual");
            Ok(())
        }
        Some(false) => {
            anyhow::bail!("la entrada de texto NO llegó intacta — ver el detalle arriba")
        }
        None if manual => Ok(()),
        None => {
            anyhow::bail!("el spike terminó sin veredicto (¿se cerró la ventana antes de tiempo?)")
        }
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
    lienzo: Option<Lienzo>,
    buffer: String,
    /// Campo aparte para el pegado, para que en modo manual se vean los dos
    /// casos a la vez sin que uno pise al otro.
    pegado: String,
    manual: bool,
    fase: Fase,
    /// Si ya se le pidió el foco al campo de texto.
    enfocado: bool,
    /// Si la ventana consiguió el primer plano del sistema.
    al_frente: bool,
    inicio: Instant,
    resultado: Option<bool>,
}

/// Saca el `HWND` de una ventana de winit.
fn hwnd_de(window: &Window) -> Option<isize> {
    match window.window_handle().ok()?.as_raw() {
        RawWindowHandle::Win32(h) => Some(h.hwnd.get()),
        _ => None,
    }
}

impl ApplicationHandler for Spike {
    fn resumed(&mut self, event_loop: &ActiveEventLoop) {
        if self.lienzo.is_some() {
            return;
        }
        let atributos = Window::default_attributes()
            .with_title("VirtualDeck — spike de entrada de texto")
            .with_inner_size(winit::dpi::LogicalSize::new(620.0, 340.0));

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
                return;
            }
        }
        self.inicio = Instant::now();

        if self.manual {
            println!("Modo manual. En la ventana:");
            println!("  1. Escribí acentos y ñ en el primer campo.");
            println!("  2. Probá el panel de emoji de Windows (Win + .) en el segundo.");
            println!("  3. Probá pegar con Ctrl+V.");
            println!("Debajo de cada campo se ven los puntos de código recibidos.");
            println!("Cerrá la ventana cuando termines.");
        } else {
            println!("Modo automático: dos casos, teclado y pegado.");
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
            WindowEvent::RedrawRequested => self.pintar(),
            _ => {}
        }
    }

    fn about_to_wait(&mut self, event_loop: &ActiveEventLoop) {
        if self.lienzo.is_none() {
            return;
        }
        self.pintar();

        if self.manual || self.resultado.is_some() {
            return;
        }

        if self.inicio.elapsed() > LIMITE {
            println!("\nSe agotó el tiempo de espera esperando el primer plano.");
            self.resultado = Some(false);
            event_loop.exit();
            return;
        }

        let Some(hwnd) = self.lienzo.as_ref().and_then(|l| hwnd_de(l.window())) else {
            return;
        };

        // Se reintenta el primer plano en cada fotograma: justo después de crear
        // la ventana el sistema aún no la considera lista y el primer intento
        // falla por eso, no por la restricción de foco de Windows.
        if !self.al_frente {
            self.al_frente = vd_core::launcher::force_foreground(hwnd);
            if !self.al_frente {
                return;
            }
        }

        match self.fase {
            Fase::Esperando => {
                println!("\n[1/2] Tecleando texto en español...");
                if let Err(e) = vd_core::launcher::type_text(TEXTO_ESPANOL) {
                    eprintln!("No se pudo teclear: {e}");
                    self.resultado = Some(false);
                    event_loop.exit();
                    return;
                }
                self.fase = Fase::Tecleado;
            }
            Fase::Tecleado => {
                if self.buffer.chars().count() < TEXTO_ESPANOL.chars().count() {
                    return;
                }
                if !comparar(
                    "texto en español tecleado",
                    TEXTO_ESPANOL,
                    self.buffer.trim(),
                ) {
                    self.resultado = Some(false);
                    event_loop.exit();
                    return;
                }

                println!("\n[2/2] Pegando un emoji desde el portapapeles...");
                if let Err(e) = vd_core::launcher::set_clipboard(EMOJI) {
                    eprintln!("No se pudo escribir en el portapapeles: {e}");
                    self.resultado = Some(false);
                    event_loop.exit();
                    return;
                }
                // El foco tiene que estar ya en el segundo campo antes de pegar,
                // y eso lo decide el fotograma siguiente.
                self.fase = Fase::Pegado;
                self.inicio = Instant::now();
                self.pintar();
                if let Err(e) = vd_core::launcher::send_hotkey("Ctrl+V") {
                    eprintln!("No se pudo enviar Ctrl+V: {e}");
                    self.resultado = Some(false);
                    event_loop.exit();
                }
            }
            Fase::Pegado => {
                // El pegado no es instantáneo; se le da un margen antes de juzgar.
                if self.pegado.trim().is_empty() && self.inicio.elapsed() < Duration::from_secs(3) {
                    return;
                }
                let ok = comparar("emoji pegado (par suplente)", EMOJI, self.pegado.trim());
                self.resultado = Some(ok);
                event_loop.exit();
            }
        }
    }
}

impl Spike {
    fn pintar(&mut self) {
        let Some(lienzo) = self.lienzo.as_mut() else {
            return;
        };

        // El foco de teclado en egui es explícito: un `TextEdit` recién creado no
        // lo tiene, y sin foco descarta la entrada en silencio. No basta con que
        // la ventana esté activa.
        let pedir_foco = !self.enfocado;
        // El guion automático pega en el segundo campo, así que hay que moverle
        // el foco cuando llega ese turno.
        let foco_en_pegado = !self.manual && self.fase == Fase::Pegado;

        let buffer = &mut self.buffer;
        let pegado = &mut self.pegado;

        lienzo.dibujar(|ctx| {
            egui::CentralPanel::default().show(ctx, |ui| {
                ui.add_space(6.0);
                ui.heading("Entrada de texto");
                ui.separator();

                ui.add_space(6.0);
                ui.label("1 · Tecleado — acentos, ñ, ¿¡ y teclas muertas:");
                let campo = ui.add(
                    egui::TextEdit::singleline(buffer)
                        .desired_width(f32::INFINITY)
                        .hint_text("escribí aquí"),
                );
                if pedir_foco && !foco_en_pegado {
                    campo.request_focus();
                }
                ui.label(
                    egui::RichText::new(puntos_de_codigo(buffer))
                        .small()
                        .monospace()
                        .weak(),
                );

                ui.add_space(12.0);
                ui.label("2 · Pegado e IME — Ctrl+V y el panel de emoji (Win + .):");
                let campo2 = ui.add(
                    egui::TextEdit::singleline(pegado)
                        .desired_width(f32::INFINITY)
                        .hint_text("pegá aquí"),
                );
                if foco_en_pegado {
                    campo2.request_focus();
                }
                // Ver los puntos de código es lo que distingue "se ve raro" de
                // saber si el problema es la composición o los pares suplentes.
                ui.label(
                    egui::RichText::new(puntos_de_codigo(pegado))
                        .small()
                        .monospace()
                        .weak(),
                );
            });
        });
        self.enfocado = true;
    }
}

/// Muestra los puntos de código de un texto, recortando si es largo.
fn puntos_de_codigo(s: &str) -> String {
    if s.is_empty() {
        return "(vacío)".into();
    }
    let mut salida: Vec<String> = s
        .chars()
        .take(10)
        .map(|c| format!("U+{:04X}", c as u32))
        .collect();
    if s.chars().count() > 10 {
        salida.push("…".into());
    }
    format!("{} caracteres · {}", s.chars().count(), salida.join(" "))
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
