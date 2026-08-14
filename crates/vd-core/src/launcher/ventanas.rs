//! Colocar ventanas en cuadrantes de la pantalla (window snapping).
//!
//! Reemplaza el bloque de C# con P/Invoke a `user32.dll` que la version Electron
//! compilaba dentro de un script de PowerShell.

use windows::Win32::Foundation::{HWND, RECT};
use windows::Win32::UI::WindowsAndMessaging::{
    GetForegroundWindow, IsIconic, SetWindowPos, ShowWindow, SystemParametersInfoW, HWND_TOP,
    SPI_GETWORKAREA, SWP_NOZORDER, SW_MAXIMIZE, SW_RESTORE, SYSTEM_PARAMETERS_INFO_UPDATE_FLAGS,
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

/// Coloca una ventana en la posicion indicada.
///
/// Si `process_name` es `None` se actua sobre la ventana en primer plano, que
/// es el comportamiento por defecto de la accion `window-snap`.
pub fn snap_window(
    position: SnapPosition,
    process_name: Option<&str>,
) -> Result<(), LauncherError> {
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
                if IsIconic(hwnd).as_bool() {
                    let _ = ShowWindow(hwnd, SW_RESTORE);
                }
                let _ = ShowWindow(hwnd, SW_RESTORE);
                if let Some((x, y, w, h)) = otra.rect_in(work_area()) {
                    SetWindowPos(hwnd, Some(HWND_TOP), x, y, w, h, SWP_NOZORDER)?;
                }
            }
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
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
}
