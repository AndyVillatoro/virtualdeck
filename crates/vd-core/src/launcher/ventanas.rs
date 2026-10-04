//! Colocar ventanas en cuadrantes de la pantalla (window snapping).
//!
//! Reemplaza el bloque de C# con P/Invoke a `user32.dll` que la version Electron
//! compilaba dentro de un script de PowerShell.

use windows::Win32::Foundation::{HWND, LPARAM, RECT, WPARAM};
use windows::Win32::Graphics::Gdi::{
    GetMonitorInfoW, MonitorFromWindow, MONITORINFO, MONITOR_DEFAULTTONEAREST,
};
use windows::Win32::UI::WindowsAndMessaging::{
    GetForegroundWindow, PostMessageW, SetWindowPos, ShowWindow, SystemParametersInfoW,
    HWND_TOP, SPI_GETWORKAREA, SWP_NOZORDER, SW_MAXIMIZE, SW_MINIMIZE, SW_RESTORE,
    SYSTEM_PARAMETERS_INFO_UPDATE_FLAGS, WM_CLOSE,
};

use super::{procesos, LauncherError};

/// Posicion destino de una ventana.
///
/// Coincide con los valores que ya guarda `deck-config.json`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SnapPosition {
    LeftHalf,
    RightHalf,
    TopHalf,
    BottomHalf,
    TopLeft,
    TopRight,
    BottomLeft,
    BottomRight,
    Maximize,
    Center,
    Restore,
}

impl SnapPosition {
    /// Convierte el valor textual de la configuracion.
    pub fn from_config(s: &str) -> Option<Self> {
        Some(match s {
            "left-half" => Self::LeftHalf,
            "right-half" => Self::RightHalf,
            "top-half" => Self::TopHalf,
            "bottom-half" => Self::BottomHalf,
            "top-left" => Self::TopLeft,
            "top-right" => Self::TopRight,
            "bottom-left" => Self::BottomLeft,
            "bottom-right" => Self::BottomRight,
            "maximize" => Self::Maximize,
            "center" => Self::Center,
            "restore" => Self::Restore,
            _ => return None,
        })
    }

    /// Rectangulo destino dentro del area de trabajo.
    ///
    /// Devuelve `None` para los casos que no son un rectangulo calculado
    /// (maximizar y restaurar).
    fn rect_in(&self, area: RECT) -> Option<(i32, i32, i32, i32)> {
        let ancho = area.right - area.left;
        let alto = area.bottom - area.top;
        let (mx, my) = (ancho / 2, alto / 2);

        let r = match self {
            Self::LeftHalf => (area.left, area.top, mx, alto),
            Self::RightHalf => (area.left + mx, area.top, ancho - mx, alto),
            Self::TopHalf => (area.left, area.top, ancho, my),
            Self::BottomHalf => (area.left, area.top + my, ancho, alto - my),
            Self::TopLeft => (area.left, area.top, mx, my),
            Self::TopRight => (area.left + mx, area.top, ancho - mx, my),
            Self::BottomLeft => (area.left, area.top + my, mx, alto - my),
            Self::BottomRight => (area.left + mx, area.top + my, ancho - mx, alto - my),
            // Centrada al 60% del area, que es lo que hacia la version Electron.
            Self::Center => {
                let w = ancho * 3 / 5;
                let h = alto * 3 / 5;
                (area.left + (ancho - w) / 2, area.top + (alto - h) / 2, w, h)
            }
            Self::Maximize | Self::Restore => return None,
        };
        Some(r)
    }
}

/// Area de trabajo del escritorio (pantalla menos la barra de tareas).
fn work_area() -> RECT {
    let mut area = RECT::default();
    // SAFETY: se pasa un RECT valido del tamanio correcto.
    unsafe {
        let _ = SystemParametersInfoW(
            SPI_GETWORKAREA,
            0,
            Some(&mut area as *mut RECT as *mut _),
            SYSTEM_PARAMETERS_INFO_UPDATE_FLAGS(0),
        );
    }
    // Si la llamada falla, un area en cero dejaria ventanas invisibles.
    if area.right <= area.left || area.bottom <= area.top {
        RECT {
            left: 0,
            top: 0,
            right: 1920,
            bottom: 1080,
        }
    } else {
        area
    }
}

