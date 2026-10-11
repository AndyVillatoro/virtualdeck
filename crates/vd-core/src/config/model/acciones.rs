//! Acciones ejecutables: tipos, `ButtonAction` y botones de sub-deck.

use serde::{Deserialize, Serialize};
use serde_json::Map;

use super::{Extra, MacroStep};

/// Tipo de accion de un boton.
///
/// La variante [`ActionType::Other`] captura tipos que este binario no conoce
/// (por ejemplo si el usuario vuelve a una version anterior), preservandolos
/// tal cual al guardar.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ActionType {
    None,
    App,
    Web,
    Shortcut,
    Script,
    AudioDevice,
    Hotkey,
    MediaPlayPause,
    MediaNext,
    MediaPrev,
    VolumeUp,
    VolumeDown,
    Mute,
    Brightness,
    Clipboard,
    TypeText,
    KillProcess,
    VolumeSet,
    Folder,
    Notify,
    SetVar,
    IncrVar,
    Webhook,
    Tts,
    RegionCapture,
    RgbColor,
    RgbMode,
    RgbProfile,
    RgbPreset,
    WindowSnap,
    Branch,
    Countdown,
    MediaShuffle,
    MediaRepeat,
    Macro,
    MobileRemote,
    Discord,
    Spotify,
    /// Tipo no reconocido. Se conserva textualmente para no romper configs
    /// creadas por otra version.
    #[serde(untagged)]
    Other(String),
}

impl ActionType {
    /// `true` si la accion no hace nada (slot vacio).
    pub fn is_none(&self) -> bool {
        matches!(self, ActionType::None)
    }
}

/// Shell con el que se ejecuta una accion de tipo `script`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ScriptShell {
    Powershell,
    Cmd,
}

/// Metodo HTTP de una accion `webhook`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum WebhookMethod {
    GET,
    POST,
    PUT,
    DELETE,
}

/// Posicion destino de una accion `window-snap`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum SnapPosition {
    LeftHalf,
    RightHalf,
    TopHalf,
    BottomHalf,
    TopLeft,
    TopRight,
    BottomLeft,
    BottomRight,
    Maximize,
    Center,
    Restore,
}

/// Operador de comparacion de una accion `branch`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum BranchOp {
    #[serde(rename = "==")]
    Eq,
    #[serde(rename = "!=")]
    Ne,
    #[serde(rename = ">")]
    Gt,
    #[serde(rename = "<")]
    Lt,
    #[serde(rename = ">=")]
    Ge,
    #[serde(rename = "<=")]
    Le,
    #[serde(rename = "contains")]
    Contains,
    #[serde(rename = "empty")]
    Empty,
    #[serde(rename = "not-empty")]
    NotEmpty,
}

/// Un boton dentro de una accion `folder` (sub-deck).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderButton {
    pub label: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub sublabel: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub icon: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub bg_color: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub fg_color: Option<String>,
    pub action: ButtonAction,
}

/// Accion ejecutable. Es una struct ancha (no un enum por variante) porque asi
/// esta modelada en el JSON de Electron: un `type` mas campos opcionales que
/// solo aplican a ciertos tipos.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ButtonAction {
    #[serde(rename = "type")]
    pub action_type: ActionType,

    // --- app / web / shortcut / script ---
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub app_path: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub app_args: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub shortcut_path: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub script: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub script_shell: Option<ScriptShell>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub show_output: Option<bool>,
    /// Captura el stdout del script en esta variable global.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub capture_to_var: Option<String>,

    // --- audio / teclado / sistema ---
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub device_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub device_name: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub hotkey: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub brightness_level: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub clipboard_text: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub type_text: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub process_name: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub volume_percent: Option<i64>,

    // --- folder / notify ---
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub folder_buttons: Option<Vec<FolderButton>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub notify_title: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub notify_body: Option<String>,

    // --- variables ---
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub var_name: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub var_value: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub var_delta: Option<i64>,

    // --- webhook / tts ---
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub webhook_url: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub webhook_method: Option<WebhookMethod>,
    /// Headers como string JSON (asi los guarda Electron).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub webhook_headers: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub webhook_body: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tts_text: Option<String>,

    // --- encadenado por paso ---
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub delay_ms: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub only_if_prev_ok: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub repeat: Option<i64>,

    // --- RGB ---
    /// `-1` o ausente = todos los dispositivos conectados.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub rgb_device_id: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub rgb_zone_id: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub rgb_color: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub rgb_mode: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub rgb_brightness: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub rgb_profile_name: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub rgb_preset_id: Option<String>,

    // --- window snap ---
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub snap_position: Option<SnapPosition>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub snap_process_name: Option<String>,

    // --- branch ---
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub branch_var: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub branch_op: Option<BranchOp>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub branch_value: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub branch_then: Option<Vec<ButtonAction>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub branch_else: Option<Vec<ButtonAction>>,

    // --- countdown ---
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub timer_delay: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub timer_actions: Option<Vec<ButtonAction>>,

    // --- macro ---
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub macro_steps: Option<Vec<MacroStep>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub macro_repeat: Option<i64>,

    // --- encadenado avanzado (Item 49) ---
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub only_if_prev_failed: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub continue_on_error: Option<bool>,

    // --- mando movil (Item 45) ---
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub mobile_remote_action: Option<String>,

    // --- integraciones de terceros (Item 50) ---
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub discord_action: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub spotify_action: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub spotify_uri: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub spotify_device_id: Option<String>,

    /// Campos desconocidos, conservados tal cual.
    #[serde(flatten, default, skip_serializing_if = "Map::is_empty")]
    pub extra: Extra,
}

impl ButtonAction {
    /// Accion vacia (`type: "none"`), equivalente a un slot sin configurar.
    pub fn none() -> Self {
        Self {
            action_type: ActionType::None,
            ..Default::default()
        }
    }
}

impl Default for ButtonAction {
    fn default() -> Self {
        Self {
            action_type: ActionType::None,
            app_path: None,
            app_args: None,
            url: None,
            shortcut_path: None,
            script: None,
            script_shell: None,
            show_output: None,
            capture_to_var: None,
            device_id: None,
            device_name: None,
            hotkey: None,
            brightness_level: None,
            clipboard_text: None,
            type_text: None,
            process_name: None,
            volume_percent: None,
            folder_buttons: None,
            notify_title: None,
            notify_body: None,
            var_name: None,
            var_value: None,
            var_delta: None,
            webhook_url: None,
            webhook_method: None,
            webhook_headers: None,
            webhook_body: None,
            tts_text: None,
            delay_ms: None,
            only_if_prev_ok: None,
            repeat: None,
            rgb_device_id: None,
            rgb_zone_id: None,
            rgb_color: None,
            rgb_mode: None,
            rgb_brightness: None,
            rgb_profile_name: None,
            rgb_preset_id: None,
            snap_position: None,
            snap_process_name: None,
            branch_var: None,
            branch_op: None,
            branch_value: None,
            branch_then: None,
            branch_else: None,
            timer_delay: None,
            timer_actions: None,
            macro_steps: None,
            macro_repeat: None,
            only_if_prev_failed: None,
            continue_on_error: None,
            mobile_remote_action: None,
            discord_action: None,
            spotify_action: None,
            spotify_uri: None,
            spotify_device_id: None,
            extra: Extra::new(),
        }
    }
}
