//! Lanzar aplicaciones y actuar sobre el sistema.
//!
//! Portado de `electron/main/launcher.ts`, el modulo con mas superficie de todo
//! el backend (14 comandos IPC). Casi todo pasaba por PowerShell con C#
//! embebido; aca son llamadas directas.
//!
//! Varias piezas se reutilizan en vez de duplicarse:
//! - Los atajos de teclado y "escribir texto" usan el `SendInput` de
//!   [`crate::macros`].
//! - El volumen maestro usa el mismo enumerador COM que [`crate::audio`].

mod brillo;
mod procesos;
mod ventanas;

pub use brillo::{brightness, set_brightness};
pub use procesos::{kill_process, running_processes, ProcessInfo};
pub use ventanas::{force_foreground, snap_window, SnapPosition};

use std::os::windows::process::CommandExt;
use std::process::{Command, Stdio};

use windows::core::HSTRING;
use windows::Win32::Media::Audio::Endpoints::IAudioEndpointVolume;
use windows::Win32::Media::Audio::{eMultimedia, eRender, IMMDeviceEnumerator, MMDeviceEnumerator};
use windows::Win32::System::Com::{CoCreateInstance, CLSCTX_ALL};
use windows::Win32::UI::Shell::ShellExecuteW;
use windows::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL;

use crate::macros::{self, MacroError};

/// No mostrar la ventana de consola al lanzar procesos auxiliares.
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

/// Errores del modulo de lanzamiento.
#[derive(Debug, thiserror::Error)]
pub enum LauncherError {
    #[error("no se pudo iniciar: {0}")]
    Spawn(String),

