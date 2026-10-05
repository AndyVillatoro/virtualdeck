/**
 * El mando móvil (1.1): la página que sirve el servidor local en `/`.
 *
 * Página web ligera sin dependencias ni build. Estética DOT / 480 OLED Micro Interface:
 * mono, mayúsculas, grilla de 4 px, sin emojis. Los colores y acento reflejan
 * el tema del usuario (oscuro, claro o sistema según prefers-color-scheme).
 */

const TEXTOS = {
  es: {
    titulo: 'VIRTUALDECK',
    pedirCodigo: 'ESCRIBA EL CÓDIGO DE SEIS CIFRAS QUE APARECE EN VIRTUALDECK',
    emparejar: 'EMPAREJAR', codigoMal: 'EL CÓDIGO NO VALE O YA CADUCÓ.',
    sinBotones: 'NO HAY BOTONES CON ACCIÓN EN ESTE DECK.', reintentar: 'REINTENTAR',
    sinConexion: 'SIN CONEXIÓN CON VIRTUALDECK.', olvidar: 'DESCONECTAR',
    pagina: 'PÁGINA', pantallaCompleta: 'PANTALLA COMPLETA',
    salirPantallaCompleta: 'SALIR DE PANTALLA COMPLETA', volumen: 'VOL', brillo: 'BRILLO',
  },
  en: {
    titulo: 'VIRTUALDECK',
    pedirCodigo: 'ENTER THE SIX-DIGIT CODE SHOWN IN VIRTUALDECK',
    emparejar: 'PAIR', codigoMal: 'THAT CODE IS WRONG OR HAS EXPIRED.',
    sinBotones: 'THIS DECK HAS NO BUTTONS WITH AN ACTION.', reintentar: 'RETRY',
    sinConexion: 'NO CONNECTION TO VIRTUALDECK.', olvidar: 'DISCONNECT',
    pagina: 'PAGE', pantallaCompleta: 'FULLSCREEN',
    salirPantallaCompleta: 'EXIT FULLSCREEN', volumen: 'VOL', brillo: 'BRIGHTNESS',
  },
};

export interface DatosTemaMando {
  theme?: 'dark' | 'light' | 'dot480' | 'system';
  accent?: string;
}

