//! Traduccion de especificaciones de tecla a codigos virtuales de Windows.
//!
//! El formato de entrada tiene que seguir siendo el que ya guardan las macros
//! en `deck-config.json`, que salio de `SendKeys` de .NET:
//!
//! - Modificadores: `Ctrl+C`, `Alt+Tab`, `Ctrl+Shift+Esc`, `Win+D`
//! - Teclas con nombre entre llaves: `{ENTER}`, `{TAB}`, `{F5}`, `{UP}`
//! - Nombres sueltos: `Enter`, `Tab`, `Esc`
//! - Caracteres sueltos: `a`, `5`
//!
//! Se acepta todo eso a la vez porque en el disco conviven pasos grabados por
//! la version Electron (que emitia `{ENTER}`) y pasos escritos a mano por el
//! usuario en el editor (que suele escribir `Ctrl+C`).

use windows::Win32::UI::Input::KeyboardAndMouse::{
    VIRTUAL_KEY, VK_BACK, VK_CONTROL, VK_DELETE, VK_DOWN, VK_END, VK_ESCAPE, VK_F1, VK_F10, VK_F11,
    VK_F12, VK_F13, VK_F14, VK_F15, VK_F16, VK_F17, VK_F18, VK_F19, VK_F2, VK_F20, VK_F21, VK_F22,
    VK_F23, VK_F24, VK_F3, VK_F4, VK_F5, VK_F6, VK_F7, VK_F8, VK_F9, VK_HOME, VK_INSERT, VK_LEFT,
    VK_LWIN, VK_MENU, VK_NEXT, VK_PRIOR, VK_RETURN, VK_RIGHT, VK_SHIFT, VK_SPACE, VK_TAB, VK_UP,
};

/// Una pulsacion: modificadores + tecla principal.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct KeyStroke {
    /// Modificadores a mantener presionados (Ctrl, Alt, Shift, Win).
    pub modifiers: Vec<VIRTUAL_KEY>,
    /// Tecla principal.
    pub key: VIRTUAL_KEY,
}

/// Resuelve el nombre de una tecla (sin modificadores) a su codigo virtual.
///
/// Acepta el nombre con o sin llaves y sin distinguir mayusculas.
fn named_key(raw: &str) -> Option<VIRTUAL_KEY> {
    let name = raw.trim().trim_start_matches('{').trim_end_matches('}');
    let upper = name.to_uppercase();

    let vk = match upper.as_str() {
        "ENTER" | "RETURN" => VK_RETURN,
        "TAB" => VK_TAB,
        "ESC" | "ESCAPE" => VK_ESCAPE,
        "SPACE" | "SPACEBAR" => VK_SPACE,
        "BACKSPACE" | "BS" | "BKSP" => VK_BACK,
        "DELETE" | "DEL" => VK_DELETE,
        "INSERT" | "INS" => VK_INSERT,
        "HOME" => VK_HOME,
        "END" => VK_END,
        "PGUP" | "PAGEUP" => VK_PRIOR,
        "PGDN" | "PAGEDOWN" => VK_NEXT,
        "UP" => VK_UP,
        "DOWN" => VK_DOWN,
        "LEFT" => VK_LEFT,
        "RIGHT" => VK_RIGHT,
        "F1" => VK_F1,
        "F2" => VK_F2,
        "F3" => VK_F3,
        "F4" => VK_F4,
        "F5" => VK_F5,
        "F6" => VK_F6,
        "F7" => VK_F7,
        "F8" => VK_F8,
        "F9" => VK_F9,
        "F10" => VK_F10,
        "F11" => VK_F11,
        "F12" => VK_F12,
        // F13-F24 existen en el teclado extendido pero practicamente ninguna
        // aplicacion las usa. Son utiles como atajos que no chocan con nada.
        "F13" => VK_F13,
        "F14" => VK_F14,
        "F15" => VK_F15,
        "F16" => VK_F16,
        "F17" => VK_F17,
        "F18" => VK_F18,
        "F19" => VK_F19,
        "F20" => VK_F20,
        "F21" => VK_F21,
        "F22" => VK_F22,
        "F23" => VK_F23,
        "F24" => VK_F24,
        _ => return None,
    };
    Some(vk)
}

