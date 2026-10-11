//! Pasos de macro de teclado y raton.

use serde::{Deserialize, Serialize};

/// Tipo de paso dentro de una macro.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum MacroStepType {
    Key,
    Hotkey,
    Text,
    Click,
    Move,
    Delay,
    Scroll,
}

/// Un paso de una macro de teclado/raton.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MacroStep {
    #[serde(rename = "type")]
    pub step_type: MacroStepType,
    /// Tecla o texto (para `key` / `hotkey` / `text`).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub value: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub x: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub y: Option<i64>,
    /// 0 = izquierdo, 1 = derecho, 2 = central.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub button: Option<u8>,
    /// Positivo = scroll hacia arriba.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub scroll_y: Option<i64>,
    /// Pausa antes de ejecutar este paso.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub delay_ms: Option<i64>,
}
