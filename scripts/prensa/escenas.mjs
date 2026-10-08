/**
 * Las escenas de las capturas: qué configuración se siembra en cada una.
 *
 * Todo lo que sale en pantalla viene de aquí o de `servicios.mjs`. Nada se
 * dibuja a mano encima: la aplicación arranca con este `deck-config.json`,
 * lee sus sensores y su RGB por los cables de siempre, y lo que se fotografía
 * es lo que pinta ella.
 *
 * Las etiquetas van en español porque la ficha en español es la principal.
 * Para la ficha en inglés se cambia `language: 'en'` y se vuelve a correr:
 * las imágenes de la Store se suben una vez por idioma de todos modos.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PRIMERA_ENTRADA } from './artes.mjs';
import { PUERTO_LHM, PUERTO_RGB } from './servicios.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * Los bits de un icono del catálogo, en el formato que un botón copia en
 * `iconoPuntos` (16×16, ver `puntos16.ts`). Se lee el mismo JSON que usa la
 * app: sembrar el icono a mano sería una copia que se queda vieja sola.
 * **Revienta si el origen no existe**, igual que `L()`.
 */
const CATALOGOS = {};
function iconoCat(origen) {
  const [catalogo, id] = origen.split(':');
  CATALOGOS[catalogo] ??= JSON.parse(
    readFileSync(join(RAIZ, 'src', 'data', 'iconosDot', `${catalogo}.json`), 'utf-8'),
  ).iconos;
  const hallado = CATALOGOS[catalogo].find(([nombre]) => nombre === id);
  if (!hallado) throw new Error(`el catalogo no tiene «${origen}» (escenas.mjs)`);
  return { bits: hallado[1], origen };
}

const ACENTO = '#4a8ef0';

/** Lo que comparten todas: sensores y RGB apuntando a los servicios locales. */
function base(extra = {}) {
  return {
    // La versión al día: sin migraciones de por medio, la captura sale de la
    // misma forma que la configuración que guarda la app.
    configVersion: 8,
    onboardingCompleted: true,
    // Sin esto salen los globos de ayuda flotando sobre la rejilla y sobre la
    // rueda de ajustes, que en una captura se leen como un error.
    hintsDismissed: ['settings', 'firstButton', 'search', 'kiosk'],
    accent: ACENTO,
    wallpaper: 'dotgrid',
    theme: 'dark',
    language: IDIOMA,
    tileMode: 'square',
    uiScale: 1,
    soundOnPress: true,
    soundProfile: 'click',
    alwaysOnTop: false,
    // El PIN va puesto para que el modo kiosko entre de un toque en vez de
    // pedir uno nuevo. 2468 no protege nada: es una captura.
    kiosk: { enabled: true, pin: '2468' },
    sensors: {
      enabled: true, host: '127.0.0.1', port: PUERTO_LHM, showWidget: true,
      spawnOnStart: false, spawnElevated: false,
      categories: ['cpu', 'gpu', 'mainboard', 'memory', 'storage'],
    },
    rgb: {
      enabled: true, host: '127.0.0.1', port: PUERTO_RGB,
      autoConnect: true, spawnOnStart: false,
      profiles: [
        { id: 'rgbp_directo', name: L('En directo'), devices: {} },
        { id: 'rgbp_noche', name: L('Noche'), devices: {} },
      ],
      // Sin esto el gestor RGB sale con el aviso «calibración pendiente» en la
      // franja de arriba, que es justo la parte de la captura que la Store no
      // tapa. La zona direccionable del emulador tiene 16 LEDs.
      zoneSizes: { 'ASUS ROG STRIX B650-E GAMING WIFI': { 'Aura Addressable 1': 16 } },
    },
    remote: { enabled: false, port: 8099, token: '', allowLan: false },
    musicPanel: { enabled: false, side: 'right' },
    floatingBar: { enabled: false, slots: [], side: 'right', tileSize: 64, opacity: 0.9 },
    profiles: [],
    state: { escena: 'CÁMARA 1', tomas: '12' },
    ...extra,
  };
}

/** Azules y grises de la paleta: nada saturado que estropee el texto de la Store. */
const C = {
  azul: '#16243a', verde: '#12261d', ambar: '#2a2313',
  violeta: '#1f1a33', rojo: '#2c1717', gris: '#1c1c1c', teal: '#0f2724',
};

