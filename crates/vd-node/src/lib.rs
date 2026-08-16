//! Puente entre `vd-core` y Electron.
//!
//! # Qué resuelve
//!
//! Hasta ahora toda la capa nativa de VirtualDeck pasaba por **PowerShell con C#
//! embebido en cadenas**: cada cambio de dispositivo de audio, cada consulta de
//! reproducción, cada macro lanzaba un `powershell.exe` nuevo. Eso costaba entre
//! 150 y 400 ms por operación y produjo los errores más caros del proyecto —el
//! audio que no cambiaba, el SMTC que devolvía `null`, el `param()` que se
//! rompía en silencio— porque el compilador no puede revisar código que vive
//! dentro de una cadena de texto.
//!
//! `vd-core` ya hace todo eso llamando a COM y WinRT **en proceso**, con tipos
//! verificados al compilar y en microsegundos. Este módulo se limita a exponerlo
//! a JavaScript.
//!
//! # Por qué N-API y no un módulo nativo clásico
//!
//! La ABI de N-API es estable entre versiones de Node y de Electron, así que el
//! binario se compila una vez y sigue sirviendo tras actualizar Electron. Un
//! módulo contra las cabeceras de V8 habría que recompilarlo en cada
//! actualización. Es la misma razón por la que el proyecto ya eligió
//! `uiohook-napi` para las macros.
//!
//! # Los nombres son los de JavaScript
//!
//! `napi` convierte automáticamente `nombre_de_funcion` a `nombreDeFuncion`, y
//! los campos de las structs igual. Las firmas se mantienen **idénticas** a las
//! que ya exportaban los módulos de `electron/main/`, para que sustituirlos no
//! obligue a tocar ni el IPC ni la interfaz.

#![deny(clippy::all)]

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
/// Sustituye a `listAudioDevices` de `electron/main/audio.ts`, que lanzaba
/// PowerShell y parseaba su salida.
///
/// # Sobre la caché
///
/// `audioIpc.ts` cachea esta lista 30 segundos. Esa caché existía **solo** para
/// esconder la latencia de PowerShell; aquí la llamada tarda microsegundos y se
/// puede quitar. Mientras siga ahí no molesta.
#[napi]
pub fn list_audio_devices() -> napi::Result<Vec<AudioDevice>> {
    let dispositivos = vd_core::audio::list_devices().map_err(a_error)?;
    Ok(dispositivos
        .into_iter()
        .map(|d| AudioDevice {
            id: d.id,
            name: d.name,
            is_default: d.is_default,
        })
        .collect())
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

/// Comprueba que el módulo nativo carga y responde.
///
/// Parece de adorno y no lo es: si el `.node` no está donde el empaquetador lo
/// dejó, o se compiló para otra arquitectura, el fallo aparece como un `require`
/// que revienta al arrancar. Llamar a esto primero permite decirlo con claridad
/// y caer al camino anterior en vez de dejar la aplicación medio muerta.
#[napi]
pub fn version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// Convierte un error del núcleo en una excepción de JavaScript.
fn a_error(e: impl std::fmt::Display) -> napi::Error {
    napi::Error::from_reason(e.to_string())
}
