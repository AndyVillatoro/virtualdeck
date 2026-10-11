//! Botones del deck: contenido, acciones, disparadores y widgets.

use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};
use serde_json::Map;

use super::{ButtonAction, Extra, SensorCondition};

/// Widget en vivo que reemplaza el icono/etiqueta de un boton.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum WidgetKind {
    Clock,
    Weather,
    NowPlaying,
    Sensor,
    Variable,
    Currency,
    Slider,
}

/// Configuracion del widget `variable`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VarWidget {
    pub var_name: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub prefix: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub suffix: Option<String>,
}

/// Configuracion del widget `sensor`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SensorWidget {
    pub sensor_id: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub suffix: Option<String>,
    /// Umbral de advertencia (amarillo).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub warn_at: Option<f64>,
    /// Umbral critico (rojo).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub crit_at: Option<f64>,
}

/// Configuracion del widget `slider`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SliderWidgetConfig {
    pub target: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub var_name: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub orientation: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub min: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub max: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub step: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub show_value: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,
}

/// Sub-boton para division 2x2.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubButtonConfig {
    pub id: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub sublabel: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub icon: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub dot_glyph: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub bg_color: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub fg_color: Option<String>,
    pub action: ButtonAction,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub actions: Option<Vec<ButtonAction>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub is_toggle: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub action_toggle_off: Option<ButtonAction>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub long_press_action: Option<ButtonAction>,
}

/// Condiciones de visibilidad de un boton. Deben cumplirse todas.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct VisibleIf {
    /// Nombre de proceso sin `.exe`, en minusculas.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub app: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub sensor: Option<SensorCondition>,
}

/// Un boton del deck.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ButtonConfig {
    pub id: String,
    pub page: i64,
    pub label: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub sublabel: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub icon: Option<String>,
    /// Ruta `vd://images/...` o data-URL heredada.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub image_data: Option<String>,

    // --- icono de marca ---
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub brand_icon: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub brand_icon_always_animate: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub brand_icon_custom_bitmap: Option<Vec<String>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub brand_icon_custom_color: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub brand_icon_custom_palette: Option<BTreeMap<String, String>>,
    /// Glifo 5x7 dibujado por el usuario: 7 enteros, bits 4..0 = izq..der.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub custom_glyph57: Option<Vec<i64>>,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub bg_color: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub fg_color: Option<String>,

    // --- acciones ---
    pub action: ButtonAction,
    /// Secuencia. Si esta presente y no vacia, tiene prioridad sobre `action`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub actions: Option<Vec<ButtonAction>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub is_toggle: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub action_toggle_off: Option<ButtonAction>,
    /// Accion al mantener presionado (~500 ms).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub long_press_action: Option<ButtonAction>,
    /// Solo un boton del grupo puede estar activo a la vez.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub radio_group: Option<String>,

    // --- disparadores ---
    /// Hotkey global del SO (ej. `Ctrl+Alt+1`).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub global_hotkey: Option<String>,
    /// Aparece en el menu de la bandeja.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub in_tray_menu: Option<bool>,
    /// Ejecutar automaticamente a esta hora (`HH:MM`).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub timer_trigger_at: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub sensor_trigger: Option<SensorCondition>,

    // --- widgets y visibilidad ---
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub widget: Option<WidgetKind>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub var_widget: Option<VarWidget>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub sensor_widget: Option<SensorWidget>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub slider_widget: Option<SliderWidgetConfig>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub visible_if: Option<VisibleIf>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub pinned: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub sub_buttons: Option<Vec<SubButtonConfig>>,

    /// Campos desconocidos, conservados tal cual.
    #[serde(flatten, default, skip_serializing_if = "Map::is_empty")]
    pub extra: Extra,
}

impl ButtonConfig {
    /// Slot vacio en la posicion indicada.
    pub fn empty(id: impl Into<String>, page: i64) -> Self {
        Self {
            id: id.into(),
            page,
            label: String::new(),
            sublabel: None,
            icon: Some(String::new()),
            image_data: None,
            brand_icon: None,
            brand_icon_always_animate: None,
            brand_icon_custom_bitmap: None,
            brand_icon_custom_color: None,
            brand_icon_custom_palette: None,
            custom_glyph57: None,
            bg_color: None,
            fg_color: None,
            action: ButtonAction::none(),
            actions: None,
            is_toggle: None,
            action_toggle_off: None,
            long_press_action: None,
            radio_group: None,
            global_hotkey: None,
            in_tray_menu: None,
            timer_trigger_at: None,
            sensor_trigger: None,
            widget: None,
            var_widget: None,
            sensor_widget: None,
            slider_widget: None,
            visible_if: None,
            pinned: None,
            sub_buttons: None,
            extra: Extra::new(),
        }
    }

    /// `true` si el boton no tiene accion ni ningun contenido visual.
    pub fn is_empty(&self) -> bool {
        self.action.action_type.is_none()
            && self.label.is_empty()
            && self.icon.as_deref().unwrap_or("").is_empty()
            && self.image_data.is_none()
            && self.brand_icon.is_none()
            // Un widget es contenido aunque no haya etiqueta ni accion: un reloj
            // o un sensor son botones que solo muestran algo. Sin esto la rejilla
            // los dibujaria como casillas vacias.
            && self.widget.is_none()
    }
}
