//! Medios: estado SMTC, control de reproducción y teclas de medios.

use napi_derive::napi;

/// Qué se está reproduciendo. Mismos campos que `NowPlaying` de `src/types.ts`,
/// más lo que la sesión dice de sí misma (opcionales: ausentes sin SMTC).
#[napi(object)]
pub struct NowPlaying {
    pub title: String,
    pub artist: String,
    /// `"Playing"`, `"Paused"`, `"Stopped"` o `"Unknown"`.
    pub status: String,
    pub source: String,
    /// Carátula como data-URL, o `null`.
    pub thumbnail: Option<String>,
    /// Lo que la sesión admite. Ausente = no se sabe (sin SMTC).
    pub controls: Option<ControlesSesion>,
    /// Si el aleatorio está activo. Ausente = no se sabe.
    pub is_shuffle_active: Option<bool>,
    /// `"none"`, `"track"` o `"list"`. Ausente = no se sabe.
    pub auto_repeat_mode: Option<String>,
    /// Posición de la pista en ms. Ausente = sin barra (sin timeline o sin SMTC).
    pub position_ms: Option<i64>,
    /// Duración de la pista en ms. Ausente = sin barra.
    pub duration_ms: Option<i64>,
    /// Cuándo SMTC midió la posición, en epoch ms Unix.
    pub timeline_updated_at: Option<i64>,
}

/// Capacidades de una sesión SMTC, de `GetPlaybackInfo().Controls`.
#[napi(object)]
pub struct ControlesSesion {
    pub play: bool,
    pub pause: bool,
    pub next: bool,
    pub prev: bool,
    pub shuffle: bool,
    pub repeat: bool,
}

/// Lo que se está reproduciendo ahora mismo.
///
/// # Lo que desaparece aquí
///
/// La versión de PowerShell necesitaba convertir el `IAsyncOperation` de WinRT
/// en un `Task` de .NET por reflexión —el bloque marcado «NO tocar» en
/// `media.ts`— porque en PowerShell 5.1 la propiedad `Status` no se proyecta y
/// el await devolvía siempre `null`, dejando el widget de música en blanco.
///
/// En Rust las llamadas a WinRT son normales y con tipos verificados al
/// compilar. El problema no se arregla: deja de existir.
#[napi]
pub fn get_now_playing() -> Option<NowPlaying> {
    let n = vd_core::media::now_playing()?;
    Some(NowPlaying {
        title: n.title,
        artist: n.artist,
        status: match n.status {
            vd_core::media::PlayState::Playing => "Playing",
            vd_core::media::PlayState::Paused => "Paused",
            vd_core::media::PlayState::Stopped => "Stopped",
            vd_core::media::PlayState::Unknown => "Unknown",
        }
        .to_string(),
        source: n.source,
        // El núcleo devuelve bytes crudos porque una interfaz nativa los
        // consume tal cual. Aquí manda un WebView, que necesita un data-URL.
        thumbnail: n.thumbnail.map(|t| a_data_url(&t.mime, &t.bytes)),
        controls: n.controls.map(|c| ControlesSesion {
            play: c.play,
            pause: c.pause,
            next: c.next,
            prev: c.prev,
            shuffle: c.shuffle,
            repeat: c.repeat,
        }),
        is_shuffle_active: n.is_shuffle_active,
        auto_repeat_mode: n.auto_repeat_mode.map(|m| m.as_str().to_string()),
        position_ms: n.position_ms,
        duration_ms: n.duration_ms,
        timeline_updated_at: n.timeline_updated_at,
    })
}

/// Controla la reproducción: `"play-pause"`, `"next"`, `"prev"` o `"stop"`.
#[napi]
pub fn control_media(cmd: String) -> bool {
    use vd_core::media::MediaCommand as C;
    let comando = match cmd.as_str() {
        "play-pause" => C::PlayPause,
        "next" => C::Next,
        "prev" => C::Prev,
        "stop" => C::Stop,
        otro => {
            eprintln!("[media] comando desconocido: \"{otro}\"");
            return false;
        }
    };
    match vd_core::media::control(comando) {
        Ok(()) => true,
        Err(e) => {
            eprintln!("[media] control {cmd}: {e}");
            false
        }
    }
}

/// Alterna el modo aleatorio. Necesita una sesión SMTC activa.
#[napi]
pub fn shuffle_media() -> bool {
    match vd_core::media::toggle_shuffle() {
        Ok(_) => true,
        Err(e) => {
            eprintln!("[media] shuffle: {e}");
            false
        }
    }
}

