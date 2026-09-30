import { useCallback, useMemo, useRef, useState } from 'react';
import { DEFAULT_CONFIG } from '../configDefaults';
import { makeT, resolveLang } from '../i18n';
import type { DeckConfig, ElectronAPI } from '../../types';

interface Opciones {
  api: ElectronAPI | undefined;
  /** Aviso flotante de "se deshizo X". Lo pinta App. */
  showUndoToast: (texto: string) => void;
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
    setConfig((prev) => {
      historyRef.current = [...historyRef.current.slice(-19), { config: prev, label: rotulo ? rotulo(prev) : label }];
      const next = updater(prev);
      api?.config.save(next).catch(() => {});
      return next;
    });
  }, [api]);

  const undo = useCallback(() => {
    if (historyRef.current.length === 0) return;
    const last = historyRef.current[historyRef.current.length - 1];
    historyRef.current = historyRef.current.slice(0, -1);
    setConfig(last.config);
    api?.config.save(last.config).catch(() => {});
    showUndoToast(t('undo.done', { label: last.label }));
  }, [api, showUndoToast, t]);

  const saveConfig = useCallback((next: DeckConfig) => {
    setConfig((prev) => {
      historyRef.current = [...historyRef.current.slice(-19), { config: prev, label: t('undo.configChange') }];
      api?.config.save(next).catch(() => {});
      return next;
    });
  }, [api, t]);

  return { config, setConfig, loaded, setLoaded, t, withHistory, undo, saveConfig };
}
