//! Modelo de datos de la configuracion, portado desde `src/types.ts`.
//!
//! # Fidelidad
//!
//! Este modelo es un **contrato con los usuarios existentes**: un
//! `deck-config.json` escrito por VirtualDeck 0.5.x tiene que poder cargarse y
//! volver a guardarse sin perder un solo campo. Dos mecanismos lo garantizan:
//!
//! 1. Cada campo opcional usa `skip_serializing_if` para no ensuciar el JSON
//!    con `null`s que Electron nunca escribio.
//! 2. Las structs que contienen datos del usuario llevan un `extra` con
//!    `#[serde(flatten)]`, que captura cualquier campo desconocido y lo vuelve a
//!    emitir al guardar. Asi, aunque este modelo se quede corto frente a una
//!    version futura, **nada se pierde en silencio**.
//!
//! El test `round_trip_conserva_la_config_real` en `store.rs` verifica esto
//! contra el archivo real de la maquina.

use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};

/// Mapa de campos desconocidos capturados por `#[serde(flatten)]`.
pub type Extra = Map<String, Value>;

// ---------------------------------------------------------------------------
// Acciones
// ---------------------------------------------------------------------------

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
            extra: Extra::new(),
        }
    }
}

// ---------------------------------------------------------------------------
// Macros
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Sensores
// ---------------------------------------------------------------------------

/// Operador de una condicion de sensor.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SensorOp {
    #[serde(rename = ">")]
    Gt,
    #[serde(rename = "<")]
    Lt,
    #[serde(rename = ">=")]
    Ge,
    #[serde(rename = "<=")]
    Le,
    #[serde(rename = "==")]
    Eq,
}

/// Condicion sobre el valor de un sensor de LibreHardwareMonitor.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SensorCondition {
    /// SensorId estable de LHM (p. ej. `/amdcpu/0/temperature/0`).
    pub id: String,
    pub op: SensorOp,
    pub value: f64,
    /// Presente solo cuando la condicion se usa como disparador
    /// (`ButtonConfig::sensor_trigger`).
    #[serde(
        default,
        rename = "cooldownMs",
        skip_serializing_if = "Option::is_none"
    )]
    pub cooldown_ms: Option<i64>,
}

impl SensorCondition {
    /// Evalua la condicion contra un valor actual.
    pub fn eval(&self, current: f64) -> bool {
        match self.op {
            SensorOp::Gt => current > self.value,
            SensorOp::Lt => current < self.value,
            SensorOp::Ge => current >= self.value,
            SensorOp::Le => current <= self.value,
            SensorOp::Eq => current == self.value,
        }
    }
}

// ---------------------------------------------------------------------------
// Botones
// ---------------------------------------------------------------------------

/// Widget en vivo que reemplaza el icono/etiqueta de un boton.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum WidgetKind {
    Clock,
    Weather,
    NowPlaying,
    Sensor,
    Variable,
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
    pub visible_if: Option<VisibleIf>,

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
            visible_if: None,
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

// ---------------------------------------------------------------------------
// Paginas y perfiles
// ---------------------------------------------------------------------------

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
pub struct Profile {
    pub id: String,
    pub name: String,
    pub pages: Vec<PageConfig>,
    pub buttons: Vec<ButtonConfig>,
    pub accent: String,
}

// ---------------------------------------------------------------------------
// Ajustes
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Configuracion raiz
// ---------------------------------------------------------------------------

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

    /// Campos desconocidos, conservados tal cual.
    #[serde(flatten, default, skip_serializing_if = "Map::is_empty")]
    pub extra: Extra,
}

impl DeckConfig {
    /// Botones de una pagina, en el orden en que aparecen.
    pub fn buttons_of_page(&self, page: i64) -> impl Iterator<Item = &ButtonConfig> {
        self.buttons.iter().filter(move |b| b.page == page)
    }

    /// Busca un boton por id.
    pub fn button(&self, id: &str) -> Option<&ButtonConfig> {
        self.buttons.iter().find(|b| b.id == id)
    }
}
