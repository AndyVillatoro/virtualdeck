//! Dispositivos de audio: enumerar y cambiar el predeterminado.
//!
//! Portado de `electron/main/audio.ts`, que hacia esto lanzando un
//! `powershell.exe` con ~150 lineas de C# embebido en cada llamada (150-400 ms).
//! Aca son llamadas COM en proceso, en microsegundos, y sin el problema de
//! codificacion que arrastraba el envoltorio de PowerShell.
//!
//! # Lecciones del bug historico
//!
//! El cambio de dispositivo fallaba **en silencio** en la version Electron por
//! tres motivos que este modulo corrige explicitamente:
//!
//! 1. Los `HRESULT` se ignoraban → aca se chequea **cada** rol.
//! 2. Algunas builds de Windows solo exponen `IPolicyConfigVista` → hay
//!    fallback automatico (ver [`policy_config`]).
//! 3. Ciertos drivers devuelven `S_OK` **sin aplicar el cambio** → despues de
//!    setear se vuelve a consultar el predeterminado para confirmarlo.

mod policy_config;

use std::fmt;

use windows::core::PCWSTR;
use windows::Win32::Devices::FunctionDiscovery::PKEY_Device_FriendlyName;
use windows::Win32::Media::Audio::{
    eCommunications, eConsole, eMultimedia, eRender, IMMDevice, IMMDeviceEnumerator,
    MMDeviceEnumerator, DEVICE_STATE_ACTIVE,
};
use windows::Win32::System::Com::StructuredStorage::{PropVariantClear, PropVariantToStringAlloc};
use windows::Win32::System::Com::{
    CoCreateInstance, CoInitializeEx, CoTaskMemFree, CLSCTX_ALL, COINIT_APARTMENTTHREADED,
    STGM_READ,
};

use policy_config::PolicyConfig;
pub use policy_config::PolicyConfigFlavor;

/// Los tres roles que Windows mantiene por separado. Cambiar "el dispositivo
/// predeterminado" desde la interfaz de Windows en realidad cambia los tres, y
/// eso es lo que replicamos.
const ROLES: [(u32, &str); 3] = [
    (eConsole.0 as u32, "Console"),
    (eMultimedia.0 as u32, "Multimedia"),
    (eCommunications.0 as u32, "Communications"),
];

/// Un dispositivo de salida de audio.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AudioDevice {
    /// Id estable de Windows (`{0.0.0.00000000}.{guid}`).
    pub id: String,
    /// Nombre para mostrar (`PKEY_Device_FriendlyName`).
    pub name: String,
    /// Si es el predeterminado actual para el rol Multimedia.
    pub is_default: bool,
}

/// Errores del modulo de audio.
#[derive(Debug, thiserror::Error)]
pub enum AudioError {
    #[error("error COM: {0}")]
    Com(#[from] windows::core::Error),

    #[error("no se encontro el dispositivo: {0}")]
    DeviceNotFound(String),

    #[error(
        "Windows acepto el cambio pero no lo aplico (el predeterminado sigue siendo {actual:?}). \
         Suele ser un driver que ignora la peticion."
    )]
    NotApplied { actual: Option<String> },

    #[error(
        "SetDefaultEndpoint fallo para el rol {role} con HRESULT 0x{hr:08X} (interfaz {flavor})"
    )]
    SetFailed {
        role: &'static str,
        hr: u32,
        flavor: String,
    },
}

impl fmt::Display for AudioDevice {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "{}{}",
            self.name,
            if self.is_default {
                " (predeterminado)"
            } else {
                ""
            }
        )
    }
}

/// Inicializa COM en el hilo actual.
///
/// Es idempotente: si el hilo ya estaba inicializado, Windows devuelve `S_FALSE`
/// o `RPC_E_CHANGED_MODE` y en ambos casos se puede seguir trabajando, asi que
/// se ignora el resultado a proposito.
pub(crate) fn ensure_com() {
    // SAFETY: llamada estandar de inicializacion; su fallo no es fatal.
    unsafe {
        let _ = CoInitializeEx(None, COINIT_APARTMENTTHREADED);
    }
}

fn device_enumerator() -> Result<IMMDeviceEnumerator, AudioError> {
    ensure_com();
    // SAFETY: CLSID y contexto validos.
    Ok(unsafe { CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL)? })
}

/// Lee el id de un dispositivo.
fn device_id(device: &IMMDevice) -> Result<String, AudioError> {
    // SAFETY: `device` es una interfaz viva; GetId aloja una cadena que
    // liberamos con `free` inmediatamente despues de copiarla.
    unsafe {
        let raw = device.GetId()?;
        let owned = raw.to_string().unwrap_or_default();
        windows::Win32::System::Com::CoTaskMemFree(Some(raw.0 as *const _));
        Ok(owned)
    }
}

