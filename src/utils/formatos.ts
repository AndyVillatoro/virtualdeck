import type { Lang } from '../comun/formatos';
export { formatoHora, formatoFecha } from '../comun/formatos';

/**
 * Reloj y fecha del panel lateral y del widget de reloj: el formato base
 * (hora y fecha corta) vive ahora en `src/comun/formatos.ts` para compartirlo
 * con el proceso principal. Aquí quedan solo los formatos específicos del
 * renderer (día y día-mes del kiosko).
 */

const cacheDia = new Map<Lang, Intl.DateTimeFormat>();
const cacheDiaMes = new Map<Lang, Intl.DateTimeFormat>();

/**
 * El día y el día-mes del reloj grande de kiosko.
 *
 * Estaban fijos en `'es-HN'` dentro de `FullscreenB`, asi que con la interfaz
 * en ingles la pantalla completa seguia diciendo «VIE» y «21 AGO». Como es una
 * constante de modulo y no pasa por `t()`, ninguna de las cinco comprobaciones
 * de i18n podia verlo: no es un literal de texto, es un locale.
 */
export function formatoDia(lang: Lang): Intl.DateTimeFormat {
  let f = cacheDia.get(lang);
  if (!f) { f = new Intl.DateTimeFormat(lang, { weekday: 'short' }); cacheDia.set(lang, f); }
  return f;
}

export function formatoDiaMes(lang: Lang): Intl.DateTimeFormat {
  let f = cacheDiaMes.get(lang);
  if (!f) { f = new Intl.DateTimeFormat(lang, { month: 'short', day: 'numeric' }); cacheDiaMes.set(lang, f); }
  return f;
}