    #[error("error de E/S: {0}")]
    Io(#[from] std::io::Error),

    #[error("error de Windows: {0}")]
    Win(#[from] windows::core::Error),

    #[error("error de entrada: {0}")]
    Input(#[from] MacroError),

    #[error("la ruta o comando esta vacio")]
    Empty,

    #[error("el script termino con codigo {0}")]
    ScriptFailed(i32),
}

// ---------------------------------------------------------------------------
// Aplicaciones, URLs y accesos directos
// ---------------------------------------------------------------------------

/// Lanza una aplicacion, desligada de este proceso.
///
/// Acepta rutas con variables de entorno (`%LOCALAPPDATA%\...`) porque asi las
/// guardan los presets de la version Electron.
pub fn launch_app(path: &str, args: &[String]) -> Result<(), LauncherError> {
    let path = expand_env(path.trim());
    if path.is_empty() {
        return Err(LauncherError::Empty);
    }

    // La ruta puede traer argumentos pegados ("Update.exe --processStart X"),
    // igual que en los presets heredados.
    let (exe, inline) = split_command(&path);
    let mut todos: Vec<String> = inline;
    todos.extend(args.iter().cloned());

    Command::new(&exe)
        .args(&todos)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map(|_| ())
        .map_err(|e| LauncherError::Spawn(format!("{exe}: {e}")))
}

/// Abre una URL, archivo o carpeta con la aplicacion asociada del sistema.
pub fn open_path(target: &str) -> Result<(), LauncherError> {
    let target = expand_env(target.trim());
    if target.is_empty() {
        return Err(LauncherError::Empty);
    }

    // SAFETY: cadenas terminadas en nulo validas durante la llamada.
    let resultado = unsafe {
        ShellExecuteW(
            None,
            &HSTRING::from("open"),
            &HSTRING::from(target.as_str()),
            None,
            None,
            SW_SHOWNORMAL,
        )
    };

    // ShellExecuteW devuelve un "handle" cuyo valor <= 32 significa error.
    if resultado.0 as usize > 32 {
        Ok(())
    } else {
        Err(LauncherError::Spawn(format!(
            "ShellExecute fallo para {target}"
        )))
    }
}

/// Expande variables de entorno estilo `%VAR%`.
fn expand_env(input: &str) -> String {
    let mut out = String::with_capacity(input.len());
    let mut resto = input;

    while let Some(inicio) = resto.find('%') {
        out.push_str(&resto[..inicio]);
        let tras = &resto[inicio + 1..];
        match tras.find('%') {
            Some(fin) => {
                let nombre = &tras[..fin];
                match std::env::var(nombre) {
                    Ok(v) => out.push_str(&v),
                    // Variable inexistente: se deja tal cual, como hace cmd.
                    Err(_) => {
                        out.push('%');
                        out.push_str(nombre);
                        out.push('%');
                    }
                }
                resto = &tras[fin + 1..];
            }
            None => {
                out.push('%');
                resto = tras;
                break;
            }
        }
    }
    out.push_str(resto);
    out
}

/// Separa un comando en ejecutable y argumentos, respetando comillas.
fn split_command(input: &str) -> (String, Vec<String>) {
    let input = input.trim();

    // Ruta entre comillas: todo lo de adentro es el ejecutable.
    if let Some(resto) = input.strip_prefix('"') {
        if let Some(fin) = resto.find('"') {
            let exe = resto[..fin].to_string();
            let args = resto[fin + 1..]
                .split_whitespace()
                .map(str::to_string)
                .collect();
            return (exe, args);
        }
    }

    let mut partes = input.split_whitespace();
    let exe = partes.next().unwrap_or("").to_string();
    (exe, partes.map(str::to_string).collect())
}

// ---------------------------------------------------------------------------
// Scripts
// ---------------------------------------------------------------------------

/// Shell con el que ejecutar un script.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Shell {
    PowerShell,
    Cmd,
}

/// Ejecuta un script y devuelve su salida combinada.
///
/// A diferencia de la version Electron, aca **no** se escribe un `.ps1`
/// temporal: el script va por `-Command`. Aquel rodeo existia para poder forzar
/// UTF-8 con `chcp`; en Rust la salida se decodifica directamente.
pub fn run_script(script: &str, shell: Shell) -> Result<String, LauncherError> {
    if script.trim().is_empty() {
        return Err(LauncherError::Empty);
    }

    let salida = match shell {
        Shell::PowerShell => Command::new("powershell")
            .args([
                "-NoProfile",
                "-ExecutionPolicy",
                "Bypass",
                "-NonInteractive",
                "-Command",
                script,
            ])
            .creation_flags(CREATE_NO_WINDOW)
            .output()?,
        Shell::Cmd => Command::new("cmd")
            .args(["/C", script])
            .creation_flags(CREATE_NO_WINDOW)
            .output()?,
    };

    let mut texto = String::from_utf8_lossy(&salida.stdout).into_owned();
    if texto.trim().is_empty() {
        texto = String::from_utf8_lossy(&salida.stderr).into_owned();
    }

    if salida.status.success() {
        Ok(texto.trim().to_string())
    } else {
        Err(LauncherError::ScriptFailed(
            salida.status.code().unwrap_or(-1),
        ))
    }
}

// ---------------------------------------------------------------------------
// Teclado: atajos y escribir texto
// ---------------------------------------------------------------------------

/// Envia una combinacion de teclas al sistema (ej. `Ctrl+Shift+Esc`).
///
/// **Ojo con el foco**: llega a la ventana activa. Ver la nota de
/// [`crate::macros`].
pub fn send_hotkey(combo: &str) -> Result<(), LauncherError> {
    use crate::config::model::{MacroStep, MacroStepType};

    let paso = MacroStep {
        step_type: MacroStepType::Key,
        value: Some(combo.to_string()),
        x: None,
        y: None,
        button: None,
        scroll_y: None,
        delay_ms: None,
    };
    macros::play(&[paso], 1).map_err(LauncherError::Input)
}

/// Escribe texto como si se tecleara.
pub fn type_text(text: &str) -> Result<(), LauncherError> {
    use crate::config::model::{MacroStep, MacroStepType};

    if text.is_empty() {
        return Ok(());
    }
    let paso = MacroStep {
        step_type: MacroStepType::Text,
        value: Some(text.to_string()),
        x: None,
        y: None,
        button: None,
        scroll_y: None,
        delay_ms: None,
    };
    macros::play(&[paso], 1).map_err(LauncherError::Input)
}

/// Teclas multimedia del teclado.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MediaKey {
    VolumeUp,
    VolumeDown,
    Mute,
}

/// Envia una tecla multimedia.
///
/// Volumen y silencio no tienen equivalente en SMTC, asi que van por tecla
/// virtual igual que en la version Electron.
pub fn send_media_key(key: MediaKey) -> Result<(), LauncherError> {
    use windows::Win32::UI::Input::KeyboardAndMouse::{
        VK_VOLUME_DOWN, VK_VOLUME_MUTE, VK_VOLUME_UP,
    };

    let vk = match key {
        MediaKey::VolumeUp => VK_VOLUME_UP,
        MediaKey::VolumeDown => VK_VOLUME_DOWN,
        MediaKey::Mute => VK_VOLUME_MUTE,
    };
    macros::press_virtual_key(vk).map_err(LauncherError::Input)
}

// ---------------------------------------------------------------------------
// Volumen maestro
// ---------------------------------------------------------------------------

/// Ajusta el volumen maestro del dispositivo predeterminado (0-100).
pub fn set_master_volume(percent: i64) -> Result<(), LauncherError> {
    let escala = (percent.clamp(0, 100) as f32) / 100.0;

    // SAFETY: se crea el enumerador, se pide el endpoint por defecto y se
    // activa IAudioEndpointVolume sobre el.
    unsafe {
        crate::audio::ensure_com();
        let enumerator: IMMDeviceEnumerator =
            CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL)?;
        let device = enumerator.GetDefaultAudioEndpoint(eRender, eMultimedia)?;
        let volume: IAudioEndpointVolume = device.Activate(CLSCTX_ALL, None)?;
        volume.SetMasterVolumeLevelScalar(escala, std::ptr::null())?;
    }
    Ok(())
}