/// Rota el modo de repetición. Necesita una sesión SMTC activa.
#[napi]
pub fn repeat_media() -> bool {
    match vd_core::media::cycle_repeat() {
        Ok(_) => true,
        Err(e) => {
            eprintln!("[media] repeat: {e}");
            false
        }
    }
}

/// Diagnóstico de SMTC, sesión por sesión.
#[napi]
pub fn diagnose_media() -> String {
    vd_core::media::diagnose()
}

/// Envía una tecla de medios del teclado.
///
/// Es el respaldo de cuando no hay sesión SMTC. La versión anterior lo hacía
/// lanzando PowerShell para un `SendKeys` de un solo carácter — unos 150 ms para
/// pulsar una tecla.
///
/// Acepta `"play-pause"`, `"next"`, `"prev"`, `"stop"`, `"volume-up"`,
/// `"volume-down"` y `"mute"`.
#[napi]
pub fn send_media_key(key: String) -> bool {
    use vd_core::launcher::MediaKey as K;
    let tecla = match key.as_str() {
        "play-pause" => K::PlayPause,
        "next" => K::Next,
        "prev" => K::Prev,
        "stop" => K::Stop,
        "volume-up" => K::VolumeUp,
        "volume-down" => K::VolumeDown,
        "mute" => K::Mute,
        otro => {
            eprintln!("[media] tecla desconocida: \"{otro}\"");
            return false;
        }
    };
    crate::informar("sendMediaKey", vd_core::launcher::send_media_key(tecla))
}

/// Convierte unos bytes de imagen en un data-URL.
///
/// Se codifica a mano en vez de traer una dependencia: son veinte líneas y la
/// alternativa es arrastrar un crate entero al binario por esto.
fn a_data_url(mime: &str, bytes: &[u8]) -> String {
    const ALFABETO: &[u8; 64] =
        b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    let mut salida = String::with_capacity(bytes.len().div_ceil(3) * 4 + mime.len() + 20);
    salida.push_str("data:");
    salida.push_str(mime);
    salida.push_str(";base64,");

    for trozo in bytes.chunks(3) {
        // Los tres bytes se juntan en un entero y se parten en cuatro grupos de
        // seis bits. El relleno con `=` marca cuántos bytes faltaban.
        let b0 = trozo[0] as u32;
        let b1 = *trozo.get(1).unwrap_or(&0) as u32;
        let b2 = *trozo.get(2).unwrap_or(&0) as u32;
        let n = (b0 << 16) | (b1 << 8) | b2;

        salida.push(ALFABETO[(n >> 18) as usize & 63] as char);
        salida.push(ALFABETO[(n >> 12) as usize & 63] as char);
        salida.push(if trozo.len() > 1 {
            ALFABETO[(n >> 6) as usize & 63] as char
        } else {
            '='
        });
        salida.push(if trozo.len() > 2 {
            ALFABETO[n as usize & 63] as char
        } else {
            '='
        });
    }
    salida
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Los vectores del RFC 4648.
    ///
    /// El codificador está escrito a mano para no arrastrar un crate entero, y
    /// eso obliga a comprobarlo contra una referencia externa. Si estuviera mal,
    /// el fallo seria una carátula que no se ve — sin ningún error.
    #[test]
    fn base64_coincide_con_el_estandar() {
        let casos = [
            ("", ""),
            ("f", "Zg=="),
            ("fo", "Zm8="),
            ("foo", "Zm9v"),
            ("foob", "Zm9vYg=="),
            ("fooba", "Zm9vYmE="),
            ("foobar", "Zm9vYmFy"),
        ];
        for (entrada, esperado) in casos {
            let url = a_data_url("image/png", entrada.as_bytes());
            let codificado = url.strip_prefix("data:image/png;base64,").expect("prefijo");
            assert_eq!(codificado, esperado, "entrada {entrada:?}");
        }
    }

    /// Los bytes altos son justo donde falla un codificador mal escrito: si
    /// algún desplazamiento usa `i8` en vez de `u8`, aquí se ve.
    #[test]
    fn base64_aguanta_bytes_altos() {
        assert_eq!(
            a_data_url("image/jpeg", &[0xFF, 0xFE, 0xFD]),
            "data:image/jpeg;base64,//79"
        );
        assert_eq!(
            a_data_url("image/jpeg", &[0x00, 0x00, 0x00]),
            "data:image/jpeg;base64,AAAA"
        );
    }

    #[test]
    fn el_data_url_lleva_su_tipo() {
        let url = a_data_url("image/png", b"x");
        assert!(url.starts_with("data:image/png;base64,"), "{url}");
    }
}
