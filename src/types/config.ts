import type { ButtonAction, TipoWidget } from './actions';
import type { RGBSettings, SensorsSettings } from './hardware';

export interface SliderWidgetConfig {
  /** Qué controla el slider: 'volume' | 'brightness' | 'variable' */
  target: 'volume' | 'brightness' | 'variable';
  /** Si target === 'variable', nombre de la variable de estado en DeckConfig.state */
  varName?: string;
  /** Orientación visual de la barra: 'horizontal' (por defecto) o 'vertical' */
  orientation?: 'horizontal' | 'vertical';
  /** Valor mínimo (por defecto 0) */
  min?: number;
  /** Valor máximo (por defecto 100) */
  max?: number;
  /** Paso del deslizador (por defecto 1 para variables, 5 para volumen/brillo) */
  step?: number;
  /** Mostrar indicador numérico/porcentaje (por defecto true) */
  showValue?: boolean;
  /** Prefijo o etiqueta técnica personalizada (ej. "VOL", "BRI", "VAR") */
  label?: string;
}

export interface SubButtonConfig {
  id: string;
  label?: string;
  sublabel?: string;
  icon?: string;
  dotGlyph?: string;
  bgColor?: string;
  fgColor?: string;
  action: ButtonAction;
  actions?: ButtonAction[];
  isToggle?: boolean;
  actionToggleOff?: ButtonAction;
  longPressAction?: ButtonAction;
}

export interface SensorCondition {
  /** SensorId estable de LHM (p. ej. "/amdcpu/0/temperature/0"). */
  id: string;
  op: '>' | '<' | '>=' | '<=' | '==';
  value: number;
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
    varName: string;
    prefix?: string;
    suffix?: string;
  };
  /** Configuración del widget 'sensor': qué sensor mostrar y umbrales para colorear. */
  sensorWidget?: {
    sensorId: string;
    suffix?: string;
    warnAt?: number;
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
  /** 4.5 — Subdivisión modular de mosaico 2×2 (4 mini-botones: TL, TR, BL, BR). */
  subButtons?: SubButtonConfig[];
  /** 7.4 — Botón anclado global: persiste en su celda en todas las páginas. */
  pinned?: boolean;
  /** 7.8 — Configuración del widget 'slider': barra táctil continua horizontal/vertical. */
  sliderWidget?: SliderWidgetConfig;
}

export interface PageConfig {
  id: string;
  name: string;
  gridSize?: 3 | 4 | 5 | 6;
  /** Número de filas. Por defecto igual a gridSize (grilla cuadrada). */
  gridRows?: number;
  /** 7.4 — Proceso de aplicación vinculado para cambio automático de página (ej. "obs64", "photoshop"). */
  targetApp?: string;
  /** Tienda (T-P4): de qué entrada de qué manifiesto vino esta página, para avisar updates. */
  origen?: OrigenInstalacion;
}

export interface Profile {
  id: string;
  name: string;
  pages: PageConfig[];
  buttons: ButtonConfig[];
  accent: string;
  wallpaper?: string;
  targetApp?: string;
  /** Tienda (T-P4): de qué entrada de qué manifiesto vino este perfil, para avisar updates. */
  origen?: OrigenInstalacion;
}

export type SoundProfileId = 'click' | 'tick' | 'thud' | 'off';

export type ThemeMode = 'dark' | 'light' | 'dot480' | 'system';

export interface DeckConfig {
  pages: PageConfig[];
  buttons: ButtonConfig[];
  accent: string;
  wallpaper: string;
  profiles?: Profile[];
  soundOnPress?: boolean;
  soundProfile?: SoundProfileId;
  kiosk?: { enabled: boolean; pin?: string };
  toggledIds?: string[];
  state?: Record<string, string>;
  configVersion?: number;
  rgb?: RGBSettings;
  uiScale?: number;
  theme?: ThemeMode;
  sensors?: SensorsSettings;
  remote?: RemoteSettings;
  musicPanel?: { enabled: boolean; side: 'left' | 'right' };
  tileMode?: 'square' | 'fill';
  language?: 'es' | 'en' | 'system';
  onboardingCompleted?: boolean;
  floatingBar?: FloatingBarSettings;
  hintsDismissed?: string[];
  alwaysOnTop?: boolean;
  autoProfileSwitch?: boolean;
  autoProfileRestoreDefault?: boolean;
  targetDisplayId?: number;
}

