//! Voz: lectura de texto en voz alta (SAPI).

use napi::bindgen_prelude::AsyncTask;
use napi::{Env, Task};
use napi_derive::napi;

/// Lee un texto en voz alta (SAPI), sin bloquear el proceso principal.
///
/// `hablar` ya vuelve enseguida por su cuenta (SAPI asíncrono), pero crearlo y
/// llamarlo en el hilo principal seguía atando ese hilo a COM en plena frase.
/// Como [`AsyncTask`], JavaScript recibe una Promise y el principal sigue
/// atendiendo IPC, bandeja e HID. `false` si no hay nada que leer o SAPI falla.
#[napi]
pub fn speak_text(texto: String) -> AsyncTask<TareaVoz> {
    AsyncTask::new(TareaVoz { texto })
}

pub struct TareaVoz {
    texto: String,
}

impl Task for TareaVoz {
    type Output = bool;
    type JsValue = bool;

    fn compute(&mut self) -> napi::Result<Self::Output> {
        if self.texto.trim().is_empty() {
            return Ok(false);
        }
        match vd_core::voz::hablar(&self.texto) {
            Ok(()) => Ok(true),
            Err(e) => {
                eprintln!("[voz] no se pudo hablar: {e}");
                Ok(false)
            }
        }
    }

    fn resolve(&mut self, _env: Env, ok: Self::Output) -> napi::Result<Self::JsValue> {
        Ok(ok)
    }
}
