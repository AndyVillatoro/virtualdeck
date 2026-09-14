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
  | 'remote'
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
  | 'macro'
  // 6.x — Mando móvil y servidor web
  | 'mobile-remote'
  // 5.0 — Integraciones de terceros
  | 'discord'
  | 'spotify';

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
  /** Otro VirtualDeck al que mandar (tipo 'remote'): «192.168.1.50» o con puerto. */
  remoteHost?: string;
  /** El token del OTRO equipo, el de sus ajustes de servidor local. */
  remoteToken?: string;
  /** Id o etiqueta del boton a pulsar alli. */
  remoteButton?: string;
  /** O una pagina, empezando en 1. Si esta puesta, manda esto y no el boton. */
  remotePage?: number;
  webhookMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  webhookHeaders?: string; // JSON string
  webhookBody?: string;
  ttsText?: string;
  /** Captura el stdout del script y lo almacena en esta variable global. */
  captureToVar?: string;
  // 1.3 / 4.9 — Encadenado avanzado por paso
  delayMs?: number;
  onlyIfPrevOk?: boolean;
  /** 4.9 — Ejecutar solo si el paso anterior falló */
  onlyIfPrevFailed?: boolean;
  /** 4.9 — No detener la secuencia si este paso falla */
  continueOnError?: boolean;
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
  // 6.x — Mando móvil
  /** Acción para tipo 'mobile-remote': generar código, alternar servidor o abrir en navegador. */
  mobileRemoteAction?: 'pair-code' | 'toggle-server' | 'open-web';
  // 5.0 — Integraciones de terceros
  /** Acción para tipo 'discord': alternar mute/deaf, silenciar, ensordecer. */
  discordAction?: 'toggle-mute' | 'toggle-deaf' | 'mute' | 'unmute' | 'deaf' | 'undeaf';
  /** Acción para tipo 'spotify': reproducir URI/playlist, transferir a dispositivo, etc. */
  spotifyAction?: 'play-uri' | 'transfer-playback' | 'toggle-shuffle' | 'toggle-repeat';
  /** URI o enlace de Spotify a reproducir (ej. spotify:playlist:... o https://open.spotify.com/...). */
  spotifyUri?: string;
  /** ID del dispositivo de reproducción de Spotify al que transferir. */
  spotifyDeviceId?: string;
  /** Token de acceso de Spotify Web API (opcional por botón para transferencias o reproducción directa). */
  spotifyToken?: string;
}

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

/**
 * Los widgets que puede llevar una celda.
 */
export type TipoWidget = 'clock' | 'weather' | 'now-playing' | 'sensor' | 'variable' | 'currency' | 'slider';

