/**
 * El mando móvil (1.1): la página que sirve el servidor local en `/`.
 *
 * Página web ligera sin dependencias ni build. Estética DOT / 480 OLED Micro Interface:
 * mono, mayúsculas, grilla de 4 px, sin emojis. Los colores y acento reflejan
 * el tema del usuario (oscuro, claro o sistema según prefers-color-scheme).
 *
 * Los iconos de los botones llegan ya resueltos a puntos desde el servidor
 * (`iconosMando.ts`): la página solo los dibuja, sin tabla de glifos propia.
 * El cromo fijo (cabecera, sliders) se incrusta abajo desde el mismo
 * catálogo compartido, no copiado a mano.
 *
 * La animación (roadmap 78/79) usa el **mismo** motor que la celda
 * (`src/components/dot480/efectosPuntos.js`), incrustado tal cual dentro del
 * script con nonce (la CSP no admite otro script). Sin motor, iconos
 * estáticos. Un solo `requestAnimationFrame` para toda la página, solo
 * mientras haya algo animándose; con «reducir movimiento» no hay animación
 * continua, pero el destello de pulsar se queda.
 */
import { DOT_GLYPHS_8X8 } from '../../src/components/dot480/dotGlyphs8x8';
import { estiloPaginaMando } from './estiloMandoPagina';
import { JS_ANIMACION_MANDO } from './iconosMando';
import { JS_VIVO_MANDO } from './vivoMandoPagina';
import { JS_TACTIL_MANDO } from './tactilMandoPagina';

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

