import { useCallback, useMemo, useRef, useState } from 'react';
import { DEFAULT_CONFIG } from '../configDefaults';
import { makeT, resolveLang, type TFunc } from '../i18n';
import type { DeckConfig, ElectronAPI } from '../../types';

interface Opciones {
  api: ElectronAPI | undefined;
  /** Aviso flotante de "se deshizo X". Lo pinta App. */
  showUndoToast: (texto: string) => void;
}

/**
 * D-071 — aviso visible cuando el guardado en disco falla.
 *
 * `config:save` devuelve `false` y el renderer lo ignoraba: el cambio se
 * perdía sin decir nada. Se avisa con la notificación del sistema (el
 * mecanismo que ya usa la app para `notify`), con respiro de 30 s para no
 * spamear si cada guardado falla. Vive aquí porque este grupo es el dueño de
 * la persistencia; los demás grupos la usan para sus guardados directos.
 */
let ultimoAvisoFalloGuardado = 0;
export function guardarConfig(
  api: ElectronAPI | undefined, t: TFunc, data: DeckConfig,
): void {
  api?.config.save(data)
    .then((ok) => {
      if (ok) return;
      const ahora = Date.now();
      if (ahora - ultimoAvisoFalloGuardado < 30000) return;
      ultimoAvisoFalloGuardado = ahora;
      api?.notify.show(t('ui.saveFailedTitle'), t('ui.saveFailedBody')).catch(() => {});
    })
    .catch(() => {});
}

/**
 * El núcleo: la configuración, su historial y el traductor.
 *
 * Es el único grupo que **posee** estado —`useState` y `useRef`— y el único que
 * guarda en disco por su cuenta. Los otros cuatro reciben de aquí todo lo que
 * necesitan a través de `ContextoDeck` y devuelven solo sus operaciones.
 */
export function useDeckEstado({ api, showUndoToast }: Opciones) {
  const [config, setConfig] = useState<DeckConfig>(DEFAULT_CONFIG);
  const [loaded, setLoaded] = useState(false);
  const historyRef = useRef<{ config: DeckConfig; label: string }[]>([]);

  /**
   * D-064 — La config viva por referencia.
   *
   * `withHistory` y `saveConfig` calculan `next` fuera del updater de
   * `setConfig`: React puede invocar el updater dos veces (StrictMode en
   * desarrollo o un render concurrente descartado) y con el historial y el
   * guardado dentro, la escritura a disco se duplicaba y el deshacer apilaba
   * dos pasos por acción. El updater que se pasa a `setConfig` es ahora puro
   * (`() => next`, vía `setConfig(next)`). La ref se actualiza en cada
   * escritura para que las llamadas encadenadas en el mismo tick vean lo
   * último sin esperar al re-render.
   */
  const configRef = useRef(config);
  configRef.current = config;

  // El traductor sale de aqui y no llega por parametro: lo construye el idioma
  // de la propia configuracion, que es lo que este hook posee. Pasarlo desde
  // fuera creaba un ciclo — App lo necesitaba para llamar al hook, y para
  // construirlo necesitaba la configuracion que devuelve el hook.
  const t = useMemo(() => makeT(resolveLang(config.language)), [config.language]);

  /**
   * Apila el estado actual y aplica el siguiente.
   *
   * El rotulo puede llegar hecho o **calcularse a partir del estado anterior**
   * (`rotulo`), que es lo que hace falta para decir «eliminar perfil "X"»: el
   * nombre solo existe antes de borrarlo. Sin eso habria que buscarlo fuera,
   * sobre una copia de `config` que puede ir un render por detras.
   */
  const withHistory = useCallback((
    label: string,
    updater: (prev: DeckConfig) => DeckConfig,
    rotulo?: (prev: DeckConfig) => string,
  ) => {
    const prev = configRef.current;
    const next = updater(prev);
    historyRef.current = [...historyRef.current.slice(-19), { config: prev, label: rotulo ? rotulo(prev) : label }];
    configRef.current = next;
    setConfig(next);
    guardarConfig(api, t, next);
  }, [api, t]);

  const undo = useCallback(() => {
    if (historyRef.current.length === 0) return;
    const last = historyRef.current[historyRef.current.length - 1];
    historyRef.current = historyRef.current.slice(0, -1);
    configRef.current = last.config;
    setConfig(last.config);
    guardarConfig(api, t, last.config);
    showUndoToast(t('undo.done', { label: last.label }));
  }, [api, showUndoToast, t]);

  const saveConfig = useCallback((next: DeckConfig) => {
    const prev = configRef.current;
    historyRef.current = [...historyRef.current.slice(-19), { config: prev, label: t('undo.configChange') }];
    configRef.current = next;
    setConfig(next);
    guardarConfig(api, t, next);
  }, [api, t]);

  return { config, setConfig, loaded, setLoaded, t, withHistory, undo, saveConfig };
}