/// Area de trabajo especifica del monitor donde se encuentra la ventana indicada.
fn work_area_for_hwnd(hwnd: HWND) -> RECT {
    let mut mi = MONITORINFO {
        cbSize: std::mem::size_of::<MONITORINFO>() as u32,
        ..Default::default()
    };
    let hmon = unsafe { MonitorFromWindow(hwnd, MONITOR_DEFAULTTONEAREST) };
    if !hmon.is_invalid() && unsafe { GetMonitorInfoW(hmon, &mut mi).as_bool() } {
        if mi.rcWork.right > mi.rcWork.left && mi.rcWork.bottom > mi.rcWork.top {
            return mi.rcWork;
        }
    }
    work_area()
}

/// Primera ventana principal de un proceso, buscando por nombre.
fn window_of_process(name: &str) -> Option<HWND> {
    use windows::core::BOOL;
    use windows::Win32::Foundation::LPARAM;
    use windows::Win32::UI::WindowsAndMessaging::{
        EnumWindows, GetWindowTextLengthW, GetWindowThreadProcessId, IsWindowVisible,
    };

    let objetivo = name.trim().trim_end_matches(".exe").to_lowercase();
    let pids: Vec<u32> = procesos::running_processes()
        .ok()?
        .into_iter()
        .filter(|p| p.name == objetivo)
        .map(|p| p.pid)
        .collect();
    if pids.is_empty() {
        return None;
    }

    struct Ctx {
        pids: Vec<u32>,
        encontrada: Option<HWND>,
    }

    unsafe extern "system" fn cb(hwnd: HWND, lparam: LPARAM) -> BOOL {
        // SAFETY: lparam es el &mut Ctx que se pasa abajo.
        let ctx = unsafe { &mut *(lparam.0 as *mut Ctx) };
        // SAFETY: hwnd valido provisto por Windows.
        unsafe {
            if IsWindowVisible(hwnd).as_bool() && GetWindowTextLengthW(hwnd) > 0 {
                let mut pid = 0u32;
                GetWindowThreadProcessId(hwnd, Some(&mut pid));
                if ctx.pids.contains(&pid) {
                    ctx.encontrada = Some(hwnd);
                    return BOOL(0); // encontrada: dejar de enumerar
                }
            }
        }
        BOOL(1)
    }

    let mut ctx = Ctx {
        pids,
        encontrada: None,
    };
    // SAFETY: ctx vive hasta despues de EnumWindows.
    unsafe {
        let _ = EnumWindows(Some(cb), LPARAM(&mut ctx as *mut Ctx as isize));
    }
    ctx.encontrada
}

/// Resuelve el HWND de destino: o el proceso pedido o la ventana en primer plano.
fn resolve_target_hwnd(process_name: Option<&str>) -> Result<HWND, LauncherError> {
    let hwnd = match process_name.filter(|s| !s.trim().is_empty()) {
        Some(nombre) => window_of_process(nombre).ok_or_else(|| {
            LauncherError::Spawn(format!("no se encontro una ventana de \"{nombre}\""))
        })?,
        // SAFETY: llamada simple sin parametros.
        None => unsafe { GetForegroundWindow() },
    };

    if hwnd.is_invalid() {
        return Err(LauncherError::Spawn("no hay ventana destino".into()));
    }
    Ok(hwnd)
}

