//! Modelo de datos de la configuracion, portado desde `src/types.ts`.
//!
//! # Fidelidad
//!
//! Este modelo es un **contrato con los usuarios existentes**: un
//! `deck-config.json` escrito por VirtualDeck 0.5.x tiene que poder cargarse y
//! volver a guardarse sin perder un solo campo. Dos mecanismos lo garantizan:
//!
//! 1. Cada campo opcional usa `skip_serializing_if` para no ensuciar el JSON
//!    con `null`s que Electron nunca escribio.
//! 2. Las structs que contienen datos del usuario llevan un `extra` con
//!    `#[serde(flatten)]`, que captura cualquier campo desconocido y lo vuelve a
//!    emitir al guardar. Asi, aunque este modelo se quede corto frente a una
//!    version futura, **nada se pierde en silencio**.
//!
//! El test `round_trip_conserva_la_config_real` en `store.rs` verifica esto
//! contra el archivo real de la maquina.

mod acciones;
mod ajustes;
mod botones;
mod macros;
mod paginas;
mod raiz;
mod sensores;

pub use acciones::*;
pub use ajustes::*;
pub use botones::*;
pub use macros::*;
pub use paginas::*;
pub use raiz::*;
pub use sensores::*;

use serde_json::{Map, Value};

/// Mapa de campos desconocidos capturados por `#[serde(flatten)]`.
pub type Extra = Map<String, Value>;