/// Lee el nombre amigable de un dispositivo.
///
/// Si algo falla devuelve un nombre generico en vez de propagar el error: un
/// dispositivo sin nombre legible no debe romper la enumeracion entera.
fn device_name(device: &IMMDevice) -> String {
    const DESCONOCIDO: &str = "Dispositivo desconocido";

    // SAFETY: `device` es una interfaz viva. El PROPVARIANT se libera con
    // PropVariantClear y la cadena que aloja PropVariantToStringAlloc con
    // CoTaskMemFree, en ambos caminos de salida.
    unsafe {
        let Ok(store) = device.OpenPropertyStore(STGM_READ) else {
            return DESCONOCIDO.to_string();
        };
        let Ok(mut value) = store.GetValue(&PKEY_Device_FriendlyName) else {
            return DESCONOCIDO.to_string();
        };

        // PropVariantToStringAlloc en vez de leer la union a mano: convierte
        // cualquier VARENUM, no solo VT_LPWSTR.
        let name = match PropVariantToStringAlloc(&value) {
            Ok(pwstr) => {
                let s = pwstr
                    .to_string()
                    .unwrap_or_else(|_| DESCONOCIDO.to_string());
                CoTaskMemFree(Some(pwstr.0 as *const _));
                s
            }
            Err(_) => DESCONOCIDO.to_string(),
        };

        let _ = PropVariantClear(&mut value);
        name
    }
}

/// Id del dispositivo predeterminado actual para el rol Multimedia.
///
/// Devuelve `None` si no hay ninguno (por ejemplo, sin tarjeta de sonido).
pub fn default_device_id() -> Option<String> {
    let enumerator = device_enumerator().ok()?;
    // SAFETY: interfaz viva, parametros validos.
    let device = unsafe {
        enumerator
            .GetDefaultAudioEndpoint(eRender, eMultimedia)
            .ok()?
    };
    device_id(&device).ok()
}

/// Enumera los dispositivos de salida activos.
pub fn list_devices() -> Result<Vec<AudioDevice>, AudioError> {
    let enumerator = device_enumerator()?;
    let default_id = default_device_id();

    // SAFETY: interfaz viva; iteramos dentro del rango que informa GetCount.
    let devices = unsafe {
        let collection = enumerator.EnumAudioEndpoints(eRender, DEVICE_STATE_ACTIVE)?;
        let count = collection.GetCount()?;

        let mut out = Vec::with_capacity(count as usize);
        for i in 0..count {
            let Ok(device) = collection.Item(i) else {
                continue; // un dispositivo ilegible no invalida el resto
            };
            let Ok(id) = device_id(&device) else { continue };
            let name = device_name(&device);
            let is_default = default_id.as_deref() == Some(id.as_str());
            out.push(AudioDevice {
                id,
                name,
                is_default,
            });
        }
        out
    };

    Ok(devices)
}

/// Cambia el dispositivo de salida predeterminado.
///
/// Aplica el cambio a los tres roles y **verifica** que Windows lo haya
/// aplicado de verdad, porque algunos drivers responden `S_OK` sin hacerlo.
pub fn set_default_device(id: &str) -> Result<(), AudioError> {
    ensure_com();

    let config = PolicyConfig::new()?;
    let flavor = config.flavor();

    // La cadena tiene que seguir viva mientras se usa el puntero.
    let wide: Vec<u16> = id.encode_utf16().chain(std::iter::once(0)).collect();
    let pcwstr = PCWSTR(wide.as_ptr());

    for (role, role_name) in ROLES {
        let hr = config.set_default_endpoint(pcwstr, role);
        if hr.is_err() {
            return Err(AudioError::SetFailed {
                role: role_name,
                hr: hr.0 as u32,
                flavor: flavor.to_string(),
            });
        }
    }

    // Verificacion: el motivo por el que el bug original era invisible.
    let actual = default_device_id();
    if actual.as_deref() == Some(id) {
        Ok(())
    } else {
        Err(AudioError::NotApplied { actual })
    }
}

/// Busca un dispositivo por nombre exacto y, si no hay, por coincidencia
/// parcial sin distinguir mayusculas.
///
/// Replica el comportamiento de la accion `audio-device`, que guarda el nombre
/// ademas del id para poder reencontrar el dispositivo cuando el id cambia
/// (por ejemplo al reinstalar drivers).
pub fn find_device_by_name(name: &str) -> Result<AudioDevice, AudioError> {
    let devices = list_devices()?;
    let needle = name.to_lowercase();

    devices
        .iter()
        .find(|d| d.name.to_lowercase() == needle)
        .or_else(|| {
            devices
                .iter()
                .find(|d| d.name.to_lowercase().contains(&needle))
        })
        .cloned()
        .ok_or_else(|| AudioError::DeviceNotFound(name.to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn se_cubren_los_tres_roles_de_windows() {
        // Cambiar solo uno deja el sistema en un estado inconsistente: el audio
        // de las apps y el de las llamadas irian a dispositivos distintos.
        assert_eq!(ROLES.len(), 3);
        let nombres: Vec<_> = ROLES.iter().map(|(_, n)| *n).collect();
        assert_eq!(nombres, ["Console", "Multimedia", "Communications"]);
    }

    #[test]
    fn enumerar_dispositivos_no_falla_en_esta_maquina() {
        // Test de humo contra hardware real. No afirma cuantos dispositivos hay
        // (depende de la maquina), solo que la cadena COM completa funciona.
        match list_devices() {
            Ok(devices) => {
                for d in &devices {
                    assert!(!d.id.is_empty(), "todo dispositivo debe tener id");
                }
                // Como mucho uno puede ser el predeterminado.
                assert!(devices.iter().filter(|d| d.is_default).count() <= 1);
            }
            Err(e) => panic!("la enumeracion COM fallo: {e}"),
        }
    }
}