/// Coloca una ventana en la posicion indicada, respetando el monitor donde reside.
///
/// Si `process_name` es `None` se actua sobre la ventana en primer plano, que
/// es el comportamiento por defecto de la accion `window-snap`.
pub fn snap_window(
    position: SnapPosition,
    process_name: Option<&str>,
) -> Result<(), LauncherError> {
    let hwnd = resolve_target_hwnd(process_name)?;

    // SAFETY: hwnd valido. Restaurar antes de mover es necesario: una ventana
    // maximizada ignora SetWindowPos.
    unsafe {
        match position {
            SnapPosition::Maximize => {
                let _ = ShowWindow(hwnd, SW_MAXIMIZE);
            }
            SnapPosition::Restore => {
                let _ = ShowWindow(hwnd, SW_RESTORE);
            }
            otra => {
                // Siempre: minimizada o maximizada, SetWindowPos no la mueve.
                let _ = ShowWindow(hwnd, SW_RESTORE);
                // El area de trabajo del monitor donde esta la ventana, no la
                // del principal (quedaba la linea vieja junto a la nueva).
                if let Some((x, y, w, h)) = otra.rect_in(work_area_for_hwnd(hwnd)) {
                    SetWindowPos(hwnd, Some(HWND_TOP), x, y, w, h, SWP_NOZORDER)?;
                }
            }
        }
    }

    Ok(())
}

/// Trae al frente la ventana principal de un proceso.
pub fn focus_window(process_name: &str) -> Result<(), LauncherError> {
    let hwnd = window_of_process(process_name).ok_or_else(|| {
        LauncherError::Spawn(format!("no se encontro una ventana de \"{process_name}\""))
    })?;
    if force_foreground(hwnd.0 as isize) {
        Ok(())
    } else {
        Err(LauncherError::Spawn(format!(
            "no se pudo traer al frente la ventana de \"{process_name}\""
        )))
    }
}

/// Minimiza una ventana. Si no se especifica proceso, minimiza la activa.
pub fn minimize_window(process_name: Option<&str>) -> Result<(), LauncherError> {
    let hwnd = resolve_target_hwnd(process_name)?;
    unsafe {
        let _ = ShowWindow(hwnd, SW_MINIMIZE);
    }
    Ok(())
}

/// Maximiza una ventana. Si no se especifica proceso, maximiza la activa.
pub fn maximize_window(process_name: Option<&str>) -> Result<(), LauncherError> {
    let hwnd = resolve_target_hwnd(process_name)?;
    unsafe {
        let _ = ShowWindow(hwnd, SW_MAXIMIZE);
    }
    Ok(())
}

/// Restaura una ventana. Si no se especifica proceso, restaura la activa.
pub fn restore_window(process_name: Option<&str>) -> Result<(), LauncherError> {
    let hwnd = resolve_target_hwnd(process_name)?;
    unsafe {
        let _ = ShowWindow(hwnd, SW_RESTORE);
    }
    Ok(())
}

/// Cierra una ventana limpiamente via WM_CLOSE (sin forzar terminacion del proceso).
pub fn close_window(process_name: Option<&str>) -> Result<(), LauncherError> {
    let hwnd = resolve_target_hwnd(process_name)?;
    unsafe {
        let _ = PostMessageW(Some(hwnd), WM_CLOSE, WPARAM(0), LPARAM(0));
    }
    Ok(())
}

/// Informacion de la aplicacion y ventana actualmente en primer plano.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ActiveAppInfo {
    pub process_name: Option<String>,
    pub window_title: Option<String>,
}

/// Consulta la ventana en primer plano del sistema en <0.05ms (directo por Win32).
pub fn active_app() -> Option<ActiveAppInfo> {
    use windows::Win32::Foundation::CloseHandle;
    use windows::Win32::System::Threading::{
        OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_WIN32,
        PROCESS_QUERY_LIMITED_INFORMATION,
    };
    use windows::Win32::UI::WindowsAndMessaging::{
        GetForegroundWindow, GetWindowTextLengthW, GetWindowTextW, GetWindowThreadProcessId,
    };

    unsafe {
        let hwnd = GetForegroundWindow();
        if hwnd.is_invalid() {
            return None;
        }

        let mut pid = 0u32;
        GetWindowThreadProcessId(hwnd, Some(&mut pid));

        let window_title = {
            let len = GetWindowTextLengthW(hwnd);
            if len > 0 {
                let mut buf = vec![0u16; len as usize + 1];
                let written = GetWindowTextW(hwnd, &mut buf);
                if written > 0 {
                    Some(String::from_utf16_lossy(&buf[..written as usize]))
                } else {
                    None
                }
            } else {
                None
            }
        };

        let process_name = if pid > 0 {
            if let Ok(handle) = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) {
                let mut buf = vec![0u16; 512];
                let mut len = buf.len() as u32;
                let ok = QueryFullProcessImageNameW(
                    handle,
                    PROCESS_NAME_WIN32,
                    windows::core::PWSTR(buf.as_mut_ptr()),
                    &mut len,
                );
                let _ = CloseHandle(handle);
                if ok.is_ok() && len > 0 {
                    let full = String::from_utf16_lossy(&buf[..len as usize]);
                    full.rsplit(['\\', '/'])
                        .next()
                        .map(|s| s.trim_end_matches(".exe").to_lowercase())
                } else {
                    None
                }
            } else {
                None
            }
        } else {
            None
        };

        Some(ActiveAppInfo {
            process_name,
            window_title,
        })
    }
}

