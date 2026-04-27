export type ActionType =
  | 'none'
  | 'app'
  | 'web'
  | 'shortcut'
  | 'script'
  | 'audio-device'
  | 'hotkey'
  | 'media-play-pause'
  | 'media-next'
  | 'media-prev'
  | 'volume-up'
  | 'volume-down'
  | 'mute'
  | 'brightness'
  | 'clipboard'
  | 'type-text'
  | 'kill-process'
  | 'volume-set'
  | 'folder'
  | 'notify'
  // 1.2 — Variables persistentes
  | 'set-var'
  | 'incr-var'
  // 1.5 — Tipos nuevos
  | 'webhook'
  | 'tts'
  | 'region-capture'
  // 2.x — RGB (OpenRGB SDK)
  | 'rgb-color'
  | 'rgb-mode'
  | 'rgb-profile'
  | 'rgb-preset'
  // 3.x — Nuevas acciones
  | 'window-snap'
  | 'branch'
  // 4.x — Temporizador
  | 'countdown';

export interface FolderButton {
  label: string;
  sublabel?: string;
  icon?: string;
  bgColor?: string;
  fgColor?: string;
  action: ButtonAction;
}

export interface ButtonAction {
  type: ActionType;
  appPath?: string;
  appArgs?: string;
  url?: string;
  shortcutPath?: string;
  script?: string;
  scriptShell?: 'powershell' | 'cmd';
  showOutput?: boolean;
  deviceId?: string;
  deviceName?: string;
  hotkey?: string;
  brightnessLevel?: number;
  clipboardText?: string;
  typeText?: string;
  processName?: string;
  volumePercent?: number;
  folderButtons?: FolderButton[];
  notifyTitle?: string;
  notifyBody?: string;
  // 1.2 — Variables
  varName?: string;
  varValue?: string;
  varDelta?: number;
  // 1.5 — Tipos nuevos
  webhookUrl?: string;
  webhookMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  webhookHeaders?: string; // JSON string
  webhookBody?: string;
  ttsText?: string;
  /** Captura el stdout del script y lo almacena en esta variable global. */
  captureToVar?: string;
  // 1.3 — Encadenado avanzado por paso
  delayMs?: number;
  onlyIfPrevOk?: boolean;
  repeat?: number;
  // 2.x — RGB (OpenRGB)
  /** Id de device OpenRGB. -1 / undefined = todos los devices conectados. */
  rgbDeviceId?: number;
  /** Id de zona dentro del device. undefined = device entero. */
  rgbZoneId?: number;
  /** Hex #RRGGBB. */
  rgbColor?: string;
  /** Nombre del modo OpenRGB ("Direct", "Static", "Breathing", "Rainbow", ...). */
  rgbMode?: string;
  /** 0-100 (mapeado a brightnessMin..brightnessMax del modo). */
  rgbBrightness?: number;
  /** Nombre del perfil RGB en DeckConfig.rgb.profiles para 'rgb-profile'. Para alternar, usa isToggle + actionToggleOff con otro perfil. */
  rgbProfileName?: string;
  /** ID de preset inteligente para 'rgb-preset': 'off'|'gaming'|'cinema'|'work'|'rainbow'|'night-blue'|'alert-red' */
  rgbPresetId?: string;
  // 3.x — Window snapper
  /** Posición destino para 'window-snap'. */
  snapPosition?: 'left-half' | 'right-half' | 'top-half' | 'bottom-half' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'maximize' | 'center' | 'restore';
  /** Nombre del proceso a snapear (ej. "chrome"). Vacío = ventana en foco al ejecutar. */
  snapProcessName?: string;
  // 3.x — Branch condicional
  /** Nombre de variable a evaluar (branch). */
  branchVar?: string;
  /** Operador de comparación. */
  branchOp?: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'contains' | 'empty' | 'not-empty';
  /** Valor a comparar (acepta {interpolación}). */
  branchValue?: string;
  /** Acciones a ejecutar si la condición es verdadera. */
  branchThen?: ButtonAction[];
  /** Acciones a ejecutar si la condición es falsa. */
  branchElse?: ButtonAction[];
  // 4.x — Countdown
  /** Tiempo de espera en ms antes de ejecutar timerActions. */
  timerDelay?: number;
  /** Acciones a ejecutar después del delay (countdown). */
  timerActions?: ButtonAction[];
}

