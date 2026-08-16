//! # vd-core
//!
//! Nucleo de VirtualDeck. Contiene **toda** la logica de la aplicacion y no
//! depende de ninguna libreria de UI: se compila, se testea y se ejerce desde
//! `vd-cli` sin abrir una sola ventana.
//!
//! Esa separacion es deliberada (ver `docs/MIGRACION-RUST.md`): permite validar
//! la parte riesgosa de la migracion —COM, WinRT, hooks globales— antes de
//! escribir la interfaz, y deja la UI como una pieza reemplazable.
//!
//! ## Modulos
//!
//! Se van habilitando por fase. Ver el estado en `docs/MIGRACION-RUST.md`.

#[cfg(windows)]
pub mod actions;
#[cfg(windows)]
pub mod arranque;
#[cfg(windows)]
pub mod audio;
pub mod config;
#[cfg(windows)]
pub mod launcher;
pub mod log;
#[cfg(windows)]
pub mod macros;
#[cfg(windows)]
pub mod media;
#[cfg(windows)]
pub mod net;
pub mod rgb;
pub mod sensors;
#[cfg(windows)]
pub mod voz;
#[cfg(windows)]
pub mod weather;

/// Error comun del nucleo. Cada modulo define su propio error especifico y aqui
/// se agregan como variantes, para que `vd-cli` y la UI manejen un solo tipo.
#[derive(Debug, thiserror::Error)]
pub enum CoreError {
    #[error("error de configuracion: {0}")]
    Config(#[from] config::ConfigError),

    #[cfg(windows)]
    #[error("error de audio: {0}")]
    Audio(#[from] audio::AudioError),

    #[cfg(windows)]
    #[error("error de medios: {0}")]
    Media(#[from] media::MediaError),

    #[cfg(windows)]
    #[error("error de macro: {0}")]
    Macro(#[from] macros::MacroError),

    #[cfg(windows)]
    #[error("error de lanzamiento: {0}")]
    Launcher(#[from] launcher::LauncherError),
}

/// Resultado estandar del nucleo.
pub type Result<T> = std::result::Result<T, CoreError>;
