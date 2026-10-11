//! Operaciones basicas sobre ventanas: foco, minimizar, maximizar, restaurar,
//! cerrar e informacion de la app en primer plano.

use windows::Win32::Foundation::{HWND, LPARAM, WPARAM};
use windows::Win32::UI::WindowsAndMessaging::{
    GetForegroundWindow, PostMessageW, ShowWindow, SW_MINIMIZE, SW_MAXIMIZE, SW_RESTORE, WM_CLOSE,
};

use super::snap::{resolve_target_hwnd, window_of_process};
use super::super::LauncherError;

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