/**
 * Las etiquetas en inglés, para la ficha en inglés.
 *
 * Cambiar `language: 'en'` **no basta**: eso traduce la interfaz de la
 * aplicación, pero las etiquetas de los botones son datos que siembra este
 * archivo. Sin esta tabla salía la interfaz en inglés con los botones en
 * español, que se lee peor que cualquiera de los dos idiomas puros.
 *
 * La clave es la etiqueta española. También traduce los sufijos de los widgets
 * de sensor y los nombres de los botones dentro de una carpeta, que son
 * etiquetas igual aunque no lo parezcan, y los rótulos de la interfaz en los
 * que hacen clic los pasos (que en inglés dicen otra cosa).
 */
const EN = {
  'EN VIVO': 'LIVE', 'CÁMARA 1': 'CAM 1', 'CÁMARA 2': 'CAM 2', 'SILENCIAR': 'MUTE MIC',
  'HORA': 'CLOCK', 'ANTERIOR': 'PREV', 'PAUSA': 'PAUSE', 'SIGUIENTE': 'NEXT',
  'NEXT': 'NEXT', 'MUTE': 'MUTE',
  'SONANDO': 'NOW PLAYING', 'VOL −': 'VOL −', 'VOL +': 'VOL +', 'MUDO': 'MUTE',
  'CASCOS': 'HEADSET', 'LUZ JUEGO': 'GAME LIGHT', 'LUZ CINE': 'MOVIE LIGHT', 'CPU': 'CPU',
  'MÁS': 'MORE', 'CÓDIGO': 'CODE', 'NOTAS': 'NOTES', 'STREAM': 'STREAM',
  'CLIMA': 'WEATHER', 'GPU': 'GPU', 'PLACA': 'BOARD', 'CARGA': 'LOAD', 'RAM': 'RAM',
  'SSD': 'SSD', 'VENT': 'FAN', 'VATIOS': 'WATTS', 'TOMAS': 'TAKES', 'LUCES': 'LIGHTS',
  'RPM': 'RPM', 'CPU W': 'CPU W',
  // Botones y huecos del dock N3 y de la página 6×2 del kiosko.
  'GRABAR': 'RECORD', 'MICRÓFONO': 'MIC', 'ESCENA': 'SCENE', 'LUZ': 'LIGHT',
  'VOL': 'VOL', 'ZOOM': 'ZOOM', 'SCROLL': 'SCROLL',
  'ZOOM −': 'ZOOM −', 'ZOOM +': 'ZOOM +', 'SCROLL −': 'SCROLL −', 'SCROLL +': 'SCROLL +',
  // Etiquetas del perfil «multimedia» del N3 (`perfilesDock.ts`), con el guion
  // recto que usan los presets.
  'VOL -': 'VOL -', 'VOL +': 'VOL +', 'PLAY/PAUSA': 'PLAY/PAUSE', 'APP MUTE': 'APP MUTE',
  'RECORTE': 'SNIP', 'ESCRITORIO': 'DESKTOP', 'CAMBIAR PÁGINA': 'CYCLE PAGE',
  'VENTANA SIG.': 'NEXT WINDOW',
  'BRILLO -': 'BRIGHT -', 'BRILLO 70': 'BRIGHT 70', 'BRILLO +': 'BRIGHT +',
  'SPOTIFY': 'SPOTIFY',
  // Nombres de página y de perfil RGB: también son datos sembrados.
  'MESA': 'DESK', 'N3': 'N3', 'En directo': 'Live', 'Noche': 'Night',
  // Textos de la **interfaz** en los que los pasos hacen clic. En inglés el
  // botón dice otra cosa y el paso no encontraría nada: se vio con «KIOSKO»,
  // que en inglés es «KIOSK», y la captura habría salido sin entrar en kiosko.
  'KIOSKO': 'KIOSK', 'MOSTRAR': 'SHOW', 'PRESETS': 'PRESETS', 'APARIENCIA': 'APPEARANCE',
  'ACCIÓN': 'ACTION', 'EDITAR': 'EDIT',
  'CATÁLOGO': 'CATALOG', 'MEDIOS': 'MEDIA', 'BRILLO': 'BRIGHT', 'PIN': 'PIN',
  'PREV': 'PREV', 'PLAY': 'PLAY',
};

/** El idioma con el que se siembra. Lo pone `capturar.mjs` por entorno. */
export const IDIOMA = process.env.VD_PRENSA_IDIOMA === 'en' ? 'en' : 'es';

/**
 * Traduce una etiqueta si toca. **Revienta si falta**, en vez de dejarla en
 * español: una captura con los dos idiomas mezclados es justo lo que se quiere
 * evitar, y en silencio no se nota hasta tenerla subida.
 */
function L(texto) {
  if (IDIOMA === 'es' || !texto) return texto;
  const t = EN[texto];
  if (t === undefined) throw new Error(`falta la traduccion de «${texto}» en EN (escenas.mjs)`);
  return t;
}

