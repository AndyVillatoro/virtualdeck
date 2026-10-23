/**
 * La animación de la página del mando móvil, como texto para incrustar.
 *
 * Vive aquí y no en `paginaMando.ts` para no pasar el tope de líneas de ese
 * archivo: es código de la página (sin tipos, con `var`), no del servidor, y
 * `guionMandoPagina` lo interpola dentro del script que lleva el nonce. Por eso
 * no lleva ni comillas invertidas ni interpolaciones: romperían el literal que
 * lo contiene. Estaba en `iconosMando.ts` y se movió con la animación de la
 * página, que no resuelve iconos.
 */
export const JS_ANIMACION_MANDO = `
var animadosMovil = [];
var rafMovil = 0;
var ocultoMovilEn = 0;

function matrizDePuntos(puntos) {
  var lado = puntos && puntos.lado === 16 ? 16 : 8;
  var filas = (puntos && puntos.filas) || [];
  var mascara = lado === 16 ? 65535 : 255;
  var m = [];
  for (var y = 0; y < lado; y++) {
    var f = [];
    var bits = ((typeof filas[y] === 'number' && isFinite(filas[y]) ? Math.trunc(filas[y]) : 0) & mascara);
    for (var x = 0; x < lado; x++) f.push(((bits >> ((lado - 1) - x)) & 1) === 1);
    m.push(f);
  }
  return m;
}

function continuaMovil(b) {
  if (!b.animacion || !b.animacion.efecto) return null;
  if (b.animacion.cuando === 'siempre') return b.animacion.efecto;
  if (b.animacion.cuando === 'encendido' && b.encendido) return b.animacion.efecto;
  return null;
}

function entradaMovil(celda) {
  for (var i = 0; i < animadosMovil.length; i++) {
    if (animadosMovil[i].celda === celda) return animadosMovil[i];
  }
  return null;
}

function arrancarMovil() {
  if (rafMovil || animadosMovil.length === 0) return;
  rafMovil = requestAnimationFrame(pasoMovil);
}

function pasoMovil(ahora) {
  rafMovil = 0;
  var vivos = [];
  for (var i = 0; i < animadosMovil.length; i++) {
    var a = animadosMovil[i];
    var intens = null;
    var sigue = false;
    if (a.pulso) {
      var durP = HAY_MOTOR.duracionEfecto(a.pulso.efecto);
      var dt = ahora - a.pulso.t0;
      if (dt >= durP) {
        a.pulso = null;
      } else {
        intens = HAY_MOTOR.calcularPuntos(a.matriz, a.pulso.efecto, dt).intensidades;
        sigue = true;
      }
    }
    if (!sigue && a.continua) {
      var durC = HAY_MOTOR.duracionEfecto(a.efecto);
      var t = (HAY_MOTOR.esContinuo(a.efecto) || durC <= 0)
        ? ahora - a.inicio
        : (ahora - a.inicio) % durC;
      intens = HAY_MOTOR.calcularPuntos(a.matriz, a.efecto, t).intensidades;
      sigue = true;
    }
    for (var j = 0; j < a.celdas.length; j++) {
      var c = a.celdas[j];
      var v = intens && intens[c.y] ? (intens[c.y][c.x] || 0) : 1;
      c.el.setAttribute('opacity', String(v < 0 ? 0 : v > 1 ? 1 : v));
    }
    if (sigue) vivos.push(a);
  }
  animadosMovil = vivos;
  if (vivos.length > 0 && !document.hidden) rafMovil = requestAnimationFrame(pasoMovil);
}

document.addEventListener('visibilitychange', function () {
  if (document.hidden) {
    ocultoMovilEn = performance.now();
  } else if (animadosMovil.length > 0) {
    var pausa = performance.now() - ocultoMovilEn;
    for (var i = 0; i < animadosMovil.length; i++) {
      animadosMovil[i].inicio += pausa;
      if (animadosMovil[i].pulso) animadosMovil[i].pulso.t0 += pausa;
    }
    arrancarMovil();
  }
});

function registrarAnimado(b, celda, celdas) {
  if (!HAY_MOTOR || REDUCIDO || !b.puntos || !celdas || celdas.length === 0) return;
  var fx = continuaMovil(b);
  if (!fx) return;
  animadosMovil.push({
    celda: celda, celdas: celdas, matriz: matrizDePuntos(b.puntos),
    efecto: fx, continua: true, inicio: performance.now(), pulso: null,
  });
  arrancarMovil();
}

function animarPulsoMovil(b, celda, celdas) {
  if (!HAY_MOTOR || !b.puntos || !celdas || celdas.length === 0) return;
  var fx = b.efectoPulsar || 'destello';
  if (fx !== 'destello' && fx !== 'onda') {
    fx = b.animacion && b.animacion.cuando === 'al-pulsar' ? b.animacion.efecto : null;
    if (!fx) return;
  }
  var a = entradaMovil(celda);
  if (!a) {
    a = {
      celda: celda, celdas: celdas, matriz: matrizDePuntos(b.puntos),
      efecto: '', continua: false, inicio: 0, pulso: null,
    };
    animadosMovil.push(a);
  }
  a.pulso = { efecto: fx, t0: performance.now() };
  arrancarMovil();
}
`;
