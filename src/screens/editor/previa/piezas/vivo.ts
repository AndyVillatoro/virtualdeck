/**
 * Datos en vivo de la vista previa y el clic de simulación (roadmap 121b).
 *
 * Salieron tal cual de `previa/VistaPreviaPiezas.tsx`: la config viva del deck,
 * el reloj/widgets del botón y `ejecutarClickPreview`, que simula el pulsado
 * (toggle del botón o del cuadrante en modo 2×2).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useClimaWidget, useDivisas, useDatosWidget } from '../../../../components/celda/useDatosWidget';
import { useSensors } from '../../../../utils/sensors';
import { useNowPlaying, useNowPlayingActivation } from '../../../../utils/nowPlaying';
import type { ButtonConfig, SubButtonConfig, DeckConfig, ElectronAPI } from '../../../../types';

export function useConfigVivo(api: ElectronAPI | undefined) {
  const [deckConfig, setDeckConfig] = useState<DeckConfig | null>(null);

  useEffect(() => {
    let montado = true;
    if (api?.config?.load) {
      api.config.load().then((c) => {
        if (montado && c) setDeckConfig(c as DeckConfig);
      }).catch(() => {});
    }
    if (api?.bar?.onConfigChanged) {
      const desuscribir = api.bar.onConfigChanged((data) => {
        if (montado && data) {
          api.config.load().then((c) => {
            if (montado && c) setDeckConfig(c as DeckConfig);
          }).catch(() => {});
        }
      });
      return () => {
        montado = false;
        desuscribir();
      };
    }
    return () => {
      montado = false;
    };
  }, [api]);

  return deckConfig;
}

function conmutarCuadrante(
  targetId: string | undefined,
  subButtons: SubButtonConfig[] | undefined,
  setSubToggled: React.Dispatch<React.SetStateAction<boolean[]>>,
) {
  if (!targetId || !subButtons) return;
  const idx = subButtons.findIndex((sb) => sb.id === targetId);
  if (idx >= 0) {
    setSubToggled((prev) => {
      const next = [...prev];
      next[idx] = !next[idx];
      return next;
    });
  }
}

export function ejecutarClickPreview(
  esModo2x2: boolean,
  targetId: string | undefined,
  subButtons: SubButtonConfig[] | undefined,
  setSubToggled: React.Dispatch<React.SetStateAction<boolean[]>>,
  isToggle: boolean,
  onTogglePreview?: () => void,
) {
  if (esModo2x2) {
    conmutarCuadrante(targetId, subButtons, setSubToggled);
  } else if (isToggle && onTogglePreview) {
    onTogglePreview();
  }
}

export function useLiveWidgetData(
  boton: ButtonConfig,
  deckState: Record<string, string>,
  api?: ElectronAPI,
) {
  const [clock, setClock] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const tieneClima = boton.widget === 'weather';
  const clima = useClimaWidget(tieneClima, api);

  const nowPlaying = useNowPlaying();
  const setNowPlayingActive = useNowPlayingActivation('editor-preview');
  const tieneNowPlaying = boton.widget === 'now-playing';
  useEffect(() => {
    setNowPlayingActive(tieneNowPlaying);
  }, [tieneNowPlaying, setNowPlayingActive]);

  const { sensors: sensorList } = useSensors();
  const arrayBoton = useMemo(() => [boton], [boton]);
  const divisas = useDivisas(arrayBoton, api);

  const widgetDataMap = useDatosWidget({
    botones: arrayBoton,
    estado: deckState,
    reloj: clock,
    clima,
    sonando: nowPlaying,
    sensores: sensorList,
    divisas,
  });

  return widgetDataMap[boton.id];
}