const b = (slot, o = {}) => {
  const x = {
    id: `${o.page ?? 0}-${slot}`, page: o.page ?? 0, label: '', icon: '',
    action: { type: 'none' }, ...o,
  };
  if (x.label) x.label = L(x.label);
  if (x.sensorWidget?.suffix) x.sensorWidget = { ...x.sensorWidget, suffix: L(x.sensorWidget.suffix) };
  if (x.varWidget?.suffix) x.varWidget = { ...x.varWidget, suffix: L(x.varWidget.suffix) };
  if (x.sliderWidget?.label) x.sliderWidget = { ...x.sliderWidget, label: L(x.sliderWidget.label) };
  if (Array.isArray(x.action?.folderButtons)) {
    x.action = { ...x.action, folderButtons: x.action.folderButtons.map((f) => ({ ...f, label: L(f.label) })) };
  }
  if (Array.isArray(x.subButtons)) {
    x.subButtons = x.subButtons.map((sb) => ({ ...sb, label: sb.label ? L(sb.label) : undefined }));
  }
  return x;
};

// ── Escena 01: el deck lleno ──────────────────────────────────────────────
// Los iconos son del catálogo grande (16×16) copiados en `iconoPuntos`, como
// los deja el selector de iconos: marcas donde hay marca (OBS, Discord,
// Spotify) y acciones donde no (cámara, play, volumen). El glifo 8×8 de
// antes ya no es la identidad de la 0.14.
const DECK = [
  b(0,  { label: 'EN VIVO',   iconoPuntos: iconoCat('marcas:obsstudio'), bgColor: C.rojo, isToggle: true, efectoPulsar: 'onda', action: { type: 'app', appPath: 'C:\\Program Files\\obs-studio\\bin\\64bit\\obs64.exe' } }),
  b(1,  { label: 'CÁMARA 2',  iconoPuntos: iconoCat('acciones:camera'),  bgColor: C.gris,    action: { type: 'hotkey', hotkey: 'Ctrl+Shift+F2' } }),
  b(2,  { label: 'SILENCIAR', iconoPuntos: iconoCat('marcas:discord'),   bgColor: C.violeta, isToggle: true, action: { type: 'hotkey', hotkey: 'Ctrl+Shift+M' } }),
  b(3,  { label: 'HORA',      widget: 'clock',       bgColor: C.azul,    action: { type: 'none' } }),

  b(4,  { label: 'PIN',       iconoPuntos: iconoCat('acciones:pin'), pinned: true, bgColor: C.gris, action: { type: 'hotkey', hotkey: 'Ctrl+Shift+P' } }),
  b(5,  { label: 'MEDIOS',    bgColor: C.gris,       action: { type: 'none' }, subButtons: [
    { id: '0-5-0', label: 'PREV', iconoPuntos: iconoCat('acciones:player-skip-back'), action: { type: 'media-prev' } },
    { id: '0-5-1', label: 'PLAY', iconoPuntos: iconoCat('acciones:player-play'), action: { type: 'media-play-pause' } },
    { id: '0-5-2', label: 'NEXT', iconoPuntos: iconoCat('acciones:player-skip-forward'), action: { type: 'media-next' } },
    { id: '0-5-3', label: 'MUTE', iconoPuntos: iconoCat('acciones:volume-off'), action: { type: 'mute' } },
  ] }),
  b(6,  { label: 'SONANDO',   widget: 'now-playing', bgColor: C.verde,   action: { type: 'media-play-pause' } }),
  b(7,  { label: 'VOL',       widget: 'slider',   sliderWidget: { target: 'volume', orientation: 'horizontal', label: 'VOL' }, bgColor: C.gris, action: { type: 'none' } }),
  b(8,  { label: 'BRILLO',    widget: 'slider',   sliderWidget: { target: 'brightness', orientation: 'horizontal', label: 'BRILLO' }, bgColor: C.gris, action: { type: 'none' } }),
  b(9,  { label: 'CASCOS',    iconoPuntos: iconoCat('acciones:headphones'), bgColor: C.teal, action: { type: 'audio-device', deviceName: 'Auriculares' } }),
  b(10, { label: 'MUDO',      iconoPuntos: iconoCat('acciones:volume-off'), bgColor: C.ambar, isToggle: true, action: { type: 'mute' } }),
  // La de Spotify es la que abre el editor de la escena 02: marca, color
  // propio, etiqueta y acción de música, con el icono animado.
  b(11, { label: 'SPOTIFY',   iconoPuntos: iconoCat('marcas:spotify'),   bgColor: C.verde, animacion: { efecto: 'pulso', cuando: 'siempre' }, action: { type: 'media-play-pause' } }),

  b(12, { label: 'LUZ JUEGO', iconoPuntos: iconoCat('acciones:flame'),   bgColor: C.rojo,    radioGroup: 'luces', isToggle: true, action: { type: 'rgb-preset', rgbPresetId: 'gaming' } }),
  b(13, { label: 'LUZ CINE',  iconoPuntos: iconoCat('acciones:movie'),   bgColor: C.azul,    radioGroup: 'luces', isToggle: true, action: { type: 'rgb-preset', rgbPresetId: 'cinema' } }),
  b(14, { label: 'CPU',       widget: 'sensor',      bgColor: C.gris,    sensorWidget: { sensorId: '/amdcpu/0/temperature/0', suffix: 'CPU', warnAt: 70, critAt: 85 }, action: { type: 'none' } }),
  b(15, { label: 'MÁS',       iconoPuntos: iconoCat('acciones:folder'),  bgColor: C.azul,    action: { type: 'folder', folderButtons: [
    { label: 'CÓDIGO', iconoPuntos: iconoCat('acciones:brand-vscode'), action: { type: 'app', appPath: 'C:\\Program Files\\Microsoft VS Code\\Code.exe' } },
    { label: 'NOTAS',  iconoPuntos: iconoCat('acciones:notebook'), action: { type: 'app', appPath: 'C:\\Windows\\System32\\notepad.exe' } },
  ] } }),
];

