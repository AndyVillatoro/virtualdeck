export type ActionType =
  | 'none'
  | 'adjust'
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
  | 'countdown'
  // 5.x — Media extendido
  | 'media-shuffle'
  | 'media-repeat'
  // 5.x — Macro teclado/ratón
  | 'macro';

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
  /** `adjust`: que se sube o se baja, y de cuanto en cuanto. */
  adjustTarget?: 'brightness' | 'volume';
  adjustDelta?: number;
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
  // 5.x — Macro
  /** Pasos de la macro (tipo 'macro'). */
  macroSteps?: MacroStep[];
  /** Veces a repetir la macro. 0 = no repetir. Default 1. */
  macroRepeat?: number;
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
  widget?: TipoWidget;
  /** Widget de divisas: cuánto vale `amount` de `from` en `to`. */
  currencyWidget?: { from: string; to: string; amount?: number };
  /** Configuración del widget 'variable': muestra el valor de una variable de `DeckConfig.state`. */
  varWidget?: {
    /** Nombre de la variable de estado a mostrar (ej. "tomas", "pomodoro"). */
    varName: string;
    /** Texto opcional antes del valor (ej. "🎬 "). */
    prefix?: string;
    /** Texto opcional debajo (ej. "TOMAS"). Vacío = nombre de la variable. */
    suffix?: string;
  };
  /** Configuración del widget 'sensor': qué sensor mostrar y umbrales para colorear. */
  sensorWidget?: {
    sensorId: string;
    /** Sufijo opcional para etiquetar (ej. "CPU", "GPU"). Vacío = nombre del sensor. */
    suffix?: string;
    /** Umbral de advertencia (color amarillo cuando value >= warnAt). */
    warnAt?: number;
    /** Umbral crítico (color rojo cuando value >= critAt). */
    critAt?: number;
  };
  /** Ocultar botón según condiciones combinables (todas deben cumplirse). */
  visibleIf?: {
    app?: string;
    sensor?: SensorCondition;
  };
  /** Ejecutar automáticamente a esta hora (formato HH:MM). */
  timerTriggerAt?: string;
  /** Disparar acción cuando un sensor cruza un umbral (edge-triggered con cooldown). */
  sensorTrigger?: SensorCondition & { cooldownMs?: number };
}

// 5.x — Macro teclado/ratón
export type MacroStepType = 'key' | 'hotkey' | 'text' | 'click' | 'move' | 'delay' | 'scroll';

export interface MacroStep {
  type: MacroStepType;
  /** Tecla o texto (para key/hotkey/text) */
  value?: string;
  /** Coordenada X de pantalla (para click/move) */
  x?: number;
  /** Coordenada Y de pantalla (para click/move) */
  y?: number;
  /** Botón del ratón: 0=izquierdo, 1=derecho, 2=central */
  button?: 0 | 1 | 2;
  /** Desplazamiento vertical del scroll (unidades, positivo=arriba) */
  scrollY?: number;
  /** Pausa antes de ejecutar este paso (ms) */
  delayMs?: number;
}

