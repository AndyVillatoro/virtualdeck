import type { ButtonAction, ButtonConfig, PluginRef } from '../../types';
import {
  contextoDe,
  contextoDeBoton,
  idDeContexto,
  superficieDe,
} from '../../comun/contextoPlugin';

/**
 * El `contexto` de un botón: lo que el plugin usa para saber **de quién** es
 * la tecla que acaba de pulsar o de aparecer.
 *
 * Es `<superficie>:<id del botón>`. Dos reglas del proyecto lo mandan:
 *
 * - **El id es del botón, no de su posición.** `conHuecosCompletos` rellena los
 *   huecos por posición, y borrar una página renumera índices sin renumerar
 *   ids: atarse al índice haría que el contexto apuntara a otro botón.
 * - **La superficie va delante.** El mismo botón del deck y el de su copia en
 *   un dock son el mismo plugin con dos teclas distintas; si compartieran
 *   contexto, el `setState` de uno se pintaría en la otra.
 *
 * La superficie sale de la **página** del botón: una página de dock lleva
 * `superficie.serial`, y las del deck no llevan nada. La barra flotante, el
 * kiosco y el mando móvil enseñan los mismos botones del deck, así que
 * comparten contexto a propósito: es la misma tecla del mismo plugin.
 *
 * Cómo se forma el contexto (y cómo se vuelve de él al id del botón) vive en
 * `src/comun/contextoPlugin.ts`: es lógica pura que el proceso principal
 * también necesita ahora —el mando móvil le lleva al móvil lo último que
 * pinta cada plugin, roadmap 83 c— y no puede importarla de `src/utils`
 * (regla `main-no-renderer`). Se reexporta aquí para que nadie deje de
 * importarla de `ref`. Este módulo conserva lo suyo: la narrowing de la
 * acción y las referencias que viajan por IPC.
 */

// La formación del contexto, tal cual estaba (movida a `src/comun/`):
// mismas funciones, quien importaba de `ref` sigue igual. `idDeContexto`
// siempre fue interna, solo se importa para `botonDeContexto`.
export { superficieDe, contextoDeBoton, contextoDe };

/** ¿Es esta acción una de plugin con los dos uuids puestos? */
export function esAccionPlugin(a: ButtonAction): a is ButtonAction & {
  plugin: { pluginUuid: string; accionUuid: string; settings?: Record<string, unknown> };
} {
  return a.type === 'plugin' && !!a.plugin?.pluginUuid && !!a.plugin?.accionUuid;
}

/**
 * La referencia que viaja al proceso principal. `null` si a la acción le falta
 * algo: el manejador avisa de eso en vez de mandar una referencia a medias.
 *
 * Los ajustes van **tal cual** los guardó el plugin: es un `Record` opaco del
 * autor del plugin y ninguno de los dos procesos tiene que entenderlo.
 */
export function refDe(a: ButtonAction, contexto: string | null): PluginRef | null {
  if (!esAccionPlugin(a) || !contexto) return null;
  return {
    pluginUuid: a.plugin.pluginUuid,
    accionUuid: a.plugin.accionUuid,
    contexto,
    ...(a.plugin.settings ? { settings: a.plugin.settings } : {}),
  };
}

/**
 * Qué botón del deck es este `contexto`, o `null`.
 *
 * Por **id** y no por posición, como el resto del proyecto (ver arriba).
 */
export function botonDeContexto(
  botones: ButtonConfig[], contexto: string,
): ButtonConfig | null {
  const id = idDeContexto(contexto);
  if (!id) return null;
  return botones.find((b) => b.id === id) ?? null;
}

/**
 * Las dos referencias son la misma si coinciden plugin y acción.
 *
 * Los ajustes **no** se comparan a propósito: el plugin los cambia con
 * `setSettings` y el cambio ya viaja por `didReceiveSettings`; si bastara un
 * ajuste para parecer otra tecla, cada `setSettings` mandaría `willDisappear`
 * + `willAppear`, y un `setSettings` dentro del `willAppear` entraría en un
 * bucle infinito vaciando Undo y reescribiendo la config (hallazgo #10).
 */
export function mismaRef(a: PluginRef, b: PluginRef): boolean {
  return a.pluginUuid === b.pluginUuid && a.accionUuid === b.accionUuid;
}
