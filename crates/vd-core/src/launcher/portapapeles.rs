//! Portapapeles del sistema (texto UTF-16).

use super::LauncherError;

/// Copia texto al portapapeles.
/// Lee el texto del portapapeles.
///
/// Devuelve `None` si el portapapeles esta vacio o contiene algo que no es
/// texto (una imagen, por ejemplo), que no es un error.
pub fn clipboard() -> Option<String> {
    use windows::Win32::Foundation::HGLOBAL;
    use windows::Win32::System::DataExchange::{CloseClipboard, GetClipboardData, OpenClipboard};
    use windows::Win32::System::Memory::{GlobalLock, GlobalUnlock};

    const CF_UNICODETEXT: u32 = 13;

    // SAFETY: el handle que devuelve GetClipboardData pertenece a Windows y no
    // se libera; solo se bloquea para leerlo y se desbloquea enseguida.
    unsafe {
        OpenClipboard(None).ok()?;

        let texto = (|| {
            let handle = GetClipboardData(CF_UNICODETEXT).ok()?;
            let global = HGLOBAL(handle.0);
            let ptr = GlobalLock(global) as *const u16;
            if ptr.is_null() {
                return None;
            }
            // La cadena termina en cero; se busca su largo antes de copiarla.
            let mut largo = 0;
            while *ptr.add(largo) != 0 {
                largo += 1;
            }
            let s = String::from_utf16_lossy(std::slice::from_raw_parts(ptr, largo));
            let _ = GlobalUnlock(global);
            Some(s)
        })();

        let _ = CloseClipboard();
        texto
    }
}

pub fn set_clipboard(text: &str) -> Result<(), LauncherError> {
    use windows::Win32::Foundation::{HANDLE, HGLOBAL};
    use windows::Win32::System::DataExchange::{
        CloseClipboard, EmptyClipboard, OpenClipboard, SetClipboardData,
    };
    use windows::Win32::System::Memory::{GlobalAlloc, GlobalLock, GlobalUnlock, GMEM_MOVEABLE};

    const CF_UNICODETEXT: u32 = 13;

    let mut utf16: Vec<u16> = text.encode_utf16().collect();
    utf16.push(0);
    let bytes = utf16.len() * std::mem::size_of::<u16>();

    // SAFETY: se abre el portapapeles, se reserva memoria global movible, se
    // copia el texto y se cede la propiedad a Windows con SetClipboardData
    // (por eso NO se libera el HGLOBAL en el camino de exito).
    unsafe {
        OpenClipboard(None)?;

        let resultado = (|| -> Result<(), LauncherError> {
            EmptyClipboard()?;
            let handle: HGLOBAL = GlobalAlloc(GMEM_MOVEABLE, bytes)?;
            let destino = GlobalLock(handle) as *mut u16;
            if destino.is_null() {
                return Err(LauncherError::Spawn("GlobalLock fallo".into()));
            }
            std::ptr::copy_nonoverlapping(utf16.as_ptr(), destino, utf16.len());
            let _ = GlobalUnlock(handle);
            SetClipboardData(CF_UNICODETEXT, Some(HANDLE(handle.0)))?;
            Ok(())
        })();

        let _ = CloseClipboard();
        resultado
    }
}
