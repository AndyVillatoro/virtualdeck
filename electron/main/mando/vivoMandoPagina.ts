/**
 * Lo vivo de la página del mando móvil, como texto para incrustar.
 *
 * Vive aquí y no en `paginaMando.ts` porque ese archivo ya va cargado (más de
 * 600 líneas): es código de la página (sin tipos, con `var`), no del servidor,
 * y `paginaMando` lo interpola dentro del script que lleva el nonce. Por eso
 * no lleva ni comillas invertidas ni interpolaciones: romperían el literal
 * que lo contiene. Igual que `JS_ANIMACION_MANDO` en `iconosMando.ts`.
 *
 * Dos trabajos, cada 3 s y solo con la página visible (0,67 peticiones por
 * segundo de media, por debajo del tope de una por segundo):
 *
 * - botones: si `/api/buttons` cambió (visibilidad, etiqueta interpolada,
 *   interruptores), se redibuja la rejilla; si no, no se toca nada para no
 *   interrumpir un slider a medias;
 * - widgets: `/api/widgets` se pinta en su sitio, sin redibujar.
 *
 * También vive aquí el deslizador de puntos del mando (roadmap 101): antes
 * era un `<input type="range">` que ignoraba `orientation`; ahora pinta
 * segmentos de 3 puntos redondos (columnas en horizontal, filas en vertical),
 * respeta la orientación del widget y usa las variables CSS del tema, así
 * que el punto apagado se ve también en modo claro. Mismas reglas que el
 * resto del bloque: sin backticks ni interpolaciones.
 */
export const JS_SLIDER_MANDO = `
function sliderPuntosMovil(opts) {
  var target = opts.target;
  var min = opts.min;
  var max = opts.max;
  var step = opts.step;
  var vertical = opts.orientation === 'vertical';
  var valSpan = opts.valSpan;
  var segmentos = vertical ? 12 : 16;
  var pista = document.createElement('div');
  pista.className = 'slider-pista';
  pista.style.flex = '1';
  pista.style.width = '100%';
  pista.style.display = 'flex';
  pista.style.flexDirection = vertical ? 'column-reverse' : 'row';
  pista.style.alignItems = 'center';
  pista.style.justifyContent = 'space-between';
  pista.style.gap = '3px';
  pista.style.padding = '4px 2px';
  pista.style.touchAction = 'none';
  pista.style.userSelect = 'none';
  pista.style.webkitUserSelect = 'none';
  pista.style.cursor = vertical ? 'ns-resize' : 'ew-resize';
  var puntos = [];
  var i;
  var j;
  for (i = 0; i < segmentos; i++) {
    var seg = document.createElement('div');
    seg.style.flex = '1';
    seg.style.display = 'flex';
    seg.style.justifyContent = 'space-between';
    seg.style.alignItems = 'center';
    seg.style.pointerEvents = 'none';
    if (vertical) { seg.style.width = '16px'; seg.style.flexDirection = 'row'; }
    else { seg.style.height = '16px'; seg.style.flexDirection = 'column'; }
    for (j = 0; j < 3; j++) {
      var p = document.createElement('div');
      p.style.width = '3.5px';
      p.style.height = '3.5px';
      p.style.borderRadius = '50%';
      p.style.background = 'var(--sub-bor)';
      p.style.transition = 'background 0.06s ease';
      seg.appendChild(p);
      puntos.push(p);
    }
    pista.appendChild(seg);
  }
  var valor = Math.max(min, Math.min(max, 50));
  function pintar(v) {
    var rango = max - min;
    var ratio = rango > 0 ? (v - min) / rango : 0;
    if (ratio < 0) ratio = 0;
    if (ratio > 1) ratio = 1;
    var activos = Math.round(ratio * segmentos);
    for (var s = 0; s < segmentos; s++) {
      var encendido = s < activos;
      var puntero = s === activos - 1;
      var color = encendido ? (puntero ? 'var(--txt)' : 'var(--ac)') : 'var(--sub-bor)';
      for (var k = 0; k < 3; k++) puntos[s * 3 + k].style.background = color;
    }
    valSpan.textContent = Math.round(v) + (target === 'variable' ? '' : '%');
  }
  function valorDe(ev) {
    var r = pista.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return null;
    var ratio = vertical ? (r.bottom - ev.clientY) / r.height : (ev.clientX - r.left) / r.width;
    if (ratio < 0) ratio = 0;
    if (ratio > 1) ratio = 1;
    var v = Math.round((min + ratio * (max - min)) / step) * step;
    return Math.max(min, Math.min(max, v));
  }
  var timerEnvio = null;
  function enviar(v) {
    if (target !== 'volume' && target !== 'brightness') return;
    pedir('/api/value/' + target, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: v }),
    }).catch(function () {});
  }
  function enviarSuave(v, forzar) {
    if (timerEnvio) { clearTimeout(timerEnvio); timerEnvio = null; }
    if (forzar) { enviar(v); return; }
    timerEnvio = setTimeout(function () { timerEnvio = null; enviar(valor); }, 60);
  }
  var arrastrando = false;
  pista.addEventListener('pointerdown', function (ev) {
    ev.stopPropagation();
    arrastrando = true;
    try { pista.setPointerCapture(ev.pointerId); } catch (e) { /* sin captura */ }
    var v = valorDe(ev);
    if (v === null) return;
    valor = v; pintar(v); enviarSuave(v, false);
  });
  pista.addEventListener('pointermove', function (ev) {
    if (!arrastrando) return;
    ev.stopPropagation();
    var v = valorDe(ev);
    if (v === null) return;
    valor = v; pintar(v); enviarSuave(v, false);
  });
  function soltar(ev) {
    if (!arrastrando) return;
    ev.stopPropagation();
    arrastrando = false;
    try { pista.releasePointerCapture(ev.pointerId); } catch (e) { /* sin captura */ }
    var v = valorDe(ev);
    if (v !== null) { valor = v; pintar(v); }
    enviarSuave(valor, true);
  }
  pista.addEventListener('pointerup', soltar);
  pista.addEventListener('pointercancel', soltar);
  pintar(valor);
  if (target === 'volume' || target === 'brightness') {
    pedir('/api/value/' + target).then(function (r) { return r.json(); }).then(function (d) {
      if (d.ok && typeof d.value === 'number' && !arrastrando) { valor = d.value; pintar(valor); }
    }).catch(function () {});
  }
  return pista;
}
`;

