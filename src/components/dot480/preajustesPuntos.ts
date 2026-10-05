import { GLYPHS_5x7 } from '../../design';

/**
 * EditorPuntos — preajustes del glifo 5×7.
 *
 * Los símbolos icónicos venían de `Glyph57Editor` (archivo a borrar cuando
 * nada lo importe): se copian aquí para no depender de él. La pestaña de
 * tipografía lee la misma fuente 5×7 del producto (`design.ts`).
 */

/** Símbolos icónicos pre-calculados en matriz 5×7 (filas de bits, bit 4 a la izquierda). */
export const SIMBOLOS_5X7: Record<string, number[]> = {
  PLAY: [16, 24, 28, 30, 28, 24, 16],
  PAUSE: [27, 27, 27, 27, 27, 27, 27],
  STOP: [0, 31, 31, 31, 31, 31, 0],
  NEXT: [0, 17, 25, 29, 25, 17, 0],
  PREV: [0, 17, 19, 23, 19, 17, 0],
  HEART: [0, 10, 31, 31, 14, 4, 0],
  CHECK: [0, 1, 2, 4, 20, 8, 0],
  CROSS: [17, 17, 10, 4, 10, 17, 17],
  UP: [4, 14, 21, 4, 4, 4, 4],
  DOWN: [4, 4, 4, 4, 21, 14, 4],
  LEFT: [0, 4, 8, 31, 8, 4, 0],
  RIGHT: [0, 4, 2, 31, 2, 4, 0],
  BOLT: [6, 12, 31, 3, 6, 12, 8],
  BELL: [4, 14, 14, 14, 31, 0, 4],
  LOCK: [14, 17, 17, 31, 27, 31, 31],
  AUDIO: [1, 3, 15, 31, 15, 3, 1],
};

/** Letras y dígitos que la fuente 5×7 sabe dibujar. */
export function letrasDeFuente57(): string[] {
  return Object.keys(GLYPHS_5x7).filter((k) => /[A-Z0-9]/.test(k));
}

/** Filas de bits de una letra de la fuente, si existe. */
export function filasDesdeFuente57(letra: string): number[] | undefined {
  const g = GLYPHS_5x7[letra];
  return g && g.length === 7 ? [...g] : undefined;
}
