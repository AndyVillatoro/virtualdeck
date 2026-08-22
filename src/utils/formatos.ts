import type { Lang } from './i18n';

/**
 * Reloj y fecha del panel lateral y del widget de reloj.
 *
 * Estaban fijos en `'es'`, así que el nombre del día salía en español aunque
 * la interfaz estuviera en inglés. Ahora siguen al idioma elegido.
 *
 * Se cachean por idioma porque `Intl.DateTimeFormat` es caro de construir y el
 * reloj se redibuja cada segundo.
 */

const cacheHora = new Map<Lang, Intl.DateTimeFormat>();
const cacheFecha = new Map<Lang, Intl.DateTimeFormat>();

export function formatoHora(lang: Lang): Intl.DateTimeFormat {
  let f = cacheHora.get(lang);
  if (!f) {
    // hour12 en false a propósito: el deck se mira de reojo, y "14:05" se lee
    // de un vistazo mejor que "2:05 PM".
    f = new Intl.DateTimeFormat(lang, { hour: '2-digit', minute: '2-digit', hour12: false });
    cacheHora.set(lang, f);
  }
  return f;
}

export function formatoFecha(lang: Lang): Intl.DateTimeFormat {
  let f = cacheFecha.get(lang);
  if (!f) {
    f = new Intl.DateTimeFormat(lang, { weekday: 'short', day: '2-digit', month: 'short' });
    cacheFecha.set(lang, f);
  }
  return f;
}

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
