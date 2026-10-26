import type { ButtonConfig, DeckConfig, PageConfig } from '../types';

/**
 * El `contexto` de un botón para los plugins, parte pura compartida entre el
 * renderer (la celda y las apariciones de `src/utils/plugins/ref.ts`) y el
 * proceso principal (el mando móvil, que le tiene que enseñar al móvil lo
 * último que el plugin pintó — roadmap 83 c).
 *
 * Es `<superficie>:<id del botón>`, y el id es **del botón, no de su
 * posición**: borrar una página renumera índices sin renumerar ids, así que
 * atarse a la posición haría que el contexto apuntara a otro botón. Los ids
 * de botón nunca llevan dos puntos, por eso solo hay que separar en el
 * último para volver del contexto al id.
 */

const SUPERFICIE_DECK = 'deck';

/** La superficie donde se ve un botón: el serial del dock de su página, o `deck`. */
export function superficieDe(paginas: PageConfig[] | undefined, indicePagina: number | undefined): string {
  if (indicePagina === undefined) return SUPERFICIE_DECK;
  return paginas?.[indicePagina]?.superficie?.serial ?? SUPERFICIE_DECK;
}

/** `<superficie>:<id>` para un botón del deck. */
export function contextoDeBoton(id: string): string {
  return `${SUPERFICIE_DECK}:${id}`;
}

/** El id del botón dentro de un contexto. `null` si el contexto no trae id. */
export function idDeContexto(contexto: string): string | null {
  const corte = contexto.lastIndexOf(':');
  if (corte < 0 || corte === contexto.length - 1) return null;
  return contexto.slice(corte + 1);
}

/** `<superficie>:<id>` para un botón, mirando en qué página vive. */
export function contextoDe(btn: ButtonConfig, config?: Pick<DeckConfig, 'pages'>): string {
  const serial = superficieDe(config?.pages, btn.page);
  return serial === SUPERFICIE_DECK ? contextoDeBoton(btn.id) : `${serial}:${btn.id}`;
}
