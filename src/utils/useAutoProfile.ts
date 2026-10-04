import { useEffect, useRef } from 'react';
import type { DeckConfig } from '../types';
import { esAppPropia, normalizarApp } from './apps';

interface AutoProfileProps {
  config: DeckConfig;
  activePage: number;
  onPageChange: (pageIdx: number) => void;
  onLoadProfile?: (profileId: string) => void;
}

/**
 * Hook de cambio automático de páginas y perfiles según la ventana activa de Windows.
 *
 * Escucha el daemon nativo Win32 en tiempo real (GetForegroundWindow).
 * Comprueba primero si alguna página de la configuración tiene `targetApp` asociado
 * al proceso en primer plano (ej. 'obs64', 'photoshop', 'code', 'chrome').
 * Si no hay coincidencia en páginas, busca en los perfiles guardados (`profiles`).
 * Si no hay coincidencia y `autoProfileRestoreDefault` está activado, vuelve a la
 * página elegida a mano (la base, por id); si ya no existe, a la página 1 (índice 0).
 * La base es cualquier cambio de página que no haya hecho este hook, y vive en memoria.
 */
export function useAutoProfile({ config, activePage, onPageChange, onLoadProfile }: AutoProfileProps) {
  const configRef = useRef(config);
  configRef.current = config;

  const activePageRef = useRef(activePage);
  activePageRef.current = activePage;

  const onPageChangeRef = useRef(onPageChange);
  onPageChangeRef.current = onPageChange;

  const onLoadProfileRef = useRef(onLoadProfile);
  onLoadProfileRef.current = onLoadProfile;

  const lastHandledAppRef = useRef<string>('');
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout>>();
  /** Base elegida a mano: id de página. En memoria: no se guarda. */
  const baseIdRef = useRef<string | null>(null);
  /** El último cambio de página lo hizo este hook, no la mano. */
  const cambioPropioRef = useRef(false);

  // La base es la página elegida a mano: cualquier cambio de `activePage`
  // que no haya hecho este hook. Se guarda por id, no por índice.
  useEffect(() => {
    if (cambioPropioRef.current) { cambioPropioRef.current = false; return; }
    const id = configRef.current.pages[activePage]?.id;
    if (id !== undefined) baseIdRef.current = id;
  }, [activePage]);

  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.events?.onActiveAppChanged) return;

    const procesarAppActiva = (appInfo: { processName: string | null; windowTitle: string | null } | null) => {
      if (!appInfo) return;
      const rawName = normalizarApp(appInfo.processName);
      // Ignorar el propio VirtualDeck y el runtime Electron para no alternar al interactuar con el deck
      if (esAppPropia(rawName)) return;

      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        const currentConfig = configRef.current;
        if (currentConfig.autoProfileSwitch === false) return;

        if (lastHandledAppRef.current === rawName) return;
        lastHandledAppRef.current = rawName;

        // 1. Coincidencia por página en el deck actual. Las páginas de un
        // dock físico no cuentan: cada dispositivo cambia la suya por su
        // cuenta (`useSuperficies`); si no, la principal saltaría a la página
        // del aparato en cuanto su app vinculada pasara al primer plano.
        const targetPageIdx = currentConfig.pages.findIndex(
          (p) => !p.superficie && p.targetApp && normalizarApp(p.targetApp) === rawName,
        );

        if (targetPageIdx !== -1) {
          if (targetPageIdx !== activePageRef.current) {
            cambioPropioRef.current = true;
            onPageChangeRef.current(targetPageIdx);
          }
          return;
        }

        // 2. Coincidencia por perfil guardado
        const targetProfile = currentConfig.profiles?.find(
          (p) => p.targetApp && normalizarApp(p.targetApp) === rawName,
        );

        if (targetProfile && onLoadProfileRef.current) {
          onLoadProfileRef.current(targetProfile.id);
          return;
        }

        // 3. Si no hay coincidencia y está configurado restaurar la página por omisión
        if (currentConfig.autoProfileRestoreDefault) {
          // Se vuelve a la base elegida a mano (por id); si ya no existe, a la 1.
          const baseId = baseIdRef.current;
          const baseIdx = baseId ? currentConfig.pages.findIndex((p) => p.id === baseId) : -1;
          const destino = baseIdx !== -1 ? baseIdx : 0;
          if (activePageRef.current !== destino) {
            cambioPropioRef.current = true;
            onPageChangeRef.current(destino);
          }
        }
      }, 250);
    };

    // Consulta inicial al montar
    api.window?.getActiveApp?.()
      .then((app) => { if (app) procesarAppActiva(app); })
      .catch(() => {});

    // Suscripción reactiva al evento del proceso principal
    const off = api.events.onActiveAppChanged(procesarAppActiva);
    return () => {
      clearTimeout(debounceTimerRef.current);
      off?.();
    };
  }, []);
}