/// Trae una ventana al frente y le da el foco de teclado.
///
/// # Por que hace falta esta maniobra
///
/// Windows no deja que un proceso que no esta en primer plano robe el foco:
/// `SetForegroundWindow` a secas falla silenciosamente y la ventana solo parpadea
/// en la barra de tareas. La regla existe para que ningun programa te interrumpa
/// mientras escribis, y es correcta.
///
/// El rodeo aceptado es adjuntar temporalmente la cola de entrada del hilo que
/// **si** tiene el primer plano a la del nuestro: mientras estan unidas, Windows
/// nos considera parte de la misma sesion de entrada y acepta el cambio.
///
/// Esto es lo contrario de la deuda del robo de foco anotada en
/// `docs/MIGRACION-RUST.md`: alli el problema es **devolver** el foco a la ventana
/// del usuario antes de reproducir una macro. Las dos caras necesitan las mismas
/// primitivas.
///
/// Devuelve `true` si la ventana quedo en primer plano.
pub fn force_foreground(hwnd: isize) -> bool {
    use windows::Win32::System::Threading::GetCurrentThreadId;
    use windows::Win32::UI::Input::KeyboardAndMouse::{SetActiveWindow, SetFocus};
    use windows::Win32::UI::WindowsAndMessaging::{
        GetWindowThreadProcessId, SetForegroundWindow, ShowWindow, SW_SHOW,
    };
    // AttachThreadInput vive en Threading, no en WindowsAndMessaging.
    use windows::Win32::System::Threading::AttachThreadInput;

    let destino = HWND(hwnd as *mut core::ffi::c_void);

    unsafe {
        let _ = ShowWindow(destino, SW_SHOW);

        let primer_plano = GetForegroundWindow();
        // Si ya somos la ventana activa no hay nada que hacer, y adjuntar un hilo
        // a si mismo es un error.
        if primer_plano == destino {
            return true;
        }

        let hilo_ajeno = GetWindowThreadProcessId(primer_plano, None);
        let hilo_propio = GetCurrentThreadId();
        let hay_que_adjuntar = hilo_ajeno != 0 && hilo_ajeno != hilo_propio;

        if hay_que_adjuntar {
            let _ = AttachThreadInput(hilo_ajeno, hilo_propio, true);
        }

        let ok = SetForegroundWindow(destino).as_bool();
        let _ = SetActiveWindow(destino);
        let _ = SetFocus(Some(destino));

        // Desadjuntar siempre, incluso si fallo: dejar las colas unidas hace que
        // los dos procesos compartan estado de entrada y se bloqueen entre si.
        if hay_que_adjuntar {
            let _ = AttachThreadInput(hilo_ajeno, hilo_propio, false);
        }

        ok || GetForegroundWindow() == destino
    }
}

/// Una ventana de aplicación abierta, como las que salen en Alt+Tab.
struct VentanaApp {
    hwnd: HWND,
    proceso: String,
}

