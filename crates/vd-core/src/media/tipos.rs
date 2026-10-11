//! Tipos del modulo de medios: estado, pista, capacidades y errores.

use windows::Media::Control::GlobalSystemMediaTransportControlsSessionPlaybackStatus as PlaybackStatus;
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
    /// Lo que la sesion dice que admite, segun ella misma. `None` = no se
    /// sabe (el fallback por titulos no tiene sesion SMTC).
    pub controls: Option<Controles>,
    /// Si el modo aleatorio esta activo ahora mismo.
    pub is_shuffle_active: Option<bool>,
    /// Modo de repeticion activo ahora mismo.
    pub auto_repeat_mode: Option<RepeatMode>,
    /// Posicion de la pista en ms. `None` = sin barra (sin timeline, duracion
    /// 0, o el camino por titulos de ventana, que no tiene sesion SMTC).
    pub position_ms: Option<i64>,
    /// Duracion publicable (`EndTime - StartTime`) en ms.
    pub duration_ms: Option<i64>,
    /// Cuando SMTC midio la posicion, en epoch ms Unix.
    pub timeline_updated_at: Option<i64>,
}

/// Lo que la sesion declara admitir, de `GetPlaybackInfo().Controls`.
///
/// No todas las fuentes hacen todo: un video suelto de YouTube en Edge declara
/// todo en `false`, y sin esto la interfaz ensena botones que no hacen nada.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Controles {
    pub play: bool,
    pub pause: bool,
    pub next: bool,
    pub prev: bool,
    pub shuffle: bool,
    pub repeat: bool,
}

/// Modo de repeticion activo, normalizado a lo que la interfaz entiende.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RepeatMode {
    None,
    Track,
    List,
}

impl RepeatMode {
    /// `"none"` / `"track"` / `"list"`: lo que viaja hacia la interfaz.
    pub fn as_str(self) -> &'static str {
        match self {
            RepeatMode::None => "none",
            RepeatMode::Track => "track",
            RepeatMode::List => "list",
        }
    }
}

impl From<MediaPlaybackAutoRepeatMode> for RepeatMode {
    fn from(m: MediaPlaybackAutoRepeatMode) -> Self {
        match m {
            MediaPlaybackAutoRepeatMode::Track => RepeatMode::Track,
            MediaPlaybackAutoRepeatMode::List => RepeatMode::List,
            _ => RepeatMode::None,
        }
    }
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
