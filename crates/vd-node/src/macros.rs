//! Reproducción de macros grabadas.

use napi::bindgen_prelude::AsyncTask;
use napi::{Env, Task};
use napi_derive::napi;

/// Reproduce una macro grabada, sin bloquear el proceso principal.
///
/// Los pasos llegan como **JSON**, no como un objeto declarado aquí, y se leen
/// con el mismo modelo (`vd_core::config::model::MacroStep`) que ya lee la
/// configuración del disco. Un espejo del tipo escrito a mano en este archivo
/// podría desviarse del modelo sin que nada fallara al compilar; así es
/// imposible.
///
/// Va como [`AsyncTask`] porque una macro con pausas duerme entre pasos: en
/// síncrono, esos segundos congelaban IPC, bandeja e HID del dock.
///
/// La **grabación** no pasa por aquí: ya era nativa con `uiohook-napi`. Lo único
/// que usaba PowerShell era la reproducción, con un script generado al vuelo que
/// mezclaba `SendKeys` y `mouse_event` de `user32.dll`.
#[napi]
pub fn play_macro(steps_json: String, repeat: Option<i64>) -> AsyncTask<TareaMacro> {
    AsyncTask::new(TareaMacro {
        steps_json,
        repeat: repeat.unwrap_or(1),
    })
}

pub struct TareaMacro {
    steps_json: String,
    repeat: i64,
}

impl Task for TareaMacro {
    type Output = bool;
    type JsValue = bool;

    fn compute(&mut self) -> napi::Result<Self::Output> {
        let pasos: Vec<vd_core::config::model::MacroStep> =
            match serde_json::from_str(&self.steps_json) {
                Ok(p) => p,
                Err(e) => {
                    eprintln!("[macro] no se entienden los pasos: {e}");
                    return Ok(false);
                }
            };
        if pasos.is_empty() {
            eprintln!("[macro] la macro no tiene ningun paso");
            return Ok(false);
        }

        match vd_core::macros::play(&pasos, self.repeat) {
            Ok(()) => Ok(true),
            Err(e) => {
                eprintln!("[macro] reproduccion: {e}");
                Ok(false)
            }
        }
    }

    fn resolve(&mut self, _env: Env, ok: Self::Output) -> napi::Result<Self::JsValue> {
        Ok(ok)
    }
}
