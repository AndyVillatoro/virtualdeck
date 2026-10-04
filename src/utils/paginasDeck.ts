import type { PageConfig } from '../types';

/**
 * Las páginas del deck, sin las de los docks.
 *
 * Las páginas de un dispositivo físico se editan en `Dispositivos`: en las
 * pestañas de la principal salían, y desde su menú se les podía cambiar la
 * cuadrícula (rompiendo la correspondencia con las teclas, que sale de
 * `rejillaDe`) y vincular app sin deshacer. `activePage` es un **índice de
 * `config.pages`**: no se renumera, se filtra al enseñar y al navegar.
 */

/** Una página del deck es la que no es de ningún dock. */
export function esPaginaDeck(p: PageConfig): boolean {
  return !p.superficie;
}

/** Índices reales (en `config.pages`) de las páginas del deck, en orden. */
export function indicesPaginasDeck(paginas: readonly PageConfig[]): number[] {
  const salida: number[] = [];
  paginas.forEach((p, i) => { if (!p.superficie) salida.push(i); });
  return salida;
}

/** Posición de una página real entre las del deck (para el «N de M»), o `null` si es de dock. */
export function posicionEnDeck(paginas: readonly PageConfig[], indiceReal: number): number | null {
  const indices = indicesPaginasDeck(paginas);
  const pos = indices.indexOf(indiceReal);
  return pos === -1 ? null : pos;
}

/**
 * Índice real de la página N del deck (teclas 1–9 y atajos), o `null` si no
 * hay tal página. Las de dock no tienen número aquí.
 */
export function indiceRealPorNumero(paginas: readonly PageConfig[], tecla: string): number | null {
  const n = parseInt(tecla, 10);
  if (isNaN(n) || n < 1) return null;
  return indicesPaginasDeck(paginas)[n - 1] ?? null;
}
