//! Texto a voz, con la síntesis que ya trae Windows (SAPI).
//!
//! No hace falta instalar nada ni bajar modelos: `ISpVoice` está en cualquier
//! Windows desde XP y usa las voces que el usuario tenga configuradas en el
//! sistema, incluidas las que haya añadido para su idioma.
//!
//! # Por qué habla en un hilo propio, con una sola voz
//!
//! `Speak` puede bloquear hasta que termina de leer, y una frase larga son
//! varios segundos: se llama con la marca de asíncrono. Pero la lectura
//! asíncrona **vive en el objeto voz**: si el `ISpVoice` se suelta al volver,
//! la frase se corta. Y `SPF_PURGEBEFORESPEAK` solo purga la cola de **esa**
//! voz: con una voz nueva por llamada, pulsar dos botones encadenaba frases.
//! Así que hay un hilo `vd-voz` (MTA, sin bombeo de mensajes que atender) que
//! crea una voz al empezar, la conserva y recibe los textos por un canal.

use std::sync::mpsc::{channel, Sender};
use std::sync::{Mutex, OnceLock};

use windows::core::HSTRING;
use windows::Win32::Media::Speech::{ISpVoice, SpVoice, SPF_ASYNC, SPF_PURGEBEFORESPEAK};
use windows::Win32::System::Com::{CoCreateInstance, CoInitializeEx, CLSCTX_ALL, COINIT_MULTITHREADED};

#[derive(Debug, thiserror::Error)]
pub enum VozError {
    #[error("no se pudo usar la sintesis de voz de Windows: {0}")]
    Com(#[from] windows::core::Error),

    #[error("no se pudo usar la sintesis de voz de Windows: {0}")]
    Hilo(String),

    #[error("no hay nada que leer")]
    Vacio,
}

/// Un encargo al hilo de voz: el texto y por dónde contestar.
type Encargo = (String, Sender<Result<(), String>>);

static HILO_VOZ: OnceLock<Mutex<Sender<Encargo>>> = OnceLock::new();

fn hilo_voz() -> &'static Mutex<Sender<Encargo>> {
    HILO_VOZ.get_or_init(|| {
        let (tx, rx) = channel::<Encargo>();
        let _ = std::thread::Builder::new().name("vd-voz".into()).spawn(move || {
            // SAFETY: inicialización COM de este hilo; la voz se crea y se usa
            // solo aquí y vive lo que vive el hilo (el proceso).
            let voz: Result<ISpVoice, String> = unsafe {
                let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
                CoCreateInstance(&SpVoice, None, CLSCTX_ALL).map_err(|e| e.to_string())
            };
            for (texto, responder) in rx {
                let r = match &voz {
                    Ok(v) => unsafe {
                        v.Speak(&HSTRING::from(texto.as_str()), (SPF_ASYNC.0 | SPF_PURGEBEFORESPEAK.0) as u32, None)
                            .map(|_| ())
                            .map_err(|e| e.to_string())
                    },
                    Err(e) => Err(e.clone()),
                };
                let _ = responder.send(r);
            }
        });
        Mutex::new(tx)
    })
}

/// Lee un texto en voz alta.
///
/// Vuelve enseguida: la lectura sigue en segundo plano. Una segunda llamada
/// **corta la anterior**, que es lo que espera quien pulsa dos botones seguidos:
/// oír lo último, no una cola de frases encadenadas.
pub fn hablar(texto: &str) -> Result<(), VozError> {
    let texto = texto.trim();
    if texto.is_empty() {
        return Err(VozError::Vacio);
    }
    let (tx, rx) = channel();
    hilo_voz()
        .lock()
        .map_err(|e| VozError::Hilo(e.to_string()))?
        .send((texto.to_string(), tx))
        .map_err(|e| VozError::Hilo(e.to_string()))?;
    // `Speak` asíncrono contesta en milisegundos; el plazo es solo la red por
    // si el hilo de voz se hubiera caído.
    rx.recv_timeout(std::time::Duration::from_secs(5))
        .map_err(|e| VozError::Hilo(e.to_string()))?
        .map_err(VozError::Hilo)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn un_texto_vacio_se_rechaza() {
        assert!(matches!(hablar(""), Err(VozError::Vacio)));
        assert!(matches!(hablar("   "), Err(VozError::Vacio)));
    }

    /// Habla de verdad, asi que suena por los altavoces.
    ///
    /// Marcado `ignore` por eso: un `cargo test` no puede ponerse a hablar en el
    /// equipo de quien compila. Ver la regla en `docs/MIGRACION-RUST.md`.
    ///
    /// ```text
    /// cargo test -p vd-core habla_de_verdad -- --ignored --nocapture
    /// ```
    #[test]
    #[ignore = "reproduce audio en el equipo"]
    fn habla_de_verdad() {
        hablar("Prueba de voz de VirtualDeck").expect("SAPI deberia funcionar");
        // Se le da tiempo a empezar antes de que el proceso termine.
        std::thread::sleep(std::time::Duration::from_secs(2));
    }
}
