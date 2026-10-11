//! Colocar ventanas en cuadrantes de la pantalla (window snapping).
//!
//! Reemplaza el bloque de C# con P/Invoke a `user32.dll` que la version Electron
//! compilaba dentro de un script de PowerShell.

mod ciclo;
mod control;
mod snap;

#[cfg(test)]
mod pruebas;

pub use ciclo::{cycle_window, open_apps};
pub use control::{
    active_app, close_window, focus_window, force_foreground, maximize_window, minimize_window,
    restore_window, ActiveAppInfo,
};
pub use snap::{snap_window, SnapPosition};
