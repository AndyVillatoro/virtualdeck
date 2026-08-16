//! Texto a voz, con la síntesis que ya trae Windows (SAPI).
//!
//! No hace falta instalar nada ni bajar modelos: `ISpVoice` está en cualquier
//! Windows desde XP y usa las voces que el usuario tenga configuradas en el
//! sistema, incluidas las que haya añadido para su idioma.
//!
//! # Por qué habla en otro hilo
//!
//! `Speak` puede bloquear hasta que termina de leer, y una frase larga son
//! varios segundos. En la aplicación eso congelaría la interfaz, así que la
//! llamada se hace con la marca de asíncrono y se devuelve el control enseguida.

use windows::core::HSTRING;
use windows::Win32::Media::Speech::{ISpVoice, SpVoice, SPF_ASYNC, SPF_PURGEBEFORESPEAK};
use windows::Win32::System::Com::{CoCreateInstance, CLSCTX_ALL};

#[derive(Debug, thiserror::Error)]
pub enum VozError {
    #[error("no se pudo usar la sintesis de voz de Windows: {0}")]
    Com(#[from] windows::core::Error),

    #[error("no hay nada que leer")]
    Vacio,
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

    // SAFETY: cadena COM estandar. La voz se crea, se le pasa el texto y se
    // suelta; SAPI mantiene viva su propia sesion hasta terminar de leer.
    unsafe {
        crate::audio::ensure_com();
        let voz: ISpVoice = CoCreateInstance(&SpVoice, None, CLSCTX_ALL)?;
        voz.Speak(
            &HSTRING::from(texto),
            (SPF_ASYNC.0 | SPF_PURGEBEFORESPEAK.0) as u32,
            None,
        )?;
    }
    Ok(())
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
