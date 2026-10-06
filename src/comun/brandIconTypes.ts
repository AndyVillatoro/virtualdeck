/**
 * Tipos y constantes livianas del pack de iconos de marca.
 *
 * Viven aparte de `brandIcons.ts` (42 KiB de bitmaps que se cargan diferidos
 * vía `utils/catalogoMarcas`): importar este módulo no arrastra los datos.
 */

export interface BrandIcon {
  key: string;
  label: string;
  color: string;
  anim: string;
  bitmap: string[];
  palette?: Record<string, string>;
  group: string;
}

/** Lado de la matriz de puntos (17×17). */
export const ICON_SIZE = 17;

const ICON_PITCH = 8, ICON_PAD = 4, ICON_VB = 140;

/**
 * De una fracción 0..1 sobre el lienzo a la celda que hay debajo.
 *
 * Hace falta porque el dibujo **no** reparte el ancho en 17 tramos iguales:
 * cada punto va en `ICON_PAD + c * ICON_PITCH + ICON_PITCH / 2` sobre un
 * `viewBox` de `ICON_VB`. Dividir el ancho entre 17 da un centro distinto, y
 * la diferencia es mayor cuanto más a la izquierda: en un lienzo de 300 px son
 * 8 px en la primera columna y casi cero en la última. Se notaba como que el
 * clic caía a la izquierda del cursor, y no había forma de pintar fino.
 */
export function celdaDesdeFraccion(f: number): number {
  return Math.floor((f * ICON_VB - ICON_PAD) / ICON_PITCH);
}
