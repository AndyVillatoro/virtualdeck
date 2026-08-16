//! Configuracion persistente y rutas de datos de la aplicacion.
//!
//! Contrato con los usuarios existentes: la v1.0 en Rust debe leer el mismo
//! `deck-config.json` que escribe VirtualDeck 0.5.x, en la misma ruta, sin
//! perder informacion. Por eso las rutas replican exactamente las que usa
//! Electron via `app.getPath('userData')` y el modelo conserva los campos
//! desconocidos.
//!
//! - [`model`] — tipos de datos (portados de `src/types.ts`)
//! - [`migration`] — cadena de migraciones v1 -> v4
//! - [`store`] — carga, guardado y backups

pub mod migration;
pub mod model;
mod paths;
pub mod store;

pub use migration::{migrate, CURRENT_CONFIG_VERSION};
pub use model::*;
pub use paths::{backups_dir, config_path, images_dir, logs_dir, user_data_dir};
pub use store::{list_backups, load, restore_backup, save, BackupInfo};

/// Prefijo de los archivos de backup. Coincide con el de Electron.
pub(crate) const BACKUP_FILE_PREFIX: &str = "deck-config-";
/// Extension de los archivos de backup.
pub(crate) const BACKUP_FILE_SUFFIX: &str = ".json";

/// Errores de carga, guardado y migracion de configuracion.
#[derive(Debug, thiserror::Error)]
pub enum ConfigError {
    #[error("no se pudo determinar el directorio de datos del usuario (falta %APPDATA%)")]
    NoUserDataDir,

    #[error("error de E/S en {path}: {source}")]
    Io {
        path: String,
        #[source]
        source: std::io::Error,
    },

    #[error("JSON invalido en {path}: {source}")]
    Json {
        path: String,
        #[source]
        source: serde_json::Error,
    },

    #[error("nombre de backup invalido: {0}")]
    InvalidBackupName(String),

    #[error("el backup no existe: {0}")]
    BackupNotFound(String),
}
