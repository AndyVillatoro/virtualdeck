import { useEffect } from 'react';
import type { DeckConfig, ElectronAPI } from '../types';

/**
 * Lo que otra ventana u otra acción guardó por fuera de este estado,
 * adoptado aquí (`config:changed`).
 *
 * Son dos ventanas con dos copias de la configuración (el deck y la barra
 * flotante). Se adopta **solo** lo que se cambia por fuera —las variables, la
 * geometría de la barra, los interruptores y el servidor remoto— y **no se
 * vuelve a guardar**: guardar aquí cerraría el bucle con el aviso que acaba de
 * llegar. Cualquier campo que una acción guarde con `api.config.save` directo
 * tiene que estar en `ADOPTADOS`, o el siguiente guardado normal lo pisa: así
 * la acción del mando móvil encendía el servidor y el siguiente cambio de
 * cualquier cosa lo **apagaba**, porque el deck mandaba la config sin `remote`.
 */
const ADOPTADOS = ['state', 'floatingBar', 'toggledIds', 'remote'] as const;

export function useConfigExterna(
  api: ElectronAPI | undefined,
  setConfig: (f: (prev: DeckConfig) => DeckConfig) => void,
) {
  useEffect(() => {
    if (!api) return;
    return api.bar.onConfigChanged((data) => {
      const llegado = data as Partial<DeckConfig>;
      setConfig((prev) => {
        const igual = (k: (typeof ADOPTADOS)[number]) =>
          JSON.stringify(prev[k] ?? null) === JSON.stringify(llegado[k] ?? null);
        if (ADOPTADOS.every(igual)) return prev;
        const next = { ...prev };
        for (const k of ADOPTADOS) {
          if (llegado[k] !== undefined) (next as Record<string, unknown>)[k] = llegado[k];
        }
        return next;
      });
    });
  }, [api, setConfig]);
}