export function paginaMando(nonceScript: string, nonceEstilo: string, datosTema?: DatosTemaMando, motorJs?: string): string {
  const modo = datosTema?.theme ?? 'dark';
  const acento = datosTema?.accent || (modo === 'dot480' ? '#ff3b30' : '#4a8ef0');
  const temaInicial = modo === 'system' ? 'system' : modo === 'light' ? 'light' : 'dark';
  const colorScheme = modo === 'system' ? 'dark light' : modo === 'light' ? 'light' : 'dark';
  const metaThemeColor = modo === 'light' ? '#d8dbe0' : '#070809';
  // El cromo fijo de la página sale del catálogo compartido, serializado al
  // servirla: es el mismo dato que la celda, no una copia que mantener.
  const cromo: Record<string, number[]> = {};
  for (const nombre of ['FULLSCREEN', 'MINIMIZE', 'CLOSE', 'SPEAKER', 'WEATHER_SUN', 'CPU']) {
    cromo[nombre] = DOT_GLYPHS_8X8[nombre];
  }

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
${estiloPaginaMando(acento)}
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

// El motor DOT, tal cual sale del archivo (sin el no hay animacion, y los
// iconos se quedan estaticos). Va dentro de este script por la CSP: la
// pagina no admite otro. No puede traer la secuencia de cierre de script.
${motorJs || ''}
var HAY_MOTOR = (typeof globalThis.EfectosPuntos === 'object' && globalThis.EfectosPuntos) || null;
var REDUCIDO = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
document.getElementById('titulo').textContent = t.titulo;
const btnFs = document.getElementById('btn-fullscreen');
const btnOlvidar = document.getElementById('btn-olvidar');

const CROMO = ${JSON.stringify(cromo)};

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

// El refresco vivo (botones + widgets cada 3 s) vive en vivoMandoPagina por
// lo mismo: este archivo ya va cargado.
${JS_VIVO_MANDO}
${JS_TACTIL_MANDO}

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
  animadosMovil = [];
  // Lo que hay ahora: el tic vivo redibuja solo si esto cambia.
  ultimoBotonesVivo = JSON.stringify(botones);
  if (rafMovil) { cancelAnimationFrame(rafMovil); rafMovil = 0; }
  const paginas = [...new Set(botones.map((b) => b.page))].sort((a, b) => a - b);
  if (paginas.length > 0 && !paginas.includes(paginaViva)) {
    paginaViva = paginas[0];
  }
  if (paginas.length > 1) {
    const barra = nodo('div', { className: 'pestanas' });
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
    // Para pintar los widgets en su sitio sin redibujar la rejilla.
    celda.setAttribute('data-boton', b.id);
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
        const subCeldas = [];
        const icoEl = dibujarIconoBoton(sub, subFrente, 12, subCeldas);
        if (icoEl && (sub.icon || sub.dotGlyph) !== sub.label) sc.append(icoEl);
        if (sub.label) sc.append(nodo('span', { className: 'sub-txt', textContent: sub.label }));
        sc.onclick = async (e) => {
          e.stopPropagation();
          if ('vibrate' in navigator) { try { navigator.vibrate(25); } catch (err) {} }
          animarPulsoMovil(sub, sc, subCeldas);
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
      const gly = target === 'volume' ? CROMO.SPEAKER : target === 'brightness' ? CROMO.WEATHER_SUN : CROMO.CPU;
      const eti = sw.label || (target === 'volume' ? t.volumen : target === 'brightness' ? t.brillo : (sw.varName || 'VAR'));
      const cabEti = nodo('span', { className: 'slider-eti' });
      const glyEl = svgPuntos({ lado: 8, filas: gly }, 'currentColor', 10);
      if (glyEl) cabEti.append(glyEl);
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

    // La imagen propia gana a la marca, como en la celda (CapasDeFondo).
    // La marca llega ya resuelta como data URI (SVG autónomo con su animación
    // dentro): aquí solo se mete en un img, que la CSP admite.
    if (b.imageData) {
      const img = nodo('img', { className: 'fondo-img', alt: '' });
      ponerImagen(img, b.imageData);
      celda.append(img);
    } else if (b.marca) {
      celda.append(nodo('img', { className: 'marca-img', alt: '', src: b.marca }));
    }
    // Con marca de fondo el centro solo se pinta si hay icono explícito
    // (iconoSobreMarca), como CentroSobreFondo en la celda: si no, la marca
    // tapa el icono de puntos. Con imagen se queda como estaba.
    const marcaFondo = !b.imageData && !!b.marca;

    if (b.customGlyph57 && b.customGlyph57.length === 7 && !marcaFondo) {
      const wrap = nodo('div', { className: 'glifo57' });
      wrap.append(svgGlifo57(b.customGlyph57, colorFrente));
      celda.append(wrap);
      celda._nodoIcono = wrap;
    } else if ((b.iconTexto || b.puntos) && (!marcaFondo || b.iconoSobreMarca)) {
      const rejillaCeldas = [];
      const icoEl = dibujarIconoBoton(b, colorFrente, 22, rejillaCeldas);
      if (icoEl) celda.append(icoEl);
      celda._nodoIcono = icoEl || null;
      registrarAnimado(b, celda, rejillaCeldas);
      celda._rejillaCeldas = rejillaCeldas;
    } else {
      celda._nodoIcono = null;
    }
    // Hueco del widget en vivo: se rellena al llegar /api/widgets (y cada
    // 3 s), escondiendo el icono como hace la celda del deck.
    const slotW = nodo('div', { className: 'widget-vivo' });
    slotW.style.display = 'none';
    celda.append(slotW);
    celda._slotWidget = slotW;

    if (b.label || b.sublabel) {
      const rotulo = nodo('div', { className: 'rotulo' });
      if (b.label) rotulo.append(nodo('span', { className: 'label-txt', textContent: b.label }));
      if (b.sublabel) rotulo.append(nodo('span', { className: 'sublabel-txt', textContent: b.sublabel }));
      celda.append(rotulo);
    }

    // El toque normal y el largo comparten dispararPulsacionMando
    // (tactilMandoPagina.ts); solo las celdas con largo miden el tiempo.
    if (b.largo) engancharTactilLargo(celda, b);
    else celda.onclick = () => dispararPulsacionMando(b, celda, false);
    rejilla.append(celda);
  }
  app.append(rejilla);
  refrescarWidgetsVivos();
  arrancarVivo();
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
