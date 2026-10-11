//! Tests del modulo de medios. Viven aqui porque `mod.rs` es solo cableado.

use windows::Media::Control::GlobalSystemMediaTransportControlsSessionPlaybackStatus as PlaybackStatus;
use windows::Media::MediaPlaybackAutoRepeatMode;

use super::now_playing;
use super::sesion::clave_pista;
use super::tipos::{PlayState, RepeatMode};

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

#[test]
fn la_clave_de_pista_distigue_cancion_y_origen() {
    let a = clave_pista("Spotify", "Titulo", "Artista");
    assert_eq!(a, clave_pista("Spotify", "Titulo", "Artista"));
    assert_ne!(a, clave_pista("Spotify", "Otro", "Artista"));
    // Misma cancion en otra app es otra pista (otra caratula).
    assert_ne!(a, clave_pista("Edge", "Titulo", "Artista"));
}

#[test]
fn el_modo_de_repeticion_se_normaliza() {
    assert_eq!(
        RepeatMode::from(MediaPlaybackAutoRepeatMode::None),
        RepeatMode::None
    );
    assert_eq!(
        RepeatMode::from(MediaPlaybackAutoRepeatMode::Track),
        RepeatMode::Track
    );
    assert_eq!(
        RepeatMode::from(MediaPlaybackAutoRepeatMode::List),
        RepeatMode::List
    );
    assert_eq!(RepeatMode::Track.as_str(), "track");
    assert_eq!(RepeatMode::List.as_str(), "list");
    assert_eq!(RepeatMode::None.as_str(), "none");
}
