/**
 * Motor de animacion DOT (roadmap 78 y 79): intensidades por punto.
 *
 * JavaScript plano, **sin imports ni exports**, a proposito: el servidor lo
 * incrusta tal cual en la pagina del mando movil (dentro del script que ya
 * lleva el nonce de la CSP) y la celda, la tecla fisica y el movil usan el
 * **mismo** codigo. Al cargarse deja el motor en `globalThis.EfectosPuntos`.
 *
 * Entrada: la matriz de puntos de un icono (8x8 o 16x16, booleanos; vale
 * cualquier lado N), el efecto y `t` en ms desde que empezo. Salida: la
 * intensidad de cada punto (0-1, misma forma que la entrada; un punto
 * apagado en la base siempre da 0) y si la animacion ya termino (solo las de
 * una sola vez: `encender`, `barrido`, `escaneo`, `destello` y `onda`;
 * `pulso` y `parpadeo` no terminan nunca).
 *
 * Pura y determinista: sin reloj dentro (el llamador pasa `t`), sin DOM, sin
 * Node. Se puede probar con `node` tal cual.
 *
 * @typedef {'encender' | 'barrido' | 'pulso' | 'parpadeo' | 'escaneo' | 'destello' | 'onda'} EfectoMotor
 * @typedef {{ intensidades: number[][], terminado: boolean }} ResultadoMotor
 */