export interface SensorCondition {
  /** SensorId estable de LHM (p. ej. "/amdcpu/0/temperature/0"). */
  id: string;
  op: '>' | '<' | '>=' | '<=' | '==';
  value: number;
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
  /**
   * El fondo con el que se guardo. Opcional porque los perfiles de antes no lo
   * traen: en esos se deja el que este puesto, que es lo que hacian.
   */
  wallpaper?: string;
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
  /**
   * Los botones de tipo interruptor que están encendidos ahora mismo.
   *
   * Vive en la configuración y no en el estado de React porque la barra
   * flotante es **otra ventana con otro React**: era la única forma de que un
   * botón pulsado en la barra saliera encendido en el deck y al revés.
   *
   * Efecto secundario buscado: sobrevive a reiniciar. Antes todo salía apagado
   * al arrancar, y el primer toque de un interruptor que ya estaba encendido
   * volvía a ejecutar la acción de encender en vez de la de apagar.
   */
  toggledIds?: string[];
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
  /** 5.x — Sensores de hardware vía LibreHardwareMonitor HTTP. */
  sensors?: SensorsSettings;
  /** 1.4 — servidor local para mandar sobre el deck por HTTP. Viene apagado. */
  remote?: RemoteSettings;
  /**
   * El panel de musica de la pantalla principal.
   *
   * Solo se dibuja cuando hay algo sonando: un panel de 300 px vacio se come
   * un tercio de la rejilla a cambio de nada.
   */
  musicPanel?: { enabled: boolean; side: 'left' | 'right' };
  /**
   * 5.x — Modo de las celdas en la grilla.
   * - 'square' (default): cuadradas estrictas, deja margen si el área no
   *   tiene la misma proporción que la grilla.
   * - 'fill': llena el área completa, las celdas pueden volverse ligeramente
   *   rectangulares pero quedan más grandes.
   */
  tileMode?: 'square' | 'fill';
  /** 6.x — Idioma de la interfaz. 'system' detecta el locale del SO. Default 'system'. */
  language?: 'es' | 'en' | 'system';
  /** 6.x — True cuando el usuario completó (o saltó) el onboarding inicial. */
  onboardingCompleted?: boolean;
  /** 6.x — Columna de tiles flotante sobre el resto del escritorio. */
  floatingBar?: FloatingBarSettings;
  /** 6.x — Keys de hints contextuales que el usuario ya descartó. */
  hintsDismissed?: string[];
  /**
   * 6.x — La ventana se queda por encima de las demás.
   *
   * Para quien deja el deck abierto en la pantalla principal y lo pulsa con
   * el ratón: sin esto, cualquier ventana que reciba el foco lo tapa, y la
   * de VirtualDeck no tiene marco con el que distinguirla del fondo.
   */
  alwaysOnTop?: boolean;
}

/**
 * Barra flotante: una columna de tiles por encima de todo, en el monitor
 * principal. Los tiles son botones que ya existen en el deck — la barra guarda
 * ids, no copias, para que editar el boton se refleje en los dos sitios.
 */
/** Geometria que el proceso principal necesita para colocar la barra. */
interface BarGeometry {
  huecos: number;
  lado: 'left' | 'right';
  tile: number;
  y: number | null;
}

export interface FloatingBarSettings {
  enabled: boolean;
  /** Ids de botones del deck en orden. `null` = hueco vacio. */
  slots: (string | null)[];
  /** Opacidad de los tiles, 0.3 – 1. Default 0.9. */
  opacity?: number;
  /** Lado del monitor principal al que se pega. Default 'right'. */
  side?: 'left' | 'right';
  /** Y absoluta guardada tras moverla. `null` = centrada. */
  y?: number | null;
  /** Lado del tile en px, 40 – 120. Default 64. */
  tileSize?: number;
}

/** Una entrada del `manifest.json` de la galeria de perfiles. */
export interface EntradaGaleria {
  id: string;
  label: string;
  author?: string;
  description?: string;
  url: string;
  tags?: string[];
}

/** Lo que un perfil descargado va a ejecutar, para poder enseñarlo antes. */
export interface ResumenRiesgo {
  botones: number;
  scripts: string[];
  programas: string[];
  atajosGlobales: string[];
}

export interface RemoteSettings {
  enabled: boolean;
  port: number;
  /** Se genera solo la primera vez que se activa. Sin token no arranca. */
  token: string;
  /** false = solo este equipo. true = cualquiera en la red local. */
  allowLan: boolean;
}