const paginaDeck = { id: 'main', name: L('STREAM'), gridSize: 4, gridRows: 4 };

// ── Escena 02/03: el editor (casilla 13 vacía) ────────────────────────────
// Con doce botones sembrados, el hueco 12 queda vacío y su casilla se titula
// «Clic para configurar»: un clic de verdad abre el editor, que es lo que un
// usuario hace. La 02 se queda en ACCIÓN (buscador y fichas por familia) y la
// 03 despliega APARIENCIA y abre el catálogo de iconos.
const EDITOR = { pages: [paginaDeck], buttons: DECK.slice(0, 12), toggledIds: ['0-0'] };

// ── Escena 04: el dock N3, sin el aparato ─────────────────────────────────
// `DispositivosB` fusiona el hardware vivo con las páginas de la config: una
// página con `superficie` de un serial que no está en el bus sale como
// dispositivo «Desconectado» y pinta el chasis con sus botones. Es la única
// forma de enseñar el dock sin el N3 enchufado, y no toca código de la app.
// Los 18 huecos salen en el orden de los controles del modelo (`n3.ts`):
// 6 teclas LCD, 3 botones, 3 perillas de tres huecos (izq, pulsar, der).
const paginaN3 = {
  id: 'n3', name: L('N3'), gridSize: 3, gridRows: 6,
  superficie: { serial: 'PRENSA-N3-0001', modelo: 'n3' },
};

