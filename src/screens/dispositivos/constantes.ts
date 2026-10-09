/**
 * Constantes con nombre y cálculos de diseño responsivo para la pantalla de Dispositivos.
 *
 * Soportan adaptación continua desde el tamaño mínimo de ventana (400×240)
 * hasta pantalla completa en monitores ultra-anchos.
 */

/** Por debajo de este ancho de ventana, el inspector lateral se pliega por defecto. */
export const PUNTO_CORTE_INSPECTOR = 860;

/** Por debajo de este ancho de ventana, la lista de dispositivos se pliega por defecto. */
export const PUNTO_CORTE_LISTA = 580;

/** Ancho mínimo legible de la lista de dispositivos hardware. */
const ANCHO_MIN_LISTA = 170;

/** Ancho máximo de la lista de dispositivos hardware en escritorios anchos. */
const ANCHO_MAX_LISTA = 240;

/** Ancho mínimo legible del panel inspector de control. */
const ANCHO_MIN_INSPECTOR = 200;

/** Ancho máximo del panel inspector de control. */
const ANCHO_MAX_INSPECTOR = 280;

/**
 * Calcula el ancho dinámico proporcional de la lista izquierda (entre 170px y 240px).
 */
export function calcularAnchoLista(anchoVentana: number): number {
  const prop = Math.round(anchoVentana * 0.22);
  return Math.min(ANCHO_MAX_LISTA, Math.max(ANCHO_MIN_LISTA, prop));
}

/**
 * Calcula el ancho dinámico proporcional del inspector derecho (entre 200px y 280px).
 */
export function calcularAnchoInspector(anchoVentana: number): number {
  const prop = Math.round(anchoVentana * 0.26);
  return Math.min(ANCHO_MAX_INSPECTOR, Math.max(ANCHO_MIN_INSPECTOR, prop));
}
