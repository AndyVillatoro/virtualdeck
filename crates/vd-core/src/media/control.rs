//! Ordenes a la sesion activa: transporte, aleatorio y repeticion.

use windows::Media::MediaPlaybackAutoRepeatMode;

use super::hilos::en_hilo_mta;
use super::sesion::{best_session, manager};
use super::tipos::{MediaCommand, MediaError};

pub fn control(cmd: MediaCommand) -> Result<(), MediaError> {
    en_hilo_mta(move || control_aqui(cmd)).unwrap_or(Err(MediaError::NoSession))
}

pub fn toggle_shuffle() -> Result<bool, MediaError> {
    en_hilo_mta(toggle_shuffle_aqui).unwrap_or(Err(MediaError::NoSession))
}

pub fn cycle_repeat() -> Result<MediaPlaybackAutoRepeatMode, MediaError> {
    en_hilo_mta(cycle_repeat_aqui).unwrap_or(Err(MediaError::NoSession))
}

/// Envia un comando de control a la sesion activa.
fn control_aqui(cmd: MediaCommand) -> Result<(), MediaError> {
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
fn toggle_shuffle_aqui() -> Result<bool, MediaError> {
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
fn cycle_repeat_aqui() -> Result<MediaPlaybackAutoRepeatMode, MediaError> {
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