export function paginaMando(nonceScript: string, nonceEstilo: string, datosTema?: DatosTemaMando): string {
  const modo = datosTema?.theme ?? 'dark';
  const acento = datosTema?.accent || (modo === 'dot480' ? '#ff3b30' : '#4a8ef0');
  const temaInicial = modo === 'system' ? 'system' : modo === 'light' ? 'light' : 'dark';
  const colorScheme = modo === 'system' ? 'dark light' : modo === 'light' ? 'light' : 'dark';
  const metaThemeColor = modo === 'light' ? '#d8dbe0' : '#070809';

  return `<!doctype html>
<html lang="es" data-theme="${temaInicial}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="${colorScheme}">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="mobile-web-app-capable" content="yes">
<meta id="meta-theme-color" name="theme-color" content="${metaThemeColor}">
<title>VirtualDeck</title>
<style nonce="${nonceEstilo}">
  :root {
    --bg: #070809; --sup: #111315; --alt: #181b1e; --bor: #26292e;
    --txt: #e6e8eb; --ten: #8e929b; --ac: ${acento}; --ac-bg: ${acento}26; --btn-txt: #070809;
    --rotulo-bg: rgba(7, 8, 9, 0.85); --rotulo-bor: rgba(255, 255, 255, 0.08);
    --sub-bg: rgba(255, 255, 255, 0.05); --sub-bor: rgba(255, 255, 255, 0.08);
  }
  :root[data-theme="light"] {
    --bg: #d8dbe0; --sup: #cbcfd5; --alt: #c0c5cc; --bor: #9da4ae;
    --txt: #111418; --ten: #4d5560; --btn-txt: #111418;
    --rotulo-bg: rgba(203, 207, 213, 0.88); --rotulo-bor: rgba(0, 0, 0, 0.12);
    --sub-bg: rgba(0, 0, 0, 0.05); --sub-bor: rgba(0, 0, 0, 0.10);
  }
  :root[data-theme="dark"] {
    --bg: #070809; --sup: #111315; --alt: #181b1e; --bor: #26292e;
    --txt: #e6e8eb; --ten: #8e929b; --btn-txt: #070809;
    --rotulo-bg: rgba(7, 8, 9, 0.85); --rotulo-bor: rgba(255, 255, 255, 0.08);
    --sub-bg: rgba(255, 255, 255, 0.05); --sub-bor: rgba(255, 255, 255, 0.08);
  }
  @media (prefers-color-scheme: light) {
    :root[data-theme="system"] {
      --bg: #d8dbe0; --sup: #cbcfd5; --alt: #c0c5cc; --bor: #9da4ae;
      --txt: #111418; --ten: #4d5560; --btn-txt: #111418;
      --rotulo-bg: rgba(203, 207, 213, 0.88); --rotulo-bor: rgba(0, 0, 0, 0.12);
      --sub-bg: rgba(0, 0, 0, 0.05); --sub-bor: rgba(0, 0, 0, 0.10);
    }
  }
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  body {
    margin: 0; background: var(--bg); color: var(--txt);
    font-family: ui-monospace, "JetBrains Mono", SFMono-Regular, Menlo, monospace;
    padding: max(12px, env(safe-area-inset-top)) 12px max(12px, env(safe-area-inset-bottom));
    min-height: 100vh; display: flex; flex-direction: column; text-transform: uppercase;
  }
  input, button { font-family: inherit; text-transform: uppercase; }
  header { display: flex; align-items: center; justify-content: space-between; padding: 4px 0 12px; border-bottom: 1px solid var(--bor); margin-bottom: 12px; }
  .logo { display: flex; align-items: center; gap: 8px; letter-spacing: 2px; font-size: 12px; font-weight: 700; }
  .punto { width: 8px; height: 8px; border-radius: 50%; background: var(--ac); box-shadow: 0 0 8px var(--ac); }
  .cab-btn {
    background: var(--sup); border: 1px solid var(--bor); border-radius: 4px;
    color: var(--txt); font-size: 10px; padding: 4px 8px; cursor: pointer;
    display: inline-flex; align-items: center; justify-content: center; gap: 4px;
    min-width: 28px; min-height: 28px; transition: background 0.12s, border-color 0.12s;
  }
  .cab-btn:active { background: var(--alt); border-color: var(--ac); }
  .cab-acciones { display: flex; gap: 8px; align-items: center; }
  .rejilla { display: grid; grid-template-columns: repeat(auto-fill, minmax(88px, 1fr)); gap: 8px; padding-bottom: 24px; width: 100%; }
  .celda {
    aspect-ratio: 1; background: var(--alt); border: 1px solid var(--bor); border-radius: 4px;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    position: relative; overflow: hidden; user-select: none; cursor: pointer; box-shadow: 0 4px 8px rgba(0,0,0,0.35);
    transition: transform 0.08s ease, border-color 0.12s, box-shadow 0.12s;
  }
  .celda:active { transform: scale(0.94); border-color: var(--ac); box-shadow: 0 0 12px var(--ac); }
  .celda.ok { border-color: #22c55e !important; box-shadow: 0 0 12px rgba(34, 197, 94, 0.5) !important; }
  .celda.mal { border-color: #ef4444 !important; box-shadow: 0 0 12px rgba(239, 68, 68, 0.5) !important; }
  .pin-insignia { position: absolute; top: 4px; right: 4px; font-size: 8px; z-index: 3; opacity: 0.85; pointer-events: none; letter-spacing: 1px; color: var(--ac); font-weight: 700; }
  .mosaico-2x2 { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 4px; width: 100%; height: 100%; padding: 4px; }
  .sub-celda {
    background: var(--sub-bg); border: 1px solid var(--sub-bor); border-radius: 4px; display: flex; flex-direction: column;
    align-items: center; justify-content: center; overflow: hidden; cursor: pointer; position: relative; user-select: none;
    padding: 2px; transition: transform 0.08s ease, border-color 0.12s, box-shadow 0.12s;
  }
  .sub-celda:active { transform: scale(0.92); border-color: var(--ac); }
  .sub-celda.ok { border-color: #22c55e !important; box-shadow: 0 0 8px rgba(34, 197, 94, 0.4) !important; }
  .sub-celda.mal { border-color: #ef4444 !important; box-shadow: 0 0 8px rgba(239, 68, 68, 0.4) !important; }
  .sub-txt { font-size: 8px; font-weight: 700; max-width: 90%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 4px; pointer-events: none; letter-spacing: 0.5px; }
  .slider-celda { width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: space-between; padding: 8px; }
  .slider-cab { display: flex; align-items: center; justify-content: space-between; width: 100%; font-size: 8px; font-weight: 700; color: var(--ten); gap: 4px; }
  .slider-eti { display: inline-flex; align-items: center; gap: 4px; }
  .slider-val { font-size: 8px; font-weight: 700; color: var(--ac); }
  .slider-control { width: 100%; -webkit-appearance: none; appearance: none; height: 8px; border-radius: 4px; background: var(--sup); outline: none; margin: 8px 0; }
  .slider-control::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 16px; height: 16px; border-radius: 4px; background: var(--ac); cursor: pointer; box-shadow: 0 0 8px var(--ac); }
  .slider-control::-moz-range-thumb { width: 16px; height: 16px; border-radius: 4px; background: var(--ac); cursor: pointer; border: none; box-shadow: 0 0 8px var(--ac); }
  .fondo-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0.88; border-radius: inherit; pointer-events: none; }
  .icono-centro { font-size: 20px; line-height: 1; z-index: 1; font-weight: 700; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.6)); pointer-events: none; }
  .rotulo {
    position: absolute; bottom: 0; left: 0; right: 0; padding: 4px; background: var(--rotulo-bg);
    backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); border-top: 1px solid var(--rotulo-bor);
    border-radius: 0 0 4px 4px; display: flex; flex-direction: column; align-items: center; justify-content: center;
    text-align: center; pointer-events: none; z-index: 2;
  }
  .label-txt { font-size: 8px; font-weight: 700; letter-spacing: 0.5px; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sublabel-txt { font-size: 8px; color: var(--ten); letter-spacing: 0.5px; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }
  input { width: 100%; background: var(--sup); border: 1px solid var(--bor); border-radius: 4px; color: var(--txt); font-size: 24px; letter-spacing: 8px; text-align: center; padding: 12px; outline: none; margin-top: 12px; }
  input:focus { border-color: var(--ac); box-shadow: 0 0 8px var(--ac); }
  button.principal {
    width: 100%; margin-top: 12px; padding: 12px; background: var(--ac); border: none; border-radius: 4px;
    color: var(--btn-txt); font-size: 12px; font-weight: 700; letter-spacing: 2px; cursor: pointer; box-shadow: 0 4px 12px var(--ac-bg);
  }
  button.principal:active { transform: scale(0.98); }
  .paginas { display: flex; gap: 8px; overflow-x: auto; padding: 0 0 12px; scrollbar-width: none; }
  .paginas::-webkit-scrollbar { display: none; }
  .pest {
    flex: 0 0 auto; padding: 4px 12px; border: 1px solid var(--bor); background: var(--sup);
    border-radius: 4px; font-size: 8px; letter-spacing: 1px; color: var(--ten); cursor: pointer;
    font-weight: 700; transition: border-color 0.12s, color 0.12s, background 0.12s;
  }
  .pest.viva { border-color: var(--ac); color: var(--ac); background: var(--ac-bg); }
  p { font-size: 12px; line-height: 1.5; color: var(--ten); margin: 8px 0; }
  .mal { color: #ef4444; }
  #btn-olvidar { display: none; }
</style>
</head>
<body>
<header>
  <div class="logo"><span class="punto"></span><span id="titulo"></span></div>
  <div class="cab-acciones">
    <button id="btn-fullscreen" class="cab-btn"></button>
    <button id="btn-olvidar" class="cab-btn"></button>
  </div>
</header>
<div id="app"></div>
<script nonce="${nonceScript}">
const T = ${JSON.stringify(TEXTOS)};
const t = T[(navigator.language || 'es').slice(0,2) === 'es' ? 'es' : 'en'];
document.getElementById('titulo').textContent = t.titulo;
const btnFs = document.getElementById('btn-fullscreen');
const btnOlvidar = document.getElementById('btn-olvidar');

const G8 = {
  SPEAKER: [0x10,0x34,0x72,0xf1,0xf1,0x72,0x34,0x10], MUTE: [0x11,0x32,0x74,0xf8,0xf8,0x74,0x32,0x11],
  MIC: [0x3c,0x66,0x66,0x7e,0xbd,0x42,0x18,0x3c], WEATHER_SUN: [0x24,0x18,0xbd,0x7e,0x7e,0xbd,0x18,0x24],
  GEAR: [0x3c,0x66,0xdb,0xa5,0xa5,0xdb,0x66,0x3c], PLAY: [0x20,0x30,0x38,0x3c,0x3c,0x38,0x30,0x20],
  PAUSE: [0x66,0x66,0x66,0x66,0x66,0x66,0x66,0x66], NEXT: [0x44,0x64,0x74,0x7c,0x7c,0x74,0x64,0x44],
  PREV: [0x22,0x26,0x2e,0x3e,0x3e,0x2e,0x26,0x22], FULLSCREEN: [0xe7,0xc3,0x81,0,0,0x81,0xc3,0xe7],
  MINIMIZE: [0,0,0,0,0,0x7e,0x7e,0], CLOSE: [0xc3,0x66,0x3c,0x18,0x18,0x3c,0x66,0xc3],
  CHECK: [0,1,3,6,0x8c,0xd8,0x70,0x20], LOCK: [0x3c,0x66,0x66,0xff,0xff,0xe7,0xff,0xff],
  BOLT: [0x0c,0x18,0x30,0x7e,0x0c,0x18,0x30,0x60], WEB: [0x3c,0x7e,0xdb,0x99,0xff,0xdb,0x7e,0x3c],
  TERMINAL: [0x80,0xc0,0x60,0x30,0x60,0xc0,0x80,0x0f], CLOCK: [0x3c,0x42,0x91,0x9d,0x81,0x81,0x42,0x3c],
  STORAGE: [0x7e,0xbd,0x81,0x81,0xbd,0xbd,0xbd,0xff], CPU: [0x24,0x7e,0xc3,0xdb,0xdb,0xc3,0x7e,0x24],
  ARROW_UP: [0x18,0x3c,0x7e,0xdb,0x18,0x18,0x18,0x18], ARROW_DOWN: [0x18,0x18,0x18,0x18,0xdb,0x7e,0x3c,0x18],
  ARROW_LEFT: [0x10,0x30,0x70,0xff,0xff,0x70,0x30,0x10], ARROW_RIGHT: [0x08,0x0c,0x0e,0xff,0xff,0x0e,0x0c,0x08],
  ADD: [0x18,0x18,0x18,0xff,0xff,0x18,0x18,0x18], SUBTRACT: [0,0,0,0xff,0xff,0,0,0],
  EDIT: [6,0x0f,0x1e,0x3c,0x78,0xf0,0xe0,0x80], FOLDER: [0x70,0xfe,0x81,0x81,0x81,0x81,0xff,0],
  CODE: [4,0x44,0x88,0x89,0x91,0x52,0x20,0x20]
};

const ALIAS = {
  VOLUME: 'SPEAKER', VOL: 'SPEAKER', SUN: 'WEATHER_SUN', CONFIG: 'GEAR', SETTINGS: 'GEAR',
  '\\uD83D\\uDD0A': 'SPEAKER', '\\u2600': 'WEATHER_SUN', '\\u2699': 'GEAR', '\\u25B6': 'PLAY',
  '\\u23F8': 'PAUSE', '\\u23ED': 'NEXT', '\\u23EE': 'PREV', '\\uD83C\\uDF99': 'MIC', '\\uD83C\\uDF10': 'WEB',
  '\\uD83D\\uDD12': 'LOCK', '\\u26A1': 'BOLT', '\\uD83D\\uDCBE': 'STORAGE', '\\uD83D\\uDD32': 'CPU',
  '\\uD83D\\uDCCA': 'CPU', '\\uD83D\\uDCC1': 'FOLDER', '\\u25F7': 'CLOCK', '\\u2713': 'CHECK',
  '\\u2715': 'CLOSE', '\\u00D7': 'CLOSE', '\\u26F6': 'FULLSCREEN', '\\uD83D\\uDDD7': 'MINIMIZE',
};

let temaConfig = ${JSON.stringify(modo)};
let acentoConfig = ${JSON.stringify(acento)};

function aplicarTema(modoNuevo, acentoNuevo) {
  if (modoNuevo) temaConfig = modoNuevo;
  if (acentoNuevo) {
    acentoConfig = acentoNuevo;
    document.documentElement.style.setProperty('--ac', acentoConfig);
    document.documentElement.style.setProperty('--ac-bg', acentoConfig + '26');
  }
  let efectivo = temaConfig;
  if (temaConfig === 'system') {
    const esClaro = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    efectivo = esClaro ? 'light' : 'dark';
  } else if (temaConfig === 'dot480') {
    efectivo = 'dark';
  }
  document.documentElement.setAttribute('data-theme', efectivo);
  const metaTc = document.getElementById('meta-theme-color');
  if (metaTc) metaTc.setAttribute('content', efectivo === 'light' ? '#d8dbe0' : '#070809');
}

aplicarTema(temaConfig, acentoConfig);

if (window.matchMedia) {
  const mql = window.matchMedia('(prefers-color-scheme: light)');
  const onChangeScheme = () => { if (temaConfig === 'system') aplicarTema('system', acentoConfig); };
  if (mql.addEventListener) mql.addEventListener('change', onChangeScheme);
  else if (mql.addListener) mql.addListener(onChangeScheme);
}

function alternarFullscreen() {
  const doc = document;
  const el = doc.documentElement;
  const estaFs = doc.fullscreenElement || doc.webkitFullscreenElement;
  if (!estaFs) {
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  } else {
    if (doc.exitFullscreen) doc.exitFullscreen().catch(() => {});
    else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen();
  }
}

function actualizarBotonFs() {
  const doc = document;
  const estaFs = !!(doc.fullscreenElement || doc.webkitFullscreenElement);
  btnFs.title = estaFs ? t.salirPantallaCompleta : t.pantallaCompleta;
  while (btnFs.firstChild) btnFs.removeChild(btnFs.firstChild);
  btnFs.append(svgGlifo8(estaFs ? G8.MINIMIZE : G8.FULLSCREEN, 'currentColor', 12));
}

btnFs.onclick = alternarFullscreen;
document.addEventListener('fullscreenchange', actualizarBotonFs);
document.addEventListener('webkitfullscreenchange', actualizarBotonFs);
actualizarBotonFs();

btnOlvidar.title = t.olvidar;
while (btnOlvidar.firstChild) btnOlvidar.removeChild(btnOlvidar.firstChild);
btnOlvidar.append(svgGlifo8(G8.CLOSE, 'currentColor', 12));

const app = document.getElementById('app');
let token = null;
try { token = localStorage.getItem('vd-token'); } catch (e) { /* privado */ }
let paginaViva = 0;
btnOlvidar.onclick = olvidar;

const pedir = (ruta, opciones) => fetch(ruta, {
  ...opciones,
  headers: { 'X-VD-Token': token || '', ...(opciones && opciones.headers) },
});

// Las imágenes de /media/ piden el token como el resto de la API. Un <img src>
// no puede mandar la cabecera, así que se piden con fetch y se enseñan como
// blob: (la CSP lo permite); se guardan para no pedirlas en cada repintado.
const imagenesPedidas = new Map();
function ponerImagen(img, ruta) {
  if (!ruta.startsWith('/media/')) { img.src = ruta; return; }
  if (!imagenesPedidas.has(ruta)) {
    imagenesPedidas.set(ruta, pedir(ruta)
      .then((r) => (r.ok ? r.blob() : null))
      .then((b) => (b ? URL.createObjectURL(b) : null))
      .catch(() => null)
      .then((url) => {
        // Un fallo no se cachea para siempre: al cambiar de página (o al
        // recargar) se vuelve a intentar en vez de quedarse en la primera
        // petición, que pudo pillar el servidor aún arrancando.
        if (!url) imagenesPedidas.delete(ruta);
        return url;
      }));
  }
  imagenesPedidas.get(ruta).then((url) => { if (url) img.src = url; });
}

function vaciar() { while (app.firstChild) app.removeChild(app.firstChild); }
function nodo(tag, props, ...hijos) {
  const e = Object.assign(document.createElement(tag), props);
  for (const h of hijos) if (h) e.append(h);
  return e;
}

function svgGlifo8(filas, color, tam) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  const d = tam || 22;
  svg.setAttribute('viewBox', '0 0 28 28');
  svg.setAttribute('width', String(d));
  svg.setAttribute('height', String(d));
  svg.setAttribute('style', 'display:block;margin:auto;z-index:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.6));flex-shrink:0;');
  const relleno = typeof color === 'string' && color.length <= 40 && color ? color : 'currentColor';
  for (let y = 0; y < 8; y++) {
    const b = filas[y];
    const fila = (typeof b === 'number' && isFinite(b) ? Math.trunc(b) : 0) & 255;
    for (let x = 0; x < 8; x++) {
      if ((fila >> (7 - x)) & 1) {
        const p = document.createElementNS(NS, 'circle');
        p.setAttribute('cx', String(x * 3.2 + 2.8));
        p.setAttribute('cy', String(y * 3.2 + 2.8));
        p.setAttribute('r', '1.3');
        p.setAttribute('fill', relleno);
        svg.append(p);
      }
    }
  }
  return svg;
}

function svgGlifo57(filas, color) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 26 36');
  svg.setAttribute('width', '22');
  svg.setAttribute('height', '30');
  svg.setAttribute('style', 'display:block;margin:auto;z-index:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.8));flex-shrink:0;');
  const relleno = typeof color === 'string' && color.length <= 40 && color ? color : 'currentColor';
  for (let y = 0; y < 7; y++) {
    const bruta = filas[y];
    const fila = (typeof bruta === 'number' && isFinite(bruta) ? Math.trunc(bruta) : 0) & 31;
    for (let x = 0; x < 5; x++) {
      if ((fila >> (4 - x)) & 1) {
        const punto = document.createElementNS(NS, 'circle');
        punto.setAttribute('cx', String(x * 5 + 3));
        punto.setAttribute('cy', String(y * 5 + 3));
        punto.setAttribute('r', '1.8');
        punto.setAttribute('fill', relleno);
        svg.append(punto);
      }
    }
  }
  return svg;
}

function resolverIcono(icono, fgColor, tam) {
  if (!icono) return null;
  const k = String(icono).trim().toUpperCase();
  const c = ALIAS[k] || ALIAS[icono] || k;
  if (G8[c]) return svgGlifo8(G8[c], fgColor, tam);
  return nodo('span', { className: 'icono-centro', textContent: String(icono).slice(0, 4) });
}

function pantallaEmparejar(error) {
  btnOlvidar.style.display = 'none';
  vaciar();
  app.append(nodo('p', { textContent: t.pedirCodigo }));
  if (error) app.append(nodo('p', { className: 'mal', textContent: error }));
  const campo = nodo('input', { inputMode: 'numeric', maxLength: 6, autocomplete: 'off', placeholder: '······' });
  const boton = nodo('button', { className: 'principal', textContent: t.emparejar });
  const enviar = async () => {
    boton.disabled = true;
    try {
      const r = await fetch('/api/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: campo.value.trim() }),
      });
      const d = await r.json();
      if (!d.ok) return pantallaEmparejar(t.codigoMal);
      token = d.token;
      try { localStorage.setItem('vd-token', token); } catch (e) { /* modo privado */ }
      pantallaDeck();
    } catch (e) {
      pantallaEmparejar(t.sinConexion);
    } finally { boton.disabled = false; }
  };
  boton.onclick = enviar;
  campo.onkeydown = (e) => { if (e.key === 'Enter') enviar(); };
  app.append(campo, boton);
  campo.focus();
}

async function pantallaDeck() {
  btnOlvidar.style.display = 'inline-flex';
  let datos;
  try {
    const [rBtn, rTema] = await Promise.all([
      pedir('/api/buttons'),
      pedir('/api/tema').catch(() => null),
    ]);
    if (rBtn.status === 401) { olvidar(); return; }
    datos = await rBtn.json();
    if (rTema && rTema.ok) {
      const dt = await rTema.json();
      if (dt.ok && dt.theme) aplicarTema(dt.theme, dt.accent);
    }
  } catch (e) {
    vaciar();
    app.append(nodo('p', { className: 'mal', textContent: t.sinConexion }),
               nodo('button', { className: 'principal', textContent: t.reintentar, onclick: pantallaDeck }));
    return;
  }
  const botones = datos.buttons || [];
  vaciar();
  const paginas = [...new Set(botones.map((b) => b.page))].sort((a, b) => a - b);
  if (paginas.length > 0 && !paginas.includes(paginaViva)) {
    paginaViva = paginas[0];
  }
  if (paginas.length > 1) {
    const barra = nodo('div', { className: 'paginas' });
    paginas.forEach((p, idx) => {
      barra.append(nodo('div', {
        className: 'pest' + (p === paginaViva ? ' viva' : ''),
        textContent: t.pagina + ' ' + (idx + 1),
        onclick: () => { paginaViva = p; pantallaDeck(); },
      }));
    });
    app.append(barra);
  }
  const rejilla = nodo('div', { className: 'rejilla' });
  const visibles = botones.filter((b) => paginas.length <= 1 || b.page === paginaViva || b.fijo);
  if (visibles.length === 0) app.append(nodo('p', { textContent: t.sinBotones }));
  const esClaro = document.documentElement.getAttribute('data-theme') === 'light';

  for (const b of visibles) {
    const celda = nodo('div', { className: 'celda' });
    let colorFrente = b.fgColor;
    if (esClaro && colorFrente && colorFrente.toLowerCase() === '#ffffff') colorFrente = '#111418';
    if (b.bgColor) celda.style.backgroundColor = b.bgColor;
    if (colorFrente) celda.style.color = colorFrente;

    if (b.fijo) {
      celda.append(nodo('span', { className: 'pin-insignia', textContent: '•PIN•' }));
    }

    if (b.subButtons && b.subButtons.length === 4) {
      celda.style.cursor = 'default';
      const m2x2 = nodo('div', { className: 'mosaico-2x2' });
      for (const sub of b.subButtons) {
        const sc = nodo('div', { className: 'sub-celda' });
        let subFrente = sub.fgColor;
        if (esClaro && subFrente && subFrente.toLowerCase() === '#ffffff') subFrente = '#111418';
        if (sub.bgColor) sc.style.backgroundColor = sub.bgColor;
        if (subFrente) sc.style.color = subFrente;
        const icoEl = resolverIcono(sub.icon || sub.dotGlyph, subFrente, 12);
        if (icoEl && (sub.icon || sub.dotGlyph) !== sub.label) sc.append(icoEl);
        if (sub.label) sc.append(nodo('span', { className: 'sub-txt', textContent: sub.label }));
        sc.onclick = async (e) => {
          e.stopPropagation();
          if ('vibrate' in navigator) { try { navigator.vibrate(25); } catch (err) {} }
          let ok = false;
          try { ok = (await pedir('/api/press/' + encodeURIComponent(sub.id))).ok; } catch (err) { ok = false; }
          sc.classList.add(ok ? 'ok' : 'mal');
          setTimeout(() => sc.classList.remove('ok', 'mal'), 300);
        };
        m2x2.append(sc);
      }
      celda.append(m2x2);
      rejilla.append(celda);
      continue;
    }

    if (b.widget === 'slider' || b.sliderWidget) {
      celda.style.cursor = 'default';
      const sw = b.sliderWidget || { target: 'volume', min: 0, max: 100, step: 2 };
      const target = sw.target || 'volume';
      const min = sw.min ?? 0;
      const max = sw.max ?? 100;
      const step = sw.step ?? (target === 'variable' ? 1 : 5);
      const sc = nodo('div', { className: 'slider-celda' });
      const cab = nodo('div', { className: 'slider-cab' });
      const gly = target === 'volume' ? G8.SPEAKER : target === 'brightness' ? G8.WEATHER_SUN : G8.CPU;
      const eti = sw.label || (target === 'volume' ? t.volumen : target === 'brightness' ? t.brillo : (sw.varName || 'VAR'));
      const cabEti = nodo('span', { className: 'slider-eti' });
      if (gly) cabEti.append(svgGlifo8(gly, 'currentColor', 10));
      cabEti.append(document.createTextNode(' ' + eti));
      cab.append(cabEti);
      const valSpan = nodo('span', { className: 'slider-val', textContent: '50%' });
      cab.append(valSpan);
      sc.append(cab);

      const range = nodo('input', {
        type: 'range',
        className: 'slider-control',
        min: String(min),
        max: String(max),
        step: String(step),
        value: '50',
      });

      if (target === 'volume' || target === 'brightness') {
        pedir('/api/value/' + target).then((r) => r.json()).then((d) => {
          if (d.ok && typeof d.value === 'number') {
            range.value = String(d.value);
            valSpan.textContent = d.value + '%';
          }
        }).catch(() => {});
      }

      let timerSlider = null;
      range.oninput = () => {
        valSpan.textContent = range.value + (target === 'variable' ? '' : '%');
        if (timerSlider) clearTimeout(timerSlider);
        timerSlider = setTimeout(() => {
          if (target === 'volume' || target === 'brightness') {
            pedir('/api/value/' + target, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ value: parseFloat(range.value) }),
            }).catch(() => {});
          }
        }, 60);
      };
      range.onclick = (e) => e.stopPropagation();
      sc.append(range);
      celda.append(sc);
      rejilla.append(celda);
      continue;
    }

    if (b.imageData) {
      const img = nodo('img', { className: 'fondo-img', alt: '' });
      ponerImagen(img, b.imageData);
      celda.append(img);
    }

    if (b.customGlyph57 && b.customGlyph57.length === 7) {
      const wrap = nodo('div');
      wrap.append(svgGlifo57(b.customGlyph57, colorFrente));
      celda.append(wrap);
    } else if (b.icon) {
      const icoEl = resolverIcono(b.icon, colorFrente, 22);
      if (icoEl) celda.append(icoEl);
    }

    if (b.label || b.sublabel) {
      const rotulo = nodo('div', { className: 'rotulo' });
      if (b.label) rotulo.append(nodo('span', { className: 'label-txt', textContent: b.label }));
      if (b.sublabel) rotulo.append(nodo('span', { className: 'sublabel-txt', textContent: b.sublabel }));
      celda.append(rotulo);
    }

    celda.onclick = async () => {
      if ('vibrate' in navigator) {
        try { navigator.vibrate(30); } catch (e) {}
      }
      let ok = false;
      try { ok = (await pedir('/api/press/' + encodeURIComponent(b.id))).ok; } catch (e) { ok = false; }
      celda.classList.add(ok ? 'ok' : 'mal');
      setTimeout(() => celda.classList.remove('ok', 'mal'), 350);
    };
    rejilla.append(celda);
  }
  app.append(rejilla);
}

function olvidar() {
  token = null;
  try { localStorage.removeItem('vd-token'); } catch (e) { /* modo privado */ }
  pantallaEmparejar();
}

if (token) pantallaDeck(); else pantallaEmparejar();
</script>
</body>
</html>`;
}