export interface SensorsSettings {
  enabled: boolean;
  /** Host de LibreHardwareMonitor (default 127.0.0.1). */
  host: string;
  /** Puerto del web server de LHM (default 8085). */
  port: number;
  /** Categorías permitidas (filtra sensores irrelevantes). */
  categories?: SensorCategory[];
  /** Spawnear LHM bundled al arrancar VirtualDeck. */
  spawnOnStart?: boolean;
  /** Lanzar LHM con privilegios de administrador (UAC). Necesario para que
   *  HttpListener bindee el puerto sin URL ACL preconfigurada. */
  spawnElevated?: boolean;
  /** Ruta custom a LibreHardwareMonitor.exe (vacío = usa el bundled). */
  lhmPath?: string;
  /** Mostrar el widget de sensores en el sidebar (MainB) y panel izquierdo (FullscreenB). */
  showWidget?: boolean;
}

export interface RGBSettings {
  enabled: boolean;
  /** Ruta absoluta a OpenRGB.exe (auto-spawn si está set). */
  openrgbPath?: string;
  host: string;
  port: number;
  autoConnect: boolean;
  spawnOnStart: boolean;
  /**
   * Perfil que se aplica solo al arrancar VirtualDeck.
   *
   * Direct no se guarda en el dispositivo y `Static` no siempre sobrevive a un
   * corte de corriente, asi que despues de reiniciar el equipo las luces pueden
   * quedar como las dejo la placa base. Esto las devuelve a lo que el usuario
   * eligio, sin tener que abrir el gestor RGB cada vez.
   */
  startupProfileId?: string;
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

interface RGBZoneInfo {
  id: number;
  name: string;
  type: number;
  ledCount: number;
  ledsMin: number;
  ledsMax: number;
  resizable: boolean;
}

interface RGBModeInfo {
  id: number;
  name: string;
  flags: number;
  /** 0=none(autonomous) 1=per-LED(Direct) 2=per-mode(Static/Breathing) 3=random */
  colorMode: number;
  brightnessMin?: number;
  brightnessMax?: number;
  speedMin?: number;
  speedMax?: number;
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
  /**
   * Colores actuales por LED (hex #RRGGBB), uno por LED en orden.
   *
   * **No refleja el color de los modos que pintan «por modo»** (Static,
   * Breathing…): en esos el color vive en el modo, no en el array por LED. Se
   * comprobó mirando las luces: al cambiar de preset el color cambia de verdad
   * y este array se queda igual. No es un fallo; solo sirve para los modos
   * per-LED, como Direct.
   */
  colors: string[];
  ledNames: string[];
  /**
   * Brillo del modo activo en 0-100, ya normalizado por el proceso principal.
   * `undefined` si el modo no admite brillo — que no es lo mismo que cero.
   */
  brightness?: number;
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

interface BackupInfo {
  filename: string;
  timestamp: number;
  sizeBytes: number;
}

interface WeatherInfo {
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

type SensorKind =
  | 'Temperature' | 'Fan' | 'Voltage' | 'Load' | 'Clock' | 'Power'
  | 'Data' | 'Throughput' | 'Level' | 'SmallData' | 'Other';

export type SensorCategory = 'cpu' | 'gpu' | 'mainboard' | 'memory' | 'storage' | 'other';

export interface Sensor {
  /** SensorId estable de LHM (ej. "/amdcpu/0/temperature/0"). */
  id: string;
  name: string;
  /** Hardware contenedor (CPU, GPU, Mainboard...) según LHM. */
  hardware: string;
  /** Categoría coarse-grained derivada del ImageURL del hardware. */
  category: SensorCategory;
  kind: SensorKind;
  value: number;
  unit: string;
  min?: number;
  max?: number;
}

export interface SensorsStatus {
  enabled: boolean;
  connected: boolean;
  host: string;
  port: number;
  count: number;
  error?: string;
  lastFetchAt?: number;
  /** True cuando el LHM bundled está corriendo (spawn-eado por nosotros). */
  bundledRunning: boolean;
}

export interface PlatformInfo {
  appVersion: string;
  electron: string;
  chrome: string;
  os: string;
  locale: string;
}

/**
 * Los widgets que puede llevar una celda.
 *
 * Estaba escrito a mano en `types.ts` y dos veces mas en `PasoEstilo`, asi que
 * añadir uno pedia acordarse de los tres.
 */
export type TipoWidget = 'clock' | 'weather' | 'now-playing' | 'sensor' | 'variable' | 'currency';

/** Tasas de cambio con una base, tal y como las devuelve el proceso principal. */
export interface TasasDivisa {
  base: string;
  rates: Record<string, number>;
  /** Cuándo las publicó el servicio, para poder enseñarlo. */
  actualizado: string;
  caducaEn: number;
}

export interface ElectronAPI {
  window: {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
    fullscreen: () => void;
    setAlwaysOnTop: (encima: boolean) => void;
  };
  bar: {
    open: (g: BarGeometry) => Promise<boolean>;
    close: () => Promise<boolean>;
    isOpen: () => Promise<boolean>;
    apply: (g: BarGeometry) => Promise<boolean>;
    position: () => Promise<{ y: number } | null>;
    /** Ajusta la ventana al contenido medido, para que nunca quede recortada. */
    fit: (ancho: number, alto: number) => Promise<boolean>;
    /** Cuantos tiles de ese tamano caben de alto en el monitor principal. */
    maxSlots: (tile: number) => Promise<number>;
    onMoved: (cb: (y: number) => void) => () => void;
    onConfigChanged: (cb: (data: unknown) => void) => () => void;
  };
  config: {
    load: () => Promise<object>;
    save: (data: object) => Promise<boolean>;
    export: () => Promise<boolean>;
    import: () => Promise<object | null>;
    listBackups: () => Promise<BackupInfo[]>;
    restoreBackup: (filename: string) => Promise<object | null>;
  };
  remote: {
    status: () => Promise<{ corriendo: boolean; port: number; lan: string[] }>;
    newToken: () => Promise<string>;
    /** Codigo de seis cifras para emparejar el telefono. Caduca a los 5 min. */
    pairCode: () => Promise<string>;
  };
  gallery: {
    // Un solo objeto y no una union discriminada: el tsconfig va con
    // `strict: false` y ahi TypeScript no estrecha `{ok:true}|{ok:false}`,
    // asi que `r.error` daba error de compilacion en la pantalla.
    manifest: (url: string) => Promise<{ ok: boolean; profiles?: EntradaGaleria[]; error?: string }>;
    profile: (url: string) => Promise<{ ok: boolean; perfil?: unknown; riesgo?: ResumenRiesgo; error?: string }>;
  };
  audio: {
    list: () => Promise<AudioDevice[]>;
    setDefault: (deviceId: string) => Promise<boolean>;
  };
  media: {
    nowPlaying: () => Promise<NowPlaying | null>;
    control: (cmd: 'play-pause' | 'next' | 'prev' | 'stop') => Promise<boolean>;
    shuffle: () => Promise<boolean>;
    repeat: () => Promise<boolean>;
    diagnose: () => Promise<{ ok: boolean; stage: string; stdout: string; stderr: string }>;
  };
  currency: {
    /** Tasas de cambio con esa base. Diarias; el proceso principal las cachea. */
    rates: (base: string, force?: boolean) => Promise<{ ok: boolean; datos?: TasasDivisa; error?: string }>;
  };
  weather: {
    get: (force?: boolean) => Promise<WeatherInfo | null>;
  };
  launch: {
    app: (path: string, args?: string[]) => Promise<boolean>;
    /** Brillo actual 0..100, o null si el equipo no lo expone (monitor externo). */
    getBrightness: () => Promise<number | null>;
    getVolume: () => Promise<number | null>;
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
    getVersion: () => Promise<string>;
    /** Abre «Configuracion de la tableta» de Windows. false = no se pudo. */
    tabletSettings: () => Promise<boolean>;
    platformInfo: () => Promise<PlatformInfo>;
  };
  log: {
    write: (entry: { level: 'error' | 'warn' | 'info'; scope: string; message: string; meta?: unknown }) => Promise<void>;
    readRecent: (maxBytes?: number) => Promise<string>;
    open: () => Promise<void>;
    /** 'sin-registro' = no hay nada que exportar todavia. */
    export: () => Promise<'ok' | 'cancelado' | 'sin-registro'>;
  };
  update: {
    check: () => Promise<{ status: 'checking' | 'available' | 'not-available' | 'disabled' | 'error'; version?: string; error?: string }>;
    quitAndInstall: () => Promise<void>;
    onStatus: (handler: (s: { status: 'available' | 'downloaded' | 'error'; version?: string; error?: string }) => void) => () => void;
  };
  page: {
    export: (pageData: object) => Promise<boolean>;
    import: () => Promise<{ page: object; buttons: object[] } | null>;
  };
  state: {
    /** Returns lowercase exe names (without .exe) of running processes. Polls every ~5 s from the UI. */
    activeApps: () => Promise<string[]>;
    /** Foto actual del estado del sistema, para no esperar al primer tic. */
    snapshot: () => Promise<unknown>;
  };
  rgb: {
    status: () => Promise<RGBStatus>;
    connect: (host?: string, port?: number) => Promise<RGBStatus>;
    disconnect: () => Promise<void>;
    spawnServer: (exePath?: string) => Promise<{ ok: boolean; error?: string }>;
    killServer: () => Promise<void>;
    listDevices: () => Promise<RGBDeviceInfo[]>;
    /** `duradero`: elegir un modo que el dispositivo se queda al cerrar OpenRGB. */
    setDeviceColor: (deviceId: number, color: string, duradero?: boolean) => Promise<boolean>;
    setZoneColors: (deviceId: number, zoneId: number, colors: string[]) => Promise<boolean>;
    setSingleLed: (deviceId: number, ledId: number, color: string) => Promise<boolean>;
    setMode: (deviceId: number, mode: string, color?: string, brightness?: number, speed?: number) => Promise<boolean>;
    resizeZone: (deviceId: number, zoneId: number, size: number) => Promise<boolean>;
    applyProfile: (profile: RGBProfile) => Promise<boolean>;
    smartPreset: (presetId: string) => Promise<boolean>;
    /** Los presets con su color, leidos de la lista del proceso principal. */
    presetList: () => Promise<Array<{ id: string; color: string }>>;
    pickFile: () => Promise<string | null>;
  };
  sensors: {
    list: (force?: boolean) => Promise<Sensor[]>;
    get: (id: string) => Promise<Sensor | null>;
    status: () => Promise<SensorsStatus>;
    configure: (opts: { host?: string; port?: number; enabled?: boolean; categories?: SensorCategory[] }) => Promise<SensorsStatus>;
    probe: () => Promise<{ ok: boolean; count: number; error?: string }>;
    spawnLHM: (customPath?: string, elevated?: boolean) => Promise<{ ok: boolean; error?: string }>;
    killLHM: () => Promise<void>;
    /** LHM encontrado en una ruta de instalacion habitual, o null. */
    knownPath: () => Promise<string | null>;
    registerUrlAcl: (port?: number) => Promise<{ ok: boolean; error?: string; url: string }>;
  };
  macro: {
    play: (steps: MacroStep[], repeat?: number) => Promise<{ ok: boolean; error?: string }>;
    startRecord: () => Promise<void>;
    stopRecord: () => Promise<MacroStep[]>;
    isRecording: () => Promise<boolean>;
  };
  events: {
    onButtonTrigger: (handler: (buttonId: string) => void) => () => void;
    onNavPage: (handler: (indice: number) => void) => () => void;
    onRGBDevicesChanged: (handler: () => void) => () => void;
    /** Estado del sistema publicado por el proceso principal cada 5 s. */
    onEstadoSistema: (handler: (data: unknown) => void) => () => void;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
