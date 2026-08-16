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

// ---------------------------------------------------------------------------
// Media (SMTC)
// ---------------------------------------------------------------------------

/// Qué se está reproduciendo. Mismos campos que `NowPlaying` de `src/types.ts`.
#[napi(object)]
pub struct NowPlaying {
    pub title: String,
    pub artist: String,
    /// `"Playing"`, `"Paused"`, `"Stopped"` o `"Unknown"`.
    pub status: String,
    pub source: String,
    /// Carátula como data-URL, o `null`.
    pub thumbnail: Option<String>,
}

/// Lo que se está reproduciendo ahora mismo.
///
/// # Lo que desaparece aquí
///
/// La versión de PowerShell necesitaba convertir el `IAsyncOperation` de WinRT
/// en un `Task` de .NET por reflexión —el bloque marcado «NO tocar» en
/// `media.ts`— porque en PowerShell 5.1 la propiedad `Status` no se proyecta y
/// el await devolvía siempre `null`, dejando el widget de música en blanco.
///
/// En Rust las llamadas a WinRT son normales y con tipos verificados al
/// compilar. El problema no se arregla: deja de existir.
#[napi]
pub fn get_now_playing() -> Option<NowPlaying> {
    let n = vd_core::media::now_playing()?;
    Some(NowPlaying {
        title: n.title,
        artist: n.artist,
        status: match n.status {
            vd_core::media::PlayState::Playing => "Playing",
            vd_core::media::PlayState::Paused => "Paused",
            vd_core::media::PlayState::Stopped => "Stopped",
            vd_core::media::PlayState::Unknown => "Unknown",
        }
        .to_string(),
        source: n.source,
        // El núcleo devuelve bytes crudos porque una interfaz nativa los
        // consume tal cual. Aquí manda un WebView, que necesita un data-URL.
        thumbnail: n.thumbnail.map(|t| a_data_url(&t.mime, &t.bytes)),
    })
}

/// Controla la reproducción: `"play-pause"`, `"next"`, `"prev"` o `"stop"`.
#[napi]
pub fn control_media(cmd: String) -> bool {
    use vd_core::media::MediaCommand as C;
    let comando = match cmd.as_str() {
        "play-pause" => C::PlayPause,
        "next" => C::Next,
        "prev" => C::Prev,
        "stop" => C::Stop,
        otro => {
            eprintln!("[media] comando desconocido: \"{otro}\"");
            return false;
        }
    };
    match vd_core::media::control(comando) {
        Ok(()) => true,
        Err(e) => {
            eprintln!("[media] control {cmd}: {e}");
            false
        }
    }
}

/// Alterna el modo aleatorio. Necesita una sesión SMTC activa.
#[napi]
pub fn shuffle_media() -> bool {
    match vd_core::media::toggle_shuffle() {
        Ok(_) => true,
        Err(e) => {
            eprintln!("[media] shuffle: {e}");
            false
        }
    }
}

/// Rota el modo de repetición. Necesita una sesión SMTC activa.
#[napi]
pub fn repeat_media() -> bool {
    match vd_core::media::cycle_repeat() {
        Ok(_) => true,
        Err(e) => {
            eprintln!("[media] repeat: {e}");
            false
        }
    }
}

/// Diagnóstico de SMTC, sesión por sesión.
#[napi]
pub fn diagnose_media() -> String {
    vd_core::media::diagnose()
}

