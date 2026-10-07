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

use std::time::Duration;

use napi::bindgen_prelude::AsyncTask;
use napi::{Env, Task};
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
    let lista = vd_core::audio::audio_sessions().map_err(a_error)?;
    Ok(lista
        .into_iter()
        .map(|s| VolumenApp { proceso: s.proceso, volumen: s.volumen as u32, silenciada: s.silenciada })
        .collect())
}

/// Sube o baja el volumen de una app (`proceso` vacío = la de primer plano).
/// Devuelve el nivel nuevo; lanza un error legible si la app no tiene sonido.
#[napi]
pub fn adjust_app_volume(proceso: String, delta: i64) -> napi::Result<u32> {
    vd_core::audio::adjust_app_volume(&proceso, delta).map(u32::from).map_err(a_error)
}

/// Fija el volumen de una app (0-100). Devuelve el nivel puesto.
#[napi]
pub fn set_app_volume(proceso: String, nivel: i64) -> napi::Result<u32> {
    vd_core::audio::set_app_volume(&proceso, nivel).map(u32::from).map_err(a_error)
}

/// Alterna el silencio de una app. Devuelve si quedó silenciada.
#[napi]
pub fn toggle_app_mute(proceso: String) -> napi::Result<bool> {
    vd_core::audio::toggle_app_mute(&proceso).map_err(a_error)
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

/// Ejecuta un script y devuelve su salida, sin bloquear el proceso principal.
///
/// Va como [`AsyncTask`]: el hijo puede tardar hasta el limite y esperar en el
/// hilo principal de Electron congelaria IPC, bandeja e HID del dock. El
/// cómputo corre en el pool de libuv y JavaScript recibe una Promise.
///
/// `timeout_ms` por defecto 30 s, como el respaldo PowerShell de Electron.
#[napi]
pub fn run_script(
    script: String,
    shell: Option<String>,
    timeout_ms: Option<u32>,
) -> AsyncTask<TareaScript> {
    let shell = match shell.as_deref() {
        Some("cmd") => vd_core::launcher::Shell::Cmd,
        _ => vd_core::launcher::Shell::PowerShell,
    };
    AsyncTask::new(TareaScript {
        script,
        shell,
        limite: Duration::from_millis(u64::from(timeout_ms.unwrap_or(30_000)).max(1)),
    })
}

pub struct TareaScript {
    script: String,
    shell: vd_core::launcher::Shell,
    limite: Duration,
}

impl Task for TareaScript {
    type Output = SalidaScript;
    type JsValue = SalidaScript;

    fn compute(&mut self) -> napi::Result<Self::Output> {
        match vd_core::launcher::run_script_con_limite(&self.script, self.shell, self.limite) {
            Ok(output) => Ok(SalidaScript {
                success: true,
                output,
            }),
            Err(e) => Ok(SalidaScript {
                success: false,
                output: e.to_string(),
            }),
        }
    }

    fn resolve(&mut self, _env: Env, salida: Self::Output) -> napi::Result<Self::JsValue> {
        Ok(salida)
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

/// Comprueba de forma inmediata si un proceso está en ejecución (<0.05ms).
#[napi]
pub fn is_process_running(name: String) -> bool {
    vd_core::launcher::is_process_running(&name)
}

/// Información de un proceso en ejecución.
#[napi(object)]
pub struct ProcessDetail {
    pub pid: u32,
    pub name: String,
}

/// Lista los procesos en ejecución con sus PIDs y nombres.
#[napi]
pub fn get_process_list() -> Vec<ProcessDetail> {
    match vd_core::launcher::running_processes() {
        Ok(lista) => lista
            .into_iter()
            .map(|p| ProcessDetail {
                pid: p.pid,
                name: p.name,
            })
            .collect(),
        Err(e) => {
            eprintln!("[launcher] getProcessList: {e}");
            Vec::new()
        }
    }
}

/// Termina un proceso por su identificador PID.
#[napi]
pub fn kill_process_by_pid(pid: u32) -> bool {
    informar("killProcessByPid", vd_core::launcher::kill_process_by_pid(pid))
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

/// Información de la ventana y proceso actualmente en primer plano.
#[napi(object)]
pub struct ActiveWindowInfo {
    pub process_name: Option<String>,
    pub window_title: Option<String>,
}

/// Obtiene el proceso y título de la ventana activa en primer plano en <0.05ms (Win32 en memoria).
#[napi]
pub fn get_active_window() -> Option<ActiveWindowInfo> {
    vd_core::launcher::active_app().map(|info| ActiveWindowInfo {
        process_name: info.process_name,
        window_title: info.window_title,
    })
}

/// Trae al frente la ventana de un proceso por nombre.
#[napi]
pub fn focus_window(process_name: String) -> bool {
    informar("focusWindow", vd_core::launcher::focus_window(&process_name))
}

/// Trae al frente la ventana de aplicación siguiente (`true`) o la anterior,
/// en un orden estable (por proceso), no el de uso reciente de Alt+Tab.
#[napi]
pub fn cycle_window(adelante: bool) -> bool {
    informar("cycleWindow", vd_core::launcher::cycle_window(adelante).map(|_| ()))
}

/// El icono de una app abierta, en puntos 16×16 (base64, formato del catálogo
/// de iconos); `null` si no está abierta o Windows no da su icono.
#[napi]
pub fn icono_app(proceso: String) -> Option<String> {
    vd_core::launcher::icono_app(&proceso)
}

/// Procesos con una ventana de aplicación abierta (sin `.exe`, en minúsculas,
/// sin repetir): para elegir la app de una página sin teclear su nombre.
#[napi]
pub fn open_apps() -> Vec<String> {
    vd_core::launcher::open_apps()
}

/// Minimiza una ventana. Si no se especifica nombre, minimiza la activa.
#[napi]
pub fn minimize_window(process_name: Option<String>) -> bool {
    informar(
        "minimizeWindow",
        vd_core::launcher::minimize_window(process_name.as_deref()),
    )
}

/// Maximiza una ventana. Si no se especifica nombre, maximiza la activa.
#[napi]
pub fn maximize_window(process_name: Option<String>) -> bool {
    informar(
        "maximizeWindow",
        vd_core::launcher::maximize_window(process_name.as_deref()),
    )
}

/// Restaura una ventana. Si no se especifica nombre, restaura la activa.
#[napi]
pub fn restore_window(process_name: Option<String>) -> bool {
    informar(
        "restoreWindow",
        vd_core::launcher::restore_window(process_name.as_deref()),
    )
}

/// Cierra suavemente una ventana vía mensaje WM_CLOSE sin forzar la terminación del proceso.
#[napi]
pub fn close_window(process_name: Option<String>) -> bool {
    informar(
        "closeWindow",
        vd_core::launcher::close_window(process_name.as_deref()),
    )
}

// ---------------------------------------------------------------------------
// Media (SMTC)
// ---------------------------------------------------------------------------

/// Qué se está reproduciendo. Mismos campos que `NowPlaying` de `src/types.ts`,
/// más lo que la sesión dice de sí misma (opcionales: ausentes sin SMTC).
#[napi(object)]
pub struct NowPlaying {
    pub title: String,
    pub artist: String,
    /// `"Playing"`, `"Paused"`, `"Stopped"` o `"Unknown"`.
    pub status: String,
    pub source: String,
    /// Carátula como data-URL, o `null`.
    pub thumbnail: Option<String>,
    /// Lo que la sesión admite. Ausente = no se sabe (sin SMTC).
    pub controls: Option<ControlesSesion>,
    /// Si el aleatorio está activo. Ausente = no se sabe.
    pub is_shuffle_active: Option<bool>,
    /// `"none"`, `"track"` o `"list"`. Ausente = no se sabe.
    pub auto_repeat_mode: Option<String>,
}

/// Capacidades de una sesión SMTC, de `GetPlaybackInfo().Controls`.
#[napi(object)]
pub struct ControlesSesion {
    pub play: bool,
    pub pause: bool,
    pub next: bool,
    pub prev: bool,
    pub shuffle: bool,
    pub repeat: bool,
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
        controls: n.controls.map(|c| ControlesSesion {
            play: c.play,
            pause: c.pause,
            next: c.next,
            prev: c.prev,
            shuffle: c.shuffle,
            repeat: c.repeat,
        }),
        is_shuffle_active: n.is_shuffle_active,
        auto_repeat_mode: n.auto_repeat_mode.map(|m| m.as_str().to_string()),
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

/// Reproduce una macro grabada, sin bloquear el proceso principal.
///
/// Los pasos llegan como **JSON**, no como un objeto declarado aquí, y se leen
/// con el mismo modelo (`vd_core::config::model::MacroStep`) que ya lee la
/// configuración del disco. Un espejo del tipo escrito a mano en este archivo
/// podría desviarse del modelo sin que nada fallara al compilar; así es
/// imposible.
///
/// Va como [`AsyncTask`] porque una macro con pausas duerme entre pasos: en
/// síncrono, esos segundos congelaban IPC, bandeja e HID del dock.
///
/// La **grabación** no pasa por aquí: ya era nativa con `uiohook-napi`. Lo único
/// que usaba PowerShell era la reproducción, con un script generado al vuelo que
/// mezclaba `SendKeys` y `mouse_event` de `user32.dll`.
#[napi]
pub fn play_macro(steps_json: String, repeat: Option<i64>) -> AsyncTask<TareaMacro> {
    AsyncTask::new(TareaMacro {
        steps_json,
        repeat: repeat.unwrap_or(1),
    })
}

pub struct TareaMacro {
    steps_json: String,
    repeat: i64,
}

impl Task for TareaMacro {
    type Output = bool;
    type JsValue = bool;

    fn compute(&mut self) -> napi::Result<Self::Output> {
        let pasos: Vec<vd_core::config::model::MacroStep> =
            match serde_json::from_str(&self.steps_json) {
                Ok(p) => p,
                Err(e) => {
                    eprintln!("[macro] no se entienden los pasos: {e}");
                    return Ok(false);
                }
            };
        if pasos.is_empty() {
            eprintln!("[macro] la macro no tiene ningun paso");
            return Ok(false);
        }

        match vd_core::macros::play(&pasos, self.repeat) {
            Ok(()) => Ok(true),
            Err(e) => {
                eprintln!("[macro] reproduccion: {e}");
                Ok(false)
            }
        }
    }

    fn resolve(&mut self, _env: Env, ok: Self::Output) -> napi::Result<Self::JsValue> {
        Ok(ok)
    }
}

// ---------------------------------------------------------------------------
// Voz
// ---------------------------------------------------------------------------

/// Lee un texto en voz alta (SAPI), sin bloquear el proceso principal.
///
/// `hablar` ya vuelve enseguida por su cuenta (SAPI asíncrono), pero crearlo y
/// llamarlo en el hilo principal seguía atando ese hilo a COM en plena frase.
/// Como [`AsyncTask`], JavaScript recibe una Promise y el principal sigue
/// atendiendo IPC, bandeja e HID. `false` si no hay nada que leer o SAPI falla.
#[napi]
pub fn speak_text(texto: String) -> AsyncTask<TareaVoz> {
    AsyncTask::new(TareaVoz { texto })
}

pub struct TareaVoz {
    texto: String,
}

impl Task for TareaVoz {
    type Output = bool;
    type JsValue = bool;

    fn compute(&mut self) -> napi::Result<Self::Output> {
        if self.texto.trim().is_empty() {
            return Ok(false);
        }
        match vd_core::voz::hablar(&self.texto) {
            Ok(()) => Ok(true),
            Err(e) => {
                eprintln!("[voz] no se pudo hablar: {e}");
                Ok(false)
            }
        }
    }

    fn resolve(&mut self, _env: Env, ok: Self::Output) -> napi::Result<Self::JsValue> {
        Ok(ok)
    }
}

// ---------------------------------------------------------------------------
// Sensores
// ---------------------------------------------------------------------------

/// Los sensores del sistema, como JSON.
///
/// # Por qué esto importa más de lo que parece
///
/// La versión Electron necesita **LibreHardwareMonitor** corriendo: 19 MB de
/// binarios empaquetados, un servidor HTTP en el puerto 8085 y, para que ese
/// servidor pueda reservar el puerto, arrancarlo como administrador. Sin todo
/// eso no hay ni un solo sensor.
///
/// El nivel 1 de `vd-core` no necesita nada instalado: CPU, RAM, disco y red
/// salen de la API del sistema, y la GPU NVIDIA de NVML, que viene con el
/// propio driver. LHM sigue disponible como nivel 2 opcional para lo que solo
/// él ve —voltajes, ventiladores de placa—, pero deja de ser un requisito.
///
/// Va como JSON y no como un objeto declarado aquí por la misma razón que las
/// macros: el tipo ya está definido en `vd-core` y un espejo escrito a mano
/// podría desviarse sin que nada fallara al compilar.
#[napi]
pub fn list_sensors(force: bool) -> napi::Result<String> {
    let mut sensores = sensores();
    let lista = sensores.list_filtered(force);
    serde_json::to_string(&lista).map_err(a_error)
}

/// Estado del subsistema de sensores, como JSON.
///
/// Dice cuántos aporta el nivel nativo, qué GPU ve NVML y por qué no pudo si no
/// pudo. Es lo que necesita la pantalla de ajustes para explicar qué pasa en vez
/// de mostrar una lista vacía.
#[napi]
pub fn sensors_status() -> napi::Result<String> {
    let mut sensores = sensores();
    serde_json::to_string(&sensores.status()).map_err(a_error)
}

/// Configura los sensores desde el JSON de `SensorsSettings`.
#[napi]
pub fn configure_sensors(settings_json: String) -> bool {
    match serde_json::from_str(&settings_json) {
        Ok(s) => {
            sensores().configure(&s);
            true
        }
        Err(e) => {
            eprintln!("[sensores] ajustes ilegibles: {e}");
            false
        }
    }
}

/// El estado de los sensores, compartido entre llamadas.
///
/// Tiene que persistir: `Sensors` guarda la caché de lecturas y el momento del
/// último intento fallido de LHM. Crearlo en cada llamada perdería ambas cosas,
/// y con la segunda volveríamos a pagar 2,6 s por refresco cuando LHM está
/// configurado pero cerrado.
fn sensores() -> std::sync::MutexGuard<'static, vd_core::sensors::Sensors> {
    static SENSORES: std::sync::OnceLock<std::sync::Mutex<vd_core::sensors::Sensors>> =
        std::sync::OnceLock::new();
    SENSORES
        .get_or_init(|| std::sync::Mutex::new(vd_core::sensors::Sensors::new()))
        .lock()
        // Un panic dentro del candado dejaría el mutex envenenado. Se sigue con
        // el estado que hubiera: perder los sensores por eso sería peor.
        .unwrap_or_else(|e| e.into_inner())
}

// ---------------------------------------------------------------------------
// Teclas de medios
// ---------------------------------------------------------------------------

/// Envía una tecla de medios del teclado.
///
/// Es el respaldo de cuando no hay sesión SMTC. La versión anterior lo hacía
/// lanzando PowerShell para un `SendKeys` de un solo carácter — unos 150 ms para
/// pulsar una tecla.
///
/// Acepta `"play-pause"`, `"next"`, `"prev"`, `"stop"`, `"volume-up"`,
/// `"volume-down"` y `"mute"`.
#[napi]
pub fn send_media_key(key: String) -> bool {
    use vd_core::launcher::MediaKey as K;
    let tecla = match key.as_str() {
        "play-pause" => K::PlayPause,
        "next" => K::Next,
        "prev" => K::Prev,
        "stop" => K::Stop,
        "volume-up" => K::VolumeUp,
        "volume-down" => K::VolumeDown,
        "mute" => K::Mute,
        otro => {
            eprintln!("[media] tecla desconocida: \"{otro}\"");
            return false;
        }
    };
    informar("sendMediaKey", vd_core::launcher::send_media_key(tecla))
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
