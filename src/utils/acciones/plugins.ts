import { OK, fail, type ActionResult, type Manejador } from './base';
import { refDe } from '../plugins/ref';
import type { PluginRef } from '../../types/plugins';
import type { ElectronAPI } from '../../types';
import type { TFunc } from '../i18n';

/**
 * La acción `plugin`: la tecla de un plugin del SDK de Stream Deck.
 *
 * El ciclo es el del hardware real —`keyDown` y, un momento después,
 * `keyUp`—, porque hay plugins que distinguen los dos: los que mantienen algo
 * pulsado (un paging que vuelve al origen, un talkback que sigue escuchando)
 * no hacen nada con el `keyUp` si no les llega. Por eso el `false` va con un
 * temporizador y **no** al terminar el manejador.
 */

/** Entre `keyDown` y `keyUp`: lo que tarda una tecla física. */
const MS_SOLTAR = 60;

/**
 * El botón que se está pulsando, y con qué contexto.
 *
 * Vive en un `WeakMap` y **no** en una variable de módulo: la pulsación es
 * asíncrona (hay esperas entre pasos) y dos botones pueden pulsarse a la vez,
 * así que un «contexto actual» global se cambiaría bajo los pies del otro. Con
 * la identidad del propio objeto de acción no hay carrera: cada ejecución
 * lleva la suya.
 *
 * Lo escribe `pulsarBoton`, que es el único sitio por donde pasa lo que se
 * ejecuta al pulsar un botón (ver su cabecera).
 */
const contextos = new WeakMap<object, string>();

/** Anota con qué contexto se van a ejecutar estas acciones. */
export function anotarContextos(acciones: readonly object[], contexto: string): void {
  for (const a of acciones) contextos.set(a, contexto);
}

/** El contexto con el que se está ejecutando esta acción, si se conoce. */
function contextoDeAccion(accion: object): string | null {
  return contextos.get(accion) ?? null;
}

/**
 * Los dos porqués de no tener referencia, que son distintos y se dicen
 * distinto: o el botón no eligió plugin (se eligió el tipo y nada más), o la
 * acción no viene de un botón del deck (los de una carpeta no tienen id).
 */
function sinElegir(t: TFunc): ActionResult {
  return fail(t('act.err.pluginSinRef'));
}

function sinContexto(t: TFunc): ActionResult {
  return fail(t('act.err.pluginSinContexto'));
}

/**
 * El `press` de bajada, que es el que puede fallar de verdad: sin plugin
 * instalado, deshabilitado o con el proceso caído, el proceso principal
 * devuelve `false` y hay que decirlo en vez de dejar el botón mudo.
 */
async function bajar(api: ElectronAPI, ref: PluginRef, t: TFunc): Promise<ActionResult> {
  try {
    if (await api.plugins.press(ref, true)) return OK;
  } catch (err) {
    console.warn('[plugins] press refused', err);
  }
  return fail(t('act.err.plugin', { plugin: ref.pluginUuid }));
}

export const PLUGINS: Record<string, Manejador> = {
  'plugin': async ({ action, api, t }) => {
    const contexto = contextoDeAccion(action);
    if (!contexto) return sinContexto(t);
    const ref = refDe(action, contexto);
    if (!ref) return sinElegir(t);

    const r = await bajar(api, ref, t);
    if (!r.ok) return r;
    // La subida va sin esperar: el manejador ya no tiene nada que decir y el
    // botón puede seguir con el paso siguiente de su secuencia.
    setTimeout(() => {
      api.plugins.press(ref, false).catch(() => {});
    }, MS_SOLTAR);
    return OK;
  },
};
