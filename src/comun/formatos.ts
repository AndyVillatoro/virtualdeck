/**
 * Formato de hora y fecha compartido por el deck y el proceso principal.
 *
 * Antes estaba duplicado en `src/utils/formatos.ts` y en
 * `electron/main/mando/mandoVivo.ts` (con su propia caché). Un único dueño evita que
 * una corrección se quede solo en un lado.
 *
 * Sin React, DOM ni Electron (regla `comun-es-puro`).
 */

export type Lang = 'es' | 'en';

const cacheHora = new Map<Lang, Intl.DateTimeFormat>();
const cacheFecha = new Map<Lang, Intl.DateTimeFormat>();

export function formatoHora(lang: Lang): Intl.DateTimeFormat {
  let f = cacheHora.get(lang);
  if (!f) {
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