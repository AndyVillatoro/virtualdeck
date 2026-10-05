/**
 * Iconos del catálogo grande (roadmap 89) guardados en un botón: 16×16 puntos.
 *
 * Formato `bits` (el del catálogo, `src/data/iconosDot/`): 32 bytes en base64,
 * fila a fila (x + 16·y), bit más significativo primero, 1 = punto encendido.
 *
 * Datos puros, sin React ni DOM: lo usan la celda, el pintor de la tecla
 * física **y el proceso principal** (el mando móvil), por eso la regla de
 * capas lo permite desde `electron/main` (`.dependency-cruiser.cjs`).
 */

export const LADO_PUNTOS16 = 16;

/** De base64 a 16 filas de 16 booleanos; `null` si no son 32 bytes. */
export function matrizDePuntos16(bits: string): boolean[][] | null {
  let bytes: number[];
  try {
    const crudo = typeof atob === 'function'
      ? atob(bits)
      : Buffer.from(bits, 'base64').toString('binary');
    bytes = Array.from(crudo, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
  if (bytes.length !== 32) return null;
  return Array.from({ length: LADO_PUNTOS16 }, (_, y) =>
    Array.from({ length: LADO_PUNTOS16 }, (_, x) => {
      const i = x + LADO_PUNTOS16 * y;
      return Boolean((bytes[i >> 3] >> (7 - (i & 7))) & 1);
    }));
}
