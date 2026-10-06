//! El icono de una aplicación, pasado a puntos (roadmap 86).
//!
//! Al vincular una página a una app se ofrece su propio icono en estilo DOT.
//! Sale en el **mismo formato** que los iconos del catálogo grande
//! (`src/components/dot480/puntos16.ts`): 16×16 puntos, fila a fila, bit más
//! significativo primero, 32 bytes en base64. Así se pinta igual en las cinco
//! superficies sin código nuevo.
//!
//! Los iconos de Windows son de color; en puntos se toma la **silueta** por
//! su transparencia (canal alfa). Si queda muy rellena —casi todos los iconos
//! son un cuadrado o un círculo lleno— se dibuja solo el **contorno**, el
//! mismo criterio que el generador del catálogo para los logos rellenos.

use windows::core::PCWSTR;
use windows::Win32::Foundation::CloseHandle;
use windows::Win32::Graphics::Gdi::{
    CreateCompatibleDC, DeleteDC, DeleteObject, GetDIBits, GetObjectW, BITMAP, BITMAPINFO,
    BITMAPINFOHEADER, BI_RGB, DIB_RGB_COLORS, HGDIOBJ,
};
use windows::Win32::Storage::FileSystem::FILE_FLAGS_AND_ATTRIBUTES;
use windows::Win32::System::Threading::{
    OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_WIN32, PROCESS_QUERY_LIMITED_INFORMATION,
};
use windows::Win32::UI::Shell::{SHGetFileInfoW, SHFILEINFOW, SHGFI_ICON, SHGFI_LARGEICON};
use windows::Win32::UI::WindowsAndMessaging::{DestroyIcon, GetIconInfo, ICONINFO};

use super::procesos;

const LADO: usize = 16;
/// Por encima de esta proporción de puntos encendidos, contorno en vez de silueta.
const RELLENO_MAXIMO: f32 = 0.45;

/// El icono de la app cuyo proceso se llama así (sin `.exe`, minúsculas), en
/// puntos y en base64; `None` si no está abierta o Windows no da su icono.
pub fn icono_app(proceso: &str) -> Option<String> {
    let ruta = ruta_de_proceso(proceso)?;
    let (ancho, alto, bgra) = pixeles_del_icono(&ruta)?;
    let matriz = a_puntos(ancho, alto, &bgra);
    Some(base64(&empaquetar(&matriz)))
}

/// La ruta del ejecutable del primer proceso con ese nombre.
fn ruta_de_proceso(proceso: &str) -> Option<String> {
    let objetivo = proceso.trim().trim_end_matches(".exe").to_lowercase();
    let pid = procesos::running_processes().ok()?.into_iter().find(|p| p.name == objetivo)?.pid;
    // SAFETY: el handle se cierra antes de salir; el buffer tiene el tamaño que se pasa.
    unsafe {
        let h = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid).ok()?;
        let mut buf = [0u16; 1024];
        let mut len = buf.len() as u32;
        let ok = QueryFullProcessImageNameW(h, PROCESS_NAME_WIN32, windows::core::PWSTR(buf.as_mut_ptr()), &mut len);
        let _ = CloseHandle(h);
        ok.ok()?;
        Some(String::from_utf16_lossy(&buf[..len as usize]))
    }
}

/// Los píxeles BGRA (de arriba abajo) del icono grande del archivo.
fn pixeles_del_icono(ruta: &str) -> Option<(usize, usize, Vec<u8>)> {
    let ancha: Vec<u16> = ruta.encode_utf16().chain(std::iter::once(0)).collect();
    let mut info = SHFILEINFOW::default();
    // SAFETY: cadena terminada en cero; `info` del tamaño correcto. Todo lo que
    // Windows reserva (icono, mapas de bits, DC) se libera antes de salir.
    unsafe {
        let r = SHGetFileInfoW(
            PCWSTR(ancha.as_ptr()),
            FILE_FLAGS_AND_ATTRIBUTES(0),
            Some(&mut info),
            std::mem::size_of::<SHFILEINFOW>() as u32,
            SHGFI_ICON | SHGFI_LARGEICON,
        );
        if r == 0 || info.hIcon.is_invalid() {
            return None;
        }
        let mut ii = ICONINFO::default();
        let leido = GetIconInfo(info.hIcon, &mut ii).is_ok();
        let resultado = if leido { leer_mapa(ii.hbmColor.into()) } else { None };
        if leido {
            let _ = DeleteObject(ii.hbmColor.into());
            let _ = DeleteObject(ii.hbmMask.into());
        }
        let _ = DestroyIcon(info.hIcon);
        resultado
    }
}

