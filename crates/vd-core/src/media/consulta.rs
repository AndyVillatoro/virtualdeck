//! Consultas de reproduccion: SMTC, fallback por titulos y diagnostico.

use std::time::Duration;

use super::hilos::en_hilo_mta_con_limite;
use super::sesion::{
    best_session, caratula_cache, clave_pista, leer_estado_sesion, manager, read_thumbnail,
};
use super::tipos::{NowPlaying, PlayState};
use super::{timeline, window_titles};

pub fn now_playing_smtc() -> Option<NowPlaying> {
    en_hilo_mta_con_limite(now_playing_smtc_aqui, LIMITE_NOW_PLAYING).flatten()
}

/// Cuanto se espera a una consulta de `now_playing` antes de darla por colgada.
///
/// Un segundo y medio: lo normal son milisegundos, y el sondeo del widget
/// pregunta cada segundo. Sin limite, una sesion zombi (una app que dejo su
/// sesion a medio cerrar y ya no contesta) cuelga el hilo que llama — y del
/// otro lado esta el proceso principal de Electron.
const LIMITE_NOW_PLAYING: Duration = Duration::from_millis(1500);

/// Cuanto se espera al diagnostico antes de darlo por colgado.
///
/// Cinco segundos: lo normal son milisegundos, y quien pulsa "?" esta mirando
/// la pantalla. Mas que esto y parece que la aplicacion se ha roto.
const LIMITE_DIAGNOSTICO: std::time::Duration = std::time::Duration::from_secs(5);

pub fn diagnose() -> String {
    en_hilo_mta_con_limite(diagnose_aqui, LIMITE_DIAGNOSTICO).unwrap_or_else(|| {
        "El diagnostico de SMTC no respondio en 5 segundos.

         Suele significar que alguna aplicacion dejo una sesion de medios a medio          cerrar: Windows la sigue listando pero ya no contesta. Cerrar y volver a          abrir el reproductor normalmente la limpia."
            .to_string()
    })
}

pub fn now_playing() -> Option<NowPlaying> {
    if let Some(np) = now_playing_smtc() {
        return Some(np);
    }
    now_playing_from_windows()
}

/// Consulta solo SMTC, sin fallback.
fn now_playing_smtc_aqui() -> Option<NowPlaying> {
    let mgr = manager().ok()?;
    let session = best_session(&mgr)?;

    let props = session.TryGetMediaPropertiesAsync().ok()?.join().ok()?;
    let title = props.Title().map(|s| s.to_string()).unwrap_or_default();
    let artist = props.Artist().map(|s| s.to_string()).unwrap_or_default();

    // Sin titulo ni artista no hay nada que mostrar: que decida el fallback.
    if title.trim().is_empty() && artist.trim().is_empty() {
        return None;
    }

    let source = session
        .SourceAppUserModelId()
        .map(|s| s.to_string())
        .unwrap_or_default();

    let (status, controls, is_shuffle_active, auto_repeat_mode) = leer_estado_sesion(&session);

    // La caratula se relee solo si cambio de pista: pesa decenas de KB y el
    // sondeo pregunta cada segundo.
    let clave = clave_pista(&source, &title, &artist);
    let thumbnail = {
        let mut cache = caratula_cache()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        // Solo se reutiliza una carátula **leída**: muchas apps publican el
        // título antes que la imagen, y guardar el `None` de ese primer
        // instante dejaba la canción entera sin carátula.
        if cache.0 == clave && cache.1.is_some() {
            cache.1.clone()
        } else {
            let t = read_thumbnail(&session);
            cache.0 = clave;
            cache.1 = t.clone();
            t
        }
    };

    let timeline = timeline::leer_timeline(&session);

    Some(NowPlaying {
        title: title.trim().to_string(),
        artist: artist.trim().to_string(),
        status,
        source,
        thumbnail,
        controls,
        is_shuffle_active,
        auto_repeat_mode,
        position_ms: timeline.map(|t| t.position_ms),
        duration_ms: timeline.map(|t| t.duration_ms),
        timeline_updated_at: timeline.map(|t| t.updated_at_epoch_ms),
    })
}

/// Fallback: deduce lo que suena leyendo titulos de ventanas.
pub fn now_playing_from_windows() -> Option<NowPlaying> {
    let parsed = window_titles::pick_best(window_titles::scan_windows())?;
    Some(NowPlaying {
        title: parsed.title,
        artist: parsed.artist,
        // Sin SMTC no hay estado real; si hay una ventana con titulo de
        // reproduccion, asumimos que esta sonando (igual que la version Electron).
        status: PlayState::Playing,
        source: parsed.source,
        thumbnail: None,
        // Sin sesion no hay capacidades ni modos que leer.
        controls: None,
        is_shuffle_active: None,
        auto_repeat_mode: None,
        // Sin sesion tampoco hay linea de tiempo.
        position_ms: None,
        duration_ms: None,
        timeline_updated_at: None,
    })
}

/// Diagnostico: describe el estado de SMTC sesion por sesion.
///
/// Reemplaza al `media:diagnose` de Electron, que devolvia el stdout crudo de
/// un script de PowerShell.
fn diagnose_aqui() -> String {
    let mut out = String::new();

    let mgr = match manager() {
        Ok(m) => m,
        Err(e) => return format!("No se pudo obtener el gestor SMTC: {e}\n"),
    };
    out.push_str("Gestor SMTC: OK\n");

    let Ok(sessions) = mgr.GetSessions() else {
        out.push_str("No se pudieron listar las sesiones.\n");
        return out;
    };

    let total = sessions.Size().unwrap_or(0);
    out.push_str(&format!("Sesiones: {total}\n"));

    for (i, session) in sessions.into_iter().enumerate() {
        let src = session
            .SourceAppUserModelId()
            .map(|s| s.to_string())
            .unwrap_or_else(|_| "(sin origen)".into());
        let status = session
            .GetPlaybackInfo()
            .ok()
            .and_then(|i| i.PlaybackStatus().ok())
            .map(PlayState::from);

        out.push_str(&format!("\n  [{i}] {src}\n"));
        out.push_str(&format!("      estado: {status:?}\n"));

        match session
            .TryGetMediaPropertiesAsync()
            .and_then(|op| op.join())
        {
            Ok(p) => {
                let t = p.Title().map(|s| s.to_string()).unwrap_or_default();
                let a = p.Artist().map(|s| s.to_string()).unwrap_or_default();
                out.push_str(&format!(
                    "      titulo: {}\n",
                    if t.is_empty() { "(vacio)" } else { &t }
                ));
                out.push_str(&format!(
                    "      artista: {}\n",
                    if a.is_empty() { "(vacio)" } else { &a }
                ));
            }
            Err(e) => out.push_str(&format!("      sin metadatos: {e}\n")),
        }
    }

    let ventanas = window_titles::scan_windows();
    out.push_str(&format!(
        "\nFallback por titulos de ventana: {} candidato(s)\n",
        ventanas.len()
    ));
    for v in &ventanas {
        out.push_str(&format!("  {} — {} / {}\n", v.source, v.title, v.artist));
    }

    out
}
