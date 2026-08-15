//! Registro rotativo a `%APPDATA%\VirtualDeck\logs\virtualdeck.log`.
//!
//! Existe para dos cosas: diagnosticar problemas que solo aparecen en el equipo
//! del usuario, y poder adjuntarse a un reporte de error.
//!
//! # Principio de diseño: no romper nada
//!
//! Escribir un log **nunca** debe hacer fallar la operacion que se estaba
//! registrando. Si el disco esta lleno, la carpeta no tiene permisos o el archivo
//! esta bloqueado por otro proceso, la entrada se pierde en silencio y la
//! aplicacion sigue. Un log que tira excepciones convierte un problema menor en
//! una caida.

use std::fmt;
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use std::sync::Mutex;

/// Tamaño al que se rota. 512 KB dan bastante historial sin que el archivo se
/// vuelva incomodo de adjuntar a un reporte.
const MAX_BYTES: u64 = 512 * 1024;

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Level {
    Error,
    Warn,
    Info,
}

impl fmt::Display for Level {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(match self {
            Level::Error => "ERROR",
            Level::Warn => "WARN",
            Level::Info => "INFO",
        })
    }
}

/// Serializa las escrituras entre hilos.
///
/// Sin esto, dos hilos escribiendo a la vez pueden entrelazar sus lineas y dejar
/// el log ilegible justo cuando mas falta hace: durante un fallo, que es cuando
/// mas componentes escriben a la vez.
static CANDADO: Mutex<()> = Mutex::new(());

pub fn log_path() -> Option<PathBuf> {
    crate::config::logs_dir()
        .ok()
        .map(|d| d.join("virtualdeck.log"))
}

fn rotated_path() -> Option<PathBuf> {
    crate::config::logs_dir()
        .ok()
        .map(|d| d.join("virtualdeck.1.log"))
}

/// Escribe una entrada. Nunca falla ni entra en panico.
pub fn write(level: Level, scope: &str, message: &str) {
    write_meta(level, scope, message, None);
}

/// Igual que [`write`], con un dato estructurado adjunto.
pub fn write_meta(level: Level, scope: &str, message: &str, meta: Option<&serde_json::Value>) {
    // Un candado envenenado (otro hilo entro en panico mientras escribia) no debe
    // impedir que se siga registrando: es justo el momento en que el log importa.
    let _guard = CANDADO.lock().unwrap_or_else(|e| e.into_inner());

    let Some(ruta) = log_path() else { return };
    let Some(dir) = ruta.parent() else { return };
    if fs::create_dir_all(dir).is_err() {
        return;
    }

    rotar_si_hace_falta(&ruta);

    let meta_txt = match meta {
        Some(v) => format!(" {v}"),
        None => String::new(),
    };
    let linea = format!(
        "[{}] [{level}] [{scope}] {}{meta_txt}\n",
        marca_de_tiempo(),
        // Un mensaje con saltos de linea partiria la entrada en varias y
        // romperia cualquier lectura por lineas del archivo.
        message.replace(['\n', '\r'], " ")
    );

    if let Ok(mut f) = OpenOptions::new().create(true).append(true).open(&ruta) {
        let _ = f.write_all(linea.as_bytes());
    }
}

pub fn error(scope: &str, message: &str) {
    write(Level::Error, scope, message);
}

pub fn warn(scope: &str, message: &str) {
    write(Level::Warn, scope, message);
}

pub fn info(scope: &str, message: &str) {
    write(Level::Info, scope, message);
}

/// Rota cuando el archivo supera [`MAX_BYTES`], conservando una generacion.
///
/// Se copia y se trunca en vez de renombrar: en Windows, renombrar sobre un
/// destino existente falla, y el archivo de destino puede estar abierto por un
/// visor de logs del propio usuario.
fn rotar_si_hace_falta(ruta: &PathBuf) {
    let Ok(meta) = fs::metadata(ruta) else { return };
    if meta.len() < MAX_BYTES {
        return;
    }
    if let Some(previo) = rotated_path() {
        let _ = fs::copy(ruta, previo);
    }
    let _ = fs::write(ruta, b"");
}

