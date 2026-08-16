//! Notificaciones del sistema (las "tostadas" de Windows).
//!
//! # Por qué hace falta un acceso directo
//!
//! Windows no deja notificar a cualquier ejecutable: exige un **identificador de
//! aplicación** (AppUserModelID) y lo busca en un acceso directo del menú Inicio.
//! Sin él, `CreateToastNotifierWithId` falla o la notificación se descarta en
//! silencio, que es peor.
//!
//! Por eso este módulo crea el acceso directo la primera vez, apuntando al
//! ejecutable que está corriendo. Es lo mismo que hace el ejemplo oficial de
//! Microsoft para aplicaciones de escritorio no empaquetadas, y es también lo que
//! deja el instalador — quien instale nunca llegará a ejecutar esta parte.
//!
//! El acceso directo es la **única** huella que VirtualDeck deja fuera de su
//! carpeta de configuración, y solo aparece si alguien usa una acción de
//! notificación. Se puede borrar a mano sin romper nada: se vuelve a crear.

use std::path::PathBuf;

use windows::core::{Interface, HSTRING};
use windows::Data::Xml::Dom::XmlDocument;
use windows::Win32::Foundation::PROPERTYKEY;
use windows::Win32::System::Com::StructuredStorage::PROPVARIANT;
use windows::Win32::System::Com::{
    CoCreateInstance, CoTaskMemAlloc, IPersistFile, CLSCTX_INPROC_SERVER, STGM_READ,
};
use windows::Win32::UI::Shell::PropertiesSystem::IPropertyStore;
use windows::Win32::UI::Shell::{IShellLinkW, ShellLink};
use windows::UI::Notifications::{ToastNotification, ToastNotificationManager};

/// Identificador de la aplicación ante Windows.
///
/// **No cambiarlo.** Windows guarda las preferencias de notificación (permitir,
/// silenciar, prioridad) contra esta cadena; otro valor las pierde y aparece como
/// una aplicación nueva. El instalador tiene que usar exactamente esta.
pub const ID_APLICACION: &str = "AndyVillatoro.VirtualDeck";

/// Nombre del acceso directo en el menú Inicio.
const NOMBRE_ACCESO: &str = "VirtualDeck.lnk";

/// `PKEY_AppUserModel_ID`, la propiedad donde va el identificador.
///
/// Se escribe a mano porque el binding de Windows no la expone como constante.
/// Los valores salen de `propkey.h`.
const PKEY_APP_USER_MODEL_ID: PROPERTYKEY = PROPERTYKEY {
    fmtid: windows::core::GUID::from_u128(0x9F4C2855_9F79_4B39_A8D0_E1D42DE1D5F3),
    pid: 5,
};

/// `VT_LPWSTR`, el tipo de variante para una cadena ancha suelta.
const VT_LPWSTR: u16 = 31;