/// ¿Sale en Alt+Tab? Visible, sin dueño, con título, que no sea de
/// herramientas ni esté oculta por DWM (las apps UWP suspendidas siguen
/// «visibles» pero tapadas), ni el escritorio (`Progman`), ni de este proceso.
fn es_ventana_de_aplicacion(hwnd: HWND, pid_propio: u32) -> bool {
    use windows::Win32::Graphics::Dwm::{DwmGetWindowAttribute, DWMWA_CLOAKED};
    use windows::Win32::UI::WindowsAndMessaging::{
        GetClassNameW, GetWindow, GetWindowLongPtrW, GetWindowTextLengthW,
        GetWindowThreadProcessId, IsWindowVisible, GWL_EXSTYLE, GW_OWNER, WS_EX_TOOLWINDOW,
    };
    // SAFETY: hwnd lo da EnumWindows; los buffers tienen el tamanio que se pasa.
    unsafe {
        if !IsWindowVisible(hwnd).as_bool() || GetWindowTextLengthW(hwnd) == 0 {
            return false;
        }
        if GetWindow(hwnd, GW_OWNER).map(|h| !h.is_invalid()).unwrap_or(false) {
            return false;
        }
        if (GetWindowLongPtrW(hwnd, GWL_EXSTYLE) as u32) & WS_EX_TOOLWINDOW.0 != 0 {
            return false;
        }
        let mut tapada: u32 = 0;
        let _ = DwmGetWindowAttribute(
            hwnd,
            DWMWA_CLOAKED,
            &mut tapada as *mut u32 as *mut _,
            std::mem::size_of::<u32>() as u32,
        );
        if tapada != 0 {
            return false;
        }
        let mut clase = [0u16; 32];
        let n = GetClassNameW(hwnd, &mut clase) as usize;
        if String::from_utf16_lossy(&clase[..n]) == "Progman" {
            return false;
        }
        let mut pid = 0u32;
        GetWindowThreadProcessId(hwnd, Some(&mut pid));
        pid != pid_propio
    }
}

/// Las ventanas de aplicación, **en el orden de pila de Windows** (la de
/// arriba primero), que es lo que devuelve `EnumWindows`.
fn ventanas_de_aplicacion() -> Vec<VentanaApp> {
    use windows::core::BOOL;
    use windows::Win32::System::Threading::GetCurrentProcessId;
    use windows::Win32::UI::WindowsAndMessaging::{EnumWindows, GetWindowThreadProcessId};

    struct Ctx {
        pid_propio: u32,
        nombres: std::collections::HashMap<u32, String>,
        salida: Vec<VentanaApp>,
    }
    unsafe extern "system" fn cb(hwnd: HWND, lparam: LPARAM) -> BOOL {
        // SAFETY: lparam es el &mut Ctx que se pasa abajo.
        let ctx = unsafe { &mut *(lparam.0 as *mut Ctx) };
        if es_ventana_de_aplicacion(hwnd, ctx.pid_propio) {
            let mut pid = 0u32;
            // SAFETY: hwnd valido provisto por Windows.
            unsafe { GetWindowThreadProcessId(hwnd, Some(&mut pid)) };
            let proceso = ctx.nombres.get(&pid).cloned().unwrap_or_default();
            ctx.salida.push(VentanaApp { hwnd, proceso });
        }
        BOOL(1)
    }

    let nombres = procesos::running_processes()
        .map(|l| l.into_iter().map(|p| (p.pid, p.name)).collect())
        .unwrap_or_default();
    let mut ctx = Ctx {
        // SAFETY: llamada simple sin parametros.
        pid_propio: unsafe { GetCurrentProcessId() },
        nombres,
        salida: Vec::new(),
    };
    // SAFETY: ctx vive hasta despues de EnumWindows.
    unsafe {
        let _ = EnumWindows(Some(cb), LPARAM(&mut ctx as *mut Ctx as isize));
    }
    ctx.salida
}

