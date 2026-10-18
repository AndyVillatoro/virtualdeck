//! Funciones de audio: dispositivos de salida y sesiones por app.

use napi_derive::napi;

/// Un dispositivo de salida de audio.
///
/// Mismos campos que la interfaz `AudioDevice` de `src/types.ts`.
#[napi(object)]
pub struct AudioDevice {
    pub id: String,
    pub name: String,
    pub is_default: bool,
}

/// Lista los dispositivos de salida de audio.
///
/// Sustituye a `listAudioDevices` de `electron/main/audio/index.ts`, que lanzaba
/// PowerShell y parseaba su salida.
///
/// # Sobre la caché
///
/// `audioIpc.ts` cachea esta lista 30 segundos. Esa caché existía **solo** para
/// esconder la latencia de PowerShell; aquí la llamada tarda microsegundos y se
/// puede quitar. Mientras siga ahí no molesta.
#[napi]
pub fn list_audio_devices() -> napi::Result<Vec<AudioDevice>> {
    let dispositivos = vd_core::audio::list_devices().map_err(crate::a_error)?;
    Ok(dispositivos
        .into_iter()
        .map(|d| AudioDevice {
            id: d.id,
            name: d.name,
            is_default: d.is_default,
        })
        .collect())
}

/// El volumen de una app (sus sesiones de audio sumadas).
#[napi(object)]
pub struct VolumenApp {
    pub proceso: String,
    pub volumen: u32,
    pub silenciada: bool,
}

/// Las apps con sonido abierto, como en el Mezclador de volumen.
#[napi]
pub fn audio_sessions() -> napi::Result<Vec<VolumenApp>> {
    let lista = vd_core::audio::audio_sessions().map_err(crate::a_error)?;
    Ok(lista
        .into_iter()
        .map(|s| VolumenApp { proceso: s.proceso, volumen: s.volumen as u32, silenciada: s.silenciada })
        .collect())
}

/// Sube o baja el volumen de una app (`proceso` vacío = la de primer plano).
/// Devuelve el nivel nuevo; lanza un error legible si la app no tiene sonido.
#[napi]
pub fn adjust_app_volume(proceso: String, delta: i64) -> napi::Result<u32> {
    vd_core::audio::adjust_app_volume(&proceso, delta).map(u32::from).map_err(crate::a_error)
}

/// Fija el volumen de una app (0-100). Devuelve el nivel puesto.
#[napi]
pub fn set_app_volume(proceso: String, nivel: i64) -> napi::Result<u32> {
    vd_core::audio::set_app_volume(&proceso, nivel).map(u32::from).map_err(crate::a_error)
}

/// Alterna el silencio de una app. Devuelve si quedó silenciada.
#[napi]
pub fn toggle_app_mute(proceso: String) -> napi::Result<bool> {
    vd_core::audio::toggle_app_mute(&proceso).map_err(crate::a_error)
}

/// Cambia el dispositivo de salida predeterminado.
///
/// Devuelve `true` si el cambio se aplicó. `vd-core` no se fía del HRESULT:
/// vuelve a consultar el dispositivo predeterminado para comprobarlo, porque
/// algunos controladores aceptan la llamada sin llegar a aplicarla.
#[napi]
pub fn set_default_audio_device(device_id: String) -> napi::Result<bool> {
    match vd_core::audio::set_default_device(&device_id) {
        Ok(()) => Ok(true),
        // Se devuelve `false` en vez de lanzar, que es lo que hacía la versión
        // de PowerShell y lo que espera quien llama.
        Err(e) => {
            eprintln!("[audio] no se pudo cambiar el dispositivo: {e}");
            Ok(false)
        }
    }
}

/// Busca un dispositivo por parte de su nombre.
///
/// Existe porque una configuración vieja puede guardar el nombre y no el id, y
/// porque el id cambia al reconectar algunos dispositivos USB.
#[napi]
pub fn find_audio_device_by_name(name: String) -> napi::Result<Option<AudioDevice>> {
    match vd_core::audio::find_device_by_name(&name) {
        Ok(d) => Ok(Some(AudioDevice {
            id: d.id,
            name: d.name,
            is_default: d.is_default,
        })),
        Err(_) => Ok(None),
    }
}