/// Codigo virtual de un caracter suelto (`a`, `5`).
///
/// Para letras y digitos el codigo virtual coincide con el ASCII en mayuscula,
/// que es justamente lo que espera `SendInput`.
fn char_key(c: char) -> Option<VIRTUAL_KEY> {
    let up = c.to_ascii_uppercase();
    if up.is_ascii_alphanumeric() {
        Some(VIRTUAL_KEY(up as u16))
    } else {
        None
    }
}

/// Convierte un modificador escrito por el usuario a su codigo virtual.
fn modifier_key(token: &str) -> Option<VIRTUAL_KEY> {
    match token.trim().to_uppercase().as_str() {
        "CTRL" | "CONTROL" | "^" => Some(VK_CONTROL),
        "ALT" | "%" => Some(VK_MENU),
        "SHIFT" | "+" => Some(VK_SHIFT),
        "WIN" | "META" | "SUPER" | "CMD" => Some(VK_LWIN),
        _ => None,
    }
}

/// Parsea una especificacion completa de tecla.
///
/// Devuelve `None` si no se reconoce la tecla principal.
pub fn parse_keystroke(spec: &str) -> Option<KeyStroke> {
    let spec = spec.trim();
    if spec.is_empty() {
        return None;
    }

    // Una tecla con nombre puede contener '+' (no lo tiene hoy, pero si algun
    // dia se agrega '{NUMPAD+}' no queremos partirla), asi que se prueba entera
    // antes de tratar el '+' como separador de modificadores.
    if let Some(key) = named_key(spec) {
        return Some(KeyStroke {
            modifiers: Vec::new(),
            key,
        });
    }

    // "Ctrl+Shift+Esc": todo lo anterior al ultimo '+' son modificadores.
    // Se usa un split cuidadoso para que "Ctrl++" (Ctrl y la tecla '+') no
    // rompa: el ultimo segmento vacio significa que la tecla ES '+'.
    if spec.contains('+') && spec.len() > 1 {
        let mut partes: Vec<&str> = spec.split('+').collect();
        let ultima = partes.pop().unwrap_or("");

        let mut modifiers = Vec::new();
        let mut todos_son_modificadores = true;
        for p in &partes {
            match modifier_key(p) {
                Some(m) if !modifiers.contains(&m) => modifiers.push(m),
                Some(_) => {}
                None => {
                    todos_son_modificadores = false;
                    break;
                }
            }
        }

        if todos_son_modificadores && !modifiers.is_empty() {
            let key = if ultima.is_empty() {
                // "Ctrl++" -> la tecla es el '+' literal.
                VIRTUAL_KEY(0xBB) // VK_OEM_PLUS
            } else {
                named_key(ultima).or_else(|| {
                    let mut chars = ultima.chars();
                    match (chars.next(), chars.next()) {
                        (Some(c), None) => char_key(c),
                        _ => None,
                    }
                })?
            };
            return Some(KeyStroke { modifiers, key });
        }
    }

    // Caracter suelto.
    let mut chars = spec.chars();
    match (chars.next(), chars.next()) {
        (Some(c), None) => char_key(c).map(|key| KeyStroke {
            modifiers: Vec::new(),
            key,
        }),
        _ => None,
    }
}

/// Nombre legible de un codigo virtual, para grabar macros en el formato que ya
/// entiende la configuracion.
pub fn key_name(vk: u16) -> Option<String> {
    let nombre = match VIRTUAL_KEY(vk) {
        VK_RETURN => "{ENTER}",
        VK_TAB => "{TAB}",
        VK_ESCAPE => "{ESC}",
        VK_SPACE => " ",
        VK_BACK => "{BACKSPACE}",
        VK_DELETE => "{DELETE}",
        VK_INSERT => "{INSERT}",
        VK_HOME => "{HOME}",
        VK_END => "{END}",
        VK_PRIOR => "{PGUP}",
        VK_NEXT => "{PGDN}",
        VK_UP => "{UP}",
        VK_DOWN => "{DOWN}",
        VK_LEFT => "{LEFT}",
        VK_RIGHT => "{RIGHT}",
        VK_F1 => "{F1}",
        VK_F2 => "{F2}",
        VK_F3 => "{F3}",
        VK_F4 => "{F4}",
        VK_F5 => "{F5}",
        VK_F6 => "{F6}",
        VK_F7 => "{F7}",
        VK_F8 => "{F8}",
        VK_F9 => "{F9}",
        VK_F10 => "{F10}",
        VK_F11 => "{F11}",
        VK_F12 => "{F12}",
        VK_F13 => "{F13}",
        VK_F14 => "{F14}",
        VK_F15 => "{F15}",
        VK_F16 => "{F16}",
        VK_F17 => "{F17}",
        VK_F18 => "{F18}",
        VK_F19 => "{F19}",
        VK_F20 => "{F20}",
        VK_F21 => "{F21}",
        VK_F22 => "{F22}",
        VK_F23 => "{F23}",
        VK_F24 => "{F24}",
        _ => {
            let c = vk as u8 as char;
            return c
                .is_ascii_alphanumeric()
                .then(|| c.to_ascii_lowercase().to_string());
        }
    };
    Some(nombre.to_string())
}

