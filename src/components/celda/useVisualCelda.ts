import { contextoDeBoton, esAccionPlugin } from '../../utils/plugins/ref';
import { useVisualPlugin } from '../../utils/plugins/visual';
import type { ButtonConfig } from '../../types';

/**
 * Lo que el plugin de este botón está pintando, o `undefined` si no es un
 * botón de plugin (roadmap 83).
 *
 * Va por el store y **no** por props a propósito: la celda está memoizada y
 * solo se redibuja cuando cambian sus props, y un `setImage` del plugin no
 * cambia ninguna — llega del proceso principal sin que nadie lo pida. Con
 * `useSyncExternalStore` se entera sola esta celda, y solo si su botón es de
 * plugin (con `contexto === null` no hay suscripción abierta).
 *
 * El contexto es el del deck (`deck:<id>`): esta celda solo se pinta en la
 * cuadrícula del deck, en el kiosko y en la barra flotante, y las tres
 * enseñan los mismos botones con los mismos ids. Las teclas de un dock se
 * pintan por otro camino (`pintarTecla`) y aún no muestran imagen de plugin
 * (ver `docs/NOTAS-TECNICAS`).
 */
export function useVisualCelda(button: ButtonConfig): { imagen?: string; titulo?: string } | undefined {
  const contexto = esAccionPlugin(button.action) ? contextoDeBoton(button.id) : null;
  const visual = useVisualPlugin(contexto);
  if (!visual?.imagen && !visual?.titulo) return undefined;
  return { imagen: visual.imagen, titulo: visual.titulo };
}