/// Lee un mapa de bits de color a BGRA de 32 bits, de arriba abajo.
unsafe fn leer_mapa(mapa: HGDIOBJ) -> Option<(usize, usize, Vec<u8>)> {
    let mut bm = BITMAP::default();
    // SAFETY: `bm` del tamaño correcto; `mapa` es un HBITMAP vivo.
    if unsafe { GetObjectW(mapa, std::mem::size_of::<BITMAP>() as i32, Some(&mut bm as *mut _ as *mut _)) } == 0 {
        return None;
    }
    let (ancho, alto) = (bm.bmWidth.max(0) as usize, bm.bmHeight.max(0) as usize);
    if ancho == 0 || alto == 0 {
        return None;
    }
    let mut bmi = BITMAPINFO::default();
    bmi.bmiHeader = BITMAPINFOHEADER {
        biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
        biWidth: ancho as i32,
        biHeight: -(alto as i32), // negativo = de arriba abajo
        biPlanes: 1,
        biBitCount: 32,
        biCompression: BI_RGB.0,
        ..Default::default()
    };
    let mut buf = vec![0u8; ancho * alto * 4];
    // SAFETY: el DC se borra antes de salir; `buf` cabe `alto` filas de 32 bits.
    unsafe {
        let dc = CreateCompatibleDC(None);
        let filas = GetDIBits(dc, windows::Win32::Graphics::Gdi::HBITMAP(mapa.0), 0, alto as u32, Some(buf.as_mut_ptr() as *mut _), &mut bmi, DIB_RGB_COLORS);
        let _ = DeleteDC(dc);
        if filas == 0 {
            return None;
        }
    }
    Some((ancho, alto, buf))
}

/// De píxeles BGRA a 16×16 puntos: silueta por alfa (o por brillo si el
/// icono es viejo y no trae alfa), y contorno si queda demasiado rellena.
fn a_puntos(ancho: usize, alto: usize, bgra: &[u8]) -> Vec<Vec<bool>> {
    let con_alfa = bgra.chunks_exact(4).any(|p| p[3] != 0);
    let tinta = |x: usize, y: usize| -> f32 {
        let p = &bgra[(y * ancho + x) * 4..(y * ancho + x) * 4 + 4];
        if con_alfa {
            p[3] as f32 / 255.0
        } else {
            (p[0] as f32 + p[1] as f32 + p[2] as f32) / (3.0 * 255.0)
        }
    };
    let mut m = vec![vec![false; LADO]; LADO];
    for (py, fila) in m.iter_mut().enumerate() {
        for (px, punto) in fila.iter_mut().enumerate() {
            let (x0, x1) = (px * ancho / LADO, ((px + 1) * ancho / LADO).max(px * ancho / LADO + 1));
            let (y0, y1) = (py * alto / LADO, ((py + 1) * alto / LADO).max(py * alto / LADO + 1));
            let mut suma = 0.0;
            let mut n = 0.0;
            for y in y0..y1.min(alto) {
                for x in x0..x1.min(ancho) {
                    suma += tinta(x, y);
                    n += 1.0;
                }
            }
            *punto = n > 0.0 && suma / n >= 0.5;
        }
    }
    let encendidos = m.iter().flatten().filter(|&&b| b).count() as f32 / (LADO * LADO) as f32;
    if encendidos > FORMA_DE_FONDO {
        // Casi todo es la forma de fondo (un cuadrado o un círculo de color con
        // el logo dentro): la silueta no dice nada. Se encienden los puntos que
        // **contrastan** con el color dominante de la forma, y su borde.
        if let Some(dentro) = logo_por_contraste(ancho, alto, bgra, &m) {
            return dentro;
        }
    }
    if encendidos > RELLENO_MAXIMO {
        contorno(&m)
    } else {
        m
    }
}

/// Por encima de esta proporción, la silueta es solo la forma de fondo.
const FORMA_DE_FONDO: f32 = 0.70;
/// Diferencia de brillo (0–1) con el color dominante para contar como logo.
const CONTRASTE_MINIMO: f32 = 0.22;

fn brillo(p: &[u8]) -> f32 {
    (0.114 * p[0] as f32 + 0.587 * p[1] as f32 + 0.299 * p[2] as f32) / 255.0
}

