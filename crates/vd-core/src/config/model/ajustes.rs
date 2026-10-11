//! Ajustes globales: tema, sonido, kiosko, sensores y RGB.

use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};
use serde_json::Map;

use super::Extra;

/// Timbre del sonido al presionar.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SoundProfileId {
    Click,
    Tick,
    Thud,
    Off,
}

/// Tema de color.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Theme {
    Dark,
    Light,
    #[serde(rename = "dot480")]
    Dot480,
    System,
}

/// Idioma de la interfaz.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Language {
    Es,
    En,
    System,
}

/// Forma de las celdas de la grilla.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TileMode {
    /// Cuadradas estrictas; deja margen si la ventana no es proporcional.
    Square,
    /// Llenan el area; pueden volverse ligeramente rectangulares.
    Fill,
}

/// Categoria de hardware a la que pertenece un sensor.
///
/// `Hash` esta para poder filtrar por categoria con un `HashSet` en
/// [`crate::sensors`].
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SensorCategory {
    Cpu,
    Gpu,
    Mainboard,
    Memory,
    Storage,
    Other,
}

/// Modo kiosko.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct KioskSettings {
    pub enabled: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub pin: Option<String>,
}

/// Ajustes del modulo de sensores (LibreHardwareMonitor via HTTP).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SensorsSettings {
    pub enabled: bool,
    pub host: String,
    pub port: u16,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub categories: Option<Vec<SensorCategory>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub spawn_on_start: Option<bool>,
    /// Lanzar LHM elevado (UAC) para que pueda bindear el puerto.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub spawn_elevated: Option<bool>,
    /// Ruta custom a LibreHardwareMonitor.exe. Vacio = bundled.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub lhm_path: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub show_widget: Option<bool>,
    #[serde(flatten, default, skip_serializing_if = "Map::is_empty")]
    pub extra: Extra,
}

impl Default for SensorsSettings {
    /// El nivel 2 arranca **desactivado**: los sensores nativos funcionan sin el,
    /// y activarlo por defecto haria que toda instalacion limpia intentara
    /// conectarse a un LibreHardwareMonitor que probablemente no existe.
    fn default() -> Self {
        Self {
            enabled: false,
            host: "127.0.0.1".into(),
            // Puerto por defecto del servidor web de LHM.
            port: 8085,
            categories: None,
            spawn_on_start: None,
            spawn_elevated: None,
            lhm_path: None,
            show_widget: None,
            extra: Extra::new(),
        }
    }
}

/// Estado guardado de un dispositivo RGB dentro de un perfil.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RgbDeviceState {
    pub mode: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub brightness: Option<i64>,
    pub zones: Vec<RgbZoneState>,
}

/// Colores guardados de una zona (uno por LED, hex `#RRGGBB`).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RgbZoneState {
    pub zone_id: i64,
    pub zone_name: String,
    pub colors: Vec<String>,
}

/// Un perfil RGB. Se indexa por **nombre** de dispositivo para sobrevivir
/// reconexiones (los ids de OpenRGB cambian entre sesiones).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct RgbProfile {
    pub id: String,
    pub name: String,
    pub devices: BTreeMap<String, RgbDeviceState>,
}

/// Ajustes del modulo RGB (OpenRGB).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RgbSettings {
    pub enabled: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub openrgb_path: Option<String>,
    pub host: String,
    pub port: u16,
    pub auto_connect: bool,
    pub spawn_on_start: bool,
    pub profiles: Vec<RgbProfile>,
    /// `zoneSizes[nombreDispositivo][nombreZona] = N LEDs`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub zone_sizes: Option<BTreeMap<String, BTreeMap<String, i64>>>,
    #[serde(flatten, default, skip_serializing_if = "Map::is_empty")]
    pub extra: Extra,
}
