//! Brillo de pantalla.
//!
//! # Dos caminos, porque no hay uno solo que sirva
//!
//! Windows expone el brillo por dos APIs distintas segun el tipo de pantalla, y
//! **ninguna funciona en los dos casos**:
//!
//! - **Paneles internos** (portatiles, algunos todo-en-uno): WMI, clase
//!   `WmiMonitorBrightnessMethods` en `root\wmi`.
//! - **Monitores externos** (lo normal en un escritorio): DDC/CI, hablando con
//!   el monitor por el propio cable de video mediante `dxva2.dll`.
//!
//! La version Electron implementaba **solo WMI**, asi que la accion de brillo
//! sencillamente no hacia nada en equipos de escritorio. Aca se intentan los dos:
//! primero WMI, y si no hay panel interno, DDC/CI sobre todos los monitores
//! conectados. Es una mejora sobre el comportamiento original, no solo un porteo.

use super::LauncherError;

/// Ajusta el brillo (0-100) de las pantallas que lo permitan.
///
/// Devuelve cuantas pantallas aceptaron el cambio. Cero no es un error: hay
/// monitores que directamente no soportan control por software.
pub fn set_brightness(percent: i64) -> Result<usize, LauncherError> {
    let nivel = nivel_valido(percent);

    let mut aplicadas = wmi_set(nivel).unwrap_or(0);
    aplicadas += ddc_set(nivel);

    Ok(aplicadas)
}

/// Lleva un porcentaje al rango que aceptan las dos APIs.
///
/// Esta separado de [`set_brightness`] para poder probarlo **sin tocar el
/// hardware**. Un test que aplique brillo de verdad le cambia la pantalla a quien
/// compile el proyecto, y ademas no la deja como estaba.
fn nivel_valido(percent: i64) -> u32 {
    percent.clamp(0, 100) as u32
}

/// Lee el brillo actual de la primera pantalla que sepa informarlo.
pub fn brightness() -> Option<u32> {
    wmi_get().or_else(ddc_get)
}

// ---------------------------------------------------------------------------
// Camino 1: WMI (paneles internos)
// ---------------------------------------------------------------------------

/// Aplica el brillo por WMI. Devuelve cuantos paneles respondieron.
///
/// `WmiSetBrightness` es un metodo **de instancia**: hay que localizar cada
/// instancia de `WmiMonitorBrightnessMethods` por su `__PATH` y ejecutar el
/// metodo sobre ella.
fn wmi_set(nivel: u32) -> Option<usize> {
    use std::collections::HashMap;
    use wmi::{Variant, WMIConnection};

    let con = WMIConnection::with_namespace_path("root\\wmi").ok()?;

    let instancias: Vec<HashMap<String, Variant>> = con
        .raw_query("SELECT * FROM WmiMonitorBrightnessMethods")
        .ok()?;

    let mut ok = 0;
    for inst in &instancias {
        let Some(Variant::String(path)) = inst.get("__PATH") else {
            continue;
        };

        // Los parametros se arman sobre una instancia de la clase de entrada
        // del metodo, no como un mapa suelto.
        let armar = || -> wmi::WMIResult<()> {
            let in_params = con
                .get_object("WmiMonitorBrightnessMethods")?
                .get_method("WmiSetBrightness")?
                .ok_or(wmi::WMIError::ResultEmpty)?
                .spawn_instance()?;
            // Timeout 0 = aplicar de inmediato.
            in_params.put_property("Timeout", 0u32)?;
            in_params.put_property("Brightness", nivel as u8)?;
            con.exec_method(path, "WmiSetBrightness", Some(&in_params))?;
            Ok(())
        };

        if armar().is_ok() {
            ok += 1;
        }
    }
    Some(ok)
}

/// Lee el brillo por WMI.
fn wmi_get() -> Option<u32> {
    use std::collections::HashMap;
    use wmi::{Variant, WMIConnection};

    let con = WMIConnection::with_namespace_path("root\\wmi").ok()?;
    let filas: Vec<HashMap<String, Variant>> = con
        .raw_query("SELECT CurrentBrightness FROM WmiMonitorBrightness")
        .ok()?;

    filas
        .first()
        .and_then(|f| match f.get("CurrentBrightness") {
            Some(Variant::UI1(v)) => Some(*v as u32),
            Some(Variant::UI4(v)) => Some(*v),
            _ => None,
        })
}

// ---------------------------------------------------------------------------
// Camino 2: DDC/CI (monitores externos)
// ---------------------------------------------------------------------------

/// Handles de los monitores fisicos conectados.
///
/// Se devuelven envueltos para garantizar que se destruyen: cada
/// `GetPhysicalMonitorsFromHMONITOR` exige su `DestroyPhysicalMonitors`.
struct PhysicalMonitors(Vec<windows::Win32::Devices::Display::PHYSICAL_MONITOR>);

impl Drop for PhysicalMonitors {
    fn drop(&mut self) {
        use windows::Win32::Devices::Display::DestroyPhysicalMonitors;
        if !self.0.is_empty() {
            // SAFETY: los handles vienen de GetPhysicalMonitorsFromHMONITOR y
            // no se usan despues de esto.
            unsafe {
                let _ = DestroyPhysicalMonitors(&self.0);
            }
        }
    }
}