/// El logo que hay dentro de una forma rellena, por contraste con su color
/// dominante; `None` si no hay contraste suficiente (un icono de un solo color).
fn logo_por_contraste(ancho: usize, alto: usize, bgra: &[u8], silueta: &[Vec<bool>]) -> Option<Vec<Vec<bool>>> {
    let opacos: Vec<f32> = bgra.chunks_exact(4).filter(|p| p[3] >= 128).map(brillo).collect();
    if opacos.is_empty() {
        return None;
    }
    let mut ordenados = opacos.clone();
    ordenados.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
    let fondo = ordenados[ordenados.len() / 2]; // la mediana: el color que más ocupa
    let mut m = vec![vec![false; LADO]; LADO];
    let mut alguno = false;
    for (py, fila) in m.iter_mut().enumerate() {
        for (px, punto) in fila.iter_mut().enumerate() {
            let (x0, x1) = (px * ancho / LADO, ((px + 1) * ancho / LADO).max(px * ancho / LADO + 1));
            let (y0, y1) = (py * alto / LADO, ((py + 1) * alto / LADO).max(py * alto / LADO + 1));
            let mut suma = 0.0;
            let mut n = 0.0;
            for y in y0..y1.min(alto) {
                for x in x0..x1.min(ancho) {
                    let p = &bgra[(y * ancho + x) * 4..(y * ancho + x) * 4 + 4];
                    if p[3] >= 128 {
                        suma += (brillo(p) - fondo).abs();
                        n += 1.0;
                    }
                }
            }
            *punto = silueta[py][px] && n > 0.0 && suma / n >= CONTRASTE_MINIMO;
            alguno |= *punto;
        }
    }
    if !alguno {
        return None;
    }
    // El borde de la forma también, para que se lea como un icono y no como
    // un dibujo suelto.
    let borde = contorno(silueta);
    for y in 0..LADO {
        for x in 0..LADO {
            m[y][x] |= borde[y][x];
        }
    }
    Some(m)
}

/// Solo los puntos encendidos que tocan uno apagado (o el borde).
fn contorno(m: &[Vec<bool>]) -> Vec<Vec<bool>> {
    let apagado = |x: isize, y: isize| -> bool {
        x < 0 || y < 0 || x >= LADO as isize || y >= LADO as isize || !m[y as usize][x as usize]
    };
    (0..LADO)
        .map(|y| {
            (0..LADO)
                .map(|x| {
                    let (xi, yi) = (x as isize, y as isize);
                    m[y][x]
                        && (apagado(xi - 1, yi) || apagado(xi + 1, yi) || apagado(xi, yi - 1) || apagado(xi, yi + 1))
                })
                .collect()
        })
        .collect()
}

/// 16×16 booleanos → 32 bytes, fila a fila, bit más significativo primero.
fn empaquetar(m: &[Vec<bool>]) -> [u8; 32] {
    let mut bytes = [0u8; 32];
    for (y, fila) in m.iter().enumerate() {
        for (x, &b) in fila.iter().enumerate() {
            if b {
                let i = x + LADO * y;
                bytes[i >> 3] |= 1 << (7 - (i & 7));
            }
        }
    }
    bytes
}

/// Base64 estándar (con relleno). Diez líneas antes que una dependencia.
fn base64(datos: &[u8]) -> String {
    const ABC: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut s = String::with_capacity(datos.len().div_ceil(3) * 4);
    for trozo in datos.chunks(3) {
        let n = (trozo[0] as u32) << 16 | (*trozo.get(1).unwrap_or(&0) as u32) << 8 | *trozo.get(2).unwrap_or(&0) as u32;
        for i in 0..4 {
            s.push(if i <= trozo.len() { ABC[(n >> (18 - 6 * i) & 63) as usize] as char } else { '=' });
        }
    }
    s
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn base64_coincide_con_el_estandar() {
        assert_eq!(base64(b"Man"), "TWFu");
        assert_eq!(base64(b"Ma"), "TWE=");
        assert_eq!(base64(b"M"), "TQ==");
        assert_eq!(base64(&[0u8; 32]).len(), 44);
    }

    #[test]
    fn cuadrado_lleno_pasa_a_contorno() {
        let lleno = vec![255u8; 32 * 32 * 4];
        let m = a_puntos(32, 32, &lleno);
        assert!(m[0][0] && !m[8][8], "el interior se apaga, el borde queda");
    }

    #[test]
    fn empaquetar_primer_y_ultimo_punto() {
        let mut m = vec![vec![false; LADO]; LADO];
        m[0][0] = true;
        m[15][15] = true;
        let b = empaquetar(&m);
        assert_eq!(b[0], 0x80);
        assert_eq!(b[31], 0x01);
    }
}
