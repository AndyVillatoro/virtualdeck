/**
 * EditorPuntos — matrices de puntos y conversiones (lógica pura, sin React).
 *
 * Une los dos formatos que hoy guardan los botones dibujados a mano:
 * - glifo 5×7 monocromo (`ButtonConfig.customGlyph57`: 7 filas de 5 bits);
 * - mapa de bits 17×17 con paleta (`brandIconCustomBitmap` / `...Color` / `...Palette`).
 *
 * La celda interna es siempre `''` (apagada) o un hex (`'#rrggbb'`, encendida):
 * en modo monocromo todas las encendidas llevan el mismo hex y al guardar se
 * colapsan a bits; en modo paleta cada hex se reparte en una letra del mapa.
 *
 * Un fotograma = una matriz. El estado del editor guarda una lista de
 * fotogramas con un índice activo (hoy siempre 0): la estructura ya sirve
 * para los iconos animados del roadmap 78, sin interfaz todavía.
 */

export type CeldaPunto = string;
export type MatrizPuntos = CeldaPunto[][];
export type FotogramaPuntos = MatrizPuntos;

export const ANCHO_GLIFO = 5;
export const ALTO_GLIFO = 7;
export const ANCHO_MARCA = 17;
export const ALTO_MARCA = 17;

/** Matriz apagada de w×h. */
export function matrizVacia(w: number, h: number): MatrizPuntos {
  const m: MatrizPuntos = [];
  for (let y = 0; y < h; y++) m.push(new Array<CeldaPunto>(w).fill(''));
  return m;
}

/** Matriz encendida entera con un color. */
export function matrizLlena(w: number, h: number, color: string): MatrizPuntos {
  const m: MatrizPuntos = [];
  for (let y = 0; y < h; y++) m.push(new Array<CeldaPunto>(w).fill(color));
  return m;
}

/** Copia profunda (una fila compartida haría que pintar una celda pintara varias). */
export function clonarMatriz(m: MatrizPuntos): MatrizPuntos {
  return m.map((fila) => [...fila]);
}

/** ¿Hay algo dibujado? */
export function estaVacia(m: MatrizPuntos): boolean {
  return m.every((fila) => fila.every((c) => !c));
}

/** Puntos encendidos (el contador de la cabecera). */
export function contarPuntos(m: MatrizPuntos): number {
  let n = 0;
  for (const fila of m) for (const c of fila) if (c) n++;
  return n;
}

/** Hex distintos en orden de aparición (franja «en uso»). */
export function coloresUsados(m: MatrizPuntos): string[] {
  const vistos = new Set<string>();
  const out: string[] = [];
  for (const fila of m) {
    for (const c of fila) {
      if (!c || vistos.has(c)) continue;
      vistos.add(c);
      out.push(c);
    }
  }
  return out;
}

/** Invierte: lo encendido se apaga y lo apagado se enciende con `color`. */
export function invertirMatriz(m: MatrizPuntos, color: string): MatrizPuntos {
  return m.map((fila) => fila.map((c) => (c ? '' : color)));
}

/**
 * Desplaza dx columnas / dy filas SIN wrap (lo que sale se pierde, entra apagado).
 * Mismo comportamiento que el pad del editor 5×7 original.
 */
export function desplazarMatriz(m: MatrizPuntos, dx: number, dy: number): MatrizPuntos {
  const h = m.length;
  const w = m[0]?.length ?? 0;
  const out = matrizVacia(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ox = x - dx;
      const oy = y - dy;
      if (ox >= 0 && ox < w && oy >= 0 && oy < h) out[y][x] = m[oy][ox];
    }
  }
  return out;
}

/** Espejo horizontal (conserva colores). */
export function voltearHMatriz(m: MatrizPuntos): MatrizPuntos {
  return m.map((fila) => [...fila].reverse());
}

/** Espejo vertical (conserva colores). */
export function voltearVMatriz(m: MatrizPuntos): MatrizPuntos {
  return [...m].reverse();
}

/** Repinta todo lo encendido con un solo color (paso paleta → mono). */
export function unificarColor(m: MatrizPuntos, color: string): MatrizPuntos {
  return m.map((fila) => fila.map((c) => (c ? color : '')));
}

// ── Glifo 5×7 ────────────────────────────────────────────────────────────────

/** Filas de bits (bit 4 a la izquierda) → matriz 5×7. */
export function filas57AMatriz(rows: number[], color: string): MatrizPuntos {
  const m = matrizVacia(ANCHO_GLIFO, ALTO_GLIFO);
  for (let y = 0; y < ALTO_GLIFO; y++) {
    const row = rows[y] ?? 0;
    for (let x = 0; x < ANCHO_GLIFO; x++) {
      if ((row >> (4 - x)) & 1) m[y][x] = color;
    }
  }
  return m;
}

