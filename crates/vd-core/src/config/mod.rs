//! Configuracion persistente y rutas de datos de la aplicacion.
//!
//! Contrato con los usuarios existentes: la v1.0 en Rust debe leer el mismo
//! `deck-config.json` que escribe VirtualDeck 0.5.x, en la misma ruta, sin
//! perder informacion. Por eso las rutas replican exactamente las que usa
//! Electron via `app.getPath('userData')`.

mod paths;

pub use paths::{backups_dir, config_path, images_dir, logs_dir, user_data_dir};

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
}
