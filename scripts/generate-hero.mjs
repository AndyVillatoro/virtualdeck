/**
 * Genera `docs/prensa/hero.svg` (la animación de cabecera) y `docs/prensa/vista.html`.
 *
 * Se genera en vez de escribirse a mano por dos motivos:
 *
 *  1. **La retícula sale de `GLYPHS_5x7`**, no de una copia.  El alfabeto de la
 *     fuente de puntos está incompleto y `DotText` dibuja un hueco en silencio
 *     cuando le falta una letra (así se leyó «SUS OTONES» en el tutorial).  Aquí
 *     la palabra se comprueba carácter por carácter y el script **falla** si
 *     algo no está en la tabla, en vez de entregar un SVG con un agujero.
 *  2. `vista.html` lleva el SVG **incrustado dos veces** para poder forzar
 *     `data-theme` claro y oscuro en la misma página: un `<img>`/`<object>` es
 *     otro documento y solo obedece al tema del sistema, así que no hay forma de
 *     ver los dos fondos a la vez sin duplicarlo.  Duplicado a mano se separaría;
 *     generado, las dos copias son la misma.
 *
 * Uso: `npm run build:hero`
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const SALIDA = join(RAIZ, 'docs', 'prensa');

// ── La palabra y el lienzo ────────────────────────────────────────────────────
const PALABRA = 'VIRTUALDECK';
const W = 1920, H = 1080;          // exactamente lo que pide la ficha de la Store
const CICLO = 12;                  // segundos del bucle

// Retícula del texto: celda de 5×7 por carácter, 2 celdas de separación.
const P_TEXTO = 22;                // paso entre puntos en la fase de texto
const R_PUNTO = 8.5;               // radio, constante en todas las fases

// Rejilla de botones: 4×4, cada botón es un anillo de puntos de 7×7.
const P_REJILLA = 30;              // paso entre puntos dentro del botón
const LADO_BOTON = 6 * P_REJILLA;  // 7 puntos = 6 pasos
const HUECO_BOTON = Math.round(1.6 * P_REJILLA);
const BOTON_PULSADO = { fila: 1, col: 1 };

// ── La tabla de la fuente, leída del propio proyecto ──────────────────────────
function leerGlifos() {
  const src = readFileSync(join(RAIZ, 'src', 'design.ts'), 'utf8');
  const bloque = src.match(/GLYPHS_5x7[^=]*=\s*\{([\s\S]*?)\n\};/);
  if (!bloque) throw new Error('No se encontró GLYPHS_5x7 en src/design.ts');
  const glifos = {};
  const re = /'(.)':\s*\[([^\]]+)\]/g;
  let m;
  while ((m = re.exec(bloque[1]))) {
    glifos[m[1]] = m[2].split(',').map((s) => parseInt(s.trim(), 16));
  }
  return glifos;
}

const GLIFOS = leerGlifos();
const faltan = [...PALABRA].filter((ch) => !GLIFOS[ch]);
if (faltan.length) {
  throw new Error(
    `La fuente de puntos no tiene ${faltan.map((c) => `'${c}'`).join(', ')}. ` +
    'Se dibujaría un hueco y la palabra se leería mal: añadí el glifo a ' +
    'GLYPHS_5x7 en src/design.ts o cambiá la palabra.'
  );
}

// ── Aleatorio reproducible (mulberry32) ──────────────────────────────────────
// Sin semilla fija, cada ejecución daría un SVG distinto y el diff sería ruido.
function azar(semilla) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const n1 = (v) => Math.round(v * 10) / 10;

// ── Fase 1: las celdas del texto ─────────────────────────────────────────────
// `encendida` distingue el punto de tinta del punto apagado de la trama; los dos
// existen como círculo, como en DotText.
const anchoTexto = (PALABRA.length * 7 - 2) * P_TEXTO;
const x0Texto = (W - anchoTexto) / 2;
const y0Texto = (H - 7 * P_TEXTO) / 2;

const celdas = [];
[...PALABRA].forEach((ch, i) => {
  GLIFOS[ch].forEach((fila, r) => {
    for (let c = 0; c < 5; c++) {
      celdas.push({
        encendida: ((fila >> (4 - c)) & 1) === 1,
        lx: x0Texto + (i * 7 + c) * P_TEXTO,
        ly: y0Texto + r * P_TEXTO,
      });
    }
  });
});

// ── Fase 2: los huecos de la rejilla ─────────────────────────────────────────
// El anillo de 7×7 tiene 7+7+5+5 = 24 puntos, y 16 botones × 24 = 384 huecos.
// El texto da 385 celdas, así que se descarta **una apagada** (nunca de tinta).
const anillo = [];
for (let c = 0; c < 7; c++) anillo.push([0, c]);
for (let r = 1; r < 6; r++) anillo.push([r, 6]);
for (let c = 6; c >= 0; c--) anillo.push([6, c]);
for (let r = 5; r >= 1; r--) anillo.push([r, 0]);

const pasoBoton = LADO_BOTON + HUECO_BOTON;
const x0Rej = (W - (4 * LADO_BOTON + 3 * HUECO_BOTON)) / 2;
const y0Rej = (H - (4 * LADO_BOTON + 3 * HUECO_BOTON)) / 2;
const centroBoton = (fila, col) => ({
  x: x0Rej + col * pasoBoton + LADO_BOTON / 2,
  y: y0Rej + fila * pasoBoton + LADO_BOTON / 2,
});

const huecos = [];
for (let j = 0; j < 16 * anillo.length; j++) {
  const b = j % 16;                       // se reparte por botones, no por bloques:
  const k = Math.floor(j / 16);           // así la reorganización barre toda la palabra
  const fila = Math.floor(b / 4), col = b % 4;
  const [ar, ac] = anillo[k];
  huecos.push({
    fila, col,
    gx: x0Rej + col * pasoBoton + ac * P_REJILLA,
    gy: y0Rej + fila * pasoBoton + ar * P_REJILLA,
  });
}

if (celdas.length - huecos.length !== 1) {
  throw new Error(`Descuadre: ${celdas.length} celdas contra ${huecos.length} huecos`);
}
const sobra = celdas.map((c, i) => [c, i]).reverse().find(([c]) => !c.encendida);
if (!sobra) throw new Error('No hay ninguna celda apagada que descartar');
const puntos = celdas.filter((_, i) => i !== sobra[1]);

// ── Reparto y varias por punto ───────────────────────────────────────────────
const rnd = azar(20260907);
const distMax = Math.hypot(3, 3);
puntos.forEach((p, i) => {
  const h = huecos[i];
  Object.assign(p, h);
  // Dos dispersiones distintas: la de entrada y la de salida. Con la misma, el
  // bucle daría un salto invisible pero el movimiento se leería como un rebote.
  p.sx = n1(40 + rnd() * (W - 80));
  p.sy = n1(40 + rnd() * (H - 80));
  p.ex = n1(40 + rnd() * (W - 80));
  p.ey = n1(40 + rnd() * (H - 80));
  // El encendido se escalona ~0,35 s: la retícula "prende" en vez de aparecer.
  // Tiene que caber en la franja en que la opacidad ya es 0 a los dos lados del
  // bucle (93–100 % y 0–4 %), o el retardo dejaría puntos visibles en el salto.
  // Y el tono llega a pleno en el 21 % (2,52 s) en vez del 24 %: con el retardo
  // encima, la palabra queda entera antes de los 3 s, que es cuando el guion la
  // manda reordenar.
  p.od = n1(rnd() * 0.35);
  // La onda sale del botón pulsado hacia fuera.
  const d = Math.hypot(h.fila - BOTON_PULSADO.fila, h.col - BOTON_PULSADO.col);
  p.wd = n1((d / distMax) * 0.85 * 10) / 10;
});

// ── CSS ──────────────────────────────────────────────────────────────────────
// Todo va con el prefijo `[data-vd-hero]` porque en `vista.html` el SVG está
// incrustado: los estilos de un SVG en línea NO están encapsulados y se
// aplicarían a la página entera.
//
// `--seek` es el mando del render a MP4: `docs/prensa/render.sh` pausa las
// animaciones y le da un valor por fotograma. En la animación normal vale 0 y
// no hace nada.
const css = `
[data-vd-hero]{
  /* Tema claro por defecto; los tokens son los de src/design.ts. */
  --vd-bg:#f0f0f0; --vd-dot:#1a1a1a; --vd-accent:#4a8ef0;
  --seek:0s;
}
@media (prefers-color-scheme: dark){
  [data-vd-hero]:not([data-theme='light']){ --vd-bg:#0f0f0f; --vd-dot:#dcdcdc; }
}
[data-vd-hero][data-theme='dark']{ --vd-bg:#0f0f0f; --vd-dot:#dcdcdc; }
[data-vd-hero][data-theme='light']{ --vd-bg:#f0f0f0; --vd-dot:#1a1a1a; }

[data-vd-hero] .bg{ fill:var(--vd-bg); }

[data-vd-hero] .d{
  fill:var(--vd-dot);
  /* Sin esto el origen de la escala sería el centro del viewBox (960,540) y la
     onda tiraría de cada punto hacia el medio: en SVG el transform-box es
     view-box, no la caja del elemento. */
  transform-origin:0 0;
  /* Estado base = fotograma de la pulsación. Es lo que se ve con
     prefers-reduced-motion, cuando las animaciones no corren. */
  translate:var(--gx) var(--gy);
  opacity:.95;
  animation:
    vd-mover ${CICLO}s ease-in-out calc(0s - var(--seek)) infinite,
    vd-onda  ${CICLO}s ease-out    calc(var(--wd) - var(--seek)) infinite;
}
/* animation-fill-mode: backwards deja el 0 % puesto durante el retardo del
   tono: sin eso, los
   puntos asomarían a opacidad plena durante el escalonado del encendido. */
[data-vd-hero] .l{ animation-name:vd-mover, vd-onda, vd-tinta; }
[data-vd-hero] .a{ animation-name:vd-mover, vd-onda, vd-trama; }
[data-vd-hero] .l, [data-vd-hero] .a{
  animation-duration:${CICLO}s, ${CICLO}s, ${CICLO}s;
  animation-timing-function:ease-in-out, ease-out, linear;
  animation-delay:calc(0s - var(--seek)), calc(var(--wd) - var(--seek)), calc(var(--od) - var(--seek));
  animation-iteration-count:infinite, infinite, infinite;
  animation-fill-mode:none, none, backwards;
}

[data-vd-hero] .destello{
  fill:url(#PREFIJOdestello);
  transform-origin:0 0;
  opacity:.6; scale:1.5;
  animation:vd-destello ${CICLO}s ease-out calc(0s - var(--seek)) infinite;
}
[data-vd-hero] .marca{
  fill:var(--vd-accent);
  transform-origin:0 0;
  opacity:1;
  animation:vd-marca ${CICLO}s linear calc(0s - var(--seek)) infinite;
}

/* 0-3 s componer / 3-6 s reordenar / 6-9 s pulsar / 9-12 s disolver. */
@keyframes vd-mover{
  0%,4%    { translate:var(--sx) var(--sy); }
  24%,25%  { translate:var(--lx) var(--ly); }
  44%,75%  { translate:var(--gx) var(--gy); }
  95%,100% { translate:var(--ex) var(--ey); }
}
@keyframes vd-tinta{
  0%,4%    { opacity:0; }
  21%,25%  { opacity:1; }
  44%,78%  { opacity:.95; }
  93%,100% { opacity:0; }
}
/* Los puntos apagados son la trama de la matriz mientras hay texto (el
   apagado de DotText) y pasan a ser puntos del boton en la rejilla. */
@keyframes vd-trama{
  0%,4%    { opacity:0; }
  21%,25%  { opacity:.13; }
  44%,78%  { opacity:.95; }
  93%,100% { opacity:0; }
}
/* Una sola pulsación por ciclo: 0,08 Hz, muy por debajo del límite de 3 Hz. */
@keyframes vd-onda{
  0%,51%   { scale:1; }
  53%      { scale:2.1; }
  57%,100% { scale:1; }
}
/* Mismos numeros que vd-flash-radial en src/index.css. */
@keyframes vd-destello{
  0%,49.5% { opacity:0;   scale:.25; }
  50%      { opacity:.95; scale:.25; }
  54%      { opacity:.55; }
  60%      { opacity:0;   scale:2.4; }
  100%     { opacity:0;   scale:2.4; }
}
@keyframes vd-marca{
  0%,49%   { opacity:0; }
  52%,72%  { opacity:1; }
  76%,100% { opacity:0; }
}

/* Accesibilidad: nada de movimiento, se queda el fotograma de la pulsación
   (el estado base de cada clase de arriba). El último fotograma del bucle está
   en negro — quieto no diría nada. */
@media (prefers-reduced-motion: reduce){
  [data-vd-hero] .d,
  [data-vd-hero] .destello,
  [data-vd-hero] .marca{ animation:none; }
}
`.trim();

// ── Armado del SVG ───────────────────────────────────────────────────────────
function svg(prefijo, tema) {
  const c = centroBoton(BOTON_PULSADO.fila, BOTON_PULSADO.col);
  const attrTema = tema ? ` data-theme="${tema}"` : '';
  const cuerpo = puntos.map((p) => {
    const vars = `--sx:${p.sx}px;--sy:${p.sy}px;--lx:${n1(p.lx)}px;--ly:${n1(p.ly)}px;` +
      `--gx:${n1(p.gx)}px;--gy:${n1(p.gy)}px;--ex:${p.ex}px;--ey:${p.ey}px;` +
      `--od:${p.od}s;--wd:${p.wd}s`;
    return `<circle class="d ${p.encendida ? 'l' : 'a'}" r="${R_PUNTO}" style="${vars}"/>`;
  }).join('\n');

  // El acento del botón pulsado se dibuja como una segunda tanda de puntos
  // encima, en vez de con más juegos de keyframes por combinación de estados.
  const marcas = anillo.map(([ar, ac]) => {
    const x = n1(x0Rej + BOTON_PULSADO.col * pasoBoton + ac * P_REJILLA);
    const y = n1(y0Rej + BOTON_PULSADO.fila * pasoBoton + ar * P_REJILLA);
    return `<circle class="marca" r="${R_PUNTO}" style="translate:${x}px ${y}px"/>`;
  }).join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"
     data-vd-hero=""${attrTema} role="img" aria-labelledby="${prefijo}titulo">
<title id="${prefijo}titulo">VirtualDeck — la retícula de puntos compone el nombre, se reordena en una rejilla de 4×4 botones y uno se pulsa.</title>
<defs>
  <radialGradient id="${prefijo}destello">
    <stop offset="0%" stop-color="var(--vd-accent)"/>
    <stop offset="55%" stop-color="var(--vd-accent)" stop-opacity="0"/>
  </radialGradient>
</defs>
<style>
${css.replace(/PREFIJO/g, prefijo)}
</style>
<rect class="bg" width="${W}" height="${H}"/>
<g>
${cuerpo}
</g>
<circle class="destello" r="${n1(LADO_BOTON * 0.62)}" style="translate:${n1(c.x)}px ${n1(c.y)}px"/>
<g>
${marcas}
</g>
</svg>`;
}

mkdirSync(SALIDA, { recursive: true });
writeFileSync(join(SALIDA, 'hero.svg'), svg('', null) + '\n');

// ── vista.html ───────────────────────────────────────────────────────────────
const vista = `<!doctype html>
<html lang="es">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>VirtualDeck — hero.svg sobre los dos temas</title>
<style>
  :root{ color-scheme:light dark; }
  body{
    margin:0; padding:24px; display:grid; gap:24px;
    font:13px/1.5 "JetBrains Mono", ui-monospace, monospace;
    background:#7a7a7a; color:#111;
  }
  figure{ margin:0; }
  figcaption{
    padding:6px 8px; background:#111; color:#dcdcdc;
    text-transform:uppercase; letter-spacing:.08em; font-size:11px;
  }
  svg, img{ display:block; width:100%; height:auto; }
  .nota{ background:#e8e8e8; padding:12px 14px; max-width:80ch; }
  .nota code{ background:#d4d4d4; padding:0 3px; }
</style>

<figure>
  <figcaption>data-theme="dark"</figcaption>
  ${svg('d-', 'dark').replace(/\n/g, '\n  ')}
</figure>

<figure>
  <figcaption>data-theme="light"</figcaption>
  ${svg('c-', 'light').replace(/\n/g, '\n  ')}
</figure>

<figure>
  <figcaption>hero.svg tal cual (&lt;img&gt;, sigue al tema del sistema)</figcaption>
  <img src="hero.svg" alt="Animación de cabecera de VirtualDeck">
</figure>

<p class="nota">
  Las dos primeras copias están <strong>incrustadas</strong> a propósito: un
  <code>&lt;img&gt;</code> es otro documento y solo obedece a
  <code>prefers-color-scheme</code>, así que no hay forma de forzar los dos temas
  en la misma página sin duplicar el SVG. Las tres salen de
  <code>scripts/generate-hero.mjs</code>, no hay copias a mano.
  Con <code>prefers-reduced-motion: reduce</code> las tres se quedan quietas en el
  fotograma de la pulsación.
</p>
</html>
`;
writeFileSync(join(SALIDA, 'vista.html'), vista);

console.log(`hero.svg: ${puntos.length} puntos (${puntos.filter((p) => p.encendida).length} de tinta), ` +
  `${anillo.length} de acento, bucle de ${CICLO}s`);
