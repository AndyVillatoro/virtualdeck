import { useEffect, useRef } from 'react';
import { botonDeContexto } from './ref';
import { guardarVisual } from './visual';
import type { ButtonConfig, ElectronAPI } from '../../types';

/**
 * Lo que el proceso principal manda de los plugins, traducido a la interfaz.
 *
 * Dos cosas, y por eso un solo hook:
 *
 * - **`setImage` / `setTitle` / `setState`** no son una respuesta a nada que
 *  .render pidiera: llegan solos, en cualquier momento, con el `contexto` del
 *   botón. Se guardan en el store de `visual.ts` y la celda se entera por su
 *   cuenta (`useSyncExternalStore`).
 * - **`setSettings`** son datos que hay que **persistir**: el Property Inspector
 *   del plugin acaba de guardar algo de *este botón*, y si no se escribe en la
 *   configuración se pierde al reiniciar. Es un cambio de verdad —un paso de
 *   deshacer y un guardado en disco—, no un estado de la interfaz.
 *
 * Vive en `App`, como `useDisparadores`, porque `App` está montada siempre: en
 * kiosko, con la ventana en la bandeja o mientras se edita un botón, el
 * plugin tiene que poder guardar sus ajustes igual.
 */

interface Opciones {
  api: ElectronAPI | undefined;
  botones: ButtonConfig[];
  /** La operación de `useDeck` que reescribe el botón entero. */
  updateButton: (b: ButtonConfig) => void;
}

export function usePluginAjustes({ api, botones, updateButton }: Opciones) {
  // Por referencia, para que los efectos no se rearmen en cada repintado:
  // `updateButton` cambia de identidad con la configuración (ver `useDisparadores`).
  const ref = useRef({ botones, updateButton });
  ref.current = { botones, updateButton };

  // Lo que el plugin pinta en cada botón.
  useEffect(() => {
    if (!api?.plugins) return;
    return api.plugins.onVisual((visual) => guardarVisual(visual));
  }, [api]);

  // Lo que el plugin guardó desde su Property Inspector.
  useEffect(() => {
    if (!api?.plugins) return;
    return api.plugins.onSettings((contexto, settings) => {
      const { botones: vivos, updateButton: escribir } = ref.current;
      const btn = botonDeContexto(vivos, contexto);
      // El contexto lo compone el renderer, así que solo puede ser de un botón
      // de plugin. Si el botón ya no es de plugin (se cambió de tipo mientras
      // estaba abierta la ventana del inspector) no hay dónde guardarlo.
      if (!btn || btn.action.type !== 'plugin' || !btn.action.plugin) return;
      escribir({
        ...btn,
        action: { ...btn.action, plugin: { ...btn.action.plugin, settings } },
      });
    });
  }, [api]);
}
