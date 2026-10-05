import type { ButtonAction } from '../types/actions';
import type { DisposicionSuperficie } from '../types/superficies';
import type { PresetHueco } from './presetsDock';

/**
 * Páginas preconfiguradas por aplicación (roadmap 75).
 *
 * Al vincular una página a una app conocida se ofrece crear una página entera
 * ya armada —y editable después— para el deck o para un dock. Son datos
 * sembrados: se **copian** dentro de los botones que se crean, como
 * `actionData.ts` y `presetsDock.ts` (por eso `check-i18n` se los salta por
 * nombre), y el nombre visible va por clave de i18n.
 *
 * **Solo atajos que la app trae de fábrica y que no dependen del idioma del
 * teclado** (letras, dígitos, F1–F24, teclas con nombre, teclado numérico).
 * Los signos (`=`, `-`, `[`, `` ` ``) cambian de tecla según el idioma: en el
 * teclado latinoamericano del dueño `=` es `Shift+0` (ver `CLAUDE.md`).
 *
 * OBS **no** tiene plantilla: no trae atajos de fábrica útiles y VirtualDeck
 * no tiene acción para OBS, así que no hay nada fiable que preconfigurar.
 */

/** Los huecos de un dock por tipo de control, en el orden de su `disposicion`. */
export interface PlantillaDock {
  teclas: (PresetHueco | null)[];
  botones: (PresetHueco | null)[];
  /** Cada perilla son 3 huecos: izq, pulsar, der. */
  perillas: [PresetHueco | null, PresetHueco | null, PresetHueco | null][];
  /** Cada tira son 2 huecos: izq, der. */
  tiras?: [PresetHueco | null, PresetHueco | null][];
}

export interface PlantillaApp {
  /** Id estable en inglés (`'vscode'`). */
  id: string;
  /** Nombres de proceso que la activan, ya normalizados (sin `.exe`, minúsculas). */
  procesos: string[];
  /** Clave de i18n del nombre visible. */
  nombre: string;
  /** Página del deck de 4×4: 16 huecos en orden de lectura; `null` = vacío. */
  deck: (PresetHueco | null)[];
  dock: PlantillaDock;
}

/** Un hueco en una línea: etiqueta, glifo DOT, acción y color de familia. */
function h(
  label: string,
  icon: string,
  action: ButtonAction,
  fgColor: string,
  toggleOff?: ButtonAction,
): PresetHueco {
  return toggleOff
    ? { label, icon, action, fgColor, isToggle: true, actionToggleOff: toggleOff }
    : { label, icon, action, fgColor };
}

/**
 * Los huecos de una página de dock a partir de una plantilla.
 *
 * Recorre los `controles` de la `disposicion` **en su orden** y reparte los
 * huecos de la plantilla por tipo: `teclas`, `botones`, `perillas` (3 huecos)
 * y `tiras` (2 huecos). Lo que no quepa se descarta y lo que falte queda
 * `null` (vacío). Los tamaños 1/1/3/2 son el contrato (`types/superficies.ts`
 * y `HUECOS_POR_TIPO` en `disposicion.ts`): si cambian allí, cambian aquí.
 */
export function repartirPlantillaDock(
  dock: PlantillaDock,
  d: DisposicionSuperficie,
): (PresetHueco | null)[] {
  const salida: (PresetHueco | null)[] = [];
  let teclas = 0;
  let botones = 0;
  let perillas = 0;
  let tiras = 0;
  for (const c of d.controles) {
    if (c.tipo === 'key') {
      salida.push(dock.teclas[teclas] ?? null);
      teclas += 1;
    } else if (c.tipo === 'button') {
      salida.push(dock.botones[botones] ?? null);
      botones += 1;
    } else if (c.tipo === 'knob') {
      const p = dock.perillas[perillas] ?? [null, null, null];
      salida.push(p[0], p[1], p[2]);
      perillas += 1;
    } else {
      const s = dock.tiras?.[tiras] ?? [null, null];
      salida.push(s[0], s[1]);
      tiras += 1;
    }
  }
  return salida;
}

