/**
 * Diccionario espanol.
 *
 * Vive fuera de `i18n.tsx` porque el archivo llegaba a 1135 lineas y crecia
 * con cada texto nuevo: los tres diccionarios son datos, y mezclados con el
 * proveedor hacian ilegible lo poco que ahi es logica.
 *
 * Las claves son estables (no el texto). El orden importa solo para leerlo.
 */
import type { Dict } from './tipos';
import { ES_COMUN } from './esComun';
import { ES_EDITOR } from './esEditor';
import { ES_ACCIONES } from './esAcciones';
import { ES_AJUSTES } from './esAjustes';

/** Diccionario espanol completo: fusion de los fragmentos por dominio. */
export const ES: Dict = {
  ...ES_COMUN,
  ...ES_EDITOR,
  ...ES_ACCIONES,
  ...ES_AJUSTES,
};
