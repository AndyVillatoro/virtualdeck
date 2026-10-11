//! Ciclo de ventanas estilo Alt+Tab estable y lista de apps abiertas.

use windows::Win32::Foundation::{HWND, LPARAM};
use windows::Win32::UI::WindowsAndMessaging::{GetForegroundWindow, ShowWindow, SW_RESTORE};

use super::control::force_foreground;
use super::super::{LauncherError, procesos};

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
pub(super) fn indice_vecino(actual: Option<usize>, total: usize, adelante: bool) -> Option<usize> {
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
