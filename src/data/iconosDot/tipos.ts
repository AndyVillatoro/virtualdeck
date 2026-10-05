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

/** [id, nombre, etiquetas] — el índice ligero de búsqueda, sin bitmaps. */
export type EntradaIndice = [string, string, string[]];

export interface IndiceDot {
  formato: string;
  marcas: EntradaIndice[];
  acciones: EntradaIndice[];
}

/** Los catálogos disponibles: las claves de `IndiceDot` menos su metadata. */
export type NombreCatalogo = keyof Omit<IndiceDot, 'formato'>;
