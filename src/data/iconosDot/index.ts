/* VirtualDeck — Catálogo grande de iconos en puntos (roadmap 89).
 *
 * **Todo se carga bajo demanda** con `import()` dinámico, también el índice de
 * búsqueda (id, nombre, etiquetas, categoría; sin bitmaps): con un `import`
 * estático entraría en el bundle principal en cuanto el selector de iconos
 * importara este módulo. Al elegir un icono se copia su mapa de puntos en el
 * botón: pintar nunca necesita el catálogo. */

import type { CatalogoDot, EntradaIndice, IndiceCrudo, IndiceDot, NombreCatalogo } from './tipos';

export type {
  IconoDot,
  CatalogoDot,
  EntradaIndice,
  IndiceDot,
  IndiceCrudo,
  GrupoIndice,
  OrigenEntrada,
  NombreCatalogo,
} from './tipos';

let indice: Promise<IndiceDot> | null = null;

/** El índice para buscar; se pide una vez y se reutiliza. */
export function cargarIndice(): Promise<IndiceDot> {
  indice ??= import('./indice.json').then((m) => resolverIndice(m.default as unknown as IndiceCrudo));
  return indice;
}

/** Traduce el JSON compacto (etiquetas por índice, acciones sin nombre) al índice de consumo. */
export function resolverIndice(crudo: IndiceCrudo): IndiceDot {
  const etiquetas = crudo.etiquetas;
  const resolverEtiquetas = (indices?: number[]): string[] =>
    (indices ?? []).map((i) => etiquetas[i]).filter((t): t is string => typeof t === 'string');
  const acciones: EntradaIndice[] = crudo.acciones.map(([id, indices, cat]) => [
    id,
    // El nombre de una acción es su id con guiones: no se guarda en disco.
    id.replace(/-/g, ' '),
    resolverEtiquetas(indices),
    { catalogo: 'acciones', categoria: crudo.categorias[cat]?.[0] },
  ]);
  const marcas: EntradaIndice[] = crudo.marcas.map(([id, nombre, indices]) => [
    id,
    nombre,
    resolverEtiquetas(indices),
    { catalogo: 'marcas' },
  ]);
  return {
    formato: crudo.formato,
    categorias: crudo.categorias.map(([titulo, recuento]) => ({ titulo, recuento })),
    destacadas: crudo.destacadas.map(([titulo, ids]) => ({ titulo, recuento: ids.length, ids })),
    marcas,
    acciones,
  };
}

const CARGADORES: Record<NombreCatalogo, () => Promise<CatalogoDot>> = {
  marcas: () => import('./marcas.json').then((m) => m.default as CatalogoDot),
  acciones: () => import('./acciones.json').then((m) => m.default as CatalogoDot),
};

export function cargarCatalogo(nombre: NombreCatalogo): Promise<CatalogoDot> {
  return CARGADORES[nombre]();
}
