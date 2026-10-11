//! Configuracion raiz: el contenido de `deck-config.json`.

use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};
use serde_json::Map;

use super::{
    ButtonConfig, Extra, KioskSettings, Language, PageConfig, Profile, RgbSettings,
    SensorsSettings, SoundProfileId, Theme, TileMode,
};

/// Configuracion completa de VirtualDeck. Es el contenido de
/// `%APPDATA%\VirtualDeck\deck-config.json`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeckConfig {
    pub pages: Vec<PageConfig>,
    pub buttons: Vec<ButtonConfig>,
    pub accent: String,
    pub wallpaper: String,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub profiles: Option<Vec<Profile>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub sound_on_press: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub sound_profile: Option<SoundProfileId>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub kiosk: Option<KioskSettings>,
    /// Variables persistentes, interpolables como `{nombre}` en las acciones.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub state: Option<BTreeMap<String, String>>,
    /// Version del schema. Ver `config::migration`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub config_version: Option<u32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub rgb: Option<RgbSettings>,
    /// Escala de la interfaz (0.75 – 1.75).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ui_scale: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub theme: Option<Theme>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub sensors: Option<SensorsSettings>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tile_mode: Option<TileMode>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub language: Option<Language>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub onboarding_completed: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub hints_dismissed: Option<Vec<String>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub auto_profile_switch: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub auto_profile_restore_default: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub target_display_id: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub always_on_top: Option<bool>,

    /// Campos desconocidos, conservados tal cual.
    #[serde(flatten, default, skip_serializing_if = "Map::is_empty")]
    pub extra: Extra,
}

impl Default for DeckConfig {
    /// Configuracion de una instalacion limpia: una pagina de 4x4 vacia.
    ///
    /// Existe porque `load()` devuelve `None` cuando no hay archivo, y sin esto
    /// no habria forma de crear el primero: la aplicacion se quedaria mostrando
    /// "no hay configuracion" para siempre.
    fn default() -> Self {
        let pagina = PageConfig {
            id: "p0".into(),
            name: "Main".into(),
            grid_size: Some(4),
            grid_rows: Some(4),
            target_app: None,
            extra: Extra::new(),
        };
        let casillas = usize::from(pagina.columns()) * usize::from(pagina.rows());

        Self {
            pages: vec![pagina],
            buttons: (0..casillas)
                .map(|i| ButtonConfig::empty(format!("0-{i}"), 0))
                .collect(),
            // El acento por defecto del proyecto.
            accent: "#4FC3F7".into(),
            wallpaper: "none".into(),
            config_version: Some(crate::config::CURRENT_CONFIG_VERSION),
            // Una instalacion nueva no tiene por que ver el tutorial de nuevo si
            // el usuario ya lo hizo en otra maquina; pero aqui es de verdad
            // nueva, asi que se deja sin marcar.
            ..Self::vacia()
        }
    }
}

impl DeckConfig {
    /// Todos los campos opcionales a `None`. Auxiliar de [`Default`].
    fn vacia() -> Self {
        // `serde` sabe construirla desde el JSON minimo, y asi este constructor
        // no hay que actualizarlo cada vez que se agrega un campo opcional.
        serde_json::from_str(r#"{"pages":[],"buttons":[],"accent":"","wallpaper":""}"#)
            .expect("el JSON minimo de DeckConfig deberia parsear siempre")
    }

    /// Botones de una pagina, en el orden en que aparecen.
    pub fn buttons_of_page(&self, page: i64) -> impl Iterator<Item = &ButtonConfig> {
        self.buttons.iter().filter(move |b| b.page == page)
    }

    /// Busca un boton por id.
    pub fn button(&self, id: &str) -> Option<&ButtonConfig> {
        self.buttons.iter().find(|b| b.id == id)
    }
}
