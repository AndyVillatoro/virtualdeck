//! Motor de ejecucion: convierte un `ButtonAction` en efectos reales.
//!
//! Es el modulo que orquesta a todos los demas, y por eso va el ultimo: audio,
//! media, launcher, macros, rgb y net ya estan verificados de forma
//! independiente. Aca solo se decide **que** llamar y **en que orden**.
//!
//! # Que queda fuera a proposito
//!
//! Una accion no es ejecutable desde el nucleo cuando su efecto *es* la interfaz:
//! hoy, abrir una carpeta de botones. El motor la reconoce y devuelve
//! [`Outcome::ForUi`] en vez de fingir que la ejecuto o de tratarla como error;
//! `vd-app` es quien la atiende.
//!
//! Notificar y capturar una region estuvieron aqui y ya no: las dos las hace
//! Windows, no la interfaz, asi que el nucleo puede con ellas.
//!
//! Esa distincion importa: una accion "para la UI" **no interrumpe** una
//! secuencia, mientras que un fallo real si puede hacerlo.

mod despacho;
mod expr;
mod motor;
mod rgb;
mod utilidades;

#[cfg(test)]
mod pruebas;

pub use expr::{eval_branch, interpolate, State};
pub use motor::{Outcome, SequenceResult, run_one, run_sequence};
pub use rgb::presets_rgb;