/// Codigos virtuales que son solo modificadores. Al grabar no se emiten como
/// pasos propios: se acumulan y se aplican a la siguiente tecla real.
pub fn is_modifier(vk: u16) -> bool {
    matches!(VIRTUAL_KEY(vk), VK_CONTROL | VK_MENU | VK_SHIFT | VK_LWIN)
        || matches!(vk, 0xA0..=0xA5) // L/R Shift, Ctrl, Alt
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn caracter_suelto() {
        let k = parse_keystroke("a").unwrap();
        assert!(k.modifiers.is_empty());
        assert_eq!(k.key, VIRTUAL_KEY(b'A' as u16));
    }

    #[test]
    fn tecla_con_nombre_entre_llaves() {
        assert_eq!(parse_keystroke("{ENTER}").unwrap().key, VK_RETURN);
        assert_eq!(parse_keystroke("{F5}").unwrap().key, VK_F5);
        assert_eq!(parse_keystroke("{UP}").unwrap().key, VK_UP);
    }

    #[test]
    fn tecla_con_nombre_suelto() {
        assert_eq!(parse_keystroke("Enter").unwrap().key, VK_RETURN);
        assert_eq!(parse_keystroke("esc").unwrap().key, VK_ESCAPE);
    }

    #[test]
    fn combinacion_con_un_modificador() {
        let k = parse_keystroke("Ctrl+C").unwrap();
        assert_eq!(k.modifiers, vec![VK_CONTROL]);
        assert_eq!(k.key, VIRTUAL_KEY(b'C' as u16));
    }

    #[test]
    fn combinacion_con_varios_modificadores() {
        let k = parse_keystroke("Ctrl+Shift+Esc").unwrap();
        assert_eq!(k.modifiers, vec![VK_CONTROL, VK_SHIFT]);
        assert_eq!(k.key, VK_ESCAPE);
    }

    #[test]
    fn la_tecla_windows_se_reconoce() {
        let k = parse_keystroke("Win+D").unwrap();
        assert_eq!(k.modifiers, vec![VK_LWIN]);
        assert_eq!(k.key, VIRTUAL_KEY(b'D' as u16));
    }

    #[test]
    fn no_se_duplican_modificadores_repetidos() {
        let k = parse_keystroke("Ctrl+Ctrl+A").unwrap();
        assert_eq!(k.modifiers, vec![VK_CONTROL]);
    }

    #[test]
    fn una_especificacion_sin_sentido_no_parsea() {
        assert!(parse_keystroke("").is_none());
        assert!(parse_keystroke("   ").is_none());
        assert!(parse_keystroke("NoExisteEstaTecla").is_none());
    }

    #[test]
    fn ida_y_vuelta_entre_grabar_y_reproducir() {
        // Lo que grabamos tiene que poder volver a parsearse: si no, una macro
        // grabada no se reproduce igual.
        for vk in [
            VK_RETURN.0,
            VK_TAB.0,
            VK_F5.0,
            VK_UP.0,
            b'A' as u16,
            b'Z' as u16,
            b'0' as u16,
        ] {
            let nombre = key_name(vk).unwrap_or_else(|| panic!("sin nombre para vk {vk}"));
            let parsed = parse_keystroke(&nombre)
                .unwrap_or_else(|| panic!("no se pudo reparsear {nombre:?}"));
            assert_eq!(parsed.key.0, vk, "ida y vuelta fallo para {nombre:?}");
        }
    }

    #[test]
    fn los_modificadores_se_detectan_al_grabar() {
        assert!(is_modifier(VK_CONTROL.0));
        assert!(is_modifier(VK_SHIFT.0));
        assert!(is_modifier(VK_LWIN.0));
        assert!(!is_modifier(b'A' as u16));
        assert!(!is_modifier(VK_RETURN.0));
    }
}
