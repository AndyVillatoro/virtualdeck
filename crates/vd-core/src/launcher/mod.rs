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

mod apps;
mod brillo;
mod icono_app;
mod portapapeles;
mod procesos;
mod scripts;
mod teclado;
mod ventanas;
mod volumen;

#[cfg(test)]
mod pruebas;

pub use apps::{launch_app, open_path};
pub use icono_app::icono_app;

pub use brillo::{brightness, set_brightness};
pub use portapapeles::{clipboard, set_clipboard};
pub use procesos::{
    find_processes, is_process_running, kill_process, kill_process_by_pid, running_processes,
    ProcessInfo,
};
pub use scripts::{run_command_fast, run_script, run_script_con_limite, Shell, LIMITE_SCRIPT};
pub use teclado::{send_hotkey, send_media_key, type_text, MediaKey};
pub use ventanas::{
    active_app, close_window, cycle_window, focus_window, open_apps, force_foreground, maximize_window, minimize_window,
    restore_window, snap_window, ActiveAppInfo, SnapPosition,
};
pub use volumen::{is_muted, master_volume, set_master_volume, set_muted};

use crate::macros::MacroError;

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

    #[error("el script supero el limite de {0} s y se detuvo")]
    Timeout(u64),

    #[error("el script termino con codigo {0}")]
    ScriptFailed(i32),
}