export interface ButtonConfig {
  id: string;
  page: number;
  label: string;
  sublabel?: string;
  icon?: string;
  imageData?: string;
  brandIcon?: string;
  brandIconAlwaysAnimate?: boolean;
  brandIconCustomBitmap?: string[];
  brandIconCustomColor?: string;
  brandIconCustomPalette?: Record<string, string>;
  /** 2.1 — Glifo 5×7 dibujado por el usuario. 7 enteros con bits 4..0 = izquierda..derecha. */
  customGlyph57?: number[];
  bgColor?: string;
  fgColor?: string;
  action: ButtonAction;
  actions?: ButtonAction[];
  isToggle?: boolean;
  actionToggleOff?: ButtonAction;
  /** 1.4 — Hotkey global del SO (ej. "Ctrl+Alt+1"). Vacío = sin trigger. */
  globalHotkey?: string;
  /** 1.4 — Aparece en el menú del tray como acceso rápido. */
  inTrayMenu?: boolean;
  /** 3.x — Acción al mantener presionado (~500 ms). */
  longPressAction?: ButtonAction;
  /** 3.x — Nombre del grupo radio. Solo un botón del grupo puede estar toggled ON a la vez. */
  radioGroup?: string;
  // 4.x — Widget en vivo
  /** Widget de datos en tiempo real que reemplaza el icono/etiqueta. */
  widget?: 'clock' | 'weather' | 'now-playing';
  /** Ocultar botón si el proceso indicado no está activo (ej. "chrome"). Sin .exe, lowercase. */
  visibleIf?: { app: string };
  /** Ejecutar automáticamente a esta hora (formato HH:MM). */
  timerTriggerAt?: string;
}

export interface PageConfig {
  id: string;
  name: string;
  gridSize?: 3 | 4 | 5 | 6;
  /** Número de filas. Por defecto igual a gridSize (grilla cuadrada). */
  gridRows?: number;
}

export interface Profile {
  id: string;
  name: string;
  pages: PageConfig[];
  buttons: ButtonConfig[];
  accent: string;
}

export type SoundProfileId = 'click' | 'tick' | 'thud' | 'off';

export interface DeckConfig {
  pages: PageConfig[];
  buttons: ButtonConfig[];
  accent: string;
  wallpaper: string;
  profiles?: Profile[];
  soundOnPress?: boolean;
  /** Timbre para el press. Si soundOnPress=false, no suena nada sin importar el perfil. */
  soundProfile?: SoundProfileId;
  /** Modo kiosko: oculta UI no esencial y bloquea ESC con PIN en fullscreen. */
  kiosk?: { enabled: boolean; pin?: string };
  /** 1.2 — Variables persistentes interpolables como {nombre} en campos de acción. */
  state?: Record<string, string>;
  /** Schema version. Migra automáticamente al cargar — ver src/utils/configMigration.ts */
  configVersion?: number;
  /** 2.x — Configuración del módulo RGB (OpenRGB). */
  rgb?: RGBSettings;
  /** 4.x — Factor de escala de la interfaz (0.75 – 1.75). Default 1. */
  uiScale?: number;
  /** 4.x — Tema de color. */
  theme?: 'dark' | 'light' | 'system';
}

export interface RGBSettings {
  enabled: boolean;
  /** Ruta absoluta a OpenRGB.exe (auto-spawn si está set). */
  openrgbPath?: string;
  host: string;
  port: number;
  autoConnect: boolean;
  spawnOnStart: boolean;
  profiles: RGBProfile[];
  /** Tamaños de zonas redimensionables: zoneSizes[deviceName][zoneName] = N LEDs. */
  zoneSizes?: Record<string, Record<string, number>>;
}

export interface RGBProfile {
  id: string;
  name: string;
  /** deviceName -> estado del device (clave por nombre para sobrevivir reconexiones). */
  devices: Record<string, RGBDeviceState>;
}

export interface RGBDeviceState {
  mode: string;
  brightness?: number;
  /** Por zona: array de colores (uno por LED, hex #RRGGBB). */
  zones: Array<{ zoneId: number; zoneName: string; colors: string[] }>;
}

export interface RGBZoneInfo {
  id: number;
  name: string;
  type: number;
  ledCount: number;
  ledsMin: number;
  ledsMax: number;
  resizable: boolean;
}

export interface RGBModeInfo {
  id: number;
  name: string;
  flags: number;
  /** 0=none(autonomous) 1=per-LED(Direct) 2=per-mode(Static/Breathing) 3=random */
  colorMode: number;
  brightnessMin?: number;
  brightnessMax?: number;
}

