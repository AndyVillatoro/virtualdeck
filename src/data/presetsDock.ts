import type { ButtonConfig } from '../types/config';

/**
 * Hueco individual dentro de un preset de control físico.
 * Define la acción y la apariencia técnica (icono, etiqueta y colores) que se
 * aplican a la celda del deck vinculada al gesto del control. Incluye el par
 * de alternancia (`isToggle` + `actionToggleOff`) cuando el gesto se deshace
 * pulsando otra vez (multitarea, portapapeles): `rellenarBotones` rehace el
 * botón entero con el contenido, así que llega tal cual.
 */
export type PresetHueco = Pick<ButtonConfig, 'label' | 'icon' | 'bgColor' | 'fgColor' | 'action' | 'isToggle' | 'actionToggleOff' | 'fijo' | 'modosPerilla'>;

/**
 * Preset prearmado para un control de un dock (perilla rotativa, tecla/botón o tira táctil).
 * Contiene un identificador técnico en inglés, la clave i18n para el nombre legible
 * en la interfaz, un icono representativo DOT/480 y la lista ordenada de huecos.
 */
export interface PresetDock {
  id: string;
  nombre: string;
  icon: string;
  huecos: PresetHueco[];
}

/**
 * Presets para perillas rotativas con encoder y pulsador central.
 * Cada preset cuenta exactamente con 3 huecos en el orden físico:
 * [0] Giro antihorario (izquierda)
 * [1] Pulsación del eje (centro)
 * [2] Giro horario (derecha)
 */
