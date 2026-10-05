/* VirtualDeck — Catálogo grande de iconos en puntos (roadmap 89).
 *
 * **Todo se carga bajo demanda** con `import()` dinámico, también el índice de
 * búsqueda (id, nombre y etiquetas, sin bitmaps): pesa ~870 KB, y con un
 * `import` estático entraría en el bundle principal en cuanto el selector de
 * iconos importara este módulo. Al elegir un icono se copia su mapa de puntos
 * en el botón: pintar nunca necesita el catálogo. */

import type { CatalogoDot, IndiceDot, NombreCatalogo } from './tipos';

export type { IconoDot, CatalogoDot, EntradaIndice, IndiceDot, NombreCatalogo } from './tipos';

let indice: Promise<IndiceDot> | null = null;

/** El índice para buscar; se pide una vez y se reutiliza. */
export function cargarIndice(): Promise<IndiceDot> {
  indice ??= import('./indice.json').then((m) => m.default as unknown as IndiceDot);
  return indice;
}

const CARGADORES: Record<NombreCatalogo, () => Promise<CatalogoDot>> = {
  marcas: () => import('./marcas.json').then((m) => m.default as CatalogoDot),
  acciones: () => import('./acciones.json').then((m) => m.default as CatalogoDot),
};

export function cargarCatalogo(nombre: NombreCatalogo): Promise<CatalogoDot> {
  return CARGADORES[nombre]();
}