export interface BarGeometry {
  huecos: number;
  lado: 'left' | 'right';
  tile: number;
  y: number | null;
}

export interface FloatingBarSettings {
  enabled: boolean;
  slots: (string | null)[];
  opacity?: number;
  side?: 'left' | 'right';
  y?: number | null;
  tileSize?: number;
}

export type TipoEntradaGaleria = 'profile' | 'page';

export interface EntradaGaleria {
  id: string;
  label: string;
  author?: string;
  description?: string;
  url: string;
  tags?: string[];
  /** Tienda (T-P4): qué trae la url. Ausente = 'profile' (formato v1). */
  kind?: TipoEntradaGaleria;
  /** Versión del contenido (semver libre, ej. "1.2.0"). */
  version?: string;
  /** Versión mínima de VirtualDeck para instalarlo (ej. "0.12.0"). */
  minAppVersion?: string;
  /** App destino (ej. "obs64"): activa el auto-perfil si coincide. */
  targetApp?: string;
  /** Requisitos en texto libre (ej. "OBS instalado", "cuenta de Spotify"). */
  requires?: string[];
  /** Texto libre del autor (se muestra tal cual en la ficha de la tienda). */
  readme?: string;
  /** Dirección de un texto del autor (se trae como la ficha: solo https, tope 64 KiB). */
  readmeUrl?: string;
}

/** De qué entrada de qué manifiesto se instaló un perfil o página. */
export interface OrigenInstalacion {
  manifestUrl?: string;
  entryId?: string;
  version?: string;
}

/**
 * Lo instalado desde la tienda, resumido para comparar con un manifiesto.
 * Sale de `profiles[].origen` y `pages[].origen` (ver `instaladosDeConfig`).
 */
export interface InstaladoTienda {
  kind: TipoEntradaGaleria;
  label: string;
  entryId?: string;
  manifestUrl?: string;
  version?: string;
}

/**
 * Pedido de la ventana `#tienda` a la principal: instalar esto.
 * La ventana de la tienda no escribe configuración —no ve los cambios sin
 * guardar de la principal y la pisaría—; la principal valida y aplica.
 */
export type PedidoTienda =
  | { kind: 'profile'; profile: unknown; origen?: OrigenInstalacion; agregarAlDeck?: boolean; label?: string }
  | { kind: 'page'; page: unknown; buttons: unknown; origen?: OrigenInstalacion };

/** Respuesta de la principal: se aplicó, o por qué no. */
export interface ResultadoTienda {
  ok: boolean;
  /** Error ya traducido, para mostrar tal cual en la tienda. */
  error?: string;
  /** Páginas: cuántos atajos globales se limpiaron por chocar (aviso). */
  limpiados?: number;
}

export interface ResumenRiesgo {
  botones: number;
  scripts: string[];
  programas: string[];
  atajosGlobales: string[];
  webhooks?: string[];
  teclas?: string[];
  /** Disparadores que se ejecutan solos, sin pulsar: temporizadores y sensores. */
  automaticos: string[];
  /** Efectos al pulsar no cubiertos arriba: voz, cierre de apps, portapapeles, integraciones. */
  integraciones: string[];
}

export interface OrdenRemota {
  host: string;
  port?: number;
  token: string;
  boton?: string;
  pagina?: number;
}

export interface RemoteSettings {
  enabled: boolean;
  port: number;
  token: string;
  allowLan: boolean;
}

export interface RemoteStatus {
  corriendo: boolean;
  port: number;
  lan: string[];
  ipPrincipal?: string;
  hostname?: string;
  mdnsUrl?: string;
}

export interface FirewallStatus {
  soportado: boolean;
  existe: boolean;
  permitido: boolean;
  error?: string;
}
