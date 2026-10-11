//! Lanzador: apps, scripts, brillo, portapapeles, tecleado, procesos, volumen,
//! ventanas e iconos.

use std::time::Duration;

use napi::bindgen_prelude::AsyncTask;
use napi::{Env, Task};
use napi_derive::napi;

/// Lanza una aplicación con sus argumentos.
#[napi]
pub fn launch_app(app_path: String, args: Vec<String>) -> bool {
    crate::informar("launchApp", vd_core::launcher::launch_app(&app_path, &args))
}

/// Abre una URL, archivo o carpeta con la aplicación asociada del sistema.
///
/// Cubre `openUrl` y `openShortcut`, que en la versión de PowerShell eran dos
/// funciones distintas haciendo exactamente lo mismo.
#[napi]
pub fn open_path(target: String) -> bool {
    crate::informar("openPath", vd_core::launcher::open_path(&target))
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
    crate::informar("copyToClipboard", vd_core::launcher::set_clipboard(&text))
}

/// El texto del portapapeles, o `null` si no hay texto.
#[napi]
pub fn read_clipboard() -> Option<String> {
    vd_core::launcher::clipboard()
}

/// Escribe texto como si se teclease.
#[napi]
pub fn type_text(text: String) -> bool {
    crate::informar("typeText", vd_core::launcher::type_text(&text))
}

/// Envía una combinación de teclas, por ejemplo `"Ctrl+Shift+M"`.
#[napi]
pub fn send_hotkey(combo: String) -> bool {
    crate::informar("sendHotkey", vd_core::launcher::send_hotkey(&combo))
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
    crate::informar("killProcessByPid", vd_core::launcher::kill_process_by_pid(pid))
}

#[napi]
pub fn set_volume(percent: i64) -> bool {
    crate::informar("setVolume", vd_core::launcher::set_master_volume(percent))
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
    crate::informar("setMuted", vd_core::launcher::set_muted(muted))
}

/// Coloca una ventana. Sin `process_name`, la que esté en primer plano.
#[napi]
pub fn snap_window(position: String, process_name: Option<String>) -> bool {
    let Some(pos) = vd_core::launcher::SnapPosition::from_config(&position) else {
        eprintln!("[launcher] snapWindow: posicion desconocida \"{position}\"");
        return false;
    };
    crate::informar(
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
    crate::informar("focusWindow", vd_core::launcher::focus_window(&process_name))
}

/// Trae al frente la ventana de aplicación siguiente (`true`) o la anterior,
/// en un orden estable (por proceso), no el de uso reciente de Alt+Tab.
#[napi]
pub fn cycle_window(adelante: bool) -> bool {
    crate::informar("cycleWindow", vd_core::launcher::cycle_window(adelante).map(|_| ()))
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
    crate::informar(
        "minimizeWindow",
        vd_core::launcher::minimize_window(process_name.as_deref()),
    )
}

/// Maximiza una ventana. Si no se especifica nombre, maximiza la activa.
#[napi]
pub fn maximize_window(process_name: Option<String>) -> bool {
    crate::informar(
        "maximizeWindow",
        vd_core::launcher::maximize_window(process_name.as_deref()),
    )
}

/// Restaura una ventana. Si no se especifica nombre, restaura la activa.
#[napi]
pub fn restore_window(process_name: Option<String>) -> bool {
    crate::informar(
        "restoreWindow",
        vd_core::launcher::restore_window(process_name.as_deref()),
    )
}

/// Cierra suavemente una ventana vía mensaje WM_CLOSE sin forzar la terminación del proceso.
#[napi]
pub fn close_window(process_name: Option<String>) -> bool {
    crate::informar(
        "closeWindow",
        vd_core::launcher::close_window(process_name.as_deref()),
    )
}
