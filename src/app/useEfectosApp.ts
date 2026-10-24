import { useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { DeckConfig, ElectronAPI } from '../types';
import { installGlobalErrorHandlers } from '../utils/logger';

/**
 * Efectos de entorno de `App`: el acento como variable CSS, la escala de
 * interfaz (zoom), el primer plano, el acotado de la página activa, los
 * manejadores globales de error y el aviso de actualización descargada.
 * Movidos tal cual desde `App.tsx`, en el mismo punto del montaje.
 */
export function useEfectosApp({
  api,
  config,
  setActivePage,
  setUpdateReady,
}: {
  api: ElectronAPI | undefined;
  config: DeckConfig;
  setActivePage: Dispatch<SetStateAction<number>>;
  setUpdateReady: Dispatch<SetStateAction<string | null>>;
}) {
  useEffect(() => {
    document.documentElement.style.setProperty('--vd-accent', config.accent);
  }, [config.accent]);

  // Apply UI scale via Electron zoom factor
  useEffect(() => {
    if (!api || config.uiScale === undefined) return;
    api.app.setZoom(config.uiScale).catch(() => {});
  }, [api, config.uiScale]);

  // Primer plano. El proceso principal ya lo aplica al crear la ventana leyendo
  // la config del disco; esto es para cuando el usuario lo cambia en caliente.
  useEffect(() => {
    api?.window.setAlwaysOnTop(!!config.alwaysOnTop);
  }, [api, config.alwaysOnTop]);

  // Clamp activePage when pages change
  useEffect(() => {
    setActivePage((curr) => (curr >= config.pages.length ? Math.max(0, config.pages.length - 1) : curr));
  }, [config.pages.length, setActivePage]);

  // Install global error handlers once (forwards to main-process log file).
  useEffect(() => { installGlobalErrorHandlers(); }, []);

  // Listen for auto-update events (downloaded → offer restart).
  useEffect(() => {
    if (!api?.update?.onStatus) return;
    return api.update.onStatus((s: { status: string; version?: string }) => {
      if (s.status === 'downloaded') setUpdateReady(s.version ?? '');
    });
  }, [api, setUpdateReady]);
}