/// Respaldo de `force_foreground`. Windows solo deja traer una ventana al
/// frente al proceso que tiene el foco o que recibió la última entrada, y
/// desde el dock VirtualDeck no tiene ninguna de las dos (medido: adelante
/// funcionó una vez y todo lo demás falló, también con `SwitchToThisWindow`).
/// Pulsar `Alt` levanta ese bloqueo —por eso Alt+Tab funciona siempre—; la
/// tecla `0xE8` (sin asignar) entre medias evita que soltar `Alt` abra el menú
/// de la ventana, que es lo que hace AutoHotkey.
fn cambiar_a(hwnd: HWND) -> bool {
    use windows::Win32::UI::Input::KeyboardAndMouse::{
        SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, KEYBDINPUT, KEYBD_EVENT_FLAGS, KEYEVENTF_KEYUP,
        VIRTUAL_KEY, VK_MENU,
    };
    use windows::Win32::UI::WindowsAndMessaging::SetForegroundWindow;
    let tecla = |vk: VIRTUAL_KEY, arriba: bool| INPUT {
        r#type: INPUT_KEYBOARD,
        Anonymous: INPUT_0 {
            ki: KEYBDINPUT {
                wVk: vk,
                dwFlags: if arriba { KEYEVENTF_KEYUP } else { KEYBD_EVENT_FLAGS(0) },
                ..Default::default()
            },
        },
    };
    let mascara = VIRTUAL_KEY(0xE8);
    // SAFETY: estructuras INPUT validas; hwnd recien enumerado.
    unsafe {
        let antes = [tecla(VK_MENU, false), tecla(mascara, false), tecla(mascara, true)];
        SendInput(&antes, std::mem::size_of::<INPUT>() as i32);
        let _ = SetForegroundWindow(hwnd);
        SendInput(&[tecla(VK_MENU, true)], std::mem::size_of::<INPUT>() as i32);
        GetForegroundWindow() == hwnd
    }
}

/// Los procesos que tienen una ventana de aplicación abierta (las de Alt+Tab),
/// sin repetir y en orden alfabético. Es lo que se ofrece al vincular una
/// página a una app: la lista de todos los procesos trae cientos de servicios.
pub fn open_apps() -> Vec<String> {
    let mut nombres: Vec<String> = ventanas_de_aplicacion()
        .into_iter()
        .map(|v| v.proceso)
        // `applicationframehost` aloja a todas las apps de la Tienda
        // (Calculadora, Configuración...): vincular una página a él la
        // activaría con cualquiera de ellas.
        .filter(|p| !p.is_empty() && p != "applicationframehost")
        .collect();
    nombres.sort();
    nombres.dedup();
    nombres
}

/// A qué posición se va desde `actual` en una lista de `total`, dando la vuelta.
fn indice_vecino(actual: Option<usize>, total: usize, adelante: bool) -> Option<usize> {
    if total == 0 {
        return None;
    }
    Some(match (actual, adelante) {
        (None, true) => 0,
        (None, false) => total - 1,
        (Some(i), true) => (i + 1) % total,
        (Some(i), false) => (i + total - 1) % total,
    })
}

/// Trae al frente la ventana de aplicación siguiente (o la anterior).
///
/// `Alt+Tab` ordena por uso reciente, así que «la siguiente» cambia cada vez
/// que se usa. Aquí el orden es **estable** —por nombre de proceso y, dentro
/// del mismo, por identificador de ventana— y se puede recorrer con una
/// perilla. La actual es la de primer plano, o la de arriba de la pila si la
/// de primer plano no cuenta (se pulsó desde la propia pantalla de VirtualDeck). Devuelve el proceso que quedó delante.
pub fn cycle_window(adelante: bool) -> Result<String, LauncherError> {
    use windows::Win32::UI::WindowsAndMessaging::IsIconic;

    let en_pila = ventanas_de_aplicacion();
    // La de primer plano si es de aplicación; si no (VirtualDeck delante), la
    // de arriba de la pila. Solo la pila no basta: tarda unos milisegundos en
    // reordenarse tras traer una ventana, y girando rápido la perilla el
    // segundo clic se calculaba desde la anterior y no avanzaba (medido).
    // SAFETY: llamada simple sin parametros.
    let delante = unsafe { GetForegroundWindow() };
    let arriba = en_pila
        .iter()
        .find(|v| v.hwnd == delante)
        .or_else(|| en_pila.first())
        .map(|v| v.hwnd);
    let mut orden = en_pila;
    orden.sort_by(|a, b| a.proceso.cmp(&b.proceso).then((a.hwnd.0 as usize).cmp(&(b.hwnd.0 as usize))));
    let actual = arriba.and_then(|h| orden.iter().position(|v| v.hwnd == h));
    let i = indice_vecino(actual, orden.len(), adelante)
        .ok_or_else(|| LauncherError::Spawn("no hay ventanas abiertas".into()))?;
    let destino = &orden[i];
    // SAFETY: hwnd valido recien enumerado.
    unsafe {
        if IsIconic(destino.hwnd).as_bool() {
            let _ = ShowWindow(destino.hwnd, SW_RESTORE);
        }
    }
    if force_foreground(destino.hwnd.0 as isize) || cambiar_a(destino.hwnd) {
        Ok(destino.proceso.clone())
    } else {
        Err(LauncherError::Spawn(format!("Windows no dejo traer \"{}\"", destino.proceso)))
    }
}

