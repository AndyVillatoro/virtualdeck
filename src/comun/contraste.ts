/**
 * Contraste automático del texto sobre un fondo propio, compartido por las
 * cinco superficies (deck, kiosko, barra flotante, mando móvil y tecla del
 * dock).
 *
 * Vive en `src/comun/` porque los dos procesos lo usan y tienen que dar el
 * mismo resultado: el renderer (celda) y el proceso principal (tecla LCD y
 * mando móvil). Puro: sin React, DOM, electron ni Node (regla `comun-es-puro`).
 */

/** Texto sobre un fondo claro. Casi negro OLED, nunca blanco (regla del proyecto). */
const TEXTO_EN_FONDO_CLARO = '#070809';
/** Texto sobre un fondo oscuro. Gris claro OLED, nunca `#ffffff`. */
const TEXTO_EN_FONDO_OSCURO = '#e6e8eb';

/** Umbral de luminancia WCAG a partir del cual el fondo cuenta como claro. */
const UMBRAL_LUMINANCIA = 0.22;

function linealizar(c: number): number {
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminancia(r: number, g: number, b: number): number {
  return 0.2126 * linealizar(r) + 0.7152 * linealizar(g) + 0.0722 * linealizar(b);
}

/**
 * `#rgb` / `#rrggbb` / `#rrggbbaa` (con o sin `#`) → sus canales 0-255.
 * Con alfa, se usa el color tal cual, sin mezclar contra ningún fondo.
 */
function rgbDeHex(texto: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(texto.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

const NUM = '[0-9]+(?:\\.[0-9]+)?';
const ALFA = '[0-9]*\\.?[0-9]+';

/**
 * `rgb(r,g,b)` / `rgba(r,g,b,a)` (0-255, con espacios opcionales) → 0-255.
 * Con alfa, se usa el color tal cual, sin mezclar contra ningún fondo.
 */
function rgbDeFuncional(texto: string): [number, number, number] | null {
  const m = new RegExp(
    `^rgba?\\(\\s*(${NUM})\\s*,\\s*(${NUM})\\s*,\\s*(${NUM})(?:\\s*,\\s*(${ALFA}))?\\s*\\)$`,
    'i',
  ).exec(texto.trim());
  if (!m) return null;
  const rgb = [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3])];
  if (rgb.some((v) => !Number.isFinite(v) || v < 0 || v > 255)) return null;
  return [rgb[0], rgb[1], rgb[2]];
}

/**
 * Qué color de texto se lee sobre un fondo de `color`: casi negro sobre
 * fondos claros, casi blanco sobre oscuros. Nunca `#ffffff`.
 * Acepta `#rgb`, `#rrggbb`, `#rrggbbaa` y `rgb()`/`rgba()`; con cualquier
 * otra cosa devuelve el oscuro (el comportamiento de antes).
 */
export function textoSobre(color: string): string {
  const rgb = rgbDeHex(color) ?? rgbDeFuncional(color);
  if (!rgb) return TEXTO_EN_FONDO_CLARO;
  const lum = luminancia(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255);
  return lum > UMBRAL_LUMINANCIA ? TEXTO_EN_FONDO_CLARO : TEXTO_EN_FONDO_OSCURO;
}

/** ¿El fondo es claro (el texto que lleva encima va en oscuro)? */
export function esFondoClaro(color: string): boolean {
  return textoSobre(color) === TEXTO_EN_FONDO_CLARO;
}
