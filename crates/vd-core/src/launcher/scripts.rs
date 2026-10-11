//! Scripts de PowerShell y Cmd con limite de tiempo.

use std::os::windows::process::CommandExt;
use std::process::{Command, Stdio};

use super::LauncherError;
use super::procesos::kill_process_by_pid;

/// No mostrar la ventana de consola al lanzar procesos auxiliares.
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

/// Shell con el que ejecutar un script.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Shell {
    PowerShell,
    Cmd,
}

/// Plazo por defecto para un script: el mismo que el respaldo PowerShell de
/// Electron (`runPS` con `timeoutMs: 30000`). Un script colgado no puede
/// colgar a quien lo lanzo.
pub const LIMITE_SCRIPT: std::time::Duration = std::time::Duration::from_secs(30);

/// Ejecuta un script y devuelve su salida combinada.
///
/// A diferencia de la version Electron, aca **no** se escribe un `.ps1`
/// temporal: el script va por `-Command`. Aquel rodeo existia para poder forzar
/// UTF-8 con `chcp`; en Rust la salida se decodifica directamente.
pub fn run_script(script: &str, shell: Shell) -> Result<String, LauncherError> {
    run_script_con_limite(script, shell, LIMITE_SCRIPT)
}

/// Como [`run_script`], pero con el plazo que se le diga.
///
/// Vencido el plazo, el proceso hijo se mata y se devuelve [`LauncherError::Timeout`].
/// Sin esto, un `while ($true) {}` en un boton congelaba el hilo que lo lanzo:
/// con napi asincrono ese hilo es del pool de libuv, no el principal, pero un
/// pool agotado por scripts colgados deja a la aplicacion sin respuestas igual.
pub fn run_script_con_limite(
    script: &str,
    shell: Shell,
    limite: std::time::Duration,
) -> Result<String, LauncherError> {
    if script.trim().is_empty() {
        return Err(LauncherError::Empty);
    }

    let mut cmd = match shell {
        Shell::PowerShell => {
            // Habia dos ramas `PowerShell`: la vieja, primero, ganaba siempre y la
            // del prefijo UTF-8 no se ejecutaba nunca (cada acento volvia roto).
            let script_con_utf8 = if script.contains("[Console]::OutputEncoding") {
                script.to_string()
            } else {
                format!(
                    "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; \
                     $OutputEncoding = [System.Text.Encoding]::UTF8; \
                     {script}"
                )
            };
            let mut c = Command::new("powershell");
            c.args([
                "-NoProfile",
                "-ExecutionPolicy",
                "Bypass",
                "-NonInteractive",
                "-Command",
                &script_con_utf8,
            ]);
            c
        }
        Shell::Cmd => {
            let mut c = Command::new("cmd");
            c.args(["/C", script]);
            c
        }
    };
    cmd.creation_flags(CREATE_NO_WINDOW);
    cmd.stdin(Stdio::null()).stdout(Stdio::piped()).stderr(Stdio::piped());

    // `.output()` espera sin plazo y no deja matar al hijo: se lanza y se
    // espera en un hilo aparte, con la respuesta viajando por un canal. La
    // salida se recoge por las tuberias en ese hilo, asi que un script
    // verboso no se bloquea con el bufer lleno mientras se espera el plazo.
    let hijo = cmd.spawn()?;
    let pid = hijo.id();
    let (tx, rx) = std::sync::mpsc::channel();
    std::thread::spawn(move || {
        let r = hijo.wait_with_output();
        let _ = tx.send(r);
    });

    let salida = match rx.recv_timeout(limite) {
        Ok(Ok(s)) => s,
        Ok(Err(e)) => return Err(LauncherError::Io(e)),
        Err(_) => {
            // Vencio el plazo: se mata al hijo por su PID (el `Child` vive en
            // el otro hilo) y se devuelve el error. El hilo recoge la salida
            // cuando el proceso muera y suelta su extremo del canal solo.
            let _ = kill_process_by_pid(pid);
            return Err(LauncherError::Timeout(limite.as_secs()));
        }
    };

    salida_como_texto(&salida)
}

/// Salida combinada de un hijo ya terminado: stdout, o stderr si stdout viene
/// vacio. `Ok` si el codigo es 0, [`LauncherError::ScriptFailed`] si no.
fn salida_como_texto(salida: &std::process::Output) -> Result<String, LauncherError> {
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

/// Ejecuta un comando o ejecutable directamente en el sistema sin intermediarios shell (latencia ~2ms).
pub fn run_command_fast(exe: &str, args: &[String]) -> Result<String, LauncherError> {
    if exe.trim().is_empty() {
        return Err(LauncherError::Empty);
    }
    let salida = Command::new(exe)
        .args(args)
        .creation_flags(CREATE_NO_WINDOW)
        .output()?;

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
