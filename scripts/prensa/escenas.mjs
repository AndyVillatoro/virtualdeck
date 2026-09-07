/**
 * Las seis escenas de las capturas: qué configuración se siembra en cada una.
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

const ACENTO = '#4a8ef0';

/** Lo que comparten todas: sensores y RGB apuntando a los servicios locales. */
function base(extra = {}) {
  return {
    configVersion: 4,
    onboardingCompleted: true,
    // Sin esto salen los globos de ayuda flotando sobre la rejilla y sobre la
    // rueda de ajustes, que en una captura se leen como un error.
    hintsDismissed: ['settings', 'firstButton', 'search', 'kiosk'],
    accent: ACENTO,
    wallpaper: 'dotgrid',
    theme: 'dark',
    language: 'es',
    tileMode: 'square',
    uiScale: 1,
    soundOnPress: true,
    soundProfile: 'click',
    alwaysOnTop: false,
    // El PIN va puesto para que el modo kiosko entre de un toque en vez de
    // pedir uno nuevo. 2468 no protege nada: es una captura.
    kiosk: { enabled: true, pin: '2468' },
    sensors: {
      enabled: true, host: '127.0.0.1', port: 8085, showWidget: true,
      spawnOnStart: false, spawnElevated: false,
      categories: ['cpu', 'gpu', 'mainboard', 'memory', 'storage'],
    },
    rgb: {
      enabled: true, host: '127.0.0.1', port: 6742,
      autoConnect: true, spawnOnStart: false,
      profiles: [
        { id: 'rgbp_directo', name: 'En directo', devices: {} },
        { id: 'rgbp_noche', name: 'Noche', devices: {} },
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

const b = (slot, o) => ({ id: `0-${slot}`, page: 0, label: '', icon: '', ...o });

// ── Escena 1: el deck lleno ───────────────────────────────────────────────
const DECK = [
  b(0,  { label: 'EN VIVO',   brandIcon: 'obs',      bgColor: C.rojo,    isToggle: true, action: { type: 'app', appPath: 'C:\\Program Files\\obs-studio\\bin\\64bit\\obs64.exe' } }),
  b(1,  { label: 'CÁMARA 2',  icon: '🎥',            bgColor: C.gris,    action: { type: 'hotkey', hotkey: 'Ctrl+Shift+F2' } }),
  b(2,  { label: 'SILENCIAR', brandIcon: 'discord',  bgColor: C.violeta, isToggle: true, action: { type: 'hotkey', hotkey: 'Ctrl+Shift+M' } }),
  b(3,  { label: 'HORA',      widget: 'clock',       bgColor: C.azul,    action: { type: 'none' } }),

  b(4,  { label: 'ANTERIOR',  bgColor: C.gris,       action: { type: 'media-prev' } }),
  b(5,  { label: 'PAUSA',     bgColor: C.gris,       action: { type: 'media-play-pause' } }),
  b(6,  { label: 'SIGUIENTE', bgColor: C.gris,       action: { type: 'media-next' } }),
  b(7,  { label: 'SONANDO',   widget: 'now-playing', bgColor: C.verde,   action: { type: 'media-play-pause' } }),

  b(8,  { label: 'VOL −',     bgColor: C.gris,       action: { type: 'adjust', adjustTarget: 'volume', adjustDelta: -10 } }),
  b(9,  { label: 'VOL +',     bgColor: C.gris,       action: { type: 'adjust', adjustTarget: 'volume', adjustDelta: 10 } }),
  b(10, { label: 'MUDO',      bgColor: C.ambar,      isToggle: true, action: { type: 'mute' } }),
  b(11, { label: 'CASCOS',    icon: '🎧',            bgColor: C.teal,    action: { type: 'audio-device', deviceName: 'Auriculares' } }),

  b(12, { label: 'LUZ JUEGO', icon: '🔴',            bgColor: C.rojo,    radioGroup: 'luces', isToggle: true, action: { type: 'rgb-preset', rgbPresetId: 'gaming' } }),
  b(13, { label: 'LUZ CINE',  icon: '🔵',            bgColor: C.azul,    radioGroup: 'luces', isToggle: true, action: { type: 'rgb-preset', rgbPresetId: 'cinema' } }),
  b(14, { label: 'CPU',       widget: 'sensor',      bgColor: C.gris,    sensorWidget: { sensorId: '/amdcpu/0/temperature/0', suffix: 'CPU', warnAt: 70, critAt: 85 }, action: { type: 'none' } }),
  b(15, { label: 'MÁS',       brandIcon: 'vscode',   bgColor: C.azul,    action: { type: 'folder', folderButtons: [
    { label: 'CÓDIGO', action: { type: 'app', appPath: 'C:\\Program Files\\Microsoft VS Code\\Code.exe' } },
    { label: 'NOTAS',  action: { type: 'app', appPath: 'C:\\Windows\\System32\\notepad.exe' } },
  ] } }),
];

// ── Escena 4: la barra lateral ────────────────────────────────────────────
// Rejilla de 5×4: llena el hueco de una pantalla 16:9 con casillas cuadradas,
// y a ese tamaño los widgets se leen sin que el deck se coma la captura. Con
// 3×3 las casillas salían enormes y medio vacías.
const sensor = (id, sufijo, warnAt, critAt) => ({
  widget: 'sensor', sensorWidget: { sensorId: id, suffix: sufijo, warnAt, critAt }, action: { type: 'none' },
});

const MESA = [
  b(0,  { label: 'HORA',   bgColor: C.azul,  widget: 'clock', action: { type: 'none' } }),
  b(1,  { label: 'CLIMA',  bgColor: C.teal,  widget: 'weather', action: { type: 'none' } }),
  b(2,  { label: 'CPU',    bgColor: C.gris,  ...sensor('/amdcpu/0/temperature/0', 'CPU', 70, 85) }),
  b(3,  { label: 'GPU',    bgColor: C.gris,  ...sensor('/gpu-nvidia/0/temperature/0', 'GPU', 75, 88) }),
  b(4,  { label: 'PLACA',  bgColor: C.gris,  ...sensor('/lpc/nct6798d/0/temperature/0', 'PLACA', 50, 60) }),

  b(5,  { label: 'CARGA',  bgColor: C.gris,  ...sensor('/amdcpu/0/load/0', 'CARGA', 85, 95) }),
  b(6,  { label: 'RAM',    bgColor: C.gris,  ...sensor('/ram/load/0', 'RAM', 80, 92) }),
  b(7,  { label: 'SSD',    bgColor: C.gris,  ...sensor('/nvme/0/temperature/0', 'SSD', 60, 70) }),
  b(8,  { label: 'VENT',   bgColor: C.gris,  ...sensor('/gpu-nvidia/0/fan/0', 'RPM', 2000, 2300) }),
  b(9,  { label: 'VATIOS', bgColor: C.gris,  ...sensor('/amdcpu/0/power/0', 'CPU W', 90, 110) }),

  b(10, { label: 'SONANDO', bgColor: C.verde,   widget: 'now-playing', action: { type: 'media-play-pause' } }),
  b(11, { label: 'TOMAS',   bgColor: C.violeta, widget: 'variable', varWidget: { varName: 'tomas', suffix: 'TOMAS' }, action: { type: 'incr-var', varName: 'tomas', varDelta: 1 } }),
  b(12, { label: 'ANTERIOR', bgColor: C.gris,   action: { type: 'media-prev' } }),
  b(13, { label: 'PAUSA',    bgColor: C.gris,   action: { type: 'media-play-pause' } }),
  b(14, { label: 'SIGUIENTE', bgColor: C.gris,  action: { type: 'media-next' } }),

  b(15, { label: 'CÓDIGO',  brandIcon: 'vscode',   bgColor: C.azul,  action: { type: 'app', appPath: 'C:\\Program Files\\Microsoft VS Code\\Code.exe' } }),
  b(16, { label: 'NOTAS',   brandIcon: 'obsidian', bgColor: C.violeta, action: { type: 'app', appPath: 'C:\\Program Files\\Obsidian\\Obsidian.exe' } }),
  b(17, { label: 'CASCOS',  icon: '🎧',            bgColor: C.teal,  action: { type: 'audio-device', deviceName: 'Auriculares' } }),
  b(18, { label: 'MUDO',    bgColor: C.ambar,      isToggle: true, action: { type: 'mute' } }),
  b(19, { label: 'LUCES',   icon: '💡',            bgColor: C.gris,  isToggle: true, action: { type: 'rgb-preset', rgbPresetId: 'work' } }),
];

const paginaDeck = { id: 'main', name: 'STREAM', gridSize: 4, gridRows: 4 };
const paginaMesa = { id: 'main', name: 'MESA', gridSize: 5, gridRows: 4 };

/**
 * Las seis escenas.
 *
 * `pasos` es lo que hay que hacer con el ratón después de arrancar; los
 * ejecuta `capturar.mjs` con `Input.dispatchMouseEvent`, que son eventos de
 * entrada de verdad: los sintéticos de React no valen aquí.
 */
export const ESCENAS = [
  {
    archivo: '01-deck.png',
    titulo: 'La rejilla del deck, 4×4',
    ancho: 1280, alto: 720, escala: 1.5,
    // El panel de música va encendido en esta y solo en esta: una rejilla de
    // 4×4 con casillas cuadradas deja franjas vacías a los lados de una
    // pantalla 16:9, y el panel las ocupa enseñando algo en vez de nada.
    config: base({
      pages: [paginaDeck], buttons: DECK, toggledIds: ['0-0', '0-12'],
      musicPanel: { enabled: true, side: 'left' },
    }),
    pasos: [],
  },
  {
    archivo: '02-editor.png',
    titulo: 'El editor, paso 1: qué hace el botón',
    ancho: 1280, alto: 720, escala: 1.5,
    config: base({ pages: [paginaDeck], buttons: DECK.slice(0, 12), toggledIds: ['0-0'] }),
    // La casilla 13 está vacía, y un clic en una casilla vacía abre el editor.
    // El diálogo tal y como se abre, sin desplazarlo. Se probó subirlo para
    // meter más filas de tipos de acción en los dos tercios de arriba y sale
    // peor: los presets quedan cortados a media casilla y la captura parece
    // mal encuadrada. Así se ven los presets enteros, el rótulo «TIPO DE
    // ACCIÓN» y sus dos primeras filas por encima de la franja que tapa la
    // Store.
    pasos: [{ hacer: 'clicEnCasillaVacia' }, { hacer: 'esperar', ms: 700 }],
  },
  {
    archivo: '03-kiosko.png',
    titulo: 'Modo kiosko: sin barra, casillas grandes',
    ancho: 1280, alto: 720, escala: 1.5,
    // Dos páginas para que el selector de la columna izquierda enseñe para
    // qué está: con una sola salía una barra suelta con un «1» dentro.
    config: base({
      pages: [paginaDeck, { id: 'p2', name: 'LUCES', gridSize: 4, gridRows: 4 }],
      buttons: DECK, toggledIds: ['0-0', '0-13'],
      tileMode: 'fill',
    }),
    pasos: [
      { hacer: 'clicEnTexto', texto: '⤢' },
      { hacer: 'esperar', ms: 900 },
      { hacer: 'clicEnTexto', texto: 'KIOSKO' },
      { hacer: 'esperar', ms: 900 },
    ],
  },
  {
    archivo: '04-barra-lateral.png',
    titulo: 'Reloj, clima y sensores en la barra lateral',
    ancho: 1280, alto: 720, escala: 1.5,
    config: base({ pages: [paginaMesa], buttons: MESA, toggledIds: ['0-19'] }),
    pasos: [],
  },
  {
    archivo: '05-rgb.png',
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
      { hacer: 'clicEnTexto', texto: 'MOSTRAR' },
      { hacer: 'esperar', ms: 900 },
    ],
  },
  {
    archivo: '06-galeria.png',
    titulo: 'La galería de perfiles, con el aviso de riesgo desplegado',
    ancho: 1120, alto: 630, escala: 1.7142857142857142,
    config: base({ pages: [paginaDeck], buttons: DECK }),
    pasos: [{ hacer: 'abrirGaleriaConRiesgo' }],
  },
  {
    archivo: '07-barra-flotante.png',
    titulo: 'La barra flotante, por encima de la ventana de debajo',
    ancho: 1280, alto: 720, escala: 1.5,
    // Esta es la única con dos ventanas, y por eso pide dos cosas que las
    // demás no:
    //
    // · La pantalla de X mide **exactamente** lo que la vista, y la ventana
    //   del deck se siembra ocupándola entera (`ventana`). El proceso
    //   principal coloca la barra con `screen.getPrimaryDisplay().workArea`,
    //   así que si la pantalla no coincide con lo que se fotografía, la
    //   columna sale pegada a un borde que no está en la imagen.
    // · `compuesta` le dice al guion que junte las dos ventanas por sus
    //   coordenadas reales. Ver `capturarCompuesta` en `capturar.mjs`.
    pantalla: { ancho: 1280, alto: 720 },
    ventana: { x: 0, y: 0, width: 1280, height: 720 },
    compuesta: true,
    config: base({
      pages: [paginaDeck], buttons: DECK, toggledIds: ['0-0', '0-12'],
      // Seis tiles, y ninguno con widget: la barra no sondea los datos en
      // vivo —no importa `useDatosWidget`—, así que un botón de reloj o de
      // sensor saldría ahí con el icono de su acción y no con su lectura.
      // Casillas de la rejilla hasta el borde: así la columna flotante queda
      // claramente **encima de botones**, que es lo que hay que ver.
      tileMode: 'fill',
      // 80 px y no los 64 de fábrica: a 64 las etiquetas de dos palabras se
      // cortan («SILENC…», «LUZ JU…») y en una captura eso se lee como un
      // defecto. Sigue dentro del rango que admite la aplicación (40–120).
      floatingBar: {
        enabled: true,
        slots: ['0-0', '0-2', '0-5', '0-10', '0-11', '0-12'],
        side: 'right', tileSize: 80, y: null, opacity: 0.9,
      },
    }),
    // La barra lateral del deck se recoge: con ella puesta, la columna
    // flotante caía justo encima de las tarjetas de sensores y los números
    // salían cortados por la mitad, que parece un fallo de dibujado en vez de
    // una ventana por delante de otra.
    pasos: [{ hacer: 'clicEnTitulo', titulo: 'Ocultar panel' }, { hacer: 'esperar', ms: 900 }],
  },
];