export const PLANTILLAS_APP: PlantillaApp[] = [
  // Navegadores Chromium + Firefox: comparten los atajos de pestañas.
  // https://support.google.com/chrome/answer/157179
  // https://support.microsoft.com/en-us/microsoft-edge/keyboard-shortcuts-in-microsoft-edge-50d3edab-30d9-4440-b094-08671c12b324
  // https://support.mozilla.org/en-US/kb/keyboard-shortcuts-perform-firefox-tasks-quickly
  {
    id: 'web',
    procesos: ['chrome', 'msedge', 'firefox', 'brave', 'opera'],
    nombre: 'plantilla.app.web',
    deck: [
      h('NUEVA PEST', 'ADD', { type: 'hotkey', hotkey: 'Ctrl+T' }, '#60a5fa'),
      h('CERRAR PEST', 'CLOSE', { type: 'hotkey', hotkey: 'Ctrl+W' }, '#60a5fa'),
      h('REABRIR', 'UNDO', { type: 'hotkey', hotkey: 'Ctrl+Shift+T' }, '#60a5fa'),
      h('ANT', 'ARROW_LEFT', { type: 'hotkey', hotkey: 'Ctrl+Shift+Tab' }, '#60a5fa'),
      h('SIG', 'ARROW_RIGHT', { type: 'hotkey', hotkey: 'Ctrl+Tab' }, '#60a5fa'),
      h('DIRECCIÓN', 'WEB', { type: 'hotkey', hotkey: 'Ctrl+L' }, '#60a5fa'),
      h('RECARGAR', 'ROTATE_CW', { type: 'hotkey', hotkey: 'Ctrl+R' }, '#60a5fa'),
      h('BUSCAR', 'HELP', { type: 'hotkey', hotkey: 'Ctrl+F' }, '#60a5fa'),
      h('MARCADOR', 'BOOK', { type: 'hotkey', hotkey: 'Ctrl+D' }, '#60a5fa'),
      h('HISTORIAL', 'CLOCK', { type: 'hotkey', hotkey: 'Ctrl+H' }, '#60a5fa'),
      h('DESCARGAS', 'IMPORT', { type: 'hotkey', hotkey: 'Ctrl+J' }, '#60a5fa'),
      h('ZOOM -', 'SUBTRACT', { type: 'hotkey', hotkey: 'Ctrl+Subtract' }, '#60a5fa'),
      h('ZOOM 100', 'FULLSCREEN', { type: 'hotkey', hotkey: 'Ctrl+0' }, '#60a5fa'),
      h('ZOOM +', 'ADD', { type: 'hotkey', hotkey: 'Ctrl+Add' }, '#60a5fa'),
      h('PANTALLA', 'FULLSCREEN', { type: 'hotkey', hotkey: 'F11' }, '#60a5fa'),
      h('MULTITAREA', 'MONITOR', { type: 'hotkey', hotkey: 'Win+Tab' }, '#60a5fa', { type: 'hotkey', hotkey: 'Esc' }),
    ],
    dock: {
      teclas: [
        h('NUEVA', 'ADD', { type: 'hotkey', hotkey: 'Ctrl+T' }, '#60a5fa'),
        h('CERRAR', 'CLOSE', { type: 'hotkey', hotkey: 'Ctrl+W' }, '#60a5fa'),
        h('REABRIR', 'UNDO', { type: 'hotkey', hotkey: 'Ctrl+Shift+T' }, '#60a5fa'),
        h('RECARGAR', 'ROTATE_CW', { type: 'hotkey', hotkey: 'Ctrl+R' }, '#60a5fa'),
        h('BUSCAR', 'HELP', { type: 'hotkey', hotkey: 'Ctrl+F' }, '#60a5fa'),
        h('DIRECCIÓN', 'WEB', { type: 'hotkey', hotkey: 'Ctrl+L' }, '#60a5fa'),
      ],
      botones: [
        h('ATRÁS', 'ARROW_LEFT', { type: 'hotkey', hotkey: 'Alt+Left' }, '#60a5fa'),
        h('ADELANTE', 'ARROW_RIGHT', { type: 'hotkey', hotkey: 'Alt+Right' }, '#60a5fa'),
        h('PANTALLA', 'FULLSCREEN', { type: 'hotkey', hotkey: 'F11' }, '#60a5fa'),
      ],
      perillas: [
        [
          h('ANT', 'ARROW_LEFT', { type: 'hotkey', hotkey: 'Ctrl+Shift+Tab' }, '#60a5fa'),
          h('NUEVA', 'ADD', { type: 'hotkey', hotkey: 'Ctrl+T' }, '#60a5fa'),
          h('SIG', 'ARROW_RIGHT', { type: 'hotkey', hotkey: 'Ctrl+Tab' }, '#60a5fa'),
        ],
        [
          h('ZOOM -', 'SUBTRACT', { type: 'hotkey', hotkey: 'Ctrl+Subtract' }, '#60a5fa'),
          h('ZOOM 100', 'FULLSCREEN', { type: 'hotkey', hotkey: 'Ctrl+0' }, '#60a5fa'),
          h('ZOOM +', 'ADD', { type: 'hotkey', hotkey: 'Ctrl+Add' }, '#60a5fa'),
        ],
        [
          h('ATRÁS', 'ARROW_LEFT', { type: 'hotkey', hotkey: 'Alt+Left' }, '#60a5fa'),
          h('RECARGAR', 'ROTATE_CW', { type: 'hotkey', hotkey: 'Ctrl+R' }, '#60a5fa'),
          h('ADELANTE', 'ARROW_RIGHT', { type: 'hotkey', hotkey: 'Alt+Right' }, '#60a5fa'),
        ],
      ],
      tiras: [
        [
          h('ATRÁS', 'ARROW_LEFT', { type: 'hotkey', hotkey: 'Alt+Left' }, '#60a5fa'),
          h('ADELANTE', 'ARROW_RIGHT', { type: 'hotkey', hotkey: 'Alt+Right' }, '#60a5fa'),
        ],
      ],
    },
  },
  // VS Code. https://code.visualstudio.com/docs/getstarted/keybindings
  {
    id: 'vscode',
    procesos: ['code', 'code-insiders'],
    nombre: 'plantilla.app.vscode',
    deck: [
      h('PALETA', 'TERMINAL', { type: 'hotkey', hotkey: 'Ctrl+Shift+P' }, '#38bdf8'),
      h('ABRIR', 'FOLDER', { type: 'hotkey', hotkey: 'Ctrl+P' }, '#38bdf8'),
      h('GUARDAR', 'STORAGE', { type: 'hotkey', hotkey: 'Ctrl+S' }, '#38bdf8'),
      h('BUSCAR', 'HELP', { type: 'hotkey', hotkey: 'Ctrl+F' }, '#38bdf8'),
      h('REEMPLAZAR', 'EDIT', { type: 'hotkey', hotkey: 'Ctrl+H' }, '#38bdf8'),
      h('BUSCAR TODO', 'CODE', { type: 'hotkey', hotkey: 'Ctrl+Shift+F' }, '#38bdf8'),
      h('IR A LÍNEA', 'PIN', { type: 'hotkey', hotkey: 'Ctrl+G' }, '#38bdf8'),
      h('SELECCIÓN', 'ADD', { type: 'hotkey', hotkey: 'Ctrl+D' }, '#38bdf8'),
      h('BARRA', 'APP_WINDOW', { type: 'hotkey', hotkey: 'Ctrl+B' }, '#38bdf8'),
      h('PANEL', 'MONITOR', { type: 'hotkey', hotkey: 'Ctrl+J' }, '#38bdf8'),
      h('DEPURAR', 'BUG', { type: 'hotkey', hotkey: 'F5' }, '#38bdf8'),
      h('INTERRUPC', 'PIN', { type: 'hotkey', hotkey: 'F9' }, '#38bdf8'),
      h('DEFINICIÓN', 'CODE', { type: 'hotkey', hotkey: 'F12' }, '#38bdf8'),
      h('LÍNEA ARRIBA', 'ARROW_UP', { type: 'hotkey', hotkey: 'Alt+Up' }, '#38bdf8'),
      h('LÍNEA ABAJO', 'ARROW_DOWN', { type: 'hotkey', hotkey: 'Alt+Down' }, '#38bdf8'),
      h('DESHACER', 'UNDO', { type: 'hotkey', hotkey: 'Ctrl+Z' }, '#38bdf8'),
    ],
    dock: {
      teclas: [
        h('PALETA', 'TERMINAL', { type: 'hotkey', hotkey: 'Ctrl+Shift+P' }, '#38bdf8'),
        h('ABRIR', 'FOLDER', { type: 'hotkey', hotkey: 'Ctrl+P' }, '#38bdf8'),
        h('GUARDAR', 'STORAGE', { type: 'hotkey', hotkey: 'Ctrl+S' }, '#38bdf8'),
        h('BUSCAR', 'HELP', { type: 'hotkey', hotkey: 'Ctrl+F' }, '#38bdf8'),
        h('DEFINICIÓN', 'CODE', { type: 'hotkey', hotkey: 'F12' }, '#38bdf8'),
        h('INTERRUPC', 'PIN', { type: 'hotkey', hotkey: 'F9' }, '#38bdf8'),
      ],
      botones: [
        h('BARRA', 'APP_WINDOW', { type: 'hotkey', hotkey: 'Ctrl+B' }, '#38bdf8'),
        h('PANEL', 'MONITOR', { type: 'hotkey', hotkey: 'Ctrl+J' }, '#38bdf8'),
        h('DEPURAR', 'BUG', { type: 'hotkey', hotkey: 'F5' }, '#38bdf8'),
      ],
      perillas: [
        [
          h('DESHACER', 'UNDO', { type: 'hotkey', hotkey: 'Ctrl+Z' }, '#38bdf8'),
          h('GUARDAR', 'STORAGE', { type: 'hotkey', hotkey: 'Ctrl+S' }, '#38bdf8'),
          h('REHACER', 'UNDO', { type: 'hotkey', hotkey: 'Ctrl+Y' }, '#38bdf8'),
        ],
        [
          h('ATRÁS', 'ARROW_LEFT', { type: 'hotkey', hotkey: 'Alt+Left' }, '#38bdf8'),
          h('DEFINICIÓN', 'CODE', { type: 'hotkey', hotkey: 'F12' }, '#38bdf8'),
          h('ADELANTE', 'ARROW_RIGHT', { type: 'hotkey', hotkey: 'Alt+Right' }, '#38bdf8'),
        ],
        [
          h('LÍNEA ARRIBA', 'ARROW_UP', { type: 'hotkey', hotkey: 'Alt+Up' }, '#38bdf8'),
          h('SELECCIÓN', 'ADD', { type: 'hotkey', hotkey: 'Ctrl+D' }, '#38bdf8'),
          h('LÍNEA ABAJO', 'ARROW_DOWN', { type: 'hotkey', hotkey: 'Alt+Down' }, '#38bdf8'),
        ],
      ],
    },
  },
  // Spotify: transporte y modo por acciones propias, resto atajos de fábrica.
  // https://support.spotify.com/us/article/keyboard-shortcuts/
  {
    id: 'spotify',
    procesos: ['spotify'],
    nombre: 'plantilla.app.spotify',
    deck: [
      h('REPRODUCIR', 'PLAY', { type: 'media-play-pause' }, '#1db954'),
      h('ANTERIOR', 'PREV', { type: 'media-prev' }, '#1db954'),
      h('SIGUIENTE', 'NEXT', { type: 'media-next' }, '#1db954'),
      h('ALEATORIO', 'SWIPE', { type: 'spotify', spotifyAction: 'toggle-shuffle' }, '#1db954'),
      h('REPETIR', 'ROTATE_CW', { type: 'spotify', spotifyAction: 'toggle-repeat' }, '#1db954'),
      h('NUEVA LISTA', 'ADD', { type: 'hotkey', hotkey: 'Ctrl+N' }, '#1db954'),
      h('VOL -', 'SPEAKER', { type: 'hotkey', hotkey: 'Ctrl+Down' }, '#1db954'),
      h('VOL +', 'SPEAKER', { type: 'hotkey', hotkey: 'Ctrl+Up' }, '#1db954'),
      h('SILENCIO', 'MUTE', { type: 'mute' }, '#1db954'),
      h('BUSCAR', 'HELP', { type: 'hotkey', hotkey: 'Ctrl+L' }, '#1db954'),
      h('FILTRO', 'EDIT', { type: 'hotkey', hotkey: 'Ctrl+F' }, '#1db954'),
      h('ATRÁS', 'ARROW_LEFT', { type: 'hotkey', hotkey: 'Alt+Left' }, '#1db954'),
      h('ADELANTE', 'ARROW_RIGHT', { type: 'hotkey', hotkey: 'Alt+Right' }, '#1db954'),
      h('AJUSTES', 'GEAR', { type: 'hotkey', hotkey: 'Ctrl+P' }, '#1db954'),
      null,
      null,
    ],
    dock: {
      teclas: [
        h('REPRODUCIR', 'PLAY', { type: 'media-play-pause' }, '#1db954'),
        h('ANTERIOR', 'PREV', { type: 'media-prev' }, '#1db954'),
        h('SIGUIENTE', 'NEXT', { type: 'media-next' }, '#1db954'),
        h('ALEATORIO', 'SWIPE', { type: 'spotify', spotifyAction: 'toggle-shuffle' }, '#1db954'),
        h('REPETIR', 'ROTATE_CW', { type: 'spotify', spotifyAction: 'toggle-repeat' }, '#1db954'),
        h('NUEVA LISTA', 'ADD', { type: 'hotkey', hotkey: 'Ctrl+N' }, '#1db954'),
      ],
      botones: [
        h('VOL -', 'SPEAKER', { type: 'hotkey', hotkey: 'Ctrl+Down' }, '#1db954'),
        h('SILENCIO', 'MUTE', { type: 'mute' }, '#1db954'),
        h('VOL +', 'SPEAKER', { type: 'hotkey', hotkey: 'Ctrl+Up' }, '#1db954'),
      ],
      perillas: [
        [
          h('VOL -', 'SUBTRACT', { type: 'app-volume', appVolumeTarget: 'spotify', appVolumeMode: 'adjust', appVolumeDelta: -5 }, '#1db954'),
          h('SILENCIO', 'MUTE', { type: 'app-volume', appVolumeTarget: 'spotify', appVolumeMode: 'mute' }, '#1db954'),
          h('VOL +', 'ADD', { type: 'app-volume', appVolumeTarget: 'spotify', appVolumeMode: 'adjust', appVolumeDelta: 5 }, '#1db954'),
        ],
        [
          h('ANTERIOR', 'PREV', { type: 'media-prev' }, '#1db954'),
          h('REPRODUCIR', 'PLAY', { type: 'media-play-pause' }, '#1db954'),
          h('SIGUIENTE', 'NEXT', { type: 'media-next' }, '#1db954'),
        ],
        [
          h('ALEATORIO', 'SWIPE', { type: 'spotify', spotifyAction: 'toggle-shuffle' }, '#1db954'),
          h('NUEVA LISTA', 'ADD', { type: 'hotkey', hotkey: 'Ctrl+N' }, '#1db954'),
          h('REPETIR', 'ROTATE_CW', { type: 'spotify', spotifyAction: 'toggle-repeat' }, '#1db954'),
        ],
      ],
      tiras: [
        [
          h('ANTERIOR', 'PREV', { type: 'media-prev' }, '#1db954'),
          h('SIGUIENTE', 'NEXT', { type: 'media-next' }, '#1db954'),
        ],
      ],
    },
  },
  // Discord: voz por acciones propias, navegación por atajos de fábrica.
  // https://support.discord.com/hc/en-us/articles/225977308--Windows-Discord-Hotkeys
  {
    id: 'discord',
    procesos: ['discord', 'discordcanary', 'discordptb'],
    nombre: 'plantilla.app.discord',
    deck: [
      h('SILENCIAR', 'MIC', { type: 'discord', discordAction: 'toggle-mute' }, '#7289da'),
      h('ENSORDECER', 'MUTE', { type: 'discord', discordAction: 'toggle-deaf' }, '#7289da'),
      h('IR A', 'HELP', { type: 'hotkey', hotkey: 'Ctrl+K' }, '#7289da'),
      h('EMOJI', 'HEART', { type: 'hotkey', hotkey: 'Ctrl+E' }, '#7289da'),
      h('CANAL ANT', 'ARROW_UP', { type: 'hotkey', hotkey: 'Alt+Up' }, '#7289da'),
      h('CANAL SIG', 'ARROW_DOWN', { type: 'hotkey', hotkey: 'Alt+Down' }, '#7289da'),
      h('SERVIDOR ANT', 'ARROW_UP', { type: 'hotkey', hotkey: 'Ctrl+Alt+Up' }, '#7289da'),
      h('SERVIDOR SIG', 'ARROW_DOWN', { type: 'hotkey', hotkey: 'Ctrl+Alt+Down' }, '#7289da'),
      h('NUEVO', 'ADD', { type: 'hotkey', hotkey: 'Ctrl+Shift+N' }, '#7289da'),
      h('BUSCAR', 'EDIT', { type: 'hotkey', hotkey: 'Ctrl+F' }, '#7289da'),
      h('LEÍDO', 'CHECK', { type: 'hotkey', hotkey: 'Esc' }, '#7289da'),
      null,
      null,
      null,
      null,
      null,
    ],
    dock: {
      teclas: [
        h('SILENCIAR', 'MIC', { type: 'discord', discordAction: 'toggle-mute' }, '#7289da'),
        h('ENSORDECER', 'MUTE', { type: 'discord', discordAction: 'toggle-deaf' }, '#7289da'),
        h('IR A', 'HELP', { type: 'hotkey', hotkey: 'Ctrl+K' }, '#7289da'),
        h('EMOJI', 'HEART', { type: 'hotkey', hotkey: 'Ctrl+E' }, '#7289da'),
        h('CANAL ANT', 'ARROW_UP', { type: 'hotkey', hotkey: 'Alt+Up' }, '#7289da'),
        h('CANAL SIG', 'ARROW_DOWN', { type: 'hotkey', hotkey: 'Alt+Down' }, '#7289da'),
      ],
      botones: [
        h('SILENCIAR', 'MIC', { type: 'discord', discordAction: 'toggle-mute' }, '#7289da'),
        h('ENSORDECER', 'MUTE', { type: 'discord', discordAction: 'toggle-deaf' }, '#7289da'),
        h('IR A', 'HELP', { type: 'hotkey', hotkey: 'Ctrl+K' }, '#7289da'),
      ],
      perillas: [
        [
          h('VOL -', 'SUBTRACT', { type: 'app-volume', appVolumeTarget: 'discord', appVolumeMode: 'adjust', appVolumeDelta: -5 }, '#7289da'),
          h('SILENCIO', 'MUTE', { type: 'app-volume', appVolumeTarget: 'discord', appVolumeMode: 'mute' }, '#7289da'),
          h('VOL +', 'ADD', { type: 'app-volume', appVolumeTarget: 'discord', appVolumeMode: 'adjust', appVolumeDelta: 5 }, '#7289da'),
        ],
        [
          h('CANAL ANT', 'ARROW_UP', { type: 'hotkey', hotkey: 'Alt+Up' }, '#7289da'),
          h('IR A', 'HELP', { type: 'hotkey', hotkey: 'Ctrl+K' }, '#7289da'),
          h('CANAL SIG', 'ARROW_DOWN', { type: 'hotkey', hotkey: 'Alt+Down' }, '#7289da'),
        ],
        [
          h('SILENCIAR', 'MIC', { type: 'discord', discordAction: 'toggle-mute' }, '#7289da'),
          h('EMOJI', 'HEART', { type: 'hotkey', hotkey: 'Ctrl+E' }, '#7289da'),
          h('ENSORDECER', 'MUTE', { type: 'discord', discordAction: 'toggle-deaf' }, '#7289da'),
        ],
      ],
    },
  },
  // Photoshop. https://helpx.adobe.com/photoshop/using/default-keyboard-shortcuts.html
  // El tamaño de pincel (`[`/`]`) no va: son signos y dependen del idioma.
  {
    id: 'photoshop',
    procesos: ['photoshop'],
    nombre: 'plantilla.app.photoshop',
    deck: [
      h('MOVER', 'EXPORT', { type: 'hotkey', hotkey: 'V' }, '#00c8ff'),
      h('PINCEL', 'EDIT', { type: 'hotkey', hotkey: 'B' }, '#00c8ff'),
      h('BORRADOR', 'TRASH', { type: 'hotkey', hotkey: 'E' }, '#00c8ff'),
      h('NUEVO', 'ADD', { type: 'hotkey', hotkey: 'Ctrl+N' }, '#00c8ff'),
      h('ABRIR', 'FOLDER', { type: 'hotkey', hotkey: 'Ctrl+O' }, '#00c8ff'),
      h('GUARDAR', 'STORAGE', { type: 'hotkey', hotkey: 'Ctrl+S' }, '#00c8ff'),
      h('DESHACER', 'UNDO', { type: 'hotkey', hotkey: 'Ctrl+Z' }, '#00c8ff'),
      h('PASO ATRÁS', 'ROTATE_CCW', { type: 'hotkey', hotkey: 'Ctrl+Alt+Z' }, '#00c8ff'),
      h('PASO ADELANTE', 'ROTATE_CW', { type: 'hotkey', hotkey: 'Ctrl+Shift+Z' }, '#00c8ff'),
      h('DESELECC', 'CLOSE', { type: 'hotkey', hotkey: 'Ctrl+D' }, '#00c8ff'),
      h('INVERTIR', 'SPARKLE', { type: 'hotkey', hotkey: 'Ctrl+Shift+I' }, '#00c8ff'),
      h('TRANSFORMAR', 'APP_WINDOW', { type: 'hotkey', hotkey: 'Ctrl+T' }, '#00c8ff'),
      h('CAPA +', 'ADD', { type: 'hotkey', hotkey: 'Ctrl+J' }, '#00c8ff'),
      h('FUSIONAR', 'MINIMIZE', { type: 'hotkey', hotkey: 'Ctrl+E' }, '#00c8ff'),
      h('ZOOM +', 'ADD', { type: 'hotkey', hotkey: 'Ctrl+Add' }, '#00c8ff'),
      h('ZOOM -', 'SUBTRACT', { type: 'hotkey', hotkey: 'Ctrl+Subtract' }, '#00c8ff'),
    ],
    dock: {
      teclas: [
        h('MOVER', 'EXPORT', { type: 'hotkey', hotkey: 'V' }, '#00c8ff'),
        h('PINCEL', 'EDIT', { type: 'hotkey', hotkey: 'B' }, '#00c8ff'),
        h('BORRADOR', 'TRASH', { type: 'hotkey', hotkey: 'E' }, '#00c8ff'),
        h('GUARDAR', 'STORAGE', { type: 'hotkey', hotkey: 'Ctrl+S' }, '#00c8ff'),
        h('DESHACER', 'UNDO', { type: 'hotkey', hotkey: 'Ctrl+Z' }, '#00c8ff'),
        h('TRANSFORMAR', 'APP_WINDOW', { type: 'hotkey', hotkey: 'Ctrl+T' }, '#00c8ff'),
      ],
      botones: [
        h('ENCAJAR', 'FULLSCREEN', { type: 'hotkey', hotkey: 'Ctrl+0' }, '#00c8ff'),
        h('PANTALLA', 'MONITOR', { type: 'hotkey', hotkey: 'F' }, '#00c8ff'),
        h('PANELES', 'APP_WINDOW', { type: 'hotkey', hotkey: 'Tab' }, '#00c8ff'),
      ],
      perillas: [
        [
          h('ZOOM -', 'SUBTRACT', { type: 'hotkey', hotkey: 'Ctrl+Subtract' }, '#00c8ff'),
          h('ENCAJAR', 'FULLSCREEN', { type: 'hotkey', hotkey: 'Ctrl+0' }, '#00c8ff'),
          h('ZOOM +', 'ADD', { type: 'hotkey', hotkey: 'Ctrl+Add' }, '#00c8ff'),
        ],
        [
          h('PASO ATRÁS', 'ROTATE_CCW', { type: 'hotkey', hotkey: 'Ctrl+Alt+Z' }, '#00c8ff'),
          h('DESHACER', 'UNDO', { type: 'hotkey', hotkey: 'Ctrl+Z' }, '#00c8ff'),
          h('PASO ADELANTE', 'ROTATE_CW', { type: 'hotkey', hotkey: 'Ctrl+Shift+Z' }, '#00c8ff'),
        ],
        [
          h('CAPA +', 'ADD', { type: 'hotkey', hotkey: 'Ctrl+J' }, '#00c8ff'),
          h('FUSIONAR', 'MINIMIZE', { type: 'hotkey', hotkey: 'Ctrl+E' }, '#00c8ff'),
          h('BORRAR', 'TRASH', { type: 'hotkey', hotkey: 'Delete' }, '#00c8ff'),
        ],
      ],
    },
  },
  // Premiere Pro. https://helpx.adobe.com/premiere-pro/using/keyboard-shortcuts.html
  // El zoom de línea de tiempo (`+`/`-`) no va: son signos.
  {
    id: 'premiere',
    procesos: ['adobe premiere pro'],
    nombre: 'plantilla.app.premiere',
    deck: [
      h('CORTAR', 'SCISSORS', { type: 'hotkey', hotkey: 'Ctrl+K' }, '#a78bfa'),
      h('GUARDAR', 'STORAGE', { type: 'hotkey', hotkey: 'Ctrl+S' }, '#a78bfa'),
      h('DESHACER', 'UNDO', { type: 'hotkey', hotkey: 'Ctrl+Z' }, '#a78bfa'),
      h('EXPORTAR', 'EXPORT', { type: 'hotkey', hotkey: 'Ctrl+M' }, '#a78bfa'),
      h('ENTRADA', 'PIN', { type: 'hotkey', hotkey: 'I' }, '#a78bfa'),
      h('SALIDA', 'ARROW_RIGHT', { type: 'hotkey', hotkey: 'O' }, '#a78bfa'),
      h('CUADRO ANT', 'PREV', { type: 'hotkey', hotkey: 'Left' }, '#a78bfa'),
      h('CUADRO SIG', 'NEXT', { type: 'hotkey', hotkey: 'Right' }, '#a78bfa'),
      h('EDICIÓN ANT', 'ARROW_UP', { type: 'hotkey', hotkey: 'Up' }, '#a78bfa'),
      h('EDICIÓN SIG', 'ARROW_DOWN', { type: 'hotkey', hotkey: 'Down' }, '#a78bfa'),
      h('ATRÁS', 'ROTATE_CCW', { type: 'hotkey', hotkey: 'J' }, '#a78bfa'),
      h('PARAR', 'PAUSE', { type: 'hotkey', hotkey: 'K' }, '#a78bfa'),
      h('ADELANTE', 'ROTATE_CW', { type: 'hotkey', hotkey: 'L' }, '#a78bfa'),
      h('REHACER', 'UNDO', { type: 'hotkey', hotkey: 'Ctrl+Shift+Z' }, '#a78bfa'),
      h('TRANSICIÓN', 'SPARKLE', { type: 'hotkey', hotkey: 'Ctrl+D' }, '#a78bfa'),
      null,
    ],
    dock: {
      teclas: [
        h('CORTAR', 'SCISSORS', { type: 'hotkey', hotkey: 'Ctrl+K' }, '#a78bfa'),
        h('EXPORTAR', 'EXPORT', { type: 'hotkey', hotkey: 'Ctrl+M' }, '#a78bfa'),
        h('ENTRADA', 'PIN', { type: 'hotkey', hotkey: 'I' }, '#a78bfa'),
        h('SALIDA', 'ARROW_RIGHT', { type: 'hotkey', hotkey: 'O' }, '#a78bfa'),
        h('DESHACER', 'UNDO', { type: 'hotkey', hotkey: 'Ctrl+Z' }, '#a78bfa'),
        h('GUARDAR', 'STORAGE', { type: 'hotkey', hotkey: 'Ctrl+S' }, '#a78bfa'),
      ],
      botones: [
        h('ATRÁS', 'ROTATE_CCW', { type: 'hotkey', hotkey: 'J' }, '#a78bfa'),
        h('PARAR', 'PAUSE', { type: 'hotkey', hotkey: 'K' }, '#a78bfa'),
        h('ADELANTE', 'ROTATE_CW', { type: 'hotkey', hotkey: 'L' }, '#a78bfa'),
      ],
      perillas: [
        [
          h('CUADRO ANT', 'PREV', { type: 'hotkey', hotkey: 'Left' }, '#a78bfa'),
          h('PARAR', 'PAUSE', { type: 'hotkey', hotkey: 'K' }, '#a78bfa'),
          h('CUADRO SIG', 'NEXT', { type: 'hotkey', hotkey: 'Right' }, '#a78bfa'),
        ],
        [
          h('ENTRADA', 'PIN', { type: 'hotkey', hotkey: 'I' }, '#a78bfa'),
          h('REPRODUCIR', 'PLAY', { type: 'hotkey', hotkey: 'Space' }, '#a78bfa'),
          h('SALIDA', 'ARROW_RIGHT', { type: 'hotkey', hotkey: 'O' }, '#a78bfa'),
        ],
        [
          h('DESHACER', 'UNDO', { type: 'hotkey', hotkey: 'Ctrl+Z' }, '#a78bfa'),
          h('GUARDAR', 'STORAGE', { type: 'hotkey', hotkey: 'Ctrl+S' }, '#a78bfa'),
          h('REHACER', 'UNDO', { type: 'hotkey', hotkey: 'Ctrl+Shift+Z' }, '#a78bfa'),
        ],
      ],
    },
  },
  // Explorador de archivos de Windows.
  // https://support.microsoft.com/en-us/windows/keyboard-shortcuts-in-windows-dccfa2c8-c93b-c21c-eb9f-9f2b14805b3e
  {
    id: 'explorer',
    procesos: ['explorer'],
    nombre: 'plantilla.app.explorer',
    deck: [
      h('NUEVA CARPETA', 'ADD', { type: 'hotkey', hotkey: 'Ctrl+Shift+N' }, '#facc15'),
      h('RENOMBRAR', 'EDIT', { type: 'hotkey', hotkey: 'F2' }, '#facc15'),
      h('ACTUALIZAR', 'ROTATE_CW', { type: 'hotkey', hotkey: 'F5' }, '#facc15'),
      h('CERRAR', 'CLOSE', { type: 'hotkey', hotkey: 'Ctrl+W' }, '#facc15'),
      h('NUEVA VENTANA', 'APP_WINDOW', { type: 'hotkey', hotkey: 'Ctrl+N' }, '#facc15'),
      h('PROPIEDADES', 'GEAR', { type: 'hotkey', hotkey: 'Alt+Enter' }, '#facc15'),
      h('TODO', 'CHECK', { type: 'hotkey', hotkey: 'Ctrl+A' }, '#facc15'),
      h('ELIMINAR', 'TRASH', { type: 'hotkey', hotkey: 'Delete' }, '#facc15'),
      h('ATRÁS', 'ARROW_LEFT', { type: 'hotkey', hotkey: 'Alt+Left' }, '#facc15'),
      h('SUBIR', 'ARROW_UP', { type: 'hotkey', hotkey: 'Alt+Up' }, '#facc15'),
      h('ADELANTE', 'ARROW_RIGHT', { type: 'hotkey', hotkey: 'Alt+Right' }, '#facc15'),
      h('ABRIR', 'FOLDER', { type: 'hotkey', hotkey: 'Win+E' }, '#facc15'),
      h('PANTALLA', 'FULLSCREEN', { type: 'hotkey', hotkey: 'F11' }, '#facc15'),
      h('ESCRITORIO', 'MINIMIZE', { type: 'hotkey', hotkey: 'Win+D' }, '#facc15'),
      h('MULTITAREA', 'MONITOR', { type: 'hotkey', hotkey: 'Win+Tab' }, '#facc15', { type: 'hotkey', hotkey: 'Esc' }),
      h('CERRAR VENT', 'CLOSE', { type: 'hotkey', hotkey: 'Alt+F4' }, '#facc15'),
    ],
    dock: {
      teclas: [
        h('NUEVA CARPETA', 'ADD', { type: 'hotkey', hotkey: 'Ctrl+Shift+N' }, '#facc15'),
        h('RENOMBRAR', 'EDIT', { type: 'hotkey', hotkey: 'F2' }, '#facc15'),
        h('ACTUALIZAR', 'ROTATE_CW', { type: 'hotkey', hotkey: 'F5' }, '#facc15'),
        h('PROPIEDADES', 'GEAR', { type: 'hotkey', hotkey: 'Alt+Enter' }, '#facc15'),
        h('TODO', 'CHECK', { type: 'hotkey', hotkey: 'Ctrl+A' }, '#facc15'),
        h('ELIMINAR', 'TRASH', { type: 'hotkey', hotkey: 'Delete' }, '#facc15'),
      ],
      botones: [
        h('ATRÁS', 'ARROW_LEFT', { type: 'hotkey', hotkey: 'Alt+Left' }, '#facc15'),
        h('SUBIR', 'ARROW_UP', { type: 'hotkey', hotkey: 'Alt+Up' }, '#facc15'),
        h('ADELANTE', 'ARROW_RIGHT', { type: 'hotkey', hotkey: 'Alt+Right' }, '#facc15'),
      ],
      perillas: [
        [
          h('ATRÁS', 'ARROW_LEFT', { type: 'hotkey', hotkey: 'Alt+Left' }, '#facc15'),
          h('SUBIR', 'ARROW_UP', { type: 'hotkey', hotkey: 'Alt+Up' }, '#facc15'),
          h('ADELANTE', 'ARROW_RIGHT', { type: 'hotkey', hotkey: 'Alt+Right' }, '#facc15'),
        ],
        [
          h('TODO', 'CHECK', { type: 'hotkey', hotkey: 'Ctrl+A' }, '#facc15'),
          h('CANCELAR', 'CHECK', { type: 'hotkey', hotkey: 'Esc' }, '#facc15'),
          h('ELIMINAR', 'TRASH', { type: 'hotkey', hotkey: 'Delete' }, '#facc15'),
        ],
        [
          h('PANTALLA', 'FULLSCREEN', { type: 'hotkey', hotkey: 'F11' }, '#facc15'),
          h('ABRIR', 'FOLDER', { type: 'hotkey', hotkey: 'Win+E' }, '#facc15'),
          h('CERRAR VENT', 'CLOSE', { type: 'hotkey', hotkey: 'Alt+F4' }, '#facc15'),
        ],
      ],
      tiras: [
        [
          h('ATRÁS', 'ARROW_LEFT', { type: 'hotkey', hotkey: 'Alt+Left' }, '#facc15'),
          h('ADELANTE', 'ARROW_RIGHT', { type: 'hotkey', hotkey: 'Alt+Right' }, '#facc15'),
        ],
      ],
    },
  },
];

/** La plantilla de una app (nombre de proceso ya normalizado), o `null`. */
export function plantillaParaApp(proceso: string): PlantillaApp | null {
  return PLANTILLAS_APP.find((p) => p.procesos.includes(proceso)) ?? null;
}
