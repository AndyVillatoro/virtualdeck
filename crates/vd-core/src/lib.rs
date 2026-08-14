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
pub mod audio;
pub mod config;

/// Error comun del nucleo. Cada modulo define su propio error especifico y aqui
/// se agregan como variantes, para que `vd-cli` y la UI manejen un solo tipo.
#[derive(Debug, thiserror::Error)]
pub enum CoreError {
    #[error("error de configuracion: {0}")]
    Config(#[from] config::ConfigError),

    #[cfg(windows)]
    #[error("error de audio: {0}")]
    Audio(#[from] audio::AudioError),
}

/// Resultado estandar del nucleo.
pub type Result<T> = std::result::Result<T, CoreError>;