/// Convierte unos bytes de imagen en un data-URL.
///
/// Se codifica a mano en vez de traer una dependencia: son veinte líneas y la
/// alternativa es arrastrar un crate entero al binario por esto.
fn a_data_url(mime: &str, bytes: &[u8]) -> String {
    const ALFABETO: &[u8; 64] =
        b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    let mut salida = String::with_capacity(bytes.len().div_ceil(3) * 4 + mime.len() + 20);
    salida.push_str("data:");
    salida.push_str(mime);
    salida.push_str(";base64,");

    for trozo in bytes.chunks(3) {
        // Los tres bytes se juntan en un entero y se parten en cuatro grupos de
        // seis bits. El relleno con `=` marca cuántos bytes faltaban.
        let b0 = trozo[0] as u32;
        let b1 = *trozo.get(1).unwrap_or(&0) as u32;
        let b2 = *trozo.get(2).unwrap_or(&0) as u32;
        let n = (b0 << 16) | (b1 << 8) | b2;

        salida.push(ALFABETO[(n >> 18) as usize & 63] as char);
        salida.push(ALFABETO[(n >> 12) as usize & 63] as char);
        salida.push(if trozo.len() > 1 {
            ALFABETO[(n >> 6) as usize & 63] as char
        } else {
            '='
        });
        salida.push(if trozo.len() > 2 {
            ALFABETO[n as usize & 63] as char
        } else {
            '='
        });
    }
    salida
}

// ---------------------------------------------------------------------------
// Macros
// ---------------------------------------------------------------------------

/// Reproduce una macro grabada.
///
/// Los pasos llegan como **JSON**, no como un objeto declarado aquí, y se leen
/// con el mismo modelo (`vd_core::config::model::MacroStep`) que ya lee la
/// configuración del disco. Un espejo del tipo escrito a mano en este archivo
/// podría desviarse del modelo sin que nada fallara al compilar; así es
/// imposible.
///
/// La **grabación** no pasa por aquí: ya era nativa con `uiohook-napi`. Lo único
/// que usaba PowerShell era la reproducción, con un script generado al vuelo que
/// mezclaba `SendKeys` y `mouse_event` de `user32.dll`.
#[napi]
pub fn play_macro(steps_json: String, repeat: Option<i64>) -> bool {
    let pasos: Vec<vd_core::config::model::MacroStep> = match serde_json::from_str(&steps_json) {
        Ok(p) => p,
        Err(e) => {
            eprintln!("[macro] no se entienden los pasos: {e}");
            return false;
        }
    };
    if pasos.is_empty() {
        eprintln!("[macro] la macro no tiene ningun paso");
        return false;
    }

    match vd_core::macros::play(&pasos, repeat.unwrap_or(1)) {
        Ok(()) => true,
        Err(e) => {
            eprintln!("[macro] reproduccion: {e}");
            false
        }
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

#[cfg(test)]
mod tests {
    use super::*;

    /// Los vectores del RFC 4648.
    ///
    /// El codificador está escrito a mano para no arrastrar un crate entero, y
    /// eso obliga a comprobarlo contra una referencia externa. Si estuviera mal,
    /// el fallo seria una carátula que no se ve — sin ningún error.
    #[test]
    fn base64_coincide_con_el_estandar() {
        let casos = [
            ("", ""),
            ("f", "Zg=="),
            ("fo", "Zm8="),
            ("foo", "Zm9v"),
            ("foob", "Zm9vYg=="),
            ("fooba", "Zm9vYmE="),
            ("foobar", "Zm9vYmFy"),
        ];
        for (entrada, esperado) in casos {
            let url = a_data_url("image/png", entrada.as_bytes());
            let codificado = url.strip_prefix("data:image/png;base64,").expect("prefijo");
            assert_eq!(codificado, esperado, "entrada {entrada:?}");
        }
    }

    /// Los bytes altos son justo donde falla un codificador mal escrito: si
    /// algún desplazamiento usa `i8` en vez de `u8`, aquí se ve.
    #[test]
    fn base64_aguanta_bytes_altos() {
        assert_eq!(
            a_data_url("image/jpeg", &[0xFF, 0xFE, 0xFD]),
            "data:image/jpeg;base64,//79"
        );
        assert_eq!(
            a_data_url("image/jpeg", &[0x00, 0x00, 0x00]),
            "data:image/jpeg;base64,AAAA"
        );
    }

    #[test]
    fn el_data_url_lleva_su_tipo() {
        let url = a_data_url("image/png", b"x");
        assert!(url.starts_with("data:image/png;base64,"), "{url}");
    }
}
