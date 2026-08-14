//! Carga, guardado y backups de la configuracion.
//!
//! Portado de `electron/main/configManager.ts`, conservando su comportamiento
//! observable: mismo archivo, mismo formato (JSON indentado a 2 espacios),
//! misma politica de backups (cooldown de 5 minutos, se retienen 5).

use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::{Duration, Instant};

use serde_json::Value;

use super::{
    backups_dir, config_path, migration, ConfigError, DeckConfig, BACKUP_FILE_PREFIX,
    BACKUP_FILE_SUFFIX,
};

/// No se hace un backup nuevo si el ultimo es mas reciente que esto.
const BACKUP_COOLDOWN: Duration = Duration::from_secs(5 * 60);
/// Cantidad de backups que se conservan.
const BACKUP_RETAIN: usize = 5;

/// Momento del ultimo backup. `None` = todavia no se hizo ninguno en esta
/// ejecucion (igual que el `lastBackupAt = 0` de Electron).
static LAST_BACKUP: Mutex<Option<Instant>> = Mutex::new(None);

fn io_err(path: &Path, source: std::io::Error) -> ConfigError {
    ConfigError::Io {
        path: path.display().to_string(),
        source,
    }
}

/// Lee y migra la configuracion del disco.
///
/// Devuelve `Ok(None)` si el archivo no existe (instalacion limpia), lo que es
/// distinto de un error de lectura o de un JSON corrupto.
pub fn load() -> Result<Option<DeckConfig>, ConfigError> {
    let path = config_path()?;
    if !path.exists() {
        return Ok(None);
    }
    let text = fs::read_to_string(&path).map_err(|e| io_err(&path, e))?;
    Ok(Some(parse_and_migrate(&text, &path)?))
}

/// Parsea, migra y deserializa. Separado de [`load`] para poder testearlo sin
/// tocar el disco.
pub fn parse_and_migrate(text: &str, path: &Path) -> Result<DeckConfig, ConfigError> {
    let raw: Value = serde_json::from_str(text).map_err(|source| ConfigError::Json {
        path: path.display().to_string(),
        source,
    })?;
    let migrated = migration::migrate(raw);
    serde_json::from_value(migrated).map_err(|source| ConfigError::Json {
        path: path.display().to_string(),
        source,
    })
}

/// Guarda la configuracion, rotando un backup antes si corresponde.
pub fn save(config: &DeckConfig) -> Result<(), ConfigError> {
    let path = config_path()?;
    if let Some(dir) = path.parent() {
        fs::create_dir_all(dir).map_err(|e| io_err(dir, e))?;
    }

    rotate_backup(&path)?;

    let text = serde_json::to_string_pretty(config).map_err(|source| ConfigError::Json {
        path: path.display().to_string(),
        source,
    })?;
    fs::write(&path, text).map_err(|e| io_err(&path, e))
}

/// Copia la config actual a `backups/` si paso el cooldown, y poda las viejas.
///
/// Los fallos de backup no abortan el guardado: es preferible escribir la
/// config sin backup que perder el cambio del usuario.
fn rotate_backup(config: &Path) -> Result<(), ConfigError> {
    if !config.exists() {
        return Ok(());
    }

    {
        let mut last = LAST_BACKUP.lock().unwrap_or_else(|e| e.into_inner());
        if let Some(prev) = *last {
            if prev.elapsed() < BACKUP_COOLDOWN {
                return Ok(());
            }
        }
        *last = Some(Instant::now());
    }

    let dir = backups_dir()?;
    if fs::create_dir_all(&dir).is_err() {
        return Ok(());
    }

    let name = format!("{BACKUP_FILE_PREFIX}{}{BACKUP_FILE_SUFFIX}", timestamp());
    let _ = fs::copy(config, dir.join(name));

    prune_backups(&dir);
    Ok(())
}

/// Deja solo los [`BACKUP_RETAIN`] backups mas recientes.
fn prune_backups(dir: &Path) {
    let mut files = backup_files(dir);
    // Orden lexicografico == cronologico gracias al timestamp ISO del nombre.
    files.sort();
    while files.len() > BACKUP_RETAIN {
        let stale = files.remove(0);
        let _ = fs::remove_file(dir.join(stale));
    }
}

fn backup_files(dir: &Path) -> Vec<String> {
    let Ok(entries) = fs::read_dir(dir) else {
        return Vec::new();
    };
    entries
        .flatten()
        .filter_map(|e| e.file_name().into_string().ok())
        .filter(|n| n.starts_with(BACKUP_FILE_PREFIX) && n.ends_with(BACKUP_FILE_SUFFIX))
        .collect()
}

/// Metadatos de un backup, para mostrarlos en la interfaz.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BackupInfo {
    pub filename: String,
    /// Milisegundos desde el epoch (mtime).
    pub timestamp_ms: u128,
    pub size_bytes: u64,
}

