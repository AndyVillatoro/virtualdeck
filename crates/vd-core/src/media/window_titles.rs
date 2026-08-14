//! Fallback: deducir que suena a partir de los titulos de las ventanas.
//!
//! Se usa cuando SMTC no reporta nada — tipicamente porque el navegador no
//! registra la sesion (pasa con algunas versiones de Edge/Chrome) o porque la
//! app reproduce sin integrarse con Windows.
//!
//! El parser es un **puerto literal** del de `electron/main/media.ts`. Esas
//! expresiones estan afinadas contra rarezas reales de navegadores y romperlas
//! "simplificando" es facil, asi que van con tests de las cadenas conocidas.

use std::sync::LazyLock;

use regex::Regex;

/// Lo que se pudo deducir de un titulo de ventana.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ParsedTitle {
    pub title: String,
    pub artist: String,
    /// Nombre legible de la fuente ("Spotify", "YouTube Music", ...).
    pub source: String,
}

/// Navegadores cuyo sufijo hay que recortar del titulo.
const BROWSERS: &str = r"(?:Mozilla Firefox|Google Chrome|Microsoft\s*Edge|Brave|Opera|Vivaldi)";

/// "and 3 more pages" / "y 3 páginas más" / "e mais 3 páginas".
const MORE_PAGES: &str = r"(?:and \d+ more pages?|y \d+ p[áa]ginas? m[áa]s|e mais \d+ p[áa]ginas?)";

/// Prioridad de fuentes cuando varias ventanas matchean. Mas alto gana.
const SOURCE_PRIORITY: [&str; 5] = ["Spotify", "YouTube Music", "YouTube", "SoundCloud", "VLC"];

static RE_BROWSER_SUFFIX: LazyLock<Regex> = LazyLock::new(|| {
    // " — Perfil: Google Chrome" o " - Google Chrome" al final.
    Regex::new(&format!(r"(?i)\s+[—-]\s+(?:[^-—:]+:\s*)?{BROWSERS}\s*$")).expect("regex valida")
});

static RE_MORE_PAGES: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(&format!(r"(?i)\s+{MORE_PAGES}.*$")).expect("regex valida"));

static RE_YT_MUSIC: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^(.+?)\s+-\s+YouTube Music$").expect("regex valida"));
static RE_YOUTUBE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^(.+?)\s+-\s+YouTube$").expect("regex valida"));
static RE_SPOTIFY_PREFIX: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^Spotify\s+[-·–]\s+(.+?)\s+[·•]\s+(.+)$").expect("regex valida"));
static RE_SPOTIFY_SUFFIX: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"^(.+?)\s+[•·]\s+(.+?)\s+[-—–]\s+Spotify$").expect("regex valida")
});
static RE_SOUNDCLOUD: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?i)^(.+?)\s+-\s+(.+?)\s+on SoundCloud").expect("regex valida"));
static RE_VLC: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?i)^(.+?)\s+-\s+VLC media player$").expect("regex valida"));

/// Normaliza los espacios unicode que Edge/Chrome inyectan en los titulos
/// (NBSP, zero-width space/joiner, BOM). Sin esto, los regex no matchean.
fn normalize_spaces(raw: &str) -> String {
    raw.chars()
        .map(|c| match c {
            '\u{00A0}' | '\u{200B}' | '\u{200C}' | '\u{200D}' | '\u{FEFF}' => ' ',
            other => other,
        })
        .collect()
}