/** Matriz → 7 filas de bits (cualquier hex cuenta como encendido). */
export function matrizAFilas57(m: MatrizPuntos): number[] {
  const rows: number[] = [];
  for (let y = 0; y < ALTO_GLIFO; y++) {
    let row = 0;
    const fila = m[y] ?? [];
    for (let x = 0; x < ANCHO_GLIFO; x++) {
      if (fila[x]) row |= 1 << (4 - x);
    }
    rows.push(row);
  }
  return rows;
}

// ── Mapa de bits 17×17 ───────────────────────────────────────────────────────

/** Mapa del catálogo (letras + paleta) → matriz de hex. */
export function mapaBitsAMatriz(
  bitmap: string[],
  primario: string,
  paleta: Record<string, string>,
): MatrizPuntos {
  const m = matrizVacia(ANCHO_MARCA, ALTO_MARCA);
  for (let y = 0; y < ALTO_MARCA; y++) {
    const fila = bitmap[y] ?? '';
    for (let x = 0; x < ANCHO_MARCA; x++) {
      const ch = fila[x] ?? '.';
      if (ch === '.' || ch === ' ') continue;
      m[y][x] = ch === '#' ? primario : (paleta[ch] ?? primario);
    }
  }
  return m;
}

function hexEq(a: string, b: string): boolean {
  return (a || '').toLowerCase() === (b || '').toLowerCase();
}

/** ¿Los dos hex son el mismo color (insensible a mayúsculas)? */
export function mismoHex(a: string, b: string): boolean {
  return hexEq(a, b);
}

/** Letras disponibles para colores nuevos ('#' es el primario, '.' apagado). */
const LETRAS_LIBRES = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ@$%&+';

function letraParaColor(
  hex: string,
  primario: string,
  base: Record<string, string>,
  asignadas: Map<string, { letra: string; hex: string }>,
  usadas: Set<string>,
): string {
  if (hexEq(hex, primario)) return '#';
  for (const [letra, color] of Object.entries(base)) {
    if (hexEq(color, hex)) return letra;
  }
  const previa = asignadas.get(hex.toLowerCase());
  if (previa) return previa.letra;
  for (const c of LETRAS_LIBRES) {
    if (!usadas.has(c)) {
      asignadas.set(hex.toLowerCase(), { letra: c, hex });
      usadas.add(c);
      return c;
    }
  }
  return '?';
}

/**
 * Matriz → mapa de bits con paleta recortada.
 *
 * `base` es la paleta incorporada del icono (p. ej. TikTok multicolor): sus
 * letras se reutilizan pero NO se emiten, igual que hacía el editor original,
 * para no hinchar el archivo de configuración.
 */
export function matrizAMapaBits(
  m: MatrizPuntos,
  primario: string,
  base: Record<string, string>,
): { bitmap: string[]; paleta: Record<string, string> } {
  const usadas = new Set<string>(['#', '.', ' ', ...Object.keys(base)]);
  const asignadas = new Map<string, { letra: string; hex: string }>();
  const bitmap: string[] = [];
  for (let y = 0; y < ALTO_MARCA; y++) {
    let fila = '';
    const fr = m[y] ?? [];
    for (let x = 0; x < ANCHO_MARCA; x++) {
      const c = fr[x] ?? '';
      fila += !c ? '.' : letraParaColor(c, primario, base, asignadas, usadas);
    }
    bitmap.push(fila);
  }
  const paleta: Record<string, string> = {};
  for (const { letra, hex } of asignadas.values()) paleta[letra] = hex;
  return { bitmap, paleta };
}

// ── Trazo ────────────────────────────────────────────────────────────────────

/** Celda de rejilla. */
export interface PuntoCelda {
  r: number;
  c: number;
}

/**
 * Celdas de la recta entre dos puntos (Bresenham): arrastrar rápido no deja
 * huecos. Venía del editor de marca; el 5×7 pintaba celda a celda.
 */
export function celdasDeLinea(desde: PuntoCelda | null, hasta: PuntoCelda): PuntoCelda[] {
  if (!desde) return [hasta];
  const out: PuntoCelda[] = [];
  let x0 = desde.c;
  let y0 = desde.r;
  const x1 = hasta.c;
  const y1 = hasta.r;
  const dx = Math.abs(x1 - x0);
  const sx = x0 < x1 ? 1 : -1;
  const dy = -Math.abs(y1 - y0);
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    out.push({ r: y0, c: x0 });
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
  }
  return out;
}