// El perfil «multimedia» de `perfilesDock.ts` (T-DOCK-01) sembrado en los 18
// huecos, con sus iconos del catálogo. El orden es el de los controles del
// modelo: 6 teclas LCD, 3 botones, 3 perillas de tres huecos (izq, pulsar,
// der). Así la página sale pintada entera —ningún hueco vacío— y la captura
// enseña lo mismo que cuando alguien pulsa «MULTIMEDIA» en la pantalla.
const N3 = [
  // las 6 teclas LCD
  b(0,  { label: 'MUTE',    dotGlyph: 'MUTE',   iconoPuntos: iconoCat('acciones:volume-off'), action: { type: 'mute' } }),
  b(1,  { label: 'PLAY/PAUSA', dotGlyph: 'PLAY', iconoPuntos: iconoCat('acciones:player-play'), fgColor: '#1db954', action: { type: 'media-play-pause' } }),
  b(2,  { label: 'SIGUIENTE', dotGlyph: 'NEXT',  iconoPuntos: iconoCat('acciones:player-skip-forward'), fgColor: '#1db954', action: { type: 'media-next' } }),
  b(3,  { label: 'ANTERIOR', dotGlyph: 'PREV',  iconoPuntos: iconoCat('acciones:player-skip-back'), fgColor: '#1db954', action: { type: 'media-prev' } }),
  b(4,  { label: 'APP MUTE', dotGlyph: 'MUTE',  iconoPuntos: iconoCat('acciones:volume-off'), fgColor: '#38bdf8', action: { type: 'app-volume', appVolumeMode: 'mute' } }),
  b(5,  { label: 'RECORTE', dotGlyph: 'SCISSORS', iconoPuntos: iconoCat('acciones:screenshot'), action: { type: 'hotkey', hotkey: 'Win+Shift+S' } }),
  // los 3 botones sin pantalla
  b(6,  { label: 'CAMBIAR PÁGINA', dotGlyph: 'NEXT', iconoPuntos: iconoCat('acciones:repeat'), action: { type: 'page-nav', pageNav: 'cycle' }, fijo: true }),
  b(7,  { label: 'ESCRITORIO', dotGlyph: 'MINIMIZE', iconoPuntos: iconoCat('acciones:minimize'), action: { type: 'hotkey', hotkey: 'Win+D' } }),
  b(8,  { label: 'VENTANA SIG.', dotGlyph: 'NEXT', iconoPuntos: iconoCat('acciones:arrow-right'), action: { type: 'window-cycle', windowCycle: 'next' } }),
  // perilla 1: volumen maestro
  b(9,  { label: 'VOL -', dotGlyph: 'SPEAKER', iconoPuntos: iconoCat('acciones:volume-2'), fgColor: '#38bdf8', action: { type: 'adjust', adjustTarget: 'volume', adjustDelta: -5 } }),
  b(10, { label: 'MUTE',  dotGlyph: 'MUTE',    iconoPuntos: iconoCat('acciones:volume-off'), fgColor: '#38bdf8', action: { type: 'mute' } }),
  b(11, { label: 'VOL +', dotGlyph: 'SPEAKER', iconoPuntos: iconoCat('acciones:volume'), fgColor: '#38bdf8', action: { type: 'adjust', adjustTarget: 'volume', adjustDelta: 5 } }),
  // perilla 2: reproducción
  b(12, { label: 'ANTERIOR',  dotGlyph: 'PREV', iconoPuntos: iconoCat('acciones:player-skip-back'), fgColor: '#1db954', action: { type: 'media-prev' } }),
  b(13, { label: 'PLAY/PAUSA', dotGlyph: 'PLAY', iconoPuntos: iconoCat('acciones:player-play'), fgColor: '#1db954', action: { type: 'media-play-pause' } }),
  b(14, { label: 'SIGUIENTE',  dotGlyph: 'NEXT', iconoPuntos: iconoCat('acciones:player-skip-forward'), fgColor: '#1db954', action: { type: 'media-next' } }),
  // perilla 3: brillo
  b(15, { label: 'BRILLO -',  dotGlyph: 'BRIGHTNESS', iconoPuntos: iconoCat('acciones:brightness-down'), fgColor: '#facc15', action: { type: 'adjust', adjustTarget: 'brightness', adjustDelta: -10 } }),
  b(16, { label: 'BRILLO 70', dotGlyph: 'BRIGHTNESS', iconoPuntos: iconoCat('acciones:brightness'), fgColor: '#facc15', action: { type: 'brightness', brightnessLevel: 70 } }),
  b(17, { label: 'BRILLO +',  dotGlyph: 'BRIGHTNESS', iconoPuntos: iconoCat('acciones:brightness-up'), fgColor: '#facc15', action: { type: 'adjust', adjustTarget: 'brightness', adjustDelta: 10 } }),
].map((x, i) => ({ ...x, page: 1, id: `1-${i}` }));

// ── Escena 08: el kiosko en formato barra (1280×480, página 6×2) ──────────
// Seis columnas es el máximo de la rejilla (`PageConfig.gridSize`), así que la
// página de barra es 6×2, no la 8×2 que llegó a proponerse en el informe.
const paginaBarra = { id: 'main', name: L('STREAM'), gridSize: 6, gridRows: 2 };
const paginaLuces = { id: 'p2', name: L('LUCES'), gridSize: 6, gridRows: 2 };

