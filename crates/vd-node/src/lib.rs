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

// ---------------------------------------------------------------------------
// Launcher
// ---------------------------------------------------------------------------

/// Lanza una aplicación con sus argumentos.
#[napi]
pub fn launch_app(app_path: String, args: Vec<String>) -> bool {
    informar("launchApp", vd_core::launcher::launch_app(&app_path, &args))
}

/// Abre una URL, archivo o carpeta con la aplicación asociada del sistema.
///
/// Cubre `openUrl` y `openShortcut`, que en la versión de PowerShell eran dos
/// funciones distintas haciendo exactamente lo mismo.
#[napi]
pub fn open_path(target: String) -> bool {
    informar("openPath", vd_core::launcher::open_path(&target))
}

/// Resultado de ejecutar un script.
#[napi(object)]
pub struct SalidaScript {
    pub success: bool,
    pub output: String,
}

/// Ejecuta un script y devuelve su salida.
///
/// `shell` acepta `"powershell"` (por defecto) o `"cmd"`, los mismos valores que
/// guarda `deck-config.json`.
#[napi]
pub fn run_script(script: String, shell: Option<String>) -> SalidaScript {
    let shell = match shell.as_deref() {
        Some("cmd") => vd_core::launcher::Shell::Cmd,
        _ => vd_core::launcher::Shell::PowerShell,
    };
    match vd_core::launcher::run_script(&script, shell) {
        Ok(output) => SalidaScript {
            success: true,
            output,
        },
        Err(e) => SalidaScript {
            success: false,
            output: e.to_string(),
        },
    }
}

/// Fija el brillo de las pantallas por DDC/CI.
///
/// Devuelve `false` si **ninguna** pantalla aceptó el cambio, que es lo normal
/// en portátiles y en monitores que no exponen DDC/CI.
#[napi]
pub fn set_brightness(level: i64) -> bool {
    match vd_core::launcher::set_brightness(level) {
        Ok(aplicadas) => aplicadas > 0,
        Err(e) => {
            eprintln!("[launcher] setBrightness: {e}");
            false
        }
    }
}

/// El brillo actual, o `null` si ninguna pantalla lo informa.
#[napi]
pub fn get_brightness() -> Option<u32> {
    vd_core::launcher::brightness()
}

#[napi]
pub fn copy_to_clipboard(text: String) -> bool {
    informar("copyToClipboard", vd_core::launcher::set_clipboard(&text))
}

/// El texto del portapapeles, o `null` si no hay texto.
#[napi]
pub fn read_clipboard() -> Option<String> {
    vd_core::launcher::clipboard()
}

/// Escribe texto como si se teclease.
#[napi]
pub fn type_text(text: String) -> bool {
    informar("typeText", vd_core::launcher::type_text(&text))
}

/// Envía una combinación de teclas, por ejemplo `"Ctrl+Shift+M"`.
#[napi]
pub fn send_hotkey(combo: String) -> bool {
    informar("sendHotkey", vd_core::launcher::send_hotkey(&combo))
}

/// Nombres de los procesos en ejecución, sin `.exe` y en minúsculas.
///
/// Es el formato con el que la configuración compara (`visibleIf.app`,
/// `kill-process`), y coincide con lo que devolvía la versión de PowerShell.
#[napi]
pub fn get_running_processes() -> Vec<String> {
    match vd_core::launcher::running_processes() {
        Ok(lista) => {
            let mut nombres: Vec<String> = lista.into_iter().map(|p| p.name).collect();
            nombres.sort_unstable();
            nombres.dedup();
            nombres
        }
        Err(e) => {
            eprintln!("[launcher] getRunningProcesses: {e}");
            Vec::new()
        }
    }
}

/// Cierra todos los procesos con ese nombre. `false` si no había ninguno.
#[napi]
pub fn kill_process(name: String) -> bool {
    match vd_core::launcher::kill_process(&name) {
        Ok(cerrados) => cerrados > 0,
        Err(e) => {
            eprintln!("[launcher] killProcess: {e}");
            false
        }
    }
}

#[napi]
pub fn set_volume(percent: i64) -> bool {
    informar("setVolume", vd_core::launcher::set_master_volume(percent))
}

/// El volumen maestro en porcentaje, o `null` si no se pudo leer.
#[napi]
pub fn get_volume() -> Option<i64> {
    vd_core::launcher::master_volume().ok()
}

/// Si el sistema está silenciado.
///
/// Poder **leerlo** importa: la tecla de silencio alterna, así que sin conocer
/// el estado no hay forma de dejarlo como estaba.
#[napi]
pub fn is_muted() -> Option<bool> {
    vd_core::launcher::is_muted().ok()
}

#[napi]
pub fn set_muted(muted: bool) -> bool {
    informar("setMuted", vd_core::launcher::set_muted(muted))
}

/// Coloca una ventana. Sin `process_name`, la que esté en primer plano.
#[napi]
pub fn snap_window(position: String, process_name: Option<String>) -> bool {
    let Some(pos) = vd_core::launcher::SnapPosition::from_config(&position) else {
        eprintln!("[launcher] snapWindow: posicion desconocida \"{position}\"");
        return false;
    };
    informar(
        "snapWindow",
        vd_core::launcher::snap_window(pos, process_name.as_deref()),
    )
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

/// Convierte un `Result` en el `boolean` que espera JavaScript, dejando rastro.
///
/// Las funciones del launcher devolvían `boolean` en la versión de PowerShell y
/// se mantiene la firma para no tocar el IPC. Pero un `false` a secas no dice
/// **por qué** falló, así que el motivo va al log del proceso principal: es lo
/// único que queda cuando alguien reporta que un botón no hace nada.
fn informar<E: std::fmt::Display>(que: &str, r: Result<(), E>) -> bool {
    match r {
        Ok(()) => true,
        Err(e) => {
            eprintln!("[launcher] {que}: {e}");
            false
        }
    }
}