export interface RGBDeviceInfo {
  id: number;
  name: string;
  type: number;
  typeLabel: string;
  vendor?: string;
  description: string;
  activeMode: number;
  zones: RGBZoneInfo[];
  modes: RGBModeInfo[];
  /** Colores actuales por LED (hex #RRGGBB), uno por LED en orden. */
  colors: string[];
  ledNames: string[];
}

export interface RGBStatus {
  connected: boolean;
  serverRunning: boolean;
  deviceCount: number;
  host: string;
  port: number;
  error?: string;
}

export interface AudioDevice {
  id: string;
  name: string;
  isDefault: boolean;
}

export interface BackupInfo {
  filename: string;
  timestamp: number;
  sizeBytes: number;
}

export interface WeatherInfo {
  temp: number;
  code: number;
  city: string;
  country: string;
}

export interface NowPlaying {
  title: string;
  artist: string;
  status: 'Playing' | 'Paused' | 'Stopped' | 'Unknown';
  source: string;
  thumbnail?: string;
}

export interface ElectronAPI {
  window: {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
    fullscreen: () => void;
  };
  config: {
    load: () => Promise<object>;
    save: (data: object) => Promise<boolean>;
    export: () => Promise<boolean>;
    import: () => Promise<object | null>;
    listBackups: () => Promise<BackupInfo[]>;
    restoreBackup: (filename: string) => Promise<object | null>;
  };
  audio: {
    list: () => Promise<AudioDevice[]>;
    setDefault: (deviceId: string) => Promise<boolean>;
  };
  media: {
    nowPlaying: () => Promise<NowPlaying | null>;
    control: (cmd: 'play-pause' | 'next' | 'prev' | 'stop') => Promise<boolean>;
    diagnose: () => Promise<{ ok: boolean; stage: string; stdout: string; stderr: string }>;
  };
  weather: {
    get: (force?: boolean) => Promise<WeatherInfo | null>;
  };
  launch: {
    app: (path: string, args?: string[]) => Promise<boolean>;
    url: (url: string) => Promise<boolean>;
    script: (script: string, shell?: string) => Promise<boolean>;
    scriptCapture: (script: string, shell?: string) => Promise<{ success: boolean; output: string }>;
    shortcut: (path: string) => Promise<boolean>;
    mediaKey: (key: string) => Promise<boolean>;
    brightness: (level: number) => Promise<boolean>;
    hotkey: (combo: string) => Promise<boolean>;
    clipboard: (text: string) => Promise<boolean>;
    typeText: (text: string) => Promise<boolean>;
    killProcess: (name: string) => Promise<boolean>;
    setVolume: (percent: number) => Promise<boolean>;
    snapWindow: (position: string, processName?: string) => Promise<boolean>;
  };
  dialog: {
    openFile: (opts?: object) => Promise<string | null>;
    openImage: () => Promise<string | null>;
    saveClipboardImage: (dataUrl: string) => Promise<string | null>;
  };
  notify: {
    show: (title: string, body: string) => Promise<boolean>;
  };
  app: {
    getAutostart: () => Promise<boolean>;
    setAutostart: (enabled: boolean) => Promise<void>;
    setZoom: (factor: number) => Promise<void>;
    getZoom: () => Promise<number>;
  };
  page: {
    export: (pageData: object) => Promise<boolean>;
    import: () => Promise<{ page: object; buttons: object[] } | null>;
  };
  state: {
    /** Returns lowercase exe names (without .exe) of running processes. Polls every ~5 s from the UI. */
    activeApps: () => Promise<string[]>;
  };
  rgb: {
    status: () => Promise<RGBStatus>;
    connect: (host?: string, port?: number) => Promise<RGBStatus>;
    disconnect: () => Promise<void>;
    spawnServer: (exePath?: string) => Promise<{ ok: boolean; error?: string }>;
    killServer: () => Promise<void>;
    listDevices: () => Promise<RGBDeviceInfo[]>;
    setDeviceColor: (deviceId: number, color: string) => Promise<boolean>;
    setZoneColors: (deviceId: number, zoneId: number, colors: string[]) => Promise<boolean>;
    setSingleLed: (deviceId: number, ledId: number, color: string) => Promise<boolean>;
    setMode: (deviceId: number, mode: string, color?: string, brightness?: number) => Promise<boolean>;
    resizeZone: (deviceId: number, zoneId: number, size: number) => Promise<boolean>;
    applyProfile: (profile: RGBProfile) => Promise<boolean>;
    smartPreset: (presetId: string) => Promise<boolean>;
    pickFile: () => Promise<string | null>;
  };
  events: {
    onButtonTrigger: (handler: (buttonId: string) => void) => () => void;
    onRGBDevicesChanged: (handler: () => void) => () => void;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
