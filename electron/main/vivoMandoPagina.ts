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
 */
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