const BARRA = [
  b(0,  { label: 'EN VIVO',   iconoPuntos: iconoCat('marcas:obsstudio'), bgColor: C.rojo,    isToggle: true }),
  b(1,  { label: 'GRABAR',    iconoPuntos: iconoCat('acciones:player-record'), bgColor: C.violeta }),
  b(2,  { label: 'MICRÓFONO', iconoPuntos: iconoCat('acciones:microphone'), bgColor: C.violeta, isToggle: true }),
  b(3,  { label: 'HORA',      widget: 'clock',     bgColor: C.azul }),
  b(4,  { label: 'SONANDO',   widget: 'now-playing', bgColor: C.verde, action: { type: 'media-play-pause' } }),
  b(5,  { label: 'VOL',       widget: 'slider', sliderWidget: { target: 'volume', orientation: 'horizontal', label: 'VOL' }, bgColor: C.gris, action: { type: 'none' } }),
  b(6,  { label: 'BRILLO',    widget: 'slider', sliderWidget: { target: 'brightness', orientation: 'horizontal', label: 'BRILLO' }, bgColor: C.gris, action: { type: 'none' } }),
  b(7,  { label: 'MUDO',      iconoPuntos: iconoCat('acciones:volume-off'), bgColor: C.ambar,   isToggle: true, action: { type: 'mute' } }),
  b(8,  { label: 'LUZ JUEGO', iconoPuntos: iconoCat('acciones:flame'), bgColor: C.rojo,    isToggle: true, action: { type: 'rgb-preset', rgbPresetId: 'gaming' } }),
  b(9,  { label: 'LUZ CINE',  iconoPuntos: iconoCat('acciones:movie'), bgColor: C.azul,    isToggle: true, action: { type: 'rgb-preset', rgbPresetId: 'cinema' } }),
  b(10, { label: 'CPU',       widget: 'sensor',    bgColor: C.gris,    sensorWidget: { sensorId: '/amdcpu/0/temperature/0', suffix: 'CPU', warnAt: 70, critAt: 85 }, action: { type: 'none' } }),
  b(11, { label: 'CÁMARA 2',  iconoPuntos: iconoCat('acciones:camera'), bgColor: C.gris }),
];

/** La misma página en otro índice: las fichas de abajo del kiosko necesitan más de una. */
const enPagina = (lista, page) => lista.map((x, i) => ({ ...x, id: `${page}-${i}`, page }));

/**
 * Las once escenas (la 05b en vertical y la 06b de la ficha, además de las
 * nueve de la ficha de la Store).
 *
 * `pasos` es lo que hay que hacer con el ratón después de arrancar; los
 * ejecuta `capturar.mjs` con `Input.dispatchMouseEvent`, que son eventos de
 * entrada de verdad: los sintéticos de React no valen aquí.
 */
