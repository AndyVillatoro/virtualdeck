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

/** El nombre de proceso tal como se guarda y se compara: sin `.exe`, minúsculas, sin espacios. */
export function normalizarApp(valor: string | null | undefined): string {
  return (valor ?? '').trim().replace(/\.exe$/i, '').toLowerCase();
}

/** El propio VirtualDeck y el runtime Electron nunca disparan un cambio. */
export function esAppPropia(normalizada: string): boolean {
  return normalizada === '' || normalizada === 'virtualdeck' || normalizada === 'electron';
}
