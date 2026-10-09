/* VirtualDeck — Catálogo de iconos DOT (16×16). Tipos compartidos, sin datos. */

/** [id, bits] — el nombre y las etiquetas viven en el índice, no aquí. */
export type IconoDot = [string, string];

export interface CatalogoDot {
  fuente: string;
  licencia: string;
  umbral: number;
  /** 256 bits (16×16) en base64: fila a fila (x + 16·y), bit más significativo primero, 1 = punto encendido. */
  formatoBits: string;
  /** [id, bits] por icono, en el mismo orden que su lista del índice. */
  iconos: IconoDot[];
}

/** Los catálogos disponibles (los bitmaps), derivados de las claves del índice. */
export type NombreCatalogo = keyof Omit<IndiceDot, 'formato' | 'categorias' | 'destacadas'>;

/** De dónde sale una entrada del índice. */
export interface OrigenEntrada {
  catalogo: NombreCatalogo;
  /** Categoría de Tabler; solo en las acciones. */
  categoria?: string;
}

/**
 * [id, nombre, etiquetas, origen] — entrada resuelta de búsqueda, sin bitmaps.
 * La búsqueda mira id, nombre, etiquetas y categoría, igual que antes de mover
 * la categoría fuera de las etiquetas.
 */
export type EntradaIndice = [string, string, string[], OrigenEntrada];

/** Categoría de Tabler o subgrupo de marcas destacadas, con su recuento. */
export interface GrupoIndice {
  titulo: string;
  recuento: number;
  /** Solo en los subgrupos de marcas destacadas: los ids que agrupa. */
  ids?: string[];
}

/** Índice resuelto: lo que consume el selector (ver `resolverIndice`). */
export interface IndiceDot {
  formato: string;
  categorias: GrupoIndice[];
  destacadas: GrupoIndice[];
  marcas: EntradaIndice[];
  acciones: EntradaIndice[];
}

/** Formato compacto de `indice.json`: etiquetas por índice y acciones sin nombre. */
type CrudoMarca = [string, string] | [string, string, number[]];
/** [id, etiquetas(indices), categoria(indice; -1 = sin categoria)] */
type CrudoAccion = [string, number[], number];

export interface IndiceCrudo {
  formato: string;
  /** Tabla compartida de etiquetas: cada icono la referencia por posición. */
  etiquetas: string[];
  /** [titulo, recuento] de las categorías de Tabler, en orden alfabético. */
  categorias: [string, number][];
  /** [titulo, [ids de Simple Icons]] de los subgrupos de marcas destacadas. */
  destacadas: [string, string[]][];
  marcas: CrudoMarca[];
  acciones: CrudoAccion[];
}
