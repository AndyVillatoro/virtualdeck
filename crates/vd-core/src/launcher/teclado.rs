//! Teclado: atajos, escribir texto y teclas multimedia.

use super::LauncherError;
use crate::macros;

/// Envia una combinacion de teclas al sistema (ej. `Ctrl+Shift+Esc`).
///
/// **Ojo con el foco**: llega a la ventana activa. Ver la nota de
/// [`crate::macros`].
pub fn send_hotkey(combo: &str) -> Result<(), LauncherError> {
    use crate::config::model::{MacroStep, MacroStepType};

    let paso = MacroStep {
        step_type: MacroStepType::Key,
        value: Some(combo.to_string()),
        x: None,
        y: None,
        button: None,
        scroll_y: None,
        delay_ms: None,
    };
    macros::play(&[paso], 1).map_err(LauncherError::Input)
}

/// Escribe texto como si se tecleara.
pub fn type_text(text: &str) -> Result<(), LauncherError> {
    use crate::config::model::{MacroStep, MacroStepType};

    if text.is_empty() {
        return Ok(());
    }
    let paso = MacroStep {
        step_type: MacroStepType::Text,
        value: Some(text.to_string()),
        x: None,
        y: None,
        button: None,
        scroll_y: None,
        delay_ms: None,
    };
    macros::play(&[paso], 1).map_err(LauncherError::Input)
}

/// Teclas multimedia del teclado.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MediaKey {
    VolumeUp,
    VolumeDown,
    Mute,
    PlayPause,
    Next,
    Prev,
    Stop,
}

/// Envia una tecla multimedia.
///
/// # Cuando usar esto y cuando SMTC
///
/// Volumen y silencio **no tienen equivalente en SMTC**: van siempre por tecla
/// virtual.
///
/// Las de transporte —reproducir, siguiente, anterior— si lo tienen, y por
/// SMTC son mas fiables: se dirigen a la sesion concreta en vez de a lo que
/// haya en primer plano. Estas existen como respaldo para cuando no hay ninguna
/// sesion SMTC registrada, que pasa con reproductores viejos.
pub fn send_media_key(key: MediaKey) -> Result<(), LauncherError> {
    use windows::Win32::UI::Input::KeyboardAndMouse::{
        VK_MEDIA_NEXT_TRACK, VK_MEDIA_PLAY_PAUSE, VK_MEDIA_PREV_TRACK, VK_MEDIA_STOP,
        VK_VOLUME_DOWN, VK_VOLUME_MUTE, VK_VOLUME_UP,
    };

    let vk = match key {
        MediaKey::VolumeUp => VK_VOLUME_UP,
        MediaKey::VolumeDown => VK_VOLUME_DOWN,
        MediaKey::Mute => VK_VOLUME_MUTE,
        MediaKey::PlayPause => VK_MEDIA_PLAY_PAUSE,
        MediaKey::Next => VK_MEDIA_NEXT_TRACK,
        MediaKey::Prev => VK_MEDIA_PREV_TRACK,
        MediaKey::Stop => VK_MEDIA_STOP,
    };
    macros::press_virtual_key(vk).map_err(LauncherError::Input)
}
