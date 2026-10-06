/**
 * Nombres de aplicación, en un solo sitio.
 *
 * El nombre de proceso tal como se guarda y se compara: sin `.exe`,
 * minúsculas, sin espacios. Estaba escrito en cuatro sitios
 * (`BarraSuperiorMain`, `ModalVincularApp`, `useDeck/paginas` y
 * `superficies/paginaSegunApp`), y `useAutoProfile` comparaba sin quitar el
 * `.exe`: un `OBS64.exe` importado cambiaba el dock pero no el deck.
 * `estadoSistema` quitaba el `.exe` sin `trim`. Todo pasa por aquí.
 */

/** El nombre de proceso tal como se guarda y se compara: sin `.exe`, minúsculas, sin espacios. Se reexporta de `src/comun/visibilidad`, que es lo que comparte el mando móvil. */
export { normalizarApp } from '../comun/visibilidad';

/** El propio VirtualDeck y el runtime Electron nunca disparan un cambio. */
export function esAppPropia(normalizada: string): boolean {
  return normalizada === '' || normalizada === 'virtualdeck' || normalizada === 'electron';
}
