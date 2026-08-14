//! Macros de teclado y raton: grabar y reproducir.
//!
//! Portado de `electron/main/macro.ts`, que dependia de dos cosas que aca
//! desaparecen:
//!
//! - **`uiohook-napi`** para grabar — un modulo nativo de Node que habia que
//!   desempaquetar del asar. Se reemplaza por hooks `WH_KEYBOARD_LL` /
//!   `WH_MOUSE_LL` directos.
//! - **Un script de PowerShell generado en cada reproduccion**, con `SendKeys`
//!   y `mouse_event` de `user32.dll`. Se reemplaza por `SendInput`, que es la
//!   API que Microsoft recomienda desde hace anios (`mouse_event` esta obsoleta).
//!
//! # Cuidado con el foco
//!
//! Una macro le escribe a **la ventana que tenga el foco**. Si VirtualDeck esta
//! enfocado, se escribe a si mismo. La version Electron resolvia esto con
//! `win.blur()` + 80 ms de espera antes de enviar teclas; la capa de UI tiene
//! que hacer lo equivalente antes de llamar a [`play`]. El nucleo no puede
//! resolverlo solo porque no conoce la ventana.

pub mod keys;

use std::sync::{Mutex, OnceLock};
use std::time::Duration;

use windows::Win32::UI::Input::KeyboardAndMouse::{
    SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, INPUT_MOUSE, KEYBDINPUT, KEYBD_EVENT_FLAGS,
    KEYEVENTF_KEYUP, KEYEVENTF_UNICODE, MOUSEEVENTF_LEFTDOWN, MOUSEEVENTF_LEFTUP,
    MOUSEEVENTF_MIDDLEDOWN, MOUSEEVENTF_MIDDLEUP, MOUSEEVENTF_RIGHTDOWN, MOUSEEVENTF_RIGHTUP,
    MOUSEEVENTF_WHEEL, MOUSEINPUT, VIRTUAL_KEY,
};
use windows::Win32::UI::WindowsAndMessaging::SetCursorPos;

use crate::config::model::{MacroStep, MacroStepType};

pub use recorder::{is_recording, start_recording, stop_recording};

/// Errores del modulo de macros.
#[derive(Debug, thiserror::Error)]
pub enum MacroError {
    #[error("la macro no tiene pasos")]
    Empty,

    #[error("no se pudo interpretar la tecla: {0:?}")]
    BadKey(String),

    #[error("Windows rechazo el evento de entrada (SendInput devolvio 0)")]
    InputRejected,

    #[error("ya hay una grabacion en curso")]
    AlreadyRecording,

    #[error("no hay ninguna grabacion en curso")]
    NotRecording,

    #[error("no se pudo instalar el hook de entrada: {0}")]
    HookFailed(String),
}

// ---------------------------------------------------------------------------
// Reproduccion
// ---------------------------------------------------------------------------

/// Envia una tanda de eventos de entrada.
fn send(inputs: &[INPUT]) -> Result<(), MacroError> {
    if inputs.is_empty() {
        return Ok(());
    }
    // SAFETY: `inputs` es un slice valido y el tamanio declarado es el real.
    let enviados = unsafe { SendInput(inputs, std::mem::size_of::<INPUT>() as i32) };
    if enviados as usize == inputs.len() {
        Ok(())
    } else {
        Err(MacroError::InputRejected)
    }
}

fn key_input(vk: VIRTUAL_KEY, up: bool) -> INPUT {
    INPUT {
        r#type: INPUT_KEYBOARD,
        Anonymous: INPUT_0 {
            ki: KEYBDINPUT {
                wVk: vk,
                wScan: 0,
                dwFlags: if up {
                    KEYEVENTF_KEYUP
                } else {
                    KEYBD_EVENT_FLAGS(0)
                },
                time: 0,
                dwExtraInfo: 0,
            },
        },
    }
}

/// Evento de teclado por unidad UTF-16, para poder escribir cualquier caracter
/// (tildes, ñ, emoji) sin depender de la distribucion de teclado activa.
fn unicode_input(unit: u16, up: bool) -> INPUT {
    INPUT {
        r#type: INPUT_KEYBOARD,
        Anonymous: INPUT_0 {
            ki: KEYBDINPUT {
                wVk: VIRTUAL_KEY(0),
                wScan: unit,
                dwFlags: if up {
                    KEYEVENTF_UNICODE | KEYEVENTF_KEYUP
                } else {
                    KEYEVENTF_UNICODE
                },
                time: 0,
                dwExtraInfo: 0,
            },
        },
    }
}