/// Intenta deducir que suena a partir del proceso y el titulo de una ventana.
///
/// `proc` es el nombre del ejecutable sin `.exe`; `raw` el titulo crudo.
pub fn parse_window_title(proc: &str, raw: &str) -> Option<ParsedTitle> {
    let proc_lower = proc.to_lowercase();
    let mut title = normalize_spaces(raw);

    // 1) Sacar " - Navegador" (con perfil opcional delante).
    title = RE_BROWSER_SUFFIX.replace(&title, "").into_owned();
    // 2) Sacar "y N páginas más ..." y equivalentes.
    title = RE_MORE_PAGES.replace(&title, "").into_owned();

    let make = |t: &str, a: &str, s: &str| {
        Some(ParsedTitle {
            title: t.trim().to_string(),
            artist: a.trim().to_string(),
            source: s.to_string(),
        })
    };

    if let Some(c) = RE_YT_MUSIC.captures(&title) {
        let left = &c[1];
        // En YouTube Music el titulo suele venir "Cancion - Artista".
        if let Some(idx) = left.rfind(" - ") {
            return make(&left[..idx], &left[idx + 3..], "YouTube Music");
        }
        return make(left, "", "YouTube Music");
    }

    if let Some(c) = RE_YOUTUBE.captures(&title) {
        return make(&c[1], "", "YouTube");
    }

    if let Some(c) = RE_SPOTIFY_PREFIX.captures(&title) {
        return make(&c[1], &c[2], "Spotify");
    }
    if let Some(c) = RE_SPOTIFY_SUFFIX.captures(&title) {
        return make(&c[1], &c[2], "Spotify");
    }
    // Spotify de escritorio: el titulo de la ventana ES "Cancion - Artista",
    // salvo cuando no hay nada sonando.
    if proc_lower == "spotify"
        && !title.is_empty()
        && !matches!(
            title.as_str(),
            "Spotify" | "Spotify Premium" | "Spotify Free"
        )
    {
        if let Some(idx) = title.rfind(" - ") {
            return make(&title[..idx], &title[idx + 3..], "Spotify");
        }
        return make(&title, "", "Spotify");
    }

    if let Some(c) = RE_SOUNDCLOUD.captures(&title) {
        // En SoundCloud el orden viene invertido: "Artista - Cancion on SoundCloud".
        return make(&c[2], &c[1], "SoundCloud");
    }

    if let Some(c) = RE_VLC.captures(&title) {
        return make(&c[1], "", "VLC");
    }

    None
}

/// Recorre las ventanas visibles y devuelve las que parecen estar reproduciendo.
///
/// Sustituye al bloque de C# con `EnumWindows` que la version Electron
/// compilaba dentro de un script de PowerShell.
pub fn scan_windows() -> Vec<ParsedTitle> {
    use windows::core::BOOL;
    use windows::Win32::Foundation::{HWND, LPARAM};
    use windows::Win32::UI::WindowsAndMessaging::{
        EnumWindows, GetWindowTextLengthW, GetWindowTextW, GetWindowThreadProcessId,
        IsWindowVisible,
    };

    /// Acumulador que se pasa a `EnumWindows` a traves de `LPARAM`.
    struct Ctx {
        out: Vec<ParsedTitle>,
    }

    unsafe extern "system" fn callback(hwnd: HWND, lparam: LPARAM) -> BOOL {
        // SAFETY: `lparam` es el `&mut Ctx` que pasamos abajo; vive durante
        // toda la enumeracion.
        let ctx = unsafe { &mut *(lparam.0 as *mut Ctx) };

        // SAFETY: hwnd valido provisto por Windows.
        unsafe {
            if !IsWindowVisible(hwnd).as_bool() {
                return BOOL(1); // seguir enumerando
            }
            let len = GetWindowTextLengthW(hwnd);
            if len <= 0 {
                return BOOL(1);
            }

            let mut buf = vec![0u16; len as usize + 1];
            let written = GetWindowTextW(hwnd, &mut buf);
            if written <= 0 {
                return BOOL(1);
            }
            let title = String::from_utf16_lossy(&buf[..written as usize]);

            let mut pid = 0u32;
            GetWindowThreadProcessId(hwnd, Some(&mut pid));
            let proc = process_name(pid).unwrap_or_default();

            if let Some(parsed) = parse_window_title(&proc, &title) {
                ctx.out.push(parsed);
            }
        }
        BOOL(1)
    }

    let mut ctx = Ctx { out: Vec::new() };
    // SAFETY: el callback solo usa el puntero durante la llamada, y `ctx` vive
    // hasta despues de que EnumWindows retorna.
    unsafe {
        let _ = EnumWindows(Some(callback), LPARAM(&mut ctx as *mut Ctx as isize));
    }
    ctx.out
}

/// Nombre del ejecutable de un proceso, sin ruta ni `.exe`, en minusculas.
fn process_name(pid: u32) -> Option<String> {
    use windows::Win32::Foundation::CloseHandle;
    use windows::Win32::System::Threading::{
        OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_WIN32,
        PROCESS_QUERY_LIMITED_INFORMATION,
    };

    // SAFETY: el handle se cierra siempre antes de salir.
    unsafe {
        let handle = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid).ok()?;

        let mut buf = vec![0u16; 512];
        let mut len = buf.len() as u32;
        let ok = QueryFullProcessImageNameW(
            handle,
            PROCESS_NAME_WIN32,
            windows::core::PWSTR(buf.as_mut_ptr()),
            &mut len,
        );
        let _ = CloseHandle(handle);

        if ok.is_err() || len == 0 {
            return None;
        }

        let full = String::from_utf16_lossy(&buf[..len as usize]);
        let file = full.rsplit(['\\', '/']).next()?;
        Some(file.trim_end_matches(".exe").to_lowercase())
    }
}

