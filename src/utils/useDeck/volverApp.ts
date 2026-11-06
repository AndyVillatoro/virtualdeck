import type { ButtonConfig } from '../../types';
import { ES } from '../idiomas/es';

/**
 * La tecla «VOLVER» automática de una página vinculada a una aplicación
 * (roadmap 86): `page-nav` -> `first`, con el icono de la app en puntos.
 *
 * Puro a propósito —sin React, sin Electron, sin `t`— para poder probarlo con
 * `npx tsx` y para que el mismo criterio valga en el deck y en el dock. El
 * rótulo y el icono se **copian** dentro del botón al crearlo (como los datos
 * sembrados de `presetsDock`): no se traducen en caliente, porque son texto
 * guardado del usuario y traducirlos le cambiaría lo que ya tiene.
 */

const ORIGEN_PREFIJO = 'app:';

/**
 * Rótulo de la tecla automática. Sale del diccionario español (`ui.back`),
 * como el resto de textos sembrados que se **copian** dentro de un botón: no
 * se traduce en caliente y no se duplica el literal aquí.
 */
const ETIQUETA_VOLVER = ES['ui.back'];

/** Glifo DOT de respaldo cuando el núcleo no devolvió el icono del `.exe`. */
const GLIFO_VOLVER = 'ARROW_LEFT';

/**
 * ¿Este botón lo puso `aplicarBotonVolverApp`? Se reconoce por el `origen` del
 * icono (`app:<proceso>`) y, cuando la app no tenía icono, por su rótulo y
 * glifo: si no, desvincular no podría distinguirlo de un `page-nav` del
 * usuario y el icono que llegue después no se le podría actualizar.
 */
export function esBotonVolverApp(b: ButtonConfig): boolean {
  const a = b.action;
  if (a?.type !== 'page-nav' || a.pageNav !== 'first') return false;
  return Boolean(b.iconoPuntos?.origen?.startsWith(ORIGEN_PREFIJO))
    || (b.label === ETIQUETA_VOLVER && b.icon === GLIFO_VOLVER);
}

/** El botón tal como lo deja esta ayuda cuando la app no tiene icono. */
function botonVolver(plantilla: ButtonConfig, iconoPuntos?: { bits: string; origen: string }): ButtonConfig {
  return {
    id: plantilla.id,
    page: plantilla.page,
    label: ETIQUETA_VOLVER,
    icon: GLIFO_VOLVER,
    iconoPuntos,
    action: { type: 'page-nav', pageNav: 'first' },
  };
}

/** Hueco vacío de una página: sin acción, sin mosaico 2×2 y sin widget. */
function esHuecoVacio(b: ButtonConfig): boolean {
  return b.action.type === 'none' && !b.subButtons?.length && !b.widget;
}

/**
 * Coloca, actualiza o retira el botón automático «VOLVER» (`page-nav` ->
 * `first`) en los botones de una página (`pageIdx`).
 *
 * - Al desvincular (`app` vacío): si hay un botón creado automáticamente por
 *   este helper (`esBotonVolverApp(b)` y `b.label === 'VOLVER'`), lo limpia a
 *   vacío.
 * - Al vincular (`app` no vacío): si la página ya tiene algún `page-nav`, le
 *   actualiza `iconoPuntos` cuando es el automático (o no tiene icono) y no
 *   crea otro; si no tiene ninguno, ocupa el **último hueco vacío** —primero
 *   dentro de los primeros `maxHuecosPreferidos` de la página, que es donde
 *   están las teclas de un dock— y, si no hay hueco, no pisa nada.
 */
export function aplicarBotonVolverApp(
  buttons: ButtonConfig[],
  pageIdx: number,
  app: string,
  iconoApp?: string,
  maxHuecosPreferidos?: number,
): ButtonConfig[] {
  const deLaPagina = (b: ButtonConfig): boolean => b.page === pageIdx;

  if (!app) {
    let tocado = false;
    const limpios = buttons.map((b) => {
      if (!deLaPagina(b) || !esBotonVolverApp(b) || b.label !== ETIQUETA_VOLVER) return b;
      tocado = true;
      return { ...b, label: '', icon: '', iconoPuntos: undefined, action: { type: 'none' as const } };
    });
    return tocado ? limpios : buttons;
  }

  const iconoPuntos = iconoApp ? { bits: iconoApp, origen: `${ORIGEN_PREFIJO}${app}` } : undefined;
  // Posición de cada botón **dentro de la página** (0..n): el límite de huecos
  // preferidos cuenta teclas de la página, no índices del array global.
  const posicion = new Map<number, number>();
  let orden = 0;
  buttons.forEach((b, idx) => {
    if (!deLaPagina(b)) return;
    posicion.set(idx, orden);
    orden += 1;
  });

  const navs = buttons.filter((b) => deLaPagina(b) && b.action.type === 'page-nav');
  if (navs.length > 0) {
    let tocado = false;
    const actualizados = buttons.map((b) => {
      if (!deLaPagina(b) || b.action.type !== 'page-nav') return b;
      // Un `page-nav` del usuario con icono propio no se toca.
      if (!esBotonVolverApp(b) && b.iconoPuntos) return b;
      if (b.iconoPuntos?.bits === iconoPuntos?.bits && b.iconoPuntos?.origen === iconoPuntos?.origen) return b;
      tocado = true;
      return { ...b, iconoPuntos };
    });
    return tocado ? actualizados : buttons;
  }

  const vacios = buttons
    .map((b, idx) => ({ b, idx, orden: posicion.get(idx) ?? Number.MAX_SAFE_INTEGER }))
    .filter(({ b }) => deLaPagina(b) && esHuecoVacio(b));
  const preferidos = maxHuecosPreferidos === undefined
    ? []
    : vacios.filter(({ orden }) => orden < maxHuecosPreferidos);
  const candidatos = preferidos.length > 0 ? preferidos : vacios;
  if (candidatos.length === 0) return buttons;

  const elegido = candidatos[candidatos.length - 1];
  return buttons.map((b, idx) => (idx === elegido.idx ? botonVolver(elegido.b, iconoPuntos) : b));
}
