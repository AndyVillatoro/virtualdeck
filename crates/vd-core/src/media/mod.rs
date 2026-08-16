//! Reproduccion actual y control de medios via SMTC (System Media Transport
//! Controls), la API con la que Windows habla con Spotify, YouTube, VLC, etc.
//!
//! # Lo que desaparece al portarlo
//!
//! La version Electron tenia que llegar a esta misma API **desde PowerShell**, y
//! PowerShell 5.1 no sabe esperar operaciones asincronas de WinRT. La solucion
//! era un preambulo que buscaba por reflexion los metodos genericos
//! `WindowsRuntimeSystemExtensions.AsTask` y les pasaba el tipo de resultado a
//! mano — con un comentario en el codigo advirtiendo que el enfoque previo
//! (hacer polling de `$op.Status`) devolvia `null` siempre y dejaba el widget de
//! musica vacio.
//!
//! Aca eso es `.join()`. Toda esa clase de bug deja de existir.

mod window_titles;

pub use window_titles::{parse_window_title, ParsedTitle};

use windows::Media::Control::{
    GlobalSystemMediaTransportControlsSession as Session,
    GlobalSystemMediaTransportControlsSessionManager as SessionManager,
    GlobalSystemMediaTransportControlsSessionPlaybackStatus as PlaybackStatus,
};
use windows::Media::MediaPlaybackAutoRepeatMode;

/// Estado de reproduccion, normalizado.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PlayState {
    Playing,
    Paused,
    Stopped,
    Unknown,
}

impl From<PlaybackStatus> for PlayState {
    fn from(s: PlaybackStatus) -> Self {
        match s {
            PlaybackStatus::Playing => PlayState::Playing,
            PlaybackStatus::Paused => PlayState::Paused,
            PlaybackStatus::Stopped | PlaybackStatus::Closed => PlayState::Stopped,
            _ => PlayState::Unknown,
        }
    }
}

/// Caratula del tema actual.
///
/// Se devuelven los **bytes crudos**, no un data-URL en base64 como hacia la
/// version Electron: eso existia solo para poder meter la imagen en un `<img>`
/// del WebView. Una UI nativa consume bytes directamente, asi que nos ahorramos
/// codificar y decodificar en cada tick.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Thumbnail {
    pub mime: String,
    pub bytes: Vec<u8>,
}

/// Que se esta reproduciendo.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct NowPlaying {
    pub title: String,
    pub artist: String,
    pub status: PlayState,
    /// Origen: AppUserModelId de SMTC, o el nombre deducido del titulo de
    /// ventana cuando se uso el fallback.
    pub source: String,
    pub thumbnail: Option<Thumbnail>,
}

/// Comandos de control de reproduccion.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MediaCommand {
    PlayPause,
    Next,
    Prev,
    Stop,
}