fn mouse_input(
    flags: windows::Win32::UI::Input::KeyboardAndMouse::MOUSE_EVENT_FLAGS,
    data: i32,
) -> INPUT {
    INPUT {
        r#type: INPUT_MOUSE,
        Anonymous: INPUT_0 {
            mi: MOUSEINPUT {
                dx: 0,
                dy: 0,
                // La API declara mouseData como u32 pero para la rueda el valor
                // es con signo: un scroll hacia abajo viaja como complemento a
                // dos. El cast es intencional, no una perdida de informacion.
                mouseData: data as u32,
                dwFlags: flags,
                time: 0,
                dwExtraInfo: 0,
            },
        },
    }
}

/// Ejecuta una pulsacion completa: baja modificadores, pulsa, y los suelta en
/// orden inverso.
fn press(spec: &str) -> Result<(), MacroError> {
    let stroke = keys::parse_keystroke(spec).ok_or_else(|| MacroError::BadKey(spec.to_string()))?;

    let mut inputs = Vec::with_capacity(stroke.modifiers.len() * 2 + 2);
    for m in &stroke.modifiers {
        inputs.push(key_input(*m, false));
    }
    inputs.push(key_input(stroke.key, false));
    inputs.push(key_input(stroke.key, true));
    for m in stroke.modifiers.iter().rev() {
        inputs.push(key_input(*m, true));
    }
    send(&inputs)
}

/// Escribe texto literal.
fn type_text(text: &str) -> Result<(), MacroError> {
    let mut inputs = Vec::with_capacity(text.len() * 2);
    for unit in text.encode_utf16() {
        inputs.push(unicode_input(unit, false));
        inputs.push(unicode_input(unit, true));
    }
    send(&inputs)
}

/// Reproduce una macro completa.
///
/// `repeat` es la cantidad de pasadas (minimo 1). Antes de llamar a esta
/// funcion, la capa de UI debe haber cedido el foco a la aplicacion destino.
pub fn play(steps: &[MacroStep], repeat: i64) -> Result<(), MacroError> {
    if steps.is_empty() {
        return Err(MacroError::Empty);
    }
    let pasadas = repeat.max(1);

    for _ in 0..pasadas {
        for step in steps {
            if let Some(ms) = step.delay_ms.filter(|d| *d > 0) {
                std::thread::sleep(Duration::from_millis(ms as u64));
            }

            match step.step_type {
                MacroStepType::Delay => {} // la pausa ya se aplico arriba
                MacroStepType::Key | MacroStepType::Hotkey => {
                    if let Some(v) = step.value.as_deref().filter(|v| !v.is_empty()) {
                        press(v)?;
                    }
                }
                MacroStepType::Text => {
                    if let Some(v) = step.value.as_deref().filter(|v| !v.is_empty()) {
                        type_text(v)?;
                    }
                }
                MacroStepType::Move => {
                    move_cursor(step.x.unwrap_or(0), step.y.unwrap_or(0));
                }
                MacroStepType::Click => {
                    move_cursor(step.x.unwrap_or(0), step.y.unwrap_or(0));
                    click(step.button.unwrap_or(0))?;
                }
                MacroStepType::Scroll => {
                    // Una "unidad" de rueda son 120 (WHEEL_DELTA).
                    let delta = step.scroll_y.unwrap_or(1) * 120;
                    send(&[mouse_input(MOUSEEVENTF_WHEEL, delta as i32)])?;
                }
            }
        }
    }
    Ok(())
}

fn move_cursor(x: i64, y: i64) {
    // SAFETY: coordenadas de pantalla; si estan fuera de rango Windows lo
    // ignora, no es un error fatal.
    unsafe {
        let _ = SetCursorPos(x as i32, y as i32);
    }
}

fn click(button: u8) -> Result<(), MacroError> {
    let (down, up) = match button {
        1 => (MOUSEEVENTF_RIGHTDOWN, MOUSEEVENTF_RIGHTUP),
        2 => (MOUSEEVENTF_MIDDLEDOWN, MOUSEEVENTF_MIDDLEUP),
        _ => (MOUSEEVENTF_LEFTDOWN, MOUSEEVENTF_LEFTUP),
    };
    send(&[mouse_input(down, 0), mouse_input(up, 0)])
}

// ---------------------------------------------------------------------------
// Grabacion
// ---------------------------------------------------------------------------

mod recorder {
    use super::*;

    use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
    use std::time::Instant;

    use windows::Win32::Foundation::{LPARAM, LRESULT, WPARAM};
    use windows::Win32::System::LibraryLoader::GetModuleHandleW;
    use windows::Win32::UI::WindowsAndMessaging::WM_KEYDOWN;
    use windows::Win32::UI::WindowsAndMessaging::{
        CallNextHookEx, DispatchMessageW, GetMessageW, PostThreadMessageW, SetWindowsHookExW,
        UnhookWindowsHookEx, HHOOK, KBDLLHOOKSTRUCT, MSG, MSLLHOOKSTRUCT, WH_KEYBOARD_LL,
        WH_MOUSE_LL, WM_LBUTTONDOWN, WM_MBUTTONDOWN, WM_QUIT, WM_RBUTTONDOWN, WM_SYSKEYDOWN,
    };

