/**
 * El arranque del guion de la página del mando móvil, como texto para incrustar:
 * el tema y su meta, la pantalla completa, el pintor genérico de puntos, el
 * contraste de respaldo y el centro de cada botón.
 *
 * Vive aquí y no en `paginaMando.ts` para que ese archivo (los datos de tema y
 * la composición) quepa en el tope del proyecto: es código de la página (sin
 * tipos, con `var`), no del servidor, y `plantillaMandoPagina` lo interpola
 * dentro del script que lleva el nonce. Por eso el cuerpo no lleva ni comillas
 * invertidas ni interpolaciones propias: romperían el literal que lo contiene.
 * Los cuatro bloques que sí se interpolan (`JS_ANIMACION_MANDO`,
 * `JS_VIVO_MANDO`, `JS_SLIDER_MANDO` y `JS_TACTIL_MANDO`) llegan de sus
 * archivos, igual que antes.
 */
import { JS_ANIMACION_MANDO } from './animacionMandoPagina';
import { JS_VIVO_MANDO, JS_SLIDER_MANDO } from './vivoMandoPagina';
import { JS_TACTIL_MANDO } from './tactilMandoPagina';

/** Lo que `paginaMando` ya resolvió y el guion solo tiene que serializar. */
export interface DatosGuionMando {
  /** `JSON.stringify(TEXTOS)`: las dos mitades del diccionario. */
  textosJson: string;
  /** `JSON.stringify(cromo)`: los glifos fijos del cromo, como filas 8×8. */
  cromoJson: string;
  /** `JSON.stringify(modo)`: el tema configurado (`dark`, `light`, `system` o `dot480`). */
  modoJson: string;
  /** `JSON.stringify(acento)`: el acento ya resuelto. */
  acentoJson: string;
  /** El motor DOT incrustado (sin la secuencia de cierre de script), o vacío. */
  motorJs: string;
}

