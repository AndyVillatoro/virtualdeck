import { useEffect, useRef } from 'react';
import type { DeckConfig } from '../types';

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
 * Si no hay coincidencia y `autoProfileRestoreDefault` está activado, vuelve a la página 1 (índice 0).
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

  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.events?.onActiveAppChanged) return;

    const procesarAppActiva = (appInfo: { processName: string | null; windowTitle: string | null } | null) => {
      if (!appInfo) return;
      const rawName = (appInfo.processName || '').replace(/\.exe$/i, '').toLowerCase().trim();
      // Ignorar el propio VirtualDeck y el runtime Electron para no alternar al interactuar con el deck
      if (!rawName || rawName === 'virtualdeck' || rawName === 'electron') return;

      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        const currentConfig = configRef.current;
        if (currentConfig.autoProfileSwitch === false) return;

        if (lastHandledAppRef.current === rawName) return;
        lastHandledAppRef.current = rawName;

        // 1. Coincidencia por página en el deck actual
        const targetPageIdx = currentConfig.pages.findIndex(
          (p) => p.targetApp && p.targetApp.toLowerCase().trim() === rawName,
        );

        if (targetPageIdx !== -1) {
          if (targetPageIdx !== activePageRef.current) {
            onPageChangeRef.current(targetPageIdx);
          }
          return;
        }

        // 2. Coincidencia por perfil guardado
        const targetProfile = currentConfig.profiles?.find(
          (p) => p.targetApp && p.targetApp.toLowerCase().trim() === rawName,
        );

        if (targetProfile && onLoadProfileRef.current) {
          onLoadProfileRef.current(targetProfile.id);
          return;
        }

        // 3. Si no hay coincidencia y está configurado restaurar la página por omisión
        if (currentConfig.autoProfileRestoreDefault) {
          if (activePageRef.current !== 0) {
            onPageChangeRef.current(0);
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