(function () {
  'use strict';

  /** `encender`: las filas se encienden de arriba abajo en este tiempo. */
  var DUR_ENCENDER_MS = 900;
  /** `barrido`: una banda de luz cruza el icono en diagonal. */
  var DUR_BARRIDO_MS = 1200;
  /** `pulso`: periodo de la respiracion (no termina nunca). */
  var PERIODO_PULSO_MS = 1600;
  /** `parpadeo`: periodo del encendido/apagado (no termina nunca). */
  var PERIODO_PARPADEO_MS = 1000;
  /** `escaneo`: una linea horizontal recorre el icono. */
  var DUR_ESCANEO_MS = 1400;
  /** `destello` (al pulsar): todo al maximo y se apaga en este tiempo. */
  var DUR_DESTELLO_MS = 180;
  /** `onda` (al pulsar): un anillo sale del centro en este tiempo. */
  var DUR_ONDA_MS = 520;
  /** Ancho de la banda de luz del `barrido`, en fraccion de diagonal. */
  var ANCHO_BARRIDO = 0.30;
  /** Ancho de la linea del `escaneo`, en fraccion de lado. */
  var ANCHO_ESCANEO = 0.16;
  /** Ancho del anillo de la `onda`, en fraccion de radio maximo. */
  var ANCHO_ONDA = 0.25;
  /** Suelo del `pulso`: nunca se apaga del todo, respira entre esto y 1. */
  var SUELO_PULSO = 0.35;
  /** Suelo fuera de la banda (`barrido`) y de la linea (`escaneo`). */
  var SUELO_BANDA = 0.25;
  /** Lo que se ve de un punto de la `onda` fuera del anillo. */
  var SUELO_ONDA = 0.12;

  /** Recorta a [0, 1]. */
  function sujetar(v) {
    return v < 0 ? 0 : v > 1 ? 1 : v;
  }

  /** Gaussiana centrada en 0 con el ancho dado. */
  function campana(distancia, ancho) {
    var k = distancia / ancho;
    return Math.exp(-k * k);
  }

  /**
   * ¿El efecto es continuo (no termina nunca)? Solo `pulso` y `parpadeo`.
   * @param {string} efecto
   * @returns {boolean}
   */
  function esContinuo(efecto) {
    return efecto === 'pulso' || efecto === 'parpadeo';
  }

  /**
   * Duracion de una sola pasada del efecto, en ms. Para los continuos
   * devuelve su periodo (una respiracion / un parpadeo).
   * @param {string} efecto
   * @returns {number}
   */
  function duracionEfecto(efecto) {
    switch (efecto) {
      case 'encender': return DUR_ENCENDER_MS;
      case 'barrido': return DUR_BARRIDO_MS;
      case 'pulso': return PERIODO_PULSO_MS;
      case 'parpadeo': return PERIODO_PARPADEO_MS;
      case 'escaneo': return DUR_ESCANEO_MS;
      case 'destello': return DUR_DESTELLO_MS;
      case 'onda': return DUR_ONDA_MS;
      default: return 0;
    }
  }

  /**
   * Intensidad de un punto encendido para `encender`: filas de arriba abajo.
   * @param {number} y fila del punto
   * @param {number} n lado de la matriz
   * @param {number} t ms desde el inicio
   */
  function intensidadEncender(y, n, t) {
    var frontera = (t / DUR_ENCENDER_MS) * n;
    if (y < Math.floor(frontera)) return 1;
    if (y === Math.floor(frontera)) return sujetar(frontera - Math.floor(frontera));
    return 0;
  }

  /**
   * Intensidad para `barrido`: banda de luz en diagonal (x + y).
   * @param {number} x columna
   * @param {number} y fila
   * @param {number} n lado
   * @param {number} t ms
   */
  function intensidadBarrido(x, y, n, t) {
    var diagonal = n <= 1 ? 0 : (x + y) / (2 * (n - 1));
    var centro = (t / DUR_BARRIDO_MS) * (1 + ANCHO_BARRIDO) - ANCHO_BARRIDO / 2;
    return SUELO_BANDA + (1 - SUELO_BANDA) * campana(diagonal - centro, ANCHO_BARRIDO / 2);
  }

  /**
   * Intensidad para `pulso`: respiracion senoidal entre SUELO_PULSO y 1.
   * Empieza encendido (t = 0 -> 1) para no parpadear al aparecer.
   * @param {number} t ms
   */
  function intensidadPulso(t) {
    var fase = ((t % PERIODO_PULSO_MS) / PERIODO_PULSO_MS) * 2 * Math.PI;
    return SUELO_PULSO + (1 - SUELO_PULSO) * (0.5 + 0.5 * Math.cos(fase));
  }

  /**
   * Intensidad para `parpadeo`: mitad del periodo encendido, mitad apagado.
   * @param {number} t ms
   */
  function intensidadParpadeo(t) {
    return (t % PERIODO_PARPADEO_MS) < PERIODO_PARPADEO_MS / 2 ? 1 : 0;
  }

  /**
   * Intensidad para `escaneo`: linea horizontal que baja por el icono.
   * @param {number} y fila
   * @param {number} n lado
   * @param {number} t ms
   */
  function intensidadEscaneo(y, n, t) {
    var linea = (t / DUR_ESCANEO_MS) * n;
    var distancia = n <= 0 ? 0 : Math.abs(y + 0.5 - linea) / n;
    return SUELO_BANDA + (1 - SUELO_BANDA) * campana(distancia, ANCHO_ESCANEO);
  }

  /**
   * Intensidad para `destello`: todo al maximo y caida lineal hasta 0.
   * @param {number} t ms
   */
  function intensidadDestello(t) {
    return sujetar(1 - t / DUR_DESTELLO_MS);
  }

  /**
   * Intensidad para `onda`: anillo que sale del centro.
   * @param {number} x columna
   * @param {number} y fila
   * @param {number} n lado
   * @param {number} t ms
   */
  function intensidadOnda(x, y, n, t) {
    var centro = (n - 1) / 2;
    var maximo = Math.sqrt(2 * centro * centro) || 1;
    var distancia = Math.sqrt((x - centro) * (x - centro) + (y - centro) * (y - centro)) / maximo;
    var frente = t / DUR_ONDA_MS;
    return SUELO_ONDA + (1 - SUELO_ONDA) * campana(distancia - frente, ANCHO_ONDA);
  }

  /**
   * Intensidad de un punto encendido segun el efecto y el tiempo.
   * @param {EfectoMotor} efecto
   * @param {number} x columna
   * @param {number} y fila
   * @param {number} n lado
   * @param {number} t ms (ya saneado, >= 0)
   * @returns {number} 0-1
   */
  function intensidadDe(efecto, x, y, n, t) {
    switch (efecto) {
      case 'encender': return intensidadEncender(y, n, t);
      case 'barrido': return intensidadBarrido(x, y, n, t);
      case 'pulso': return intensidadPulso(t);
      case 'parpadeo': return intensidadParpadeo(t);
      case 'escaneo': return intensidadEscaneo(y, n, t);
      case 'destello': return intensidadDestello(t);
      case 'onda': return intensidadOnda(x, y, n, t);
      default: return 1;
    }
  }

  /**
   * Calcula la intensidad de cada punto para el instante `t`.
   * @param {boolean[][]} matriz puntos encendidos del icono
   * @param {EfectoMotor} efecto
   * @param {number} t ms desde que empezo (>= 0)
   * @returns {ResultadoMotor} intensidades con la misma forma, y si termino
   */
  function calcularPuntos(matriz, efecto, t) {
    var n = matriz.length;
    var tiempo = typeof t === 'number' && t > 0 ? t : 0;
    var duracion = duracionEfecto(efecto);
    var terminado = efecto === undefined || efecto === null
      ? true
      : (!esContinuo(efecto) && tiempo >= duracion);
    var intensidades = [];
    for (var y = 0; y < n; y++) {
      var fila = [];
      var base = matriz[y] || [];
      for (var x = 0; x < (base.length || n); x++) {
        fila.push(base[x] ? sujetar(intensidadDe(efecto, x, y, n, tiempo)) : 0);
      }
      intensidades.push(fila);
    }
    return { intensidades: intensidades, terminado: terminado };
  }

  globalThis.EfectosPuntos = {
    calcularPuntos: calcularPuntos,
    duracionEfecto: duracionEfecto,
    esContinuo: esContinuo,
    DUR_ENCENDER_MS: DUR_ENCENDER_MS,
    DUR_BARRIDO_MS: DUR_BARRIDO_MS,
    PERIODO_PULSO_MS: PERIODO_PULSO_MS,
    PERIODO_PARPADEO_MS: PERIODO_PARPADEO_MS,
    DUR_ESCANEO_MS: DUR_ESCANEO_MS,
    DUR_DESTELLO_MS: DUR_DESTELLO_MS,
    DUR_ONDA_MS: DUR_ONDA_MS,
  };
})();