    /// Estado compartido entre el hilo del hook y quien controla la grabacion.
    struct State {
        steps: Vec<MacroStep>,
        last_event: Instant,
        /// Modificadores actualmente presionados, para fusionarlos con la
        /// siguiente tecla real en un solo paso ("Ctrl+C" y no "Ctrl" + "C").
        held: Vec<u16>,
    }

    static STATE: OnceLock<Mutex<Option<State>>> = OnceLock::new();
    static RECORDING: AtomicBool = AtomicBool::new(false);
    /// Id del hilo que corre el bucle de mensajes, para poder pedirle que pare.
    static HOOK_THREAD: AtomicU32 = AtomicU32::new(0);

    fn state() -> &'static Mutex<Option<State>> {
        STATE.get_or_init(|| Mutex::new(None))
    }

    /// Milisegundos transcurridos desde el evento anterior, con un piso de 0.
    ///
    /// Se descuentan 30 ms igual que hacia la version Electron: parte del tiempo
    /// entre eventos es latencia del hook, no pausa real del usuario.
    fn tomar_delay(st: &mut State) -> i64 {
        let ahora = Instant::now();
        let ms = ahora.duration_since(st.last_event).as_millis() as i64;
        st.last_event = ahora;
        (ms - 30).max(0)
    }

    unsafe extern "system" fn keyboard_hook(code: i32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
        if code >= 0 && (wparam.0 as u32 == WM_KEYDOWN || wparam.0 as u32 == WM_SYSKEYDOWN) {
            // SAFETY: cuando code >= 0, lparam apunta a un KBDLLHOOKSTRUCT valido.
            let vk = unsafe { (*(lparam.0 as *const KBDLLHOOKSTRUCT)).vkCode } as u16;

            if let Ok(mut guard) = state().lock() {
                if let Some(st) = guard.as_mut() {
                    if keys::is_modifier(vk) {
                        if !st.held.contains(&vk) {
                            st.held.push(vk);
                        }
                    } else if let Some(nombre) = keys::key_name(vk) {
                        let delay = tomar_delay(st);
                        let mods: Vec<&str> = st
                            .held
                            .iter()
                            .filter_map(|m| match *m {
                                0xA2 | 0xA3 | 0x11 => Some("Ctrl"),
                                0xA0 | 0xA1 | 0x10 => Some("Shift"),
                                0xA4 | 0xA5 | 0x12 => Some("Alt"),
                                0x5B | 0x5C => Some("Win"),
                                _ => None,
                            })
                            .collect();

                        let value = if mods.is_empty() {
                            nombre
                        } else {
                            format!("{}+{}", mods.join("+"), nombre)
                        };

                        st.steps.push(MacroStep {
                            step_type: MacroStepType::Key,
                            value: Some(value),
                            x: None,
                            y: None,
                            button: None,
                            scroll_y: None,
                            delay_ms: Some(delay),
                        });
                        st.held.clear();
                    }
                }
            }
        }
        // SAFETY: propagar el evento al resto de la cadena de hooks.
        unsafe { CallNextHookEx(None, code, wparam, lparam) }
    }

    unsafe extern "system" fn mouse_hook(code: i32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
        if code >= 0 {
            let button = match wparam.0 as u32 {
                WM_LBUTTONDOWN => Some(0u8),
                WM_RBUTTONDOWN => Some(1),
                WM_MBUTTONDOWN => Some(2),
                _ => None,
            };

            if let Some(button) = button {
                // SAFETY: con code >= 0, lparam apunta a un MSLLHOOKSTRUCT valido.
                let pt = unsafe { (*(lparam.0 as *const MSLLHOOKSTRUCT)).pt };

                if let Ok(mut guard) = state().lock() {
                    if let Some(st) = guard.as_mut() {
                        let delay = tomar_delay(st);
                        st.steps.push(MacroStep {
                            step_type: MacroStepType::Click,
                            value: None,
                            x: Some(pt.x as i64),
                            y: Some(pt.y as i64),
                            button: Some(button),
                            scroll_y: None,
                            delay_ms: Some(delay),
                        });
                    }
                }
            }
        }
        // SAFETY: propagar el evento.
        unsafe { CallNextHookEx(None, code, wparam, lparam) }
    }

    /// `true` si hay una grabacion en curso.
    pub fn is_recording() -> bool {
        RECORDING.load(Ordering::SeqCst)
    }

    /// Empieza a grabar teclado y raton globalmente.
    ///
    /// Los hooks de bajo nivel de Windows exigen un bucle de mensajes en el
    /// mismo hilo que los instalo, asi que se levanta un hilo dedicado.
    pub fn start_recording() -> Result<(), MacroError> {
        if RECORDING.swap(true, Ordering::SeqCst) {
            return Err(MacroError::AlreadyRecording);
        }

        *state().lock().unwrap_or_else(|e| e.into_inner()) = Some(State {
            steps: Vec::new(),
            last_event: Instant::now(),
            held: Vec::new(),
        });

        let (tx, rx) = std::sync::mpsc::channel::<Result<(), String>>();

        std::thread::spawn(move || {
            // SAFETY: se instalan dos hooks y se desinstalan antes de salir.
            unsafe {
                let instancia = GetModuleHandleW(None).ok();
                let hmod = instancia.map(|h| h.into());

                let teclado = SetWindowsHookExW(WH_KEYBOARD_LL, Some(keyboard_hook), hmod, 0);
                let raton = SetWindowsHookExW(WH_MOUSE_LL, Some(mouse_hook), hmod, 0);

                let (teclado, raton) = match (teclado, raton) {
                    (Ok(k), Ok(m)) => (k, m),
                    _ => {
                        let _ = tx.send(Err("SetWindowsHookExW fallo".into()));
                        RECORDING.store(false, Ordering::SeqCst);
                        return;
                    }
                };

                HOOK_THREAD.store(
                    windows::Win32::System::Threading::GetCurrentThreadId(),
                    Ordering::SeqCst,
                );
                let _ = tx.send(Ok(()));

                // Bucle de mensajes: termina cuando llega el WM_QUIT que envia
                // stop_recording().
                let mut msg = MSG::default();
                while GetMessageW(&mut msg, None, 0, 0).as_bool() {
                    DispatchMessageW(&msg);
                }

                let _ = UnhookWindowsHookEx(teclado);
                let _ = UnhookWindowsHookEx(raton);
                let _: HHOOK = HHOOK::default(); // ancla el tipo
            }
        });

        match rx.recv_timeout(Duration::from_secs(3)) {
            Ok(Ok(())) => Ok(()),
            Ok(Err(e)) => {
                RECORDING.store(false, Ordering::SeqCst);
                Err(MacroError::HookFailed(e))
            }
            Err(_) => {
                RECORDING.store(false, Ordering::SeqCst);
                Err(MacroError::HookFailed(
                    "el hilo del hook no respondio a tiempo".into(),
                ))
            }
        }
    }

    /// Detiene la grabacion y devuelve los pasos capturados.
    pub fn stop_recording() -> Result<Vec<MacroStep>, MacroError> {
        if !RECORDING.swap(false, Ordering::SeqCst) {
            return Err(MacroError::NotRecording);
        }

        // Despertar el bucle de mensajes para que se desinstalen los hooks.
        let tid = HOOK_THREAD.swap(0, Ordering::SeqCst);
        if tid != 0 {
            // SAFETY: id de hilo valido; si ya termino, la llamada solo falla.
            unsafe {
                let _ = PostThreadMessageW(tid, WM_QUIT, WPARAM(0), LPARAM(0));
            }
        }

        let pasos = state()
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .take()
            .map(|s| s.steps)
            .unwrap_or_default();

        Ok(pasos)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn paso(tipo: MacroStepType) -> MacroStep {
        MacroStep {
            step_type: tipo,
            value: None,
            x: None,
            y: None,
            button: None,
            scroll_y: None,
            delay_ms: None,
        }
    }

    #[test]
    fn una_macro_vacia_es_un_error() {
        assert!(matches!(play(&[], 1), Err(MacroError::Empty)));
    }

    #[test]
    fn una_tecla_invalida_se_reporta_con_su_texto() {
        let mut p = paso(MacroStepType::Key);
        p.value = Some("NoExisteEstaTecla".into());
        match play(&[p], 1) {
            Err(MacroError::BadKey(s)) => assert_eq!(s, "NoExisteEstaTecla"),
            otro => panic!("se esperaba BadKey, salio {otro:?}"),
        }
    }

    #[test]
    fn un_paso_de_pausa_no_envia_entrada() {
        // Solo duerme; si intentara enviar teclas fallaria por falta de valor.
        let mut p = paso(MacroStepType::Delay);
        p.delay_ms = Some(1);
        assert!(play(&[p], 1).is_ok());
    }

    #[test]
    fn no_se_puede_detener_una_grabacion_que_no_empezo() {
        assert!(matches!(stop_recording(), Err(MacroError::NotRecording)));
    }
}
