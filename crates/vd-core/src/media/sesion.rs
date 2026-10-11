//! Sesion SMTC elegida, lectura de estado y cache de caratulas.

use std::sync::{Mutex, OnceLock};

use windows::Media::Control::{
    GlobalSystemMediaTransportControlsSession as Session,
    GlobalSystemMediaTransportControlsSessionManager as SessionManager,
};

use super::tipos::{Controles, MediaError, PlayState, RepeatMode, Thumbnail};

/// Obtiene el gestor de sesiones SMTC.
pub(super) fn manager() -> Result<SessionManager, MediaError> {
    Ok(SessionManager::RequestAsync()?.join()?)
}

/// Elige la sesion mas relevante.
///
/// Replica el ranking de la version Electron: se prefiere lo que esta sonando
/// con titulo, luego lo pausado con titulo, luego cualquier cosa con titulo, y
/// por ultimo lo que este sonando aunque no tenga metadatos.
pub(super) fn best_session(mgr: &SessionManager) -> Option<Session> {
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
pub(super) fn read_thumbnail(session: &Session) -> Option<Thumbnail> {
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

/// Estado, capacidades y modos de la sesion, en una sola lectura.
///
/// `GetPlaybackInfo()` es sincrona: no es la llamada que se cuelga con una
/// sesion zombi (esa es `TryGetMediaPropertiesAsync`, que ya se hizo arriba).
/// Cada capacidad que falle se cuenta como `false`, no como error: una
/// capacidad ausente no debe tumbar la consulta entera.
pub(super) fn leer_estado_sesion(
    session: &Session,
) -> (
    PlayState,
    Option<Controles>,
    Option<bool>,
    Option<RepeatMode>,
) {
    let info = match session.GetPlaybackInfo() {
        Ok(i) => i,
        Err(_) => return (PlayState::Unknown, None, None, None),
    };
    let status = info
        .PlaybackStatus()
        .map(PlayState::from)
        .unwrap_or(PlayState::Unknown);
    let controls = info.Controls().ok().map(|c| Controles {
        play: c.IsPlayEnabled().unwrap_or(false),
        pause: c.IsPauseEnabled().unwrap_or(false),
        next: c.IsNextEnabled().unwrap_or(false),
        prev: c.IsPreviousEnabled().unwrap_or(false),
        shuffle: c.IsShuffleEnabled().unwrap_or(false),
        repeat: c.IsRepeatEnabled().unwrap_or(false),
    });
    let shuffle = info
        .IsShuffleActive()
        .ok()
        .and_then(|r| r.Value().ok());
    let repeat = info
        .AutoRepeatMode()
        .ok()
        .and_then(|r| r.Value().ok())
        .map(RepeatMode::from);
    (status, controls, shuffle, repeat)
}

/// Clave de la pista para la cache de caratulas: app + titulo + artista.
pub(super) fn clave_pista(source: &str, title: &str, artist: &str) -> String {
    format!("{source}\x1f{title}\x1f{artist}")
}

/// Caratula de la ultima pista consultada, con su clave.
///
/// Vive en un estatico porque `now_playing` se llama sin estado (via napi) una
/// vez por segundo: recrearlo en cada llamada perderia la cache.
pub(super) fn caratula_cache() -> &'static Mutex<(String, Option<Thumbnail>)> {
    static CACHE: OnceLock<Mutex<(String, Option<Thumbnail>)>> = OnceLock::new();
    CACHE.get_or_init(|| Mutex::new((String::new(), None)))
}