export const JS_VIVO_MANDO = `
var ultimoBotonesVivo = '';
var intervaloVivo = 0;

function pintarWidgetsVivos(mapa) {
  var celdas = document.querySelectorAll('.celda[data-boton]');
  for (var i = 0; i < celdas.length; i++) {
    var celda = celdas[i];
    var id = celda.getAttribute('data-boton');
    var d = (id && mapa) ? mapa[id] : null;
    var slot = celda._slotWidget;
    if (!slot) continue;
    var icono = celda._nodoIcono;
    if (!d) {
      slot.style.display = 'none';
      if (icono) icono.style.display = '';
      continue;
    }
    while (slot.firstChild) slot.removeChild(slot.firstChild);
    var color = (d.tone === 'crit') ? '#ef4444' : (d.tone === 'warn' ? '#f59e0b' : 'currentColor');
    if (d.puntos) {
      var g = svgPuntos(d.puntos, color, 16);
      if (g) slot.append(g);
    }
    var l1 = document.createElement('div');
    l1.className = 'wl1';
    l1.style.color = color;
    l1.textContent = d.line1 || '';
    slot.append(l1);
    if (d.line2) {
      var l2 = document.createElement('div');
      l2.className = 'wl2';
      l2.textContent = d.line2;
      slot.append(l2);
    }
    slot.style.display = 'flex';
    if (icono) icono.style.display = 'none';
  }
}

function refrescarWidgetsVivos() {
  if (!token) return;
  pedir('/api/widgets').then(function (r) { return r.json(); }).then(function (d) {
    if (d && d.ok) pintarWidgetsVivos(d.widgets || {});
  }).catch(function () {});
}

function ticVivo() {
  if (document.hidden || !token) return;
  pedir('/api/buttons').then(function (r) { return r.json(); }).then(function (d) {
    var txt = JSON.stringify((d && d.buttons) || []);
    if (txt !== ultimoBotonesVivo) pantallaDeck();
  }).catch(function () {});
  refrescarWidgetsVivos();
}

function arrancarVivo() {
  if (intervaloVivo) { clearInterval(intervaloVivo); intervaloVivo = 0; }
  intervaloVivo = setInterval(ticVivo, 3000);
}
`;