/// Enumera los monitores fisicos que soportan DDC/CI.
fn physical_monitors() -> PhysicalMonitors {
    use windows::core::BOOL;
    use windows::Win32::Devices::Display::{
        GetNumberOfPhysicalMonitorsFromHMONITOR, GetPhysicalMonitorsFromHMONITOR, PHYSICAL_MONITOR,
    };
    use windows::Win32::Foundation::{LPARAM, RECT};
    use windows::Win32::Graphics::Gdi::{EnumDisplayMonitors, HDC, HMONITOR};

    unsafe extern "system" fn cb(
        hmon: HMONITOR,
        _hdc: HDC,
        _rect: *mut RECT,
        lparam: LPARAM,
    ) -> BOOL {
        // SAFETY: lparam es el Vec que pasamos abajo.
        let salida = unsafe { &mut *(lparam.0 as *mut Vec<PHYSICAL_MONITOR>) };

        // SAFETY: hmon valido provisto por Windows.
        unsafe {
            let mut cantidad = 0u32;
            if GetNumberOfPhysicalMonitorsFromHMONITOR(hmon, &mut cantidad).is_err()
                || cantidad == 0
            {
                return BOOL(1);
            }
            let mut buf = vec![PHYSICAL_MONITOR::default(); cantidad as usize];
            if GetPhysicalMonitorsFromHMONITOR(hmon, &mut buf).is_ok() {
                salida.extend(buf);
            }
        }
        BOOL(1)
    }

    let mut encontrados: Vec<PHYSICAL_MONITOR> = Vec::new();
    // SAFETY: el Vec vive hasta despues de EnumDisplayMonitors.
    unsafe {
        let _ = EnumDisplayMonitors(
            None,
            None,
            Some(cb),
            LPARAM(&mut encontrados as *mut Vec<PHYSICAL_MONITOR> as isize),
        );
    }
    PhysicalMonitors(encontrados)
}

/// Aplica el brillo por DDC/CI. Devuelve cuantos monitores lo aceptaron.
fn ddc_set(nivel: u32) -> usize {
    use windows::Win32::Devices::Display::SetMonitorBrightness;

    let monitores = physical_monitors();
    let mut ok = 0;

    for m in &monitores.0 {
        // SAFETY: handle valido mientras viva `monitores`. Un monitor que no
        // soporte DDC/CI simplemente devuelve error y se ignora.
        unsafe {
            if SetMonitorBrightness(m.hPhysicalMonitor, nivel) != 0 {
                ok += 1;
            }
        }
    }
    ok
}

/// Lee el brillo del primer monitor que responda por DDC/CI.
fn ddc_get() -> Option<u32> {
    use windows::Win32::Devices::Display::GetMonitorBrightness;

    let monitores = physical_monitors();
    for m in &monitores.0 {
        let (mut min, mut actual, mut max) = (0u32, 0u32, 0u32);
        // SAFETY: handle valido; los tres punteros son a variables locales.
        let ok = unsafe {
            GetMonitorBrightness(m.hPhysicalMonitor, &mut min, &mut actual, &mut max) != 0
        };
        if ok {
            // Normalizar al rango 0-100 por si el monitor usa otra escala.
            if max > min {
                return Some(((actual - min) * 100) / (max - min));
            }
            return Some(actual);
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn el_nivel_se_recorta_al_rango_valido() {
        assert_eq!(nivel_valido(-50), 0);
        assert_eq!(nivel_valido(500), 100);
        assert_eq!(nivel_valido(0), 0);
        assert_eq!(nivel_valido(100), 100);
        assert_eq!(nivel_valido(65), 65);
    }

    /// Prueba el camino real contra el hardware, **devolviendo el brillo a como
    /// estaba**.
    ///
    /// Marcado `ignore` a proposito. La version anterior de este test llamaba a
    /// `set_brightness(500)` sin restaurar nada, asi que cada `cargo test` le
    /// dejaba las pantallas al maximo a quien compilara el proyecto. Un test no
    /// puede cambiarle el equipo a quien lo ejecuta, y menos sin devolverlo a su
    /// estado. Para ejercitarlo a proposito:
    ///
    /// ```text
    /// cargo test -p vd-core aplica_y_restaura_el_brillo -- --ignored --nocapture
    /// ```
    #[test]
    #[ignore = "cambia el brillo real de las pantallas"]
    fn aplica_y_restaura_el_brillo() {
        let Some(original) = brightness() else {
            println!("ninguna pantalla informa su brillo; nada que probar");
            return;
        };
        println!("brillo original: {original}%");

        let objetivo = if original > 50 { 40 } else { 60 };
        let aplicadas = set_brightness(objetivo).expect("aplicar brillo");
        println!("aplicado {objetivo}% a {aplicadas} pantalla(s)");

        // Se restaura pase lo que pase con la comprobacion.
        let restaurado = set_brightness(i64::from(original));
        assert!(
            restaurado.is_ok(),
            "no se pudo restaurar el brillo original"
        );
        println!("restaurado a {original}%");
    }

    #[test]
    fn enumerar_monitores_no_entra_en_panico() {
        // Test de humo del camino DDC/CI: la enumeracion y la destruccion de
        // handles tienen que funcionar aunque ningun monitor soporte DDC/CI.
        let monitores = physical_monitors();
        // Un escritorio con pantalla siempre deberia reportar al menos uno.
        println!("monitores fisicos detectados: {}", monitores.0.len());
    }
}