/// Lee el volumen maestro actual (0-100).
pub fn master_volume() -> Result<i64, LauncherError> {
    // SAFETY: misma cadena COM que set_master_volume.
    unsafe {
        crate::audio::ensure_com();
        let enumerator: IMMDeviceEnumerator =
            CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL)?;
        let device = enumerator.GetDefaultAudioEndpoint(eRender, eMultimedia)?;
        let volume: IAudioEndpointVolume = device.Activate(CLSCTX_ALL, None)?;
        let escala = volume.GetMasterVolumeLevelScalar()?;
        Ok((escala * 100.0).round() as i64)
    }
}

// ---------------------------------------------------------------------------
// Portapapeles
// ---------------------------------------------------------------------------

/// Copia texto al portapapeles.
pub fn set_clipboard(text: &str) -> Result<(), LauncherError> {
    use windows::Win32::Foundation::{HANDLE, HGLOBAL};
    use windows::Win32::System::DataExchange::{
        CloseClipboard, EmptyClipboard, OpenClipboard, SetClipboardData,
    };
    use windows::Win32::System::Memory::{GlobalAlloc, GlobalLock, GlobalUnlock, GMEM_MOVEABLE};

    const CF_UNICODETEXT: u32 = 13;

    let mut utf16: Vec<u16> = text.encode_utf16().collect();
    utf16.push(0);
    let bytes = utf16.len() * std::mem::size_of::<u16>();

    // SAFETY: se abre el portapapeles, se reserva memoria global movible, se
    // copia el texto y se cede la propiedad a Windows con SetClipboardData
    // (por eso NO se libera el HGLOBAL en el camino de exito).
    unsafe {
        OpenClipboard(None)?;

        let resultado = (|| -> Result<(), LauncherError> {
            EmptyClipboard()?;
            let handle: HGLOBAL = GlobalAlloc(GMEM_MOVEABLE, bytes)?;
            let destino = GlobalLock(handle) as *mut u16;
            if destino.is_null() {
                return Err(LauncherError::Spawn("GlobalLock fallo".into()));
            }
            std::ptr::copy_nonoverlapping(utf16.as_ptr(), destino, utf16.len());
            let _ = GlobalUnlock(handle);
            SetClipboardData(CF_UNICODETEXT, Some(HANDLE(handle.0)))?;
            Ok(())
        })();

        let _ = CloseClipboard();
        resultado
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn expande_variables_de_entorno() {
        std::env::set_var("VD_TEST_VAR", "valor");
        assert_eq!(expand_env("%VD_TEST_VAR%\\x"), "valor\\x");
        assert_eq!(expand_env("sin variables"), "sin variables");
        // Una variable inexistente se deja literal, como hace cmd.
        assert_eq!(expand_env("%NO_EXISTE_XYZ%"), "%NO_EXISTE_XYZ%");
        // Un '%' suelto no debe romper nada.
        assert_eq!(expand_env("100% seguro"), "100% seguro");
    }

    #[test]
    fn separa_comando_y_argumentos() {
        let (exe, args) = split_command("notepad.exe");
        assert_eq!(exe, "notepad.exe");
        assert!(args.is_empty());

        let (exe, args) = split_command("Update.exe --processStart Discord.exe");
        assert_eq!(exe, "Update.exe");
        assert_eq!(args, vec!["--processStart", "Discord.exe"]);
    }

    #[test]
    fn respeta_rutas_entre_comillas_con_espacios() {
        let (exe, args) = split_command("\"C:\\Program Files\\App\\app.exe\" --flag");
        assert_eq!(exe, "C:\\Program Files\\App\\app.exe");
        assert_eq!(args, vec!["--flag"]);
    }

    #[test]
    fn una_ruta_vacia_es_un_error() {
        assert!(matches!(launch_app("   ", &[]), Err(LauncherError::Empty)));
        assert!(matches!(open_path(""), Err(LauncherError::Empty)));
    }

    #[test]
    fn el_volumen_se_puede_leer_en_esta_maquina() {
        // Test de humo del camino COM. No afirma un valor concreto.
        match master_volume() {
            Ok(v) => assert!((0..=100).contains(&v), "volumen fuera de rango: {v}"),
            Err(e) => panic!("no se pudo leer el volumen: {e}"),
        }
    }

    #[test]
    fn el_portapapeles_acepta_texto_con_acentos() {
        // Verifica el camino completo incluyendo UTF-16.
        assert!(set_clipboard("año — prueba ñÁÉ").is_ok());
    }
}