export const PRESETS_PERILLA: PresetDock[] = [
  {
    id: 'master-volume',
    nombre: 'preset.dock.knob.volume',
    icon: 'SPEAKER',
    huecos: [
      {
        label: 'VOL -',
        icon: 'SPEAKER',
        fgColor: '#38bdf8',
        action: { type: 'adjust', adjustTarget: 'volume', adjustDelta: -5 },
      },
      {
        label: 'MUTE',
        icon: 'MUTE',
        fgColor: '#38bdf8',
        action: { type: 'mute' },
      },
      {
        label: 'VOL +',
        icon: 'SPEAKER',
        fgColor: '#38bdf8',
        action: { type: 'adjust', adjustTarget: 'volume', adjustDelta: 5 },
      },
    ],
  },
  // Perilla multimodo (T-HW-19, roadmap 63): modo 0 volumen, y modos brillo,
  // zoom y páginas. Pulsar cambia de modo; girar hace lo del modo activo.
  // La acción propia del pulsar (MUTE) solo corre si se quitan todos los
  // modos, que es cuando la perilla vuelve a ser normal.
  {
    id: 'multi-knob',
    nombre: 'preset.dock.knob.multi',
    icon: 'KNOB',
    huecos: [
      {
        label: 'VOL -',
        icon: 'SPEAKER',
        fgColor: '#38bdf8',
        action: { type: 'adjust', adjustTarget: 'volume', adjustDelta: -5 },
      },
      {
        label: 'MODOS',
        icon: 'KNOB',
        fgColor: '#38bdf8',
        action: { type: 'mute' },
        modosPerilla: [
          {
            label: 'BRILLO',
            icon: 'BRIGHTNESS',
            izq: { type: 'adjust', adjustTarget: 'brightness', adjustDelta: -10 },
            der: { type: 'adjust', adjustTarget: 'brightness', adjustDelta: 10 },
          },
          {
            label: 'ZOOM',
            icon: 'FULLSCREEN',
            izq: { type: 'hotkey', hotkey: 'Ctrl+Subtract' },
            der: { type: 'hotkey', hotkey: 'Ctrl+Add' },
          },
          {
            label: 'PÁGINAS',
            icon: 'FOLDER',
            izq: { type: 'page-nav', pageNav: 'prev' },
            der: { type: 'page-nav', pageNav: 'next' },
          },
        ],
      },
      {
        label: 'VOL +',
        icon: 'SPEAKER',
        fgColor: '#38bdf8',
        action: { type: 'adjust', adjustTarget: 'volume', adjustDelta: 5 },
      },
    ],
  },
  {
    id: 'screen-brightness',
    nombre: 'preset.dock.knob.brightness',
    icon: 'BRIGHTNESS',
    huecos: [
      {
        label: 'BRILLO -',
        icon: 'BRIGHTNESS',
        fgColor: '#facc15',
        action: { type: 'adjust', adjustTarget: 'brightness', adjustDelta: -10 },
      },
      {
        label: 'BRILLO 70',
        icon: 'BRIGHTNESS',
        fgColor: '#facc15',
        action: { type: 'brightness', brightnessLevel: 70 },
      },
      {
        label: 'BRILLO +',
        icon: 'BRIGHTNESS',
        fgColor: '#facc15',
        action: { type: 'adjust', adjustTarget: 'brightness', adjustDelta: 10 },
      },
    ],
  },
  {
    id: 'media-player',
    nombre: 'preset.dock.knob.media',
    icon: 'PLAY',
    huecos: [
      {
        label: 'ANTERIOR',
        icon: 'PREV',
        fgColor: '#1db954',
        action: { type: 'media-prev' },
      },
      {
        label: 'PLAY/PAUSA',
        icon: 'PLAY',
        fgColor: '#1db954',
        action: { type: 'media-play-pause' },
      },
      {
        label: 'SIGUIENTE',
        icon: 'NEXT',
        fgColor: '#1db954',
        action: { type: 'media-next' },
      },
    ],
  },
  {
    id: 'universal-zoom',
    nombre: 'preset.dock.knob.zoom',
    icon: 'FULLSCREEN',
    huecos: [
      {
        label: 'ZOOM -',
        icon: 'SUBTRACT',
        fgColor: '#4ade80',
        action: { type: 'hotkey', hotkey: 'Ctrl+Subtract' },
      },
      {
        label: 'ZOOM 100',
        icon: 'FULLSCREEN',
        fgColor: '#4ade80',
        action: { type: 'hotkey', hotkey: 'Ctrl+0' },
      },
      {
        label: 'ZOOM +',
        icon: 'ADD',
        fgColor: '#4ade80',
        action: { type: 'hotkey', hotkey: 'Ctrl+Add' },
      },
    ],
  },
  {
    id: 'browser-tabs',
    nombre: 'preset.dock.knob.tabs',
    icon: 'WEB',
    huecos: [
      {
        label: 'PEST. ANT',
        icon: 'ARROW_LEFT',
        fgColor: '#60a5fa',
        action: { type: 'hotkey', hotkey: 'Ctrl+Shift+Tab' },
      },
      {
        label: 'REABRIR',
        icon: 'ARROW_UP',
        fgColor: '#60a5fa',
        action: { type: 'hotkey', hotkey: 'Ctrl+Shift+T' },
      },
      {
        label: 'PEST. SIG',
        icon: 'ARROW_RIGHT',
        fgColor: '#60a5fa',
        action: { type: 'hotkey', hotkey: 'Ctrl+Tab' },
      },
    ],
  },
  {
    id: 'history-undo-redo',
    nombre: 'preset.dock.knob.history',
    icon: 'UNDO',
    huecos: [
      {
        label: 'DESHACER',
        icon: 'UNDO',
        fgColor: '#f43f5e',
        action: { type: 'hotkey', hotkey: 'Ctrl+Z' },
      },
      {
        label: 'GUARDAR',
        icon: 'STORAGE',
        fgColor: '#f43f5e',
        action: { type: 'hotkey', hotkey: 'Ctrl+S' },
      },
      {
        label: 'REHACER',
        icon: 'UNDO',
        fgColor: '#f43f5e',
        action: { type: 'hotkey', hotkey: 'Ctrl+Y' },
      },
    ],
  },
  {
    id: 'timeline-jog',
    nombre: 'preset.dock.knob.jog',
    icon: 'SCISSORS',
    huecos: [
      {
        label: 'CUADRO -',
        icon: 'ARROW_LEFT',
        fgColor: '#a78bfa',
        action: { type: 'hotkey', hotkey: 'Left' },
      },
      {
        label: 'CORTAR',
        icon: 'SCISSORS',
        fgColor: '#a78bfa',
        action: { type: 'hotkey', hotkey: 'Ctrl+K' },
      },
      {
        label: 'CUADRO +',
        icon: 'ARROW_RIGHT',
        fgColor: '#a78bfa',
        action: { type: 'hotkey', hotkey: 'Right' },
      },
    ],
  },
  {
    id: 'brush-size',
    nombre: 'preset.dock.knob.brush',
    icon: 'EDIT',
    huecos: [
      {
        label: 'PINCEL -',
        icon: 'SUBTRACT',
        fgColor: '#00c8ff',
        action: { type: 'hotkey', hotkey: '[' },
      },
      {
        label: 'PINCEL',
        icon: 'EDIT',
        fgColor: '#00c8ff',
        action: { type: 'hotkey', hotkey: 'B' },
      },
      {
        label: 'PINCEL +',
        icon: 'ADD',
        fgColor: '#00c8ff',
        action: { type: 'hotkey', hotkey: ']' },
      },
    ],
  },
  {
    id: 'virtual-desktops',
    nombre: 'preset.dock.knob.desktops',
    icon: 'MONITOR',
    huecos: [
      {
        label: 'ESCRIT. <',
        icon: 'ARROW_LEFT',
        fgColor: '#c084fc',
        action: { type: 'hotkey', hotkey: 'Win+Ctrl+Left' },
      },
      {
        label: 'TAREAS',
        icon: 'MONITOR',
        fgColor: '#c084fc',
        // Sin toggle: en el pulsar de una perilla, con modos, no correría
        // (pulsar cambia de modo). El editor avisa de esa combinación.
        action: { type: 'hotkey', hotkey: 'Win+Tab' },
      },
      {
        label: 'ESCRIT. >',
        icon: 'ARROW_RIGHT',
        fgColor: '#c084fc',
        action: { type: 'hotkey', hotkey: 'Win+Ctrl+Right' },
      },
    ],
  },
  {
    id: 'live-counter',
    nombre: 'preset.dock.knob.counter',
    icon: 'CLOCK',
    huecos: [
      {
        label: 'CONTADOR -',
        icon: 'SUBTRACT',
        fgColor: '#fb923c',
        action: { type: 'incr-var', varName: 'contador', varDelta: -1 },
      },
      {
        label: 'RESET',
        icon: 'CLOCK',
        fgColor: '#fb923c',
        action: { type: 'set-var', varName: 'contador', varValue: '0' },
      },
      {
        label: 'CONTADOR +',
        icon: 'ADD',
        fgColor: '#fb923c',
        action: { type: 'incr-var', varName: 'contador', varDelta: 1 },
      },
    ],
  },
  {
    id: 'dock-pages',
    nombre: 'preset.dock.knob.pages',
    icon: 'FOLDER',
    huecos: [
      {
        label: 'PAG. ANT.',
        icon: 'PREV',
        fgColor: '#e6e8eb',
        action: { type: 'page-nav', pageNav: 'prev' },
        // Fijo: un botón para cambiar de página que solo está en una de ellas
        // deja sin salida a las demás (pasó con el N3: en la segunda no había
        // con qué volver).
        fijo: true,
      },
      {
        label: 'CAMBIAR PÁG.',
        icon: 'NEXT',
        fgColor: '#e6e8eb',
        action: { type: 'page-nav', pageNav: 'cycle' },
        // Fijo: un botón para cambiar de página que solo está en una de ellas
        // deja sin salida a las demás (pasó con el N3: en la segunda no había
        // con qué volver).
        fijo: true,
      },
      {
        label: 'PAG. SIG.',
        icon: 'NEXT',
        fgColor: '#e6e8eb',
        action: { type: 'page-nav', pageNav: 'next' },
        // Fijo: un botón para cambiar de página que solo está en una de ellas
        // deja sin salida a las demás (pasó con el N3: en la segunda no había
        // con qué volver).
        fijo: true,
      },
    ],
  },
  {
    id: 'window-cycle',
    nombre: 'preset.dock.knob.windows',
    icon: 'MONITOR',
    huecos: [
      {
        label: 'VENTANA ANT.',
        icon: 'PREV',
        fgColor: '#7dd3fc',
        action: { type: 'window-cycle', windowCycle: 'prev' },
      },
      {
        label: 'MULTITAREA',
        icon: 'MONITOR',
        fgColor: '#7dd3fc',
        // Sin toggle: en el pulsar de una perilla, con modos, no correría
        // (pulsar cambia de modo). El editor avisa de esa combinación.
        action: { type: 'hotkey', hotkey: 'Win+Tab' },
      },
      {
        label: 'VENTANA SIG.',
        icon: 'NEXT',
        fgColor: '#7dd3fc',
        action: { type: 'window-cycle', windowCycle: 'next' },
      },
    ],
  },
  // Volumen de una app concreta (roadmap 63): sobre la app activa,
  // más dos fijas para los casos más comunes.
  {
    id: 'app-volume',
    nombre: 'preset.dock.knob.appVolume',
    icon: 'SPEAKER',
    huecos: [
      {
        label: 'APP VOL -',
        icon: 'SUBTRACT',
        fgColor: '#38bdf8',
        action: { type: 'app-volume', appVolumeMode: 'adjust', appVolumeDelta: -5 },
      },
      {
        label: 'APP MUTE',
        icon: 'MUTE',
        fgColor: '#38bdf8',
        action: { type: 'app-volume', appVolumeMode: 'mute' },
      },
      {
        label: 'APP VOL +',
        icon: 'ADD',
        fgColor: '#38bdf8',
        action: { type: 'app-volume', appVolumeMode: 'adjust', appVolumeDelta: 5 },
      },
    ],
  },
  {
    id: 'spotify-volume',
    nombre: 'preset.dock.knob.spotifyVolume',
    icon: 'SPEAKER',
    huecos: [
      {
        label: 'VOL -',
        icon: 'SUBTRACT',
        fgColor: '#1db954',
        action: { type: 'app-volume', appVolumeTarget: 'spotify', appVolumeMode: 'adjust', appVolumeDelta: -5 },
      },
      {
        label: 'MUTE',
        icon: 'MUTE',
        fgColor: '#1db954',
        action: { type: 'app-volume', appVolumeTarget: 'spotify', appVolumeMode: 'mute' },
      },
      {
        label: 'VOL +',
        icon: 'ADD',
        fgColor: '#1db954',
        action: { type: 'app-volume', appVolumeTarget: 'spotify', appVolumeMode: 'adjust', appVolumeDelta: 5 },
      },
    ],
  },
  {
    id: 'discord-volume',
    nombre: 'preset.dock.knob.discordVolume',
    icon: 'SPEAKER',
    huecos: [
      {
        label: 'VOL -',
        icon: 'SUBTRACT',
        fgColor: '#7289da',
        action: { type: 'app-volume', appVolumeTarget: 'discord', appVolumeMode: 'adjust', appVolumeDelta: -5 },
      },
      {
        label: 'MUTE',
        icon: 'MUTE',
        fgColor: '#7289da',
        action: { type: 'app-volume', appVolumeTarget: 'discord', appVolumeMode: 'mute' },
      },
      {
        label: 'VOL +',
        icon: 'ADD',
        fgColor: '#7289da',
        action: { type: 'app-volume', appVolumeTarget: 'discord', appVolumeMode: 'adjust', appVolumeDelta: 5 },
      },
    ],
  },
];