/// Lee la cola del log, para adjuntarla a un reporte de error.
///
/// Devuelve el **final** del archivo, no el principio: lo que explica un fallo es
/// lo ultimo que paso.
pub fn read_recent(max_bytes: usize) -> String {
    let Some(ruta) = log_path() else {
        return String::new();
    };
    let Ok(datos) = fs::read(&ruta) else {
        return String::new();
    };
    if datos.len() <= max_bytes {
        return String::from_utf8_lossy(&datos).into_owned();
    }

    // Cortar por bytes puede caer en mitad de un caracter multibyte (una tilde,
    // una ñ). Se avanza hasta el principio del siguiente caracter para no dejar
    // un byte suelto al inicio.
    let mut inicio = datos.len() - max_bytes;
    while inicio < datos.len() && (datos[inicio] & 0b1100_0000) == 0b1000_0000 {
        inicio += 1;
    }
    format!(
        "…(truncado)…\n{}",
        String::from_utf8_lossy(&datos[inicio..])
    )
}

/// Borra el log y su generacion rotada.
pub fn clear() {
    let _guard = CANDADO.lock().unwrap_or_else(|e| e.into_inner());
    if let Some(p) = log_path() {
        let _ = fs::write(&p, b"");
    }
    if let Some(p) = rotated_path() {
        let _ = fs::remove_file(p);
    }
}

/// Marca de tiempo UTC en formato ISO-8601.
///
/// Se calcula a mano, igual que en el modulo de backups, para no arrastrar una
/// biblioteca de fechas por un unico uso. El algoritmo civil-from-days es el de
/// Howard Hinnant y es exacto para cualquier fecha del calendario gregoriano
/// proleptico.
fn marca_de_tiempo() -> String {
    let segundos = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);

    let dias = segundos.div_euclid(86_400);
    let resto = segundos.rem_euclid(86_400);
    let (y, m, d) = civil_from_days(dias);

    format!(
        "{y:04}-{m:02}-{d:02}T{:02}:{:02}:{:02}Z",
        resto / 3600,
        (resto % 3600) / 60,
        resto % 60
    )
}

fn civil_from_days(z: i64) -> (i64, u32, u32) {
    let z = z + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z.rem_euclid(146_097);
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = (doy - (153 * mp + 2) / 5 + 1) as u32;
    let m = if mp < 10 { mp + 3 } else { mp - 9 } as u32;
    (if m <= 2 { y + 1 } else { y }, m, d)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn la_marca_de_tiempo_tiene_forma_iso() {
        let t = marca_de_tiempo();
        assert_eq!(t.len(), 20, "formato inesperado: {t}");
        assert!(t.ends_with('Z'));
        assert_eq!(&t[4..5], "-");
        assert_eq!(&t[10..11], "T");
    }

    #[test]
    fn convierte_fechas_conocidas() {
        // Dia 0 de la epoca Unix.
        assert_eq!(civil_from_days(0), (1970, 1, 1));
        // 2000-03-01, justo despues del bisiesto de un año divisible por 400,
        // que es donde fallan las implementaciones ingenuas.
        assert_eq!(civil_from_days(11_017), (2000, 3, 1));
        assert_eq!(civil_from_days(11_016), (2000, 2, 29));
    }

    #[test]
    fn truncar_no_parte_caracteres_multibyte() {
        // "ñ" ocupa dos bytes. Cortar por la mitad dejaria un byte suelto que
        // aparece como el caracter de reemplazo al principio del texto.
        let datos = "áéíóúñ".repeat(50).into_bytes();
        let mut inicio = datos.len() - 25;
        while inicio < datos.len() && (datos[inicio] & 0b1100_0000) == 0b1000_0000 {
            inicio += 1;
        }
        let cola = String::from_utf8(datos[inicio..].to_vec());
        assert!(cola.is_ok(), "el corte dejo UTF-8 invalido");
    }

    #[test]
    fn un_mensaje_multilinea_no_parte_la_entrada() {
        let sucio = "primera\nsegunda\r\ntercera";
        let limpio = sucio.replace(['\n', '\r'], " ");
        assert!(!limpio.contains('\n'));
        assert_eq!(limpio, "primera segunda  tercera");
    }
}
