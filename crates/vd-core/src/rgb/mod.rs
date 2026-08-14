//! Control RGB.
//!
//! # Estrategia de dos niveles
//!
//! Ver la investigación en `docs/MIGRACION-RUST.md`. Resumen:
//!
//! - **Nivel 1 — nativo**: dispositivos que hablan **USB HID** se manejan
//!   directamente, sin instalar nada y sin permisos de administrador.
//! - **Nivel 2 — opcional**: OpenRGB externo, para el hardware que solo se
//!   alcanza por SMBus (que exige un driver de kernel).
//!
//! Este modulo arranca por el reconocimiento: antes de escribir drivers hay que
//! saber que hay conectado y por que via se llega a cada cosa.

mod scan;

pub use scan::{scan, DeviceKind, HidDeviceInfo, RgbVendor};

/// Errores del modulo RGB.
#[derive(Debug, thiserror::Error)]
pub enum RgbError {
    #[error("no se pudo acceder a los dispositivos HID: {0}")]
    Hid(#[from] hidapi::HidError),
}