/**
 * Presets para botones y teclas mecánicas (B1, B2, B3 o teclas de dock).
 * Cada preset cuenta exactamente con 1 hueco.
 */
export const PRESETS_BOTON: PresetDock[] = [
  {
    id: 'button-discord-mute',
    nombre: 'preset.dock.button.discordMute',
    icon: 'MIC',
    huecos: [
      {
        label: 'MUTE MIC',
        icon: 'MIC',
        bgColor: '#1e1f40',
        fgColor: '#7289da',
        action: { type: 'discord', discordAction: 'toggle-mute' },
      },
    ],
  },
  {
    id: 'button-discord-deaf',
    nombre: 'preset.dock.button.discordDeaf',
    icon: 'MUTE',
    huecos: [
      {
        label: 'SORDO',
        icon: 'MUTE',
        bgColor: '#1e1f40',
        fgColor: '#7289da',
        action: { type: 'discord', discordAction: 'toggle-deaf' },
      },
    ],
  },
  {
    id: 'button-system-mute',
    nombre: 'preset.dock.button.systemMute',
    icon: 'MUTE',
    huecos: [
      {
        label: 'MUTE',
        icon: 'MUTE',
        action: { type: 'mute' },
      },
    ],
  },
  {
    id: 'button-screen-snip',
    nombre: 'preset.dock.button.screenSnip',
    icon: 'SCISSORS',
    huecos: [
      {
        label: 'RECORTE',
        icon: 'SCISSORS',
        action: { type: 'hotkey', hotkey: 'Win+Shift+S' },
      },
    ],
  },
  {
    id: 'button-show-desktop',
    nombre: 'preset.dock.button.showDesktop',
    icon: 'MINIMIZE',
    huecos: [
      {
        label: 'ESCRITORIO',
        icon: 'MINIMIZE',
        action: { type: 'hotkey', hotkey: 'Win+D' },
      },
    ],
  },
  {
    id: 'button-lock-pc',
    nombre: 'preset.dock.button.lockPc',
    icon: 'LOCK',
    huecos: [
      {
        label: 'BLOQUEAR',
        icon: 'LOCK',
        bgColor: '#1a0a0a',
        fgColor: '#d95f5f',
        action: {
          type: 'script',
          script: 'rundll32.exe user32.dll,LockWorkStation',
          scriptShell: 'cmd',
        },
      },
    ],
  },
  {
    id: 'button-clipboard-history',
    nombre: 'preset.dock.button.clipboardHistory',
    icon: 'STORAGE',
    huecos: [
      {
        label: 'PORTAPAPEL',
        icon: 'STORAGE',
        action: { type: 'hotkey', hotkey: 'Win+V' },
        isToggle: true,
        actionToggleOff: { type: 'hotkey', hotkey: 'Esc' },
      },
    ],
  },
  {
    id: 'button-multitask',
    nombre: 'preset.dock.button.multitask',
    icon: 'MONITOR',
    huecos: [
      {
        label: 'MULTITAREA',
        icon: 'MONITOR',
        action: { type: 'hotkey', hotkey: 'Win+Tab' },
        isToggle: true,
        actionToggleOff: { type: 'hotkey', hotkey: 'Esc' },
      },
    ],
  },
  {
    id: 'button-cycle-page',
    nombre: 'preset.dock.button.cyclePage',
    icon: 'NEXT',
    huecos: [
      {
        label: 'CAMBIAR PÁGINA',
        icon: 'NEXT',
        action: { type: 'page-nav', pageNav: 'cycle' },
        // Fijo: un botón para cambiar de página que solo está en una de ellas
        // deja sin salida a las demás (pasó con el N3: en la segunda no había
        // con qué volver).
        fijo: true,
      },
    ],
  },
  {
    id: 'button-next-page',
    nombre: 'preset.dock.button.nextPage',
    icon: 'NEXT',
    huecos: [
      {
        label: 'PAG. SIG.',
        icon: 'NEXT',
        action: { type: 'page-nav', pageNav: 'next' },
        // Fijo: un botón para cambiar de página que solo está en una de ellas
        // deja sin salida a las demás (pasó con el N3: en la segunda no había
        // con qué volver).
        fijo: true,
      },
    ],
  },
  {
    id: 'button-prev-page',
    nombre: 'preset.dock.button.prevPage',
    icon: 'PREV',
    huecos: [
      {
        label: 'PAG. ANT.',
        icon: 'PREV',
        action: { type: 'page-nav', pageNav: 'prev' },
        // Fijo: un botón para cambiar de página que solo está en una de ellas
        // deja sin salida a las demás (pasó con el N3: en la segunda no había
        // con qué volver).
        fijo: true,
      },
    ],
  },
  {
    id: 'button-prev-window',
    nombre: 'preset.dock.button.prevWindow',
    icon: 'PREV',
    huecos: [
      {
        label: 'VENTANA ANT.',
        icon: 'PREV',
        action: { type: 'window-cycle', windowCycle: 'prev' },
      },
    ],
  },
  {
    id: 'button-next-window',
    nombre: 'preset.dock.button.nextWindow',
    icon: 'NEXT',
    huecos: [
      {
        label: 'VENTANA SIG.',
        icon: 'NEXT',
        action: { type: 'window-cycle', windowCycle: 'next' },
      },
    ],
  },
];