/// Elige el mejor candidato entre varias ventanas, segun [`SOURCE_PRIORITY`].
pub fn pick_best(candidates: Vec<ParsedTitle>) -> Option<ParsedTitle> {
    candidates.into_iter().max_by_key(|p| {
        SOURCE_PRIORITY
            .iter()
            .position(|s| *s == p.source)
            .map_or(0, |idx| SOURCE_PRIORITY.len() - idx)
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn spotify_de_escritorio() {
        let p = parse_window_title("Spotify", "Bohemian Rhapsody - Queen").unwrap();
        assert_eq!(p.title, "Bohemian Rhapsody");
        assert_eq!(p.artist, "Queen");
        assert_eq!(p.source, "Spotify");
    }

    #[test]
    fn spotify_sin_reproducir_no_matchea() {
        assert!(parse_window_title("Spotify", "Spotify").is_none());
        assert!(parse_window_title("Spotify", "Spotify Premium").is_none());
        assert!(parse_window_title("Spotify", "Spotify Free").is_none());
    }

    #[test]
    fn youtube_music_separa_cancion_y_artista() {
        let p = parse_window_title("chrome", "Take Five - Dave Brubeck - YouTube Music").unwrap();
        assert_eq!(p.title, "Take Five");
        assert_eq!(p.artist, "Dave Brubeck");
        assert_eq!(p.source, "YouTube Music");
    }

    #[test]
    fn youtube_normal_no_tiene_artista() {
        let p = parse_window_title("chrome", "Un video cualquiera - YouTube").unwrap();
        assert_eq!(p.title, "Un video cualquiera");
        assert_eq!(p.artist, "");
        assert_eq!(p.source, "YouTube");
    }

    #[test]
    fn recorta_el_sufijo_del_navegador() {
        let p = parse_window_title("msedge", "Cancion - YouTube - Microsoft Edge").unwrap();
        assert_eq!(p.title, "Cancion");
        assert_eq!(p.source, "YouTube");
    }

    #[test]
    fn recorta_el_sufijo_con_perfil() {
        let p = parse_window_title("chrome", "Cancion - YouTube - Trabajo: Google Chrome").unwrap();
        assert_eq!(p.title, "Cancion");
    }

    #[test]
    fn recorta_mas_paginas_en_los_tres_idiomas() {
        for titulo in [
            "Cancion - YouTube and 3 more pages - Google Chrome",
            "Cancion - YouTube y 3 páginas más - Google Chrome",
            "Cancion - YouTube e mais 3 páginas - Google Chrome",
        ] {
            let p = parse_window_title("chrome", titulo)
                .unwrap_or_else(|| panic!("deberia matchear: {titulo}"));
            assert_eq!(p.title, "Cancion", "fallo con: {titulo}");
        }
    }

    #[test]
    fn normaliza_espacios_unicode_de_edge() {
        // Edge mete NBSP entre "Microsoft" y "Edge".
        let p = parse_window_title("msedge", "Cancion - YouTube - Microsoft\u{00A0}Edge").unwrap();
        assert_eq!(p.title, "Cancion");
    }

    #[test]
    fn soundcloud_viene_con_el_orden_invertido() {
        let p = parse_window_title("chrome", "Nujabes - Feather on SoundCloud").unwrap();
        assert_eq!(p.title, "Feather");
        assert_eq!(p.artist, "Nujabes");
        assert_eq!(p.source, "SoundCloud");
    }

    #[test]
    fn vlc() {
        let p = parse_window_title("vlc", "pelicula.mkv - VLC media player").unwrap();
        assert_eq!(p.title, "pelicula.mkv");
        assert_eq!(p.source, "VLC");
    }

    #[test]
    fn una_ventana_cualquiera_no_matchea() {
        assert!(parse_window_title("explorer", "Documentos").is_none());
        assert!(parse_window_title("code", "main.rs - Visual Studio Code").is_none());
    }

    #[test]
    fn spotify_le_gana_a_youtube() {
        let elegido = pick_best(vec![
            ParsedTitle {
                title: "video".into(),
                artist: String::new(),
                source: "YouTube".into(),
            },
            ParsedTitle {
                title: "cancion".into(),
                artist: "artista".into(),
                source: "Spotify".into(),
            },
        ])
        .unwrap();
        assert_eq!(elegido.source, "Spotify");
    }
}