#[derive(Debug, thiserror::Error)]
pub enum NotifyError {
    #[error("no se pudo mostrar la notificacion: {0}")]
    Windows(#[from] windows::core::Error),

    #[error("una notificacion necesita al menos un titulo o un cuerpo")]
    Vacia,

    #[error("no se pudo registrar VirtualDeck para notificar: {0}")]
    Registro(String),
}

/// Muestra una notificación del sistema.
///
/// Vuelve enseguida: la notificación la dibuja Windows, no la aplicación, así que
/// sigue viéndose aunque VirtualDeck esté minimizado en la bandeja.
pub fn notificar(titulo: &str, cuerpo: &str) -> Result<(), NotifyError> {
    let titulo = titulo.trim();
    let cuerpo = cuerpo.trim();
    if titulo.is_empty() && cuerpo.is_empty() {
        return Err(NotifyError::Vacia);
    }

    asegurar_registro()?;

    let xml = XmlDocument::new()?;
    xml.LoadXml(&HSTRING::from(plantilla(titulo, cuerpo)))?;

    let notificacion = ToastNotification::CreateToastNotification(&xml)?;
    let notificador =
        ToastNotificationManager::CreateToastNotifierWithId(&HSTRING::from(ID_APLICACION))?;
    notificador.Show(&notificacion)?;
    Ok(())
}

/// El XML de una notificación de dos líneas.
///
/// Windows rechaza el documento entero si el texto trae `&` o `<` sin escapar, y
/// un título con "Ventas & Marketing" es de lo más normal.
fn plantilla(titulo: &str, cuerpo: &str) -> String {
    format!(
        "<toast><visual><binding template=\"ToastGeneric\">\
         <text>{}</text><text>{}</text>\
         </binding></visual></toast>",
        escapar_xml(titulo),
        escapar_xml(cuerpo)
    )
}

fn escapar_xml(texto: &str) -> String {
    let mut salida = String::with_capacity(texto.len());
    for c in texto.chars() {
        match c {
            '&' => salida.push_str("&amp;"),
            '<' => salida.push_str("&lt;"),
            '>' => salida.push_str("&gt;"),
            '"' => salida.push_str("&quot;"),
            '\'' => salida.push_str("&apos;"),
            // Los caracteres de control no son XML valido y tumbarian el
            // documento entero; el salto de linea si lo es.
            c if (c as u32) < 0x20 && c != '\n' && c != '\t' => {}
            c => salida.push(c),
        }
    }
    salida
}

/// Dónde va el acceso directo que registra la aplicación.
fn ruta_acceso_directo() -> Option<PathBuf> {
    let appdata = std::env::var_os("APPDATA")?;
    Some(
        PathBuf::from(appdata)
            .join("Microsoft")
            .join("Windows")
            .join("Start Menu")
            .join("Programs")
            .join(NOMBRE_ACCESO),
    )
}

/// Crea el acceso directo del menú Inicio si aún no existe.
fn asegurar_registro() -> Result<(), NotifyError> {
    let destino = ruta_acceso_directo()
        .ok_or_else(|| NotifyError::Registro("no se encontro la carpeta APPDATA".into()))?;

    if destino.exists() {
        // Un acceso directo ya existente no se toca: puede ser el del
        // instalador, con su icono y su carpeta de trabajo.
        return Ok(());
    }

    let ejecutable = std::env::current_exe().map_err(|e| {
        NotifyError::Registro(format!("no se pudo saber que ejecutable corre: {e}"))
    })?;

    crear_acceso_directo(&ejecutable, &destino)
}

/// Escribe un `.lnk` con el identificador de aplicación dentro.
fn crear_acceso_directo(
    ejecutable: &std::path::Path,
    destino: &std::path::Path,
) -> Result<(), NotifyError> {
    // SAFETY: cadena COM estandar. Cada interfaz se pide del mismo objeto y se
    // suelta al salir; las cadenas viven hasta despues de su llamada.
    unsafe {
        crate::audio::ensure_com();

        let enlace: IShellLinkW = CoCreateInstance(&ShellLink, None, CLSCTX_INPROC_SERVER)?;
        enlace.SetPath(&HSTRING::from(ejecutable.as_os_str()))?;
        if let Some(carpeta) = ejecutable.parent() {
            enlace.SetWorkingDirectory(&HSTRING::from(carpeta.as_os_str()))?;
        }

        // El identificador va como propiedad del enlace, no del ejecutable: es
        // lo que Windows lee para saber quien notifica.
        let propiedades: IPropertyStore = enlace.cast()?;
        let valor = propvariant_cadena(ID_APLICACION)?;
        propiedades.SetValue(&PKEY_APP_USER_MODEL_ID, &valor)?;
        propiedades.Commit()?;

        let archivo: IPersistFile = enlace.cast()?;
        archivo.Save(&HSTRING::from(destino.as_os_str()), true)?;
        // `Save` con `true` deja el archivo como "actual"; sin esto, algunas
        // versiones no lo dan por escrito hasta cerrar el proceso.
        archivo.Load(&HSTRING::from(destino.as_os_str()), STGM_READ)?;
    }
    Ok(())
}

/// Arma un `PROPVARIANT` de cadena.
///
/// La memoria la libera `SetValue` a través del `PROPVARIANT`, así que se reserva
/// con el asignador de COM y no con el de Rust.
unsafe fn propvariant_cadena(texto: &str) -> Result<PROPVARIANT, NotifyError> {
    let anchos: Vec<u16> = texto.encode_utf16().chain(std::iter::once(0)).collect();
    let bytes = std::mem::size_of_val(&anchos[..]);

    let destino = CoTaskMemAlloc(bytes) as *mut u16;
    if destino.is_null() {
        return Err(NotifyError::Registro(
            "sin memoria para el identificador".into(),
        ));
    }
    std::ptr::copy_nonoverlapping(anchos.as_ptr(), destino, anchos.len());

    let mut variante = PROPVARIANT::default();
    let crudo = &mut variante as *mut PROPVARIANT as *mut PropVariantCrudo;
    (*crudo).vt = VT_LPWSTR;
    (*crudo).reservado = [0; 3];
    (*crudo).datos = destino as *mut std::ffi::c_void;
    Ok(variante)
}

/// La forma real de un `PROPVARIANT` en memoria.
///
/// El binding lo declara con uniones anidadas que no se pueden rellenar campo a
/// campo desde Rust seguro. La disposición —tipo, tres huecos, y el dato— es
/// parte de la ABI de COM y no cambia.
#[repr(C)]
struct PropVariantCrudo {
    vt: u16,
    reservado: [u16; 3],
    datos: *mut std::ffi::c_void,
}

/// Solo para el banco de pruebas: dónde quedaría el acceso directo.
pub fn ruta_registro() -> Option<PathBuf> {
    ruta_acceso_directo()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn una_notificacion_sin_texto_se_rechaza() {
        assert!(matches!(notificar("", "   "), Err(NotifyError::Vacia)));
    }

    #[test]
    fn el_texto_se_escapa_antes_de_entrar_en_el_xml() {
        // Un titulo con "&" tumbaria el documento entero y la notificacion no
        // saldria, sin decir por que.
        let xml = plantilla("Ventas & Marketing", "1 < 2 y \"esto\"");
        assert!(xml.contains("Ventas &amp; Marketing"), "{xml}");
        assert!(xml.contains("1 &lt; 2"), "{xml}");
        assert!(xml.contains("&quot;esto&quot;"), "{xml}");
        assert!(
            !xml.contains("Ventas & M"),
            "no deberia quedar ningun & suelto: {xml}"
        );
    }

    #[test]
    fn los_caracteres_de_control_se_tiran() {
        // Vienen de variables capturadas de la salida de un script.
        let escapado = escapar_xml("hola\u{7}mundo\nsigue");
        assert_eq!(escapado, "holamundo\nsigue");
    }

    #[test]
    fn el_identificador_no_cambia() {
        // Windows guarda las preferencias del usuario contra esta cadena. Si
        // alguien la cambia, quien ya tenia VirtualDeck pierde sus ajustes de
        // notificacion y le aparece una aplicacion nueva. El instalador tiene
        // que escribir exactamente esta.
        assert_eq!(ID_APLICACION, "AndyVillatoro.VirtualDeck");
    }

    #[test]
    fn el_acceso_directo_va_al_menu_inicio_del_usuario() {
        let ruta = ruta_acceso_directo().expect("APPDATA deberia existir en Windows");
        assert!(ruta.ends_with("Start Menu/Programs/VirtualDeck.lnk"));
    }

    /// Notifica de verdad, asi que aparece en pantalla y **crea el acceso
    /// directo** del menu Inicio.
    ///
    /// Marcado `ignore` por lo segundo: un `cargo test` no puede dejarle nada
    /// instalado a quien compila. Ver la regla en `docs/MIGRACION-RUST.md`.
    ///
    /// ```text
    /// cargo test -p vd-core notifica_de_verdad -- --ignored --nocapture
    /// ```
    #[test]
    #[ignore = "crea un acceso directo en el menu Inicio"]
    fn notifica_de_verdad() {
        notificar("VirtualDeck", "Prueba de notificacion").expect("deberia notificar");
        std::thread::sleep(std::time::Duration::from_secs(1));
    }
}