export const ESCENAS = [
  {
    archivo: '01-deck.png',
    titulo: 'La rejilla del deck, 4×4, con el panel de música',
    ancho: 1280, alto: 720, escala: 1.5,
    // El panel de música va encendido en esta y solo en esta: una rejilla de
    // 4×4 con casillas cuadradas deja franjas vacías a los lados de una
    // pantalla 16:9, y el panel las ocupa enseñando algo en vez de nada. La
    // pista y la carátula salen de `VD_MEDIOS_FIJOS` (`fuentes/`), inventadas.
    config: base({
      pages: [paginaDeck], buttons: DECK, toggledIds: ['0-0', '0-12'],
      musicPanel: { enabled: true, side: 'left' },
    }),
    pasos: [],
  },
  {
    archivo: '02-editor.png',
    titulo: 'El editor por secciones sobre un botón ya configurado (Spotify)',
    ancho: 1280, alto: 720, escala: 1.5,
    config: base(EDITOR),
    // El editor se abre con clic derecho → «Editar» sobre la casilla de
    // Spotify: así la vista previa sale llena (marca, color, etiqueta) en vez
    // del «Ninguno» de una casilla vacía. En un botón configurado PRESETS
    // viene plegada; se despliega, y ACCIÓN se pliega para que la apariencia
    // —el icono del catálogo, el color— entre entera en la captura.
    pasos: [
      { hacer: 'clicDerechoEnCasilla', titulo: L('SPOTIFY') },
      { hacer: 'esperarTexto', texto: L('EDITAR') },
      { hacer: 'clicEnTextoLibre', texto: L('EDITAR') },
      { hacer: 'esperar', ms: 1500 },
      { hacer: 'clicEnTexto', texto: L('PRESETS') },
      { hacer: 'esperar', ms: 400 },
      { hacer: 'clicEnTexto', texto: L('ACCIÓN') },
      { hacer: 'esperar', ms: 400 },
    ],
  },
  {
    archivo: '03-catalogo.png',
    titulo: 'El catálogo de iconos, con grupos y buscador',
    ancho: 1280, alto: 720, escala: 1.5,
    config: base(EDITOR),
    // Mismo editor, pero por el camino de la apariencia: APARIENCIA → ICONO →
    // la ficha CATÁLOGO abre el modal. Dentro se busca «speaker», que cabe en
    // una página (14) y devuelve a la vez el glifo 8×8 SPEAKER, las acciones
    // de sonido y la marca Speaker Deck. Con «play» salían 147 resultados y
    // las marcas caían fuera de la primera pantalla.
    pasos: [
      { hacer: 'clicEnCasillaVacia' },
      { hacer: 'esperar', ms: 1500 },
      { hacer: 'clicEnTexto', texto: L('APARIENCIA') },
      { hacer: 'esperar', ms: 400 },
      { hacer: 'clicEnTexto', texto: L('CATÁLOGO') },
      { hacer: 'esperar', ms: 1200 },
      { hacer: 'escribir', texto: 'speaker', en: IDIOMA === 'en' ? 'Search by name or tag' : 'Buscar por nombre o etiqueta' },
      { hacer: 'esperar', ms: 900 },
    ],
  },
  {
    archivo: '04-dock.png',
    titulo: 'El dock N3 pintado, conectado y con datos inventados',
    ancho: 1280, alto: 720, escala: 1.5,
    config: base({
      pages: [paginaDeck, paginaN3],
      buttons: [...DECK, ...N3],
      toggledIds: ['0-0', '1-0', '1-4'],
    }),
    // La única escena que enciende el núcleo nativo: la lista de aplicaciones
    // en ejecución sale de él, y aquí no se puede apagar porque sin ella la
    // sección sale vacía. Sus datos se sustituyen antes de disparar por los de
    // `privacidad` (el serial del aparato y apps inventadas): nada de la
    // máquina del dueño llega a la imagen, y el dock sigue «CONECTADO».
    entorno: { VD_SIN_NUCLEO: '0' },
    privacidad: {
      serial: 'PRENSA-N3-0001',
      apps: ['pixelart-studio', 'notas-rapidas', 'sintetizador', 'mi-editor', 'visor-3d'],
    },
    pasos: [
      { hacer: 'clicEnTitulo', titulo: IDIOMA === 'en' ? 'Devices' : 'Dispositivos' },
      { hacer: 'esperar', ms: 1200 },
    ],
  },
  {
    archivo: '05-movil.png',
    titulo: 'El mando móvil, servido por la app y visto en una pantalla de teléfono',
    // La vista principal solo abre el servidor remoto; lo que se fotografía es
    // la página del mando (390×844 @2) que se pega centrada en el lienzo OLED.
    ancho: 1280, alto: 720, escala: 1.5,
    mando: { puerto: 8099, token: 'prensa-borrador', ancho: 390, alto: 844, escala: 2 },
    lienzo: { ancho: 1920, alto: 1080, fondo: '#070809' },
    config: base({
      pages: [paginaDeck], buttons: DECK, toggledIds: ['0-0', '0-12'],
      remote: { enabled: true, port: 8099, token: 'prensa-borrador', allowLan: false },
    }),
    pasos: [],
  },
  {
    archivo: '05b-movil-marco.png',
    titulo: 'El mando móvil en vertical (1080×1920), para el marco del vídeo',
    // La misma vista de teléfono que la 05, pero el PNG final es 9:16: el
    // teléfono llena el alto entero y solo quedan dos franjas finas del fondo
    // OLED a los lados, en vez de las dos franjas enormes de la 05.
    ancho: 1280, alto: 720, escala: 1.5,
    mando: { puerto: 8099, token: 'prensa-borrador', ancho: 390, alto: 844, escala: 2 },
    lienzo: { ancho: 1080, alto: 1920, fondo: '#070809' },
    config: base({
      pages: [paginaDeck], buttons: DECK, toggledIds: ['0-0', '0-12'],
      remote: { enabled: true, port: 8099, token: 'prensa-borrador', allowLan: false },
    }),
    pasos: [],
  },
  {
    archivo: '06-tienda.png',
    titulo: 'La tienda con la rejilla de tarjetas de la galería',
    ancho: 1280, alto: 720, escala: 1.5,
    config: base({ pages: [paginaDeck], buttons: DECK }),
    // `abrirTienda` abre la ventana `#tienda` por IPC y pasa el testigo: los
    // pasos siguientes (galería del proyecto, tarjetas) van contra ella. El
    // manifiesto que carga es el local de `servicios.mjs`, con portadas y
    // capturas generadas. `scrollArriba` deshace el desplazamiento que deja
    // `rectangulo` al traer la primera tarjeta a la vista: sin él la captura
    // salía empezando por la mitad de la lista.
    pasos: [
      { hacer: 'abrirTienda' },
      { hacer: 'esperarTexto', texto: IDIOMA === 'en' ? 'STORE' : 'TIENDA' },
      { hacer: 'clicEnTexto', texto: IDIOMA === 'en' ? 'PROJECT GALLERY' : 'GALERIA DEL PROYECTO' },
      { hacer: 'esperarTexto', texto: PRIMERA_ENTRADA.label[IDIOMA] ?? PRIMERA_ENTRADA.label.es },
      { hacer: 'esperar', ms: 1200 },
      { hacer: 'scrollArriba' },
    ],
  },
  {
    archivo: '06b-tienda-ficha.png',
    titulo: 'La ficha abierta con el aviso de riesgo, con el scroll arriba',
    // Vista más alta que 16:9 (1792×1008, que con escala 15/14 da 1920×1080
    // exactos): a 1280×720 la ficha no cabe y el aviso de riesgo queda por
    // debajo del pliegue — solo se puede enseñar desplazando, que es lo que
    // salió mal en la corrida anterior. Con esta altura entran la portada, el
    // aviso y el scroll arriba de verdad.
    ancho: 1792, alto: 1008, escala: 15 / 14,
    config: base({ pages: [paginaDeck], buttons: DECK }),
    pasos: [
      { hacer: 'abrirTienda' },
      { hacer: 'esperarTexto', texto: IDIOMA === 'en' ? 'STORE' : 'TIENDA' },
      { hacer: 'clicEnTexto', texto: IDIOMA === 'en' ? 'PROJECT GALLERY' : 'GALERIA DEL PROYECTO' },
      { hacer: 'esperarTexto', texto: PRIMERA_ENTRADA.label[IDIOMA] ?? PRIMERA_ENTRADA.label.es },
      { hacer: 'clicEnTarjeta', texto: PRIMERA_ENTRADA.label[IDIOMA] ?? PRIMERA_ENTRADA.label.es },
      { hacer: 'esperarTexto', texto: IDIOMA === 'en' ? 'A profile is not just data' : 'Un perfil no son solo datos' },
      { hacer: 'esperar', ms: 900 },
      { hacer: 'scrollArriba' },
    ],
  },
  {
    archivo: '07-barra-flotante.png',
    titulo: 'La barra flotante sobre un escritorio neutro',
    // Ya no va sobre la ventana de Autodesk Fusion: el fondo es un escritorio
    // abstracto generado (`artes.mjs`), sin interfaz ni marca de terceros, así
    // que esta captura sí puede ir a la Store.
    ancho: 1920, alto: 1080, escala: 1,
    pantalla: { ancho: 1920, alto: 1080 },
    ventana: { x: 0, y: 0, width: 1920, height: 1080 },
    compuesta: true,
    config: base({
      pages: [paginaDeck], buttons: DECK, toggledIds: ['0-0', '0-12'],
      tileMode: 'fill',
      floatingBar: {
        enabled: true,
        slots: ['0-0', '0-4', '0-5', '0-7', '0-10', '0-12'],
        side: 'right', tileSize: 80, y: null, opacity: 0.9,
      },
    }),
    pasos: [],
  },
  {
    archivo: '08-kiosko-barra.png',
    titulo: 'Modo kiosko en formato barra (1280×480), centrado en un lienzo 1920×1080',
    // La Store pide 1366×768 o más: el kiosko de barra es 1280×480 de verdad,
    // así que se fotografía a su medida y se pega centrado en el lienzo OLED.
    // El asunto (rejilla 6×2, panel y franja) queda entero en el tercio central.
    ancho: 1280, alto: 480, escala: 2,
    lienzo: { ancho: 1920, alto: 1080, fondo: '#070809' },
    config: base({
      pages: [paginaBarra, paginaLuces],
      buttons: [...BARRA, ...enPagina(BARRA, 1)],
      toggledIds: ['0-0', '0-7'],
      tileMode: 'fill',
    }),
    pasos: [
      { hacer: 'clicEnTitulo', titulo: IDIOMA === 'en' ? 'Fullscreen mode' : 'Modo pantalla completa' },
      { hacer: 'esperar', ms: 900 },
      { hacer: 'clicEnTexto', texto: L('KIOSKO') },
      { hacer: 'esperar', ms: 900 },
    ],
  },
  {
    archivo: '09-rgb.png',
    titulo: 'El gestor RGB',
    // Más aumento que las demás: el contenido de esta pantalla mide lo que
    // mide y con una vista de 1280 se quedaba media captura en negro.
    ancho: 960, alto: 540, escala: 2,
    config: base({ pages: [paginaDeck], buttons: DECK }),
    pasos: [
      { hacer: 'clicEnTexto', texto: 'RGB' },
      { hacer: 'esperar', ms: 1800 },
      // El pintor LED a LED: llena la columna del medio y es lo que ningún
      // programa de deck de la competencia trae.
      { hacer: 'clicEnTexto', texto: L('MOSTRAR') },
      { hacer: 'esperar', ms: 900 },
    ],
  },
];
