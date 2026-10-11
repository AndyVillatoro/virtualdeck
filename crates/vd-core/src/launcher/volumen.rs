//! Volumen maestro y silencio del dispositivo de salida predeterminado.

use windows::Win32::Media::Audio::Endpoints::IAudioEndpointVolume;
use windows::Win32::Media::Audio::{eMultimedia, eRender, IMMDeviceEnumerator, MMDeviceEnumerator};
use windows::Win32::System::Com::{CoCreateInstance, CLSCTX_ALL};

use super::LauncherError;

/// Ajusta el volumen maestro del dispositivo predeterminado (0-100).
pub fn set_master_volume(percent: i64) -> Result<(), LauncherError> {
    let escala = (percent.clamp(0, 100) as f32) / 100.0;

    // SAFETY: se crea el enumerador, se pide el endpoint por defecto y se
    // activa IAudioEndpointVolume sobre el.
    unsafe {
        crate::audio::ensure_com();
        let enumerator: IMMDeviceEnumerator =
            CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL)?;
        let device = enumerator.GetDefaultAudioEndpoint(eRender, eMultimedia)?;
        let volume: IAudioEndpointVolume = device.Activate(CLSCTX_ALL, None)?;
        volume.SetMasterVolumeLevelScalar(escala, std::ptr::null())?;
    }
    Ok(())
}

/// Lee el volumen maestro actual (0-100).
pub fn master_volume() -> Result<i64, LauncherError> {
    // SAFETY: misma cadena COM que set_master_volume.
    unsafe {
        crate::audio::ensure_com();
        let enumerator: IMMDeviceEnumerator =
            CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL)?;
        let device = enumerator.GetDefaultAudioEndpoint(eRender, eMultimedia)?;
        let volume: IAudioEndpointVolume = device.Activate(CLSCTX_ALL, None)?;
        let escala = volume.GetMasterVolumeLevelScalar()?;
        Ok((escala * 100.0).round() as i64)
    }
}

/// Dice si el dispositivo de salida predeterminado esta silenciado.
///
/// Existe para poder **poner** el silencio en un estado concreto en vez de
/// alternarlo. La tecla multimedia de silencio solo alterna, asi que sin leer el
/// estado no hay forma de garantizar que el equipo queda con sonido.
pub fn is_muted() -> Result<bool, LauncherError> {
    // SAFETY: misma cadena COM que master_volume.
    unsafe {
        crate::audio::ensure_com();
        let enumerator: IMMDeviceEnumerator =
            CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL)?;
        let device = enumerator.GetDefaultAudioEndpoint(eRender, eMultimedia)?;
        let volume: IAudioEndpointVolume = device.Activate(CLSCTX_ALL, None)?;
        Ok(volume.GetMute()?.as_bool())
    }
}

/// Silencia o quita el silencio del dispositivo predeterminado.
pub fn set_muted(mudo: bool) -> Result<(), LauncherError> {
    // SAFETY: misma cadena COM que master_volume.
    unsafe {
        crate::audio::ensure_com();
        let enumerator: IMMDeviceEnumerator =
            CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL)?;
        let device = enumerator.GetDefaultAudioEndpoint(eRender, eMultimedia)?;
        let volume: IAudioEndpointVolume = device.Activate(CLSCTX_ALL, None)?;
        volume.SetMute(mudo, std::ptr::null())?;
        Ok(())
    }
}