#[cfg(test)]
mod tests {
    #[test]
    fn indice_vecino_da_la_vuelta() {
        assert_eq!(super::indice_vecino(Some(2), 3, true), Some(0));
        assert_eq!(super::indice_vecino(Some(0), 3, false), Some(2));
        assert_eq!(super::indice_vecino(None, 3, true), Some(0));
        assert_eq!(super::indice_vecino(None, 3, false), Some(2));
        assert_eq!(super::indice_vecino(Some(1), 0, true), None);
    }

    use super::*;

    const AREA: RECT = RECT {
        left: 0,
        top: 0,
        right: 1920,
        bottom: 1080,
    };

    #[test]
    fn las_mitades_cubren_la_pantalla_sin_solaparse() {
        let izq = SnapPosition::LeftHalf.rect_in(AREA).unwrap();
        let der = SnapPosition::RightHalf.rect_in(AREA).unwrap();
        assert_eq!(izq, (0, 0, 960, 1080));
        assert_eq!(der, (960, 0, 960, 1080));
        // Juntas cubren todo el ancho, sin huecos ni superposicion.
        assert_eq!(izq.2 + der.2, 1920);
    }

    #[test]
    fn los_cuadrantes_cubren_la_pantalla() {
        let esquinas = [
            SnapPosition::TopLeft,
            SnapPosition::TopRight,
            SnapPosition::BottomLeft,
            SnapPosition::BottomRight,
        ];
        let area_total: i32 = esquinas
            .iter()
            .map(|p| {
                let (_, _, w, h) = p.rect_in(AREA).unwrap();
                w * h
            })
            .sum();
        assert_eq!(area_total, 1920 * 1080);
    }

    #[test]
    fn con_ancho_impar_no_se_pierde_un_pixel() {
        // Una pantalla de ancho impar no debe dejar una franja sin cubrir.
        let area = RECT {
            left: 0,
            top: 0,
            right: 1921,
            bottom: 1080,
        };
        let izq = SnapPosition::LeftHalf.rect_in(area).unwrap();
        let der = SnapPosition::RightHalf.rect_in(area).unwrap();
        assert_eq!(izq.2 + der.2, 1921);
    }

    #[test]
    fn respeta_un_area_de_trabajo_desplazada() {
        // Barra de tareas arriba: el area no empieza en (0,0).
        let area = RECT {
            left: 0,
            top: 40,
            right: 1920,
            bottom: 1080,
        };
        let (x, y, _, h) = SnapPosition::LeftHalf.rect_in(area).unwrap();
        assert_eq!((x, y), (0, 40));
        assert_eq!(h, 1040);
    }

    #[test]
    fn maximizar_y_restaurar_no_son_rectangulos() {
        assert!(SnapPosition::Maximize.rect_in(AREA).is_none());
        assert!(SnapPosition::Restore.rect_in(AREA).is_none());
    }

    #[test]
    fn se_parsean_los_valores_de_la_configuracion() {
        assert_eq!(
            SnapPosition::from_config("left-half"),
            Some(SnapPosition::LeftHalf)
        );
        assert_eq!(
            SnapPosition::from_config("bottom-right"),
            Some(SnapPosition::BottomRight)
        );
        assert_eq!(SnapPosition::from_config("inventada"), None);
    }

    #[test]
    fn active_app_no_entra_en_panico() {
        let _ = active_app();
    }
}
