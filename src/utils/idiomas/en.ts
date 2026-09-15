/**
 * Diccionario ingles.
 *
 * Vive fuera de `i18n.tsx` porque el archivo llegaba a 1135 lineas y crecia
 * con cada texto nuevo: los tres diccionarios son datos, y mezclados con el
 * proveedor hacian ilegible lo poco que ahi es logica.
 *
 * Las claves son estables (no el texto). El orden importa solo para leerlo.
 */
import type { Dict } from './tipos';
import { EN_COMUN } from './enComun';
import { EN_EDITOR } from './enEditor';
import { EN_ACCIONES } from './enAcciones';
import { EN_AJUSTES } from './enAjustes';

/** Diccionario ingles completo: fusion de los fragmentos por dominio. */
export const EN: Dict = {
  ...EN_COMUN,
  ...EN_EDITOR,
  ...EN_ACCIONES,
  ...EN_AJUSTES,
};
