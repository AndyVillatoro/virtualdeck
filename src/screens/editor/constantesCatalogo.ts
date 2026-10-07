import type { NombreCatalogo } from '../../data/iconosDot/tipos';

export const CAT_ACCIONES: NombreCatalogo = 'acciones';
export const CAT_MARCAS: NombreCatalogo = 'marcas';
export const PREFIJO_ACCIONES = 'acciones:';
export const PREFIJO_MARCAS = 'marcas:';

/** Lo que devuelve el catálogo grande al elegir: un glifo 8×8 o un icono de puntos. */
export type IconoElegido =
  | { tipo: 'glifo'; icon: string }
  | { tipo: 'puntos'; bits: string; origen: string };

/** Con qué grupo abre el catálogo: un catálogo de bitmaps o la fila de glifos. */
export type SeccionCatalogo = NombreCatalogo | 'glifos';