/// Errores del modulo de medios.
#[derive(Debug, thiserror::Error)]
pub enum MediaError {
    #[error("error de WinRT: {0}")]
    WinRt(#[from] windows::core::Error),

    #[error("no hay ninguna sesion de medios activa")]
    NoSession,

    #[error("el comando fue rechazado por la aplicacion que reproduce")]
    Rejected,
}

/// Obtiene el gestor de sesiones SMTC.
fn manager() -> Result<SessionManager, MediaError> {
    Ok(SessionManager::RequestAsync()?.join()?)
}

/// Elige la sesion mas relevante.
///
/// Replica el ranking de la version Electron: se prefiere lo que esta sonando
/// con titulo, luego lo pausado con titulo, luego cualquier cosa con titulo, y
/// por ultimo lo que este sonando aunque no tenga metadatos.
fn best_session(mgr: &SessionManager) -> Option<Session> {
    let sessions = mgr.GetSessions().ok()?;

    let mut best: Option<(i32, Session)> = None;
    for session in &sessions {
        let has_title = session
            .TryGetMediaPropertiesAsync()
            .ok()
            .and_then(|op| op.join().ok())
            .and_then(|p| p.Title().ok())
            .map(|t| !t.is_empty())
            .unwrap_or(false);

        let status = session
            .GetPlaybackInfo()
            .ok()
            .and_then(|i| i.PlaybackStatus().ok())
            .map(PlayState::from)
            .unwrap_or(PlayState::Unknown);

        let rank = match (status, has_title) {
            (PlayState::Playing, true) => 3,
            (PlayState::Paused, true) => 2,
            (_, true) => 1,
            (PlayState::Playing | PlayState::Paused, false) => 0,
            _ => -1,
        };

        if rank >= 0 && best.as_ref().is_none_or(|(r, _)| rank > *r) {
            best = Some((rank, session));
        }
    }

    best.map(|(_, s)| s)
        .or_else(|| mgr.GetCurrentSession().ok())
}

/// Lee la caratula de la sesion.
///
/// Devuelve `None` si no hay, si es demasiado grande (>2 MB, igual que en la
/// version Electron) o si falla la lectura: una portada ausente no debe tumbar
/// la consulta entera.
fn read_thumbnail(session: &Session) -> Option<Thumbnail> {
    use windows::Storage::Streams::DataReader;

    const MAX_BYTES: u64 = 2 * 1024 * 1024;

    let props = session.TryGetMediaPropertiesAsync().ok()?.join().ok()?;
    let reference = props.Thumbnail().ok()?;
    let stream = reference.OpenReadAsync().ok()?.join().ok()?;

    let size = stream.Size().ok()?;
    if size == 0 || size > MAX_BYTES {
        return None;
    }

    let mime = stream
        .ContentType()
        .map(|s| s.to_string())
        .unwrap_or_else(|_| "image/jpeg".to_string());

    let reader = DataReader::CreateDataReader(&stream).ok()?;
    reader.LoadAsync(size as u32).ok()?.join().ok()?;

    let mut bytes = vec![0u8; size as usize];
    reader.ReadBytes(&mut bytes).ok()?;

    Some(Thumbnail {
        mime: if mime.is_empty() {
            "image/jpeg".into()
        } else {
            mime
        },
        bytes,
    })
}

/// Que se esta reproduciendo ahora.
///
/// Si SMTC no reporta nada util, cae al fallback por titulos de ventana. Ese
/// segundo camino es el que salva a los navegadores que no registran sesion.
pub fn now_playing() -> Option<NowPlaying> {
    if let Some(np) = now_playing_smtc() {
        return Some(np);
    }
    now_playing_from_windows()
}

/// Consulta solo SMTC, sin fallback.
pub fn now_playing_smtc() -> Option<NowPlaying> {
    let mgr = manager().ok()?;
    let session = best_session(&mgr)?;

    let props = session.TryGetMediaPropertiesAsync().ok()?.join().ok()?;
    let title = props.Title().map(|s| s.to_string()).unwrap_or_default();
    let artist = props.Artist().map(|s| s.to_string()).unwrap_or_default();

    // Sin titulo ni artista no hay nada que mostrar: que decida el fallback.
    if title.trim().is_empty() && artist.trim().is_empty() {
        return None;
    }

    let status = session
        .GetPlaybackInfo()
        .ok()
        .and_then(|i| i.PlaybackStatus().ok())
        .map(PlayState::from)
        .unwrap_or(PlayState::Unknown);

    let source = session
        .SourceAppUserModelId()
        .map(|s| s.to_string())
        .unwrap_or_default();

    Some(NowPlaying {
        title: title.trim().to_string(),
        artist: artist.trim().to_string(),
        status,
        source,
        thumbnail: read_thumbnail(&session),
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
    })
}

/// Envia un comando de control a la sesion activa.
pub fn control(cmd: MediaCommand) -> Result<(), MediaError> {
    let mgr = manager()?;
    let session = best_session(&mgr).ok_or(MediaError::NoSession)?;

    let ok = match cmd {
        MediaCommand::PlayPause => session.TryTogglePlayPauseAsync()?.join()?,
        MediaCommand::Next => session.TrySkipNextAsync()?.join()?,
        MediaCommand::Prev => session.TrySkipPreviousAsync()?.join()?,
        MediaCommand::Stop => session.TryStopAsync()?.join()?,
    };

    if ok {
        Ok(())
    } else {
        Err(MediaError::Rejected)
    }
}

/// Alterna el modo aleatorio.
pub fn toggle_shuffle() -> Result<bool, MediaError> {
    let mgr = manager()?;
    let session = best_session(&mgr).ok_or(MediaError::NoSession)?;

    let current = session
        .GetPlaybackInfo()
        .and_then(|i| i.IsShuffleActive())
        .and_then(|r| r.Value())
        .unwrap_or(false);

    let next = !current;
    if session.TryChangeShuffleActiveAsync(next)?.join()? {
        Ok(next)
    } else {
        Err(MediaError::Rejected)
    }
}

/// Cicla el modo de repeticion: ninguno -> pista -> lista -> ninguno.
pub fn cycle_repeat() -> Result<MediaPlaybackAutoRepeatMode, MediaError> {
    let mgr = manager()?;
    let session = best_session(&mgr).ok_or(MediaError::NoSession)?;

    let current = session
        .GetPlaybackInfo()
        .and_then(|i| i.AutoRepeatMode())
        .and_then(|r| r.Value())
        .unwrap_or(MediaPlaybackAutoRepeatMode::None);

    let next = match current {
        MediaPlaybackAutoRepeatMode::None => MediaPlaybackAutoRepeatMode::Track,
        MediaPlaybackAutoRepeatMode::Track => MediaPlaybackAutoRepeatMode::List,
        _ => MediaPlaybackAutoRepeatMode::None,
    };

    if session.TryChangeAutoRepeatModeAsync(next)?.join()? {
        Ok(next)
    } else {
        Err(MediaError::Rejected)
    }
}

/// Diagnostico: describe el estado de SMTC sesion por sesion.
///
/// Reemplaza al `media:diagnose` de Electron, que devolvia el stdout crudo de
/// un script de PowerShell.
pub fn diagnose() -> String {
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn el_estado_de_smtc_se_normaliza() {
        assert_eq!(PlayState::from(PlaybackStatus::Playing), PlayState::Playing);
        assert_eq!(PlayState::from(PlaybackStatus::Paused), PlayState::Paused);
        assert_eq!(PlayState::from(PlaybackStatus::Stopped), PlayState::Stopped);
        // 'Closed' cuenta como detenido: para el usuario es lo mismo.
        assert_eq!(PlayState::from(PlaybackStatus::Closed), PlayState::Stopped);
    }

    #[test]
    fn consultar_smtc_no_entra_en_panico() {
        // Test de humo: puede no haber nada sonando (devuelve None), pero la
        // cadena WinRT completa no debe romperse.
        let _ = now_playing();
    }
}
