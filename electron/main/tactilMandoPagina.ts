/**
 * Soporte de toque y pulsación larga en la página del mando móvil (roadmap 82).
 *
 * Vive aquí y no en `paginaMando.ts` para no pasar el tope de líneas de ese
 * archivo: es código de la página (sin tipos, con `var`), no del servidor,
 * y `paginaMando` lo interpola dentro del script que lleva el nonce. Por eso
 * no lleva ni comillas invertidas ni interpolaciones.
 *
 * Solo en celdas con `largo`: si pasan 500 ms con el dedo puesto, se dispara
 * la acción larga en ese momento y al soltar no se manda el toque normal;
 * si se suelta antes de 500 ms, se manda el toque normal.
 *
 * Aquí vive también `animarPulsoCss` (roadmap 100): pone en la celda la clase
 * del efecto elegido (`pulso-destello` / `pulso-onda`) y el CSS de
 * `estiloMandoPagina.ts` hace el resto — brillo por encima del color para el
 * destello, anillo que se expande para la onda. El efecto de puntos lo sigue
 * pintando `animarPulsoMovil`. Con `efectoPulsar` `none` no se pone nada.
 */
export const JS_TACTIL_MANDO = `
function animarPulsoCss(b, celda) {
  var fx = b.efectoPulsar || 'destello';
  if (fx !== 'destello' && fx !== 'onda') return;
  var clase = fx === 'onda' ? 'pulso-onda' : 'pulso-destello';
  celda.classList.remove('pulso-destello', 'pulso-onda');
  void celda.offsetWidth;
  celda.classList.add(clase);
  setTimeout(function () { celda.classList.remove(clase); }, fx === 'onda' ? 700 : 480);
}

function dispararPulsacionMando(b, celda, esLargo) {
  if ('vibrate' in navigator) {
    try { navigator.vibrate(30); } catch (e) {}
  }
  animarPulsoCss(b, celda);
  animarPulsoMovil(b, celda, celda._rejillaCeldas || []);
  var ruta = '/api/press/' + encodeURIComponent(b.id) + (esLargo ? '?largo=1' : '');
  pedir(ruta).then(function (r) {
    var ok = r && r.ok;
    celda.classList.add(ok ? 'ok' : 'mal');
    setTimeout(function () { celda.classList.remove('ok', 'mal'); }, 350);
    // Un interruptor cambia de aspecto al pulsar: se relee para pintarlo.
    if (ok && b.isToggle) setTimeout(function () { pantallaDeck(); }, 400);
  }).catch(function () {
    celda.classList.add('mal');
    setTimeout(function () { celda.classList.remove('ok', 'mal'); }, 350);
  });
}

function engancharTactilLargo(celda, b) {
  var timerLargo = null;
  var largoDisparado = false;
  // Solo cuenta el dedo que empezó en esta celda: si entra deslizando desde
  // otra y se suelta aquí, no es una pulsación.
  var pulsando = false;

  celda.oncontextmenu = function (e) {
    e.preventDefault();
  };

  celda.onpointerdown = function (e) {
    if (e.button !== undefined && e.button !== 0) return;
    largoDisparado = false;
    pulsando = true;
    if (timerLargo) { clearTimeout(timerLargo); timerLargo = null; }
    timerLargo = setTimeout(function () {
      largoDisparado = true;
      timerLargo = null;
      dispararPulsacionMando(b, celda, true);
    }, 500);
  };

  celda.onpointerup = function (e) {
    if (timerLargo) {
      clearTimeout(timerLargo);
      timerLargo = null;
    }
    var eraPulsacion = pulsando;
    pulsando = false;
    if (largoDisparado) {
      largoDisparado = false;
      return;
    }
    if (eraPulsacion) dispararPulsacionMando(b, celda, false);
  };

  // El dedo se fue (scroll, salió de la celda): ni corta ni larga.
  function cancelar() {
    if (timerLargo) {
      clearTimeout(timerLargo);
      timerLargo = null;
    }
    largoDisparado = false;
    pulsando = false;
  }
  celda.onpointercancel = cancelar;
  celda.onpointerleave = cancelar;

  celda.onclick = function (e) {
    e.preventDefault();
  };
}
`;
