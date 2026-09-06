import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
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

const POLL_INTERVAL_MS = 5000;

export function NowPlayingProvider({ children }: { children: React.ReactNode }) {
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const [active, setActive] = useState(true);
  const timerRef = useRef<number>();
  const pedirRef = useRef<() => void>(() => {});

  useEffect(() => {
    const api = window.electronAPI;
    if (!api || !active) return;
    let cancelled = false;
    const tick = () => {
      api.media.nowPlaying()
        .then((np) => { if (!cancelled) setNowPlaying(np); })
        .catch(() => {});
    };
    pedirRef.current = tick;
    tick();
    timerRef.current = window.setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      pedirRef.current = () => {};
      window.clearInterval(timerRef.current);
    };
  }, [active]);

  // Tras pulsar pausa, SMTC tarda un momento en reflejarlo, asi que no sirve
  // preguntar en el mismo instante. Se pregunta dos veces: pronto, para que el
  // icono cambie enseguida, y otra vez por si la primera llego demasiado
  // temprano. Sin esto habia que esperar al siguiente sondeo —hasta 5 s— y el
  // icono seguia diciendo «reproduciendo» despues de pausar.
  const refrescar = useCallback(() => {
    window.setTimeout(() => pedirRef.current(), 250);
    window.setTimeout(() => pedirRef.current(), 900);
  }, []);

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