/**
 * Presets para tiras táctiles de deslizamiento (swipe strips).
 * Cada preset cuenta exactamente con 2 huecos:
 * [0] Deslizamiento izquierda
 * [1] Deslizamiento derecha
 */
export const PRESETS_TIRA: PresetDock[] = [
  {
    id: 'strip-media-scroll',
    nombre: 'preset.dock.strip.media',
    icon: 'SWIPE',
    huecos: [
      {
        label: 'ANTERIOR',
        icon: 'PREV',
        action: { type: 'media-prev' },
      },
      {
        label: 'SIGUIENTE',
        icon: 'NEXT',
        action: { type: 'media-next' },
      },
    ],
  },
  {
    id: 'strip-brightness',
    nombre: 'preset.dock.strip.brightness',
    icon: 'BRIGHTNESS',
    huecos: [
      {
        label: 'BRILLO -',
        icon: 'BRIGHTNESS',
        fgColor: '#facc15',
        action: { type: 'adjust', adjustTarget: 'brightness', adjustDelta: -15 },
      },
      {
        label: 'BRILLO +',
        icon: 'BRIGHTNESS',
        fgColor: '#facc15',
        action: { type: 'adjust', adjustTarget: 'brightness', adjustDelta: 15 },
      },
    ],
  },
  {
    id: 'strip-tabs',
    nombre: 'preset.dock.strip.tabs',
    icon: 'WEB',
    huecos: [
      {
        label: 'PEST. ANT.',
        icon: 'ARROW_LEFT',
        fgColor: '#60a5fa',
        action: { type: 'hotkey', hotkey: 'Ctrl+Shift+Tab' },
      },
      {
        label: 'PEST. SIG.',
        icon: 'ARROW_RIGHT',
        fgColor: '#60a5fa',
        action: { type: 'hotkey', hotkey: 'Ctrl+Tab' },
      },
    ],
  },
];
