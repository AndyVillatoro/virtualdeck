//! Arranque con Windows.
//!
//! Se hace con una entrada en `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`,
//! que es la vía documentada y **no necesita permisos de administrador**: vive en
//! la rama del usuario actual, no en la de la máquina.
//!
//! La alternativa —una tarea programada— permitiría arrancar elevado, pero exige
//! UAC al configurarla y es exactamente el tipo de fricción que este proyecto
//! está quitando de en medio.

use windows::core::{w, PCWSTR};
use windows::Win32::Foundation::ERROR_FILE_NOT_FOUND;
use windows::Win32::System::Registry::{
    RegCloseKey, RegDeleteValueW, RegOpenKeyExW, RegQueryValueExW, RegSetValueExW, HKEY,
    HKEY_CURRENT_USER, KEY_READ, KEY_WRITE, REG_SZ,
};

/// Nombre de la entrada. Cambiarlo dejaría huérfana la anterior, que seguiría
/// arrancando la aplicación.
const VALOR: PCWSTR = w!("VirtualDeck");
const CLAVE: PCWSTR = w!(r"Software\Microsoft\Windows\CurrentVersion\Run");

#[derive(Debug, thiserror::Error)]
pub enum ArranqueError {
    #[error("no se pudo acceder al registro: {0}")]
    Registro(#[from] windows::core::Error),

    #[error("no se pudo averiguar la ruta del ejecutable: {0}")]
    Ruta(#[from] std::io::Error),
}

/// Abre la clave `Run` con los permisos indicados.
fn abrir(permisos: windows::Win32::System::Registry::REG_SAM_FLAGS) -> Result<HKEY, ArranqueError> {
    let mut clave = HKEY::default();
    unsafe { RegOpenKeyExW(HKEY_CURRENT_USER, CLAVE, None, permisos, &mut clave) }.ok()?;
    Ok(clave)
}

/// Dice si la aplicación está configurada para arrancar con Windows.
pub fn activo() -> bool {
    let Ok(clave) = abrir(KEY_READ) else {
        return false;
    };
    let mut tam = 0u32;
    let r = unsafe { RegQueryValueExW(clave, VALOR, None, None, None, Some(&mut tam)) };
    unsafe {
        let _ = RegCloseKey(clave);
    }
    // Cualquier error que no sea "no existe" tambien significa que no esta
    // activo desde el punto de vista del usuario.
    r.is_ok()
}

/// Activa o desactiva el arranque con Windows.
pub fn set(activar: bool) -> Result<(), ArranqueError> {
    let clave = abrir(KEY_WRITE)?;

    let resultado = if activar {
        // La ruta se entrecomilla: sin comillas, una ruta con espacios
        // —`C:\Program Files\...`— se interpreta como varios argumentos y
        // Windows no encuentra el ejecutable.
        let exe = std::env::current_exe()?;
        let linea = format!("\"{}\"", exe.display());
        let ancha: Vec<u16> = linea.encode_utf16().chain(std::iter::once(0)).collect();
        let bytes =
            unsafe { std::slice::from_raw_parts(ancha.as_ptr().cast::<u8>(), ancha.len() * 2) };
        unsafe { RegSetValueExW(clave, VALOR, None, REG_SZ, Some(bytes)) }
    } else {
        let r = unsafe { RegDeleteValueW(clave, VALOR) };
        // Borrar algo que no estaba no es un fallo: el estado final es el pedido.
        if r == ERROR_FILE_NOT_FOUND {
            windows::Win32::Foundation::WIN32_ERROR(0)
        } else {
            r
        }
    };

    unsafe {
        let _ = RegCloseKey(clave);
    }
    resultado.ok()?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn consultar_el_estado_no_falla() {
        // Solo lee; el valor concreto depende de la maquina.
        let _ = activo();
    }

    /// Prueba el camino de escritura **devolviendo el registro a como estaba**.
    ///
    /// Marcado `ignore`: escribe en el registro del usuario, y aunque restaure,
    /// un `cargo test` no deberia tocarlo. Ver la regla en
    /// `docs/MIGRACION-RUST.md`. Para ejercitarlo a proposito:
    ///
    /// ```text
    /// cargo test -p vd-core activa_y_restaura -- --ignored --nocapture
    /// ```
    #[test]
    #[ignore = "escribe en el registro de Windows"]
    fn activa_y_restaura() {
        let original = activo();
        println!("estado original: {original}");

        set(!original).expect("deberia poder cambiarlo");
        assert_eq!(activo(), !original, "el cambio no se reflejo");

        set(original).expect("deberia poder restaurarlo");
        assert_eq!(activo(), original, "no quedo como estaba");
        println!("restaurado a {original}");
    }
}