/// Lista los backups existentes, del mas reciente al mas viejo.
pub fn list_backups() -> Result<Vec<BackupInfo>, ConfigError> {
    let dir = backups_dir()?;
    if !dir.exists() {
        return Ok(Vec::new());
    }

    let mut out: Vec<BackupInfo> = backup_files(&dir)
        .into_iter()
        .filter_map(|filename| {
            let meta = fs::metadata(dir.join(&filename)).ok()?;
            let timestamp_ms = meta
                .modified()
                .ok()?
                .duration_since(std::time::UNIX_EPOCH)
                .ok()?
                .as_millis();
            Some(BackupInfo {
                filename,
                timestamp_ms,
                size_bytes: meta.len(),
            })
        })
        .collect();

    out.sort_by_key(|b| std::cmp::Reverse(b.timestamp_ms));
    Ok(out)
}

/// Restaura un backup y lo deja como configuracion activa.
///
/// El nombre se valida contra el patron esperado para que no pueda escaparse
/// del directorio de backups.
pub fn restore_backup(filename: &str) -> Result<DeckConfig, ConfigError> {
    if !is_valid_backup_name(filename) {
        return Err(ConfigError::InvalidBackupName(filename.to_string()));
    }
    let path = backups_dir()?.join(filename);
    if !path.exists() {
        return Err(ConfigError::BackupNotFound(filename.to_string()));
    }

    let text = fs::read_to_string(&path).map_err(|e| io_err(&path, e))?;
    let config = parse_and_migrate(&text, &path)?;
    save(&config)?;
    Ok(config)
}

/// `deck-config-<timestamp>.json`, sin separadores de ruta.
fn is_valid_backup_name(name: &str) -> bool {
    name.starts_with(BACKUP_FILE_PREFIX)
        && name.ends_with(BACKUP_FILE_SUFFIX)
        && !name.contains(['/', '\\'])
        && !name.contains("..")
}

/// Timestamp UTC con el mismo formato que usa Electron para los backups:
/// `YYYY-MM-DD_HH-MM-SS` (derivado de `toISOString()` reemplazando `:`/`.`).
fn timestamp() -> String {
    let secs = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let (y, mo, d, h, mi, s) = civil_from_unix(secs);
    format!("{y:04}-{mo:02}-{d:02}_{h:02}-{mi:02}-{s:02}")
}

/// Convierte segundos desde el epoch a fecha civil UTC.
///
/// Algoritmo `civil_from_days` de Howard Hinnant. Se implementa a mano para no
/// arrastrar una dependencia de fechas solo para nombrar archivos.
fn civil_from_unix(secs: u64) -> (i64, u32, u32, u32, u32, u32) {
    let days = (secs / 86_400) as i64;
    let rem = secs % 86_400;
    let (h, mi, s) = (
        (rem / 3600) as u32,
        ((rem % 3600) / 60) as u32,
        (rem % 60) as u32,
    );

    let z = days + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z.rem_euclid(146_097);
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = (doy - (153 * mp + 2) / 5 + 1) as u32;
    let m = if mp < 10 { mp + 3 } else { mp - 9 } as u32;
    let y = if m <= 2 { y + 1 } else { y };

    (y, m, d, h, mi, s)
}

/// Ruta efectiva de la config (util para diagnostico desde la CLI).
pub fn path() -> Result<PathBuf, ConfigError> {
    config_path()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn el_timestamp_de_backup_tiene_el_formato_de_electron() {
        let ts = timestamp();
        assert_eq!(ts.len(), 19, "formato YYYY-MM-DD_HH-MM-SS");
        assert_eq!(ts.as_bytes()[10], b'_');
        // Ni ':' ni '.', que es justamente lo que Electron reemplaza.
        assert!(!ts.contains(':') && !ts.contains('.'));
    }

    #[test]
    fn la_conversion_de_epoch_a_fecha_civil_es_correcta() {
        // Valores verificados a mano contra fechas conocidas.
        assert_eq!(civil_from_unix(0), (1970, 1, 1, 0, 0, 0));
        assert_eq!(civil_from_unix(1_767_225_600), (2026, 1, 1, 0, 0, 0));
        // Anio bisiesto: 29 de febrero de 2024.
        assert_eq!(civil_from_unix(1_709_164_800), (2024, 2, 29, 0, 0, 0));
        // Con hora, minuto y segundo.
        assert_eq!(civil_from_unix(1_786_782_645), (2026, 8, 15, 8, 30, 45));
    }

    #[test]
    fn rechaza_nombres_de_backup_peligrosos() {
        assert!(is_valid_backup_name("deck-config-2026-08-14_10-30-45.json"));
        assert!(!is_valid_backup_name("../deck-config-x.json"));
        assert!(!is_valid_backup_name("deck-config-..\\evil.json"));
        assert!(!is_valid_backup_name("otro.json"));
        assert!(!is_valid_backup_name("deck-config-x.txt"));
    }
}