/** El guion de arranque de la página, terminado en salto de línea. */
export function guionMandoPagina(d: DatosGuionMando): string {
  return `const T = ${d.textosJson};
const t = T[(navigator.language || 'es').slice(0,2) === 'es' ? 'es' : 'en'];

// El motor DOT, tal cual sale del archivo (sin el no hay animacion, y los
// iconos se quedan estaticos). Va dentro de este script por la CSP: la
// pagina no admite otro. No puede traer la secuencia de cierre de script.
${d.motorJs}
var HAY_MOTOR = (typeof globalThis.EfectosPuntos === 'object' && globalThis.EfectosPuntos) || null;
var REDUCIDO = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
document.getElementById('titulo').textContent = t.titulo;
const btnFs = document.getElementById('btn-fullscreen');
const btnOlvidar = document.getElementById('btn-olvidar');

const CROMO = ${d.cromoJson};

let temaConfig = ${d.modoJson};
let acentoConfig = ${d.acentoJson};

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
  const fsEl = svgPuntos({ lado: 8, filas: estaFs ? CROMO.MINIMIZE : CROMO.FULLSCREEN }, 'currentColor', 12);
  if (fsEl) btnFs.append(fsEl);
}

btnFs.onclick = alternarFullscreen;
document.addEventListener('fullscreenchange', actualizarBotonFs);
document.addEventListener('webkitfullscreenchange', actualizarBotonFs);
actualizarBotonFs();

btnOlvidar.title = t.olvidar;
while (btnOlvidar.firstChild) btnOlvidar.removeChild(btnOlvidar.firstChild);
const olvidarEl = svgPuntos({ lado: 8, filas: CROMO.CLOSE }, 'currentColor', 12);
if (olvidarEl) btnOlvidar.append(olvidarEl);

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

// Dibuja los puntos que manda el servidor (puntos: lado 8 o 16, filas).
// El servidor los resuelve con los datos compartidos; aquí no hay tabla de
// glifos: solo este pintor genérico. El 16×16 usa el mismo paso que el 8×8,
// así que el punto mide lo mismo y el icono sale al doble de tamaño.
// «celdas» recoge cada círculo con su (x, y) para la animación.
function svgPuntos(puntos, color, tam, celdas) {
  const lado = puntos && puntos.lado === 16 ? 16 : 8;
  const filas = puntos && puntos.filas;
  if (!Array.isArray(filas) || filas.length !== lado) return null;
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  const d = tam || 22;
  svg.setAttribute('viewBox', '0 0 ' + (lado * 3.2 + 2.4) + ' ' + (lado * 3.2 + 2.4));
  svg.setAttribute('width', String(d));
  svg.setAttribute('height', String(d));
  svg.setAttribute('style', 'display:block;margin:auto;z-index:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.6));flex-shrink:0;');
  const relleno = typeof color === 'string' && color.length <= 40 && color ? color : 'currentColor';
  const mascara = lado === 16 ? 65535 : 255;
  for (let y = 0; y < lado; y++) {
    const b = filas[y];
    const fila = (typeof b === 'number' && isFinite(b) ? Math.trunc(b) : 0) & mascara;
    for (let x = 0; x < lado; x++) {
      if ((fila >> ((lado - 1) - x)) & 1) {
        const p = document.createElementNS(NS, 'circle');
        p.setAttribute('cx', String(x * 3.2 + 2.8));
        p.setAttribute('cy', String(y * 3.2 + 2.8));
        p.setAttribute('r', '1.3');
        p.setAttribute('fill', relleno);
        svg.append(p);
        if (celdas) celdas.push({ el: p, x: x, y: y });
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

// Contraste automático sobre un fondo propio (roadmap 102), la misma regla
// que la celda (src/comun/contraste.ts, del que el servidor ya trae el
// fgColor resuelto en iconosMando.ts con el canonico textoSobre): aquí es
// el respaldo por si llega un botón con bgColor y sin fgColor. Va dentro del
// literal porque corre en el telefono, que no puede importar el modulo:
// MANTENER SINCRONIZADO con textoSobre (umbral 0.22, pesos
// 0.2126/0.7152/0.0722, linealizado 0.03928/12.92 con exponente 2.4,
// #rgb/#rrggbb/#rrggbbaa y rgb()/rgba(), y oscuro ante lo
// irreconocible). Sin backticks ni interpolaciones: va dentro del literal.
// Con alfa (#rrggbbaa, rgba()), se usa el color tal cual.
function textoSobreMovil(c) {
  var OSCURO = '#070809';
  var CLARO = '#e6e8eb';
  if (typeof c !== 'string') return OSCURO;
  var s = c.trim();
  var r = -1;
  var g = -1;
  var b = -1;
  var m = /^#?([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(s);
  if (m) {
    var h = m[1];
    if (h.length === 3) h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2);
    r = parseInt(h.slice(0, 2), 16);
    g = parseInt(h.slice(2, 4), 16);
    b = parseInt(h.slice(4, 6), 16);
  } else {
    var low = s.toLowerCase();
    var esRgb = low.indexOf('rgb(') === 0 || low.indexOf('rgba(') === 0;
    if (!esRgb || s.charAt(s.length - 1) !== ')') return OSCURO;
    var partes = s.slice(s.indexOf('(') + 1, -1).split(',');
    if (partes.length < 3 || partes.length > 4) return OSCURO;
    r = parseFloat(partes[0]);
    g = parseFloat(partes[1]);
    b = parseFloat(partes[2]);
    if (!isFinite(r) || !isFinite(g) || !isFinite(b)) return OSCURO;
    if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) return OSCURO;
  }
  var lin = function (v) { return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  var lum = 0.2126 * lin(r / 255) + 0.7152 * lin(g / 255) + 0.0722 * lin(b / 255);
  return lum > 0.22 ? OSCURO : CLARO;
}

// El centro de un botón del móvil, en el mismo orden que la celda: dibujo
// 5x7 propio (lo decide quien llama), texto si el icono no era glifo, y si
// no los puntos que resolvió el servidor (catálogo 16x16, glifo por nombre
// o tipo de acción).
function dibujarIconoBoton(b, fgColor, tam, celdas) {
  if (b.iconTexto) return nodo('span', { className: 'icono-centro', textContent: String(b.iconTexto).slice(0, 4) });
  if (b.puntos) return svgPuntos(b.puntos, fgColor, tam, celdas);
  return null;
}

// Animación de puntos con el motor DOT: un solo rAF para toda la página,
// solo mientras haya algo animándose. Cada entrada guarda sus círculos; la
// continua sale de la animación del botón («siempre», o «encendido» estando
// encendido) y el pulso del efecto al pulsar al tocar (ausente = destello).
// Vive en iconosMando (JS_ANIMACION_MANDO) para no pasar el tope de
// líneas de este archivo: es código de la página, no del servidor.
${JS_ANIMACION_MANDO}

// El refresco vivo (botones + widgets cada 3 s) y el deslizador de puntos
// viven en vivoMandoPagina por lo mismo: este archivo ya va cargado.
${JS_VIVO_MANDO}
${JS_SLIDER_MANDO}
${JS_TACTIL_MANDO}
`;
}
