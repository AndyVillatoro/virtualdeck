//! Paginas del deck y perfiles guardados.

use serde::{Deserialize, Serialize};
use serde_json::Map;

use super::{ButtonConfig, Extra};

/// Una pagina del deck.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PageConfig {
    pub id: String,
    pub name: String,
    /// Columnas (3..6). Ausente = 4.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub grid_size: Option<u8>,
    /// Filas. Ausente = igual a `grid_size` (grilla cuadrada).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub grid_rows: Option<u8>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub target_app: Option<String>,
    #[serde(flatten, default, skip_serializing_if = "Map::is_empty")]
    pub extra: Extra,
}

impl PageConfig {
    /// Columnas efectivas (default 4).
    pub fn columns(&self) -> u8 {
        self.grid_size.unwrap_or(4)
    }

    /// Filas efectivas (default: igual a columnas).
    pub fn rows(&self) -> u8 {
        self.grid_rows.unwrap_or_else(|| self.columns())
    }
}

/// Un perfil guardado (snapshot de paginas + botones + acento).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Profile {
    pub id: String,
    pub name: String,
    pub pages: Vec<PageConfig>,
    pub buttons: Vec<ButtonConfig>,
    pub accent: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub wallpaper: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub target_app: Option<String>,
}
