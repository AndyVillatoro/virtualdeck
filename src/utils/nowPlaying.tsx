import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { NowPlaying } from '../types';

// Polling centralizado de medios. Antes MainB y FullscreenB tenían su propio
// interval — duplicaban el query a PowerShell cada 5s. Un único provider en App
// comparte el estado entre vistas.

interface NowPlayingContextValue {
  nowPlaying: NowPlaying | null;
  /** Pausa el polling cuando ningún consumidor visible lo necesita (sidebar oculta). */
  setActive: (active: boolean) => void;
  /** Vuelve a preguntar ya, sin esperar al siguiente sondeo. */
  refrescar: () => void;
}

const NowPlayingContext = createContext<NowPlayingContextValue>({
  nowPlaying: null,
  setActive: () => {},
  refrescar: () => {},
});

let _globalRefresh = () => {};

/**
 * Permite a acciones de transporte de medios (ej. media-play-pause) forzar
 * un refresco inmediato del estado de reproducción sin depender de React Context.
 */
export function refrescarNowPlayingGlobal(): void {
  _globalRefresh();
}

const POLL_INTERVAL_MS = 5000;

export function NowPlayingProvider({ children }: { children: React.ReactNode }) {
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const [active, setActive] = useState(true);
  const pedir = useCallback(() => {
    const api = window.electronAPI;
    if (!api) return;
    api.media.nowPlaying()
      .then((np) => setNowPlaying(np))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!active) return;
    pedir();
    const t = window.setInterval(pedir, POLL_INTERVAL_MS);
    return () => window.clearInterval(t);
  }, [active, pedir]);

  // Tras pulsar pausa, SMTC tarda un momento en reflejarlo, asi que no sirve
  // preguntar en el mismo instante. Se pregunta dos veces: pronto, para que el
  // icono cambie enseguida, y otra vez por si la primera llego demasiado
  // temprano. Sin esto habia que esperar al siguiente sondeo —hasta 5 s— y el
  // icono seguia diciendo «reproduciendo» despues de pausar.
  const refrescar = useCallback(() => {
    window.setTimeout(() => pedir(), 250);
    window.setTimeout(() => pedir(), 900);
  }, [pedir]);

  useEffect(() => {
    _globalRefresh = refrescar;
    return () => {
      _globalRefresh = () => {};
    };
  }, [refrescar]);

  return (
    <NowPlayingContext.Provider value={{ nowPlaying, setActive, refrescar }}>
      {children}
    </NowPlayingContext.Provider>
  );
}

export function useNowPlaying(): NowPlaying | null {
  return useContext(NowPlayingContext).nowPlaying;
}

export function useNowPlayingActivation(): (active: boolean) => void {
  return useContext(NowPlayingContext).setActive;
}

/** Volver a preguntar ya. Se usa justo despues de mandar una orden de medios. */
export function useNowPlayingRefresh(): () => void {
  return useContext(NowPlayingContext).refrescar;
}
