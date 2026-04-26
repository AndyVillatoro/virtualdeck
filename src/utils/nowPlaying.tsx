import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { NowPlaying } from '../types';

// Polling centralizado de medios. Antes MainB y FullscreenB tenían su propio
// interval — duplicaban el query a PowerShell cada 5s. Un único provider en App
// comparte el estado entre vistas.

interface NowPlayingContextValue {
  nowPlaying: NowPlaying | null;
  /** Pausa el polling cuando ningún consumidor visible lo necesita (sidebar oculta). */
  setActive: (active: boolean) => void;
}

const NowPlayingContext = createContext<NowPlayingContextValue>({
  nowPlaying: null,
  setActive: () => {},
});

const POLL_INTERVAL_MS = 5000;

export function NowPlayingProvider({ children }: { children: React.ReactNode }) {
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const [active, setActive] = useState(true);
  const timerRef = useRef<number>();

  useEffect(() => {
    const api = window.electronAPI;
    if (!api || !active) return;
    let cancelled = false;
    const tick = () => {
      api.media.nowPlaying()
        .then((np) => { if (!cancelled) setNowPlaying(np); })
        .catch(() => {});
    };
    tick();
    timerRef.current = window.setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timerRef.current);
    };
  }, [active]);

  return (
    <NowPlayingContext.Provider value={{ nowPlaying, setActive }}>
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
