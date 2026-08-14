//! Rutas de datos de VirtualDeck.
//!
//! Deben coincidir **exactamente** con las que usa la version Electron para que
//! una instalacion 0.5.x migre a v1.0 sin que el usuario pierda su deck:
//!
//! | Ruta | Contenido |
//! |---|---|
//! | `%APPDATA%\VirtualDeck\deck-config.json` | configuracion completa |
//! | `%APPDATA%\VirtualDeck\backups\` | copias rotativas (5 max) |
//! | `%APPDATA%\VirtualDeck\logs\` | log rotativo (512 KB) |
//! | `%APPDATA%\VirtualDeck\images\` | imagenes de botones |
//!
//! Electron deriva ese directorio del `productName` de package.json
//! (`VirtualDeck`), no del `appId`.

use std::path::PathBuf;

use super::ConfigError;

/// Nombre de carpeta bajo `%APPDATA%`. Coincide con `productName` en Electron.
const APP_DIR: &str = "VirtualDeck";

/// `%APPDATA%\VirtualDeck`. Es el equivalente de `app.getPath('userData')`.
///
/// No crea el directorio: solo resuelve la ruta.
pub fn user_data_dir() -> Result<PathBuf, ConfigError> {
    let appdata = std::env::var_os("APPDATA").ok_or(ConfigError::NoUserDataDir)?;
    Ok(PathBuf::from(appdata).join(APP_DIR))
}

/// `%APPDATA%\VirtualDeck\deck-config.json`
pub fn config_path() -> Result<PathBuf, ConfigError> {
    Ok(user_data_dir()?.join("deck-config.json"))
}

/// `%APPDATA%\VirtualDeck\backups`
pub fn backups_dir() -> Result<PathBuf, ConfigError> {
    Ok(user_data_dir()?.join("backups"))
}

/// `%APPDATA%\VirtualDeck\logs`
pub fn logs_dir() -> Result<PathBuf, ConfigError> {
    Ok(user_data_dir()?.join("logs"))
}

/// `%APPDATA%\VirtualDeck\images`
pub fn images_dir() -> Result<PathBuf, ConfigError> {
    Ok(user_data_dir()?.join("images"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn las_rutas_cuelgan_del_directorio_de_usuario() {
        // Si %APPDATA% no existe en el entorno de CI, no hay nada que verificar.
        let Ok(base) = user_data_dir() else { return };

        assert!(base.ends_with(APP_DIR));
        assert_eq!(config_path().unwrap(), base.join("deck-config.json"));
        assert_eq!(backups_dir().unwrap(), base.join("backups"));
        assert_eq!(logs_dir().unwrap(), base.join("logs"));
        assert_eq!(images_dir().unwrap(), base.join("images"));
    }
}
