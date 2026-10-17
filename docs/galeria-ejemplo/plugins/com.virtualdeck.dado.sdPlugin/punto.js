/* Puntos — la parte de dibujo de los plugins de VirtualDeck.
 *
 * Una matriz de puntos 5×7 por caracter y un SVG por texto: fondo OLED puro
 * (#070809), el acento del proyecto (#FF3B30) y ni un emoji ni unicode, como
 * manda la estetica DOT. El anfitrion solo acepta imagenes `data:` en base64
 * (`resolverImagenVisual` en `electron/main/plugins/validacion.ts`), asi que el
 * SVG sale codificado y no como texto plano.
 *
 * Cada glifo son siete filas de cinco bits: dentro de una fila, el bit de peso
 * 16 es el punto de la izquierda y el de peso 1 el de la derecha. Un caracter
 * que no este en la tabla sale como un globo de interrogation.
 *
 * El tamano del punto se calcula del texto: cuanto mas largo, mas pequeno el
 * paso, para que `25:00` y `7` quepan los dos en el mismo 256×256.
 */
(function (global) {
  const LADO = 256;

  const COLORES = {
    fondo: '#070809',
    acento: '#FF3B30',
    punto: '#d7dade',
    tenue: '#2b3038',
  };

  const GLIFOS = {
    '0': [14, 17, 19, 21, 25, 17, 14],
    '1': [4, 12, 4, 4, 4, 4, 14],
    '2': [14, 17, 1, 2, 4, 8, 31],
    '3': [31, 2, 4, 2, 1, 17, 14],
    '4': [2, 6, 10, 18, 31, 2, 2],
    '5': [31, 16, 30, 1, 1, 17, 14],
    '6': [6, 8, 16, 30, 17, 17, 14],
    '7': [31, 1, 2, 4, 8, 8, 8],
    '8': [14, 17, 17, 14, 17, 17, 14],
    '9': [14, 17, 17, 15, 1, 2, 12],
    A: [14, 17, 17, 31, 17, 17, 17],
    B: [30, 17, 17, 30, 17, 17, 30],
    C: [14, 17, 16, 16, 16, 17, 14],
    D: [30, 17, 17, 17, 17, 17, 30],
    E: [31, 16, 16, 30, 16, 16, 31],
    F: [31, 16, 16, 30, 16, 16, 16],
    G: [14, 17, 16, 23, 17, 17, 15],
    H: [17, 17, 17, 31, 17, 17, 17],
    I: [14, 4, 4, 4, 4, 4, 14],
    J: [7, 2, 2, 2, 2, 18, 12],
    K: [17, 18, 20, 24, 20, 18, 17],
    L: [16, 16, 16, 16, 16, 16, 31],
    M: [17, 27, 21, 21, 17, 17, 17],
    N: [17, 25, 21, 19, 17, 17, 17],
    O: [14, 17, 17, 17, 17, 17, 14],
    P: [30, 17, 17, 30, 16, 16, 16],
    Q: [14, 17, 17, 17, 21, 18, 13],
    R: [30, 17, 17, 30, 20, 18, 17],
    S: [15, 16, 16, 14, 1, 1, 30],
    T: [31, 4, 4, 4, 4, 4, 4],
    U: [17, 17, 17, 17, 17, 17, 14],
    V: [17, 17, 17, 17, 17, 10, 4],
    W: [17, 17, 17, 21, 21, 27, 17],
    X: [17, 17, 10, 4, 10, 17, 17],
    Y: [17, 17, 10, 4, 4, 4, 4],
    Z: [31, 1, 2, 4, 8, 16, 31],
    ':': [0, 4, 4, 0, 4, 4, 0],
    '.': [0, 0, 0, 0, 0, 6, 6],
    ',': [0, 0, 0, 0, 6, 6, 8],
    '-': [0, 0, 0, 31, 0, 0, 0],
    '+': [0, 4, 4, 31, 4, 4, 0],
    '/': [1, 2, 2, 4, 8, 8, 16],
    '?': [14, 17, 1, 2, 4, 0, 4],
    ' ': [0, 0, 0, 0, 0, 0, 0],
  };

  function glifo(caracter) {
    return GLIFOS[caracter] || GLIFOS['?'];
  }

  /** El texto en puntos: cinco por caracter y uno de separacion. */
  function ancho(texto) {
    return Math.max(0, texto.length * 6 - 1);
  }

  /**
   * El paso que hace que el texto quepa: par, entre 4 y 18.
   *
   * El minimo son 4 porque una etiqueta larga (`DESCANSO`, 47 puntos) no cabe
   * con un paso mayor: mas vale un texto pequeno que se salga del boton.
   */
  function pasoDe(texto, margen) {
    const puntos = ancho(texto);
    if (puntos === 0) return 16;
    const bruto = Math.floor(((LADO - margen * 2) / puntos) / 2) * 2;
    return Math.max(4, Math.min(18, bruto));
  }

  /**
   * El SVG de unas lineas de puntos.
   *
   * @param lineas `[{ t: '25:00', c: 'punto' }, …]`, cada una centrada.
   * @param opciones `margen`, `huecos` entre lineas, `marca` (raya de acento
   *   debajo) y `led` ('acento' o 'tenue', el cuadrado de estado arriba).
   */
  function svg(lineas, opciones) {
    const o = opciones || {};
    const margen = o.margen === undefined ? 28 : o.margen;
    const huecos = o.huecos === undefined ? 14 : o.huecos;
    const pasos = lineas.map((linea) => pasoDe(linea.t, margen));
    const alto = pasos.reduce((suma, paso) => suma + paso * 7, 0) + huecos * Math.max(0, lineas.length - 1);
    let y = Math.round((LADO - alto) / 2);
    const porColor = new Map();
    lineas.forEach((linea, indice) => {
      const paso = pasos[indice];
      const color = COLORES[linea.c] || COLORES.punto;
      const radio = (paso * 0.36).toFixed(1);
      const x0 = Math.round((LADO - ancho(linea.t) * paso) / 2 + paso / 2);
      const y0 = y + Math.round(paso / 2);
      for (let i = 0; i < linea.t.length; i++) {
        const filas = glifo(linea.t[i]);
        for (let fila = 0; fila < 7; fila++) {
          for (let x = 0; x < 5; x++) {
            if (!(filas[fila] & (16 >> x))) continue;
            const cx = x0 + (i * 6 + x) * paso;
            const cy = y0 + fila * paso;
            porColor.set(color, (porColor.get(color) || '') + `<circle cx="${cx}" cy="${cy}" r="${radio}"/>`);
          }
        }
      }
      y += paso * 7 + huecos;
    });
    const grupos = [...porColor]
      .map(([color, circulos]) => `<g fill="${color}">${circulos}</g>`)
      .join('');
    const marca = o.marca
      ? `<rect x="112" y="${Math.min(LADO - 24, y - huecos + 8)}" width="32" height="4" fill="${COLORES.acento}"/>`
      : '';
    const led = o.led
      ? `<rect x="16" y="16" width="8" height="8" fill="${COLORES[o.led] || COLORES.acento}"/>`
      : '';
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" width="${LADO}" height="${LADO}" viewBox="0 0 ${LADO} ${LADO}">` +
      `<rect width="${LADO}" height="${LADO}" fill="${COLORES.fondo}"/>${led}${grupos}${marca}</svg>`
    );
  }

  /** UTF-8 a base64 sin dependencias: `btoa` solo admite latin1. */
  function base64(texto) {
    const bytes = new TextEncoder().encode(texto);
    let binario = '';
    for (let i = 0; i < bytes.length; i++) binario += String.fromCharCode(bytes[i]);
    return btoa(binario);
  }

  /** El `data:` que acepta `setImage` del anfitrion. */
  function datos(lineas, opciones) {
    return 'data:image/svg+xml;base64,' + base64(svg(lineas, opciones));
  }

  global.Puntos = { svg, datos, base64, COLORES, LADO, ancho };
})(typeof window !== 'undefined' ? window : globalThis);