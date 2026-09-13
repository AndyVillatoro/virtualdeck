import { useState, useEffect, useCallback, useMemo } from 'react';
import type { DisplayInfo } from '../types';

export function useDisplays() {
  const [displays, setDisplays] = useState<DisplayInfo[]>([]);
  const api = typeof window !== 'undefined' ? window.electronAPI : undefined;

  const refreshDisplays = useCallback(async () => {
    if (!api?.window?.getDisplays) return;
    try {
      const list = await api.window.getDisplays();
      if (Array.isArray(list)) {
        setDisplays(list);
      }
    } catch {}
  }, [api]);

  useEffect(() => {
    refreshDisplays();

    if (!api?.events?.onDisplaysChanged) return;
    const cleanup = api.events.onDisplaysChanged((updatedDisplays) => {
      if (Array.isArray(updatedDisplays)) {
        setDisplays(updatedDisplays);
      }
    });

    return cleanup;
  }, [api, refreshDisplays]);

  const moveToDisplay = useCallback(async (displayId: number) => {
    if (!api?.window?.moveToDisplay) return false;
    try {
      const ok = await api.window.moveToDisplay(displayId);
      if (ok) {
        await refreshDisplays();
      }
      return ok;
    } catch {
      return false;
    }
  }, [api, refreshDisplays]);

  const currentDisplay = useMemo(() => displays.find((d) => d.isCurrent) ?? null, [displays]);
  const primaryDisplay = useMemo(() => displays.find((d) => d.isPrimary) ?? null, [displays]);

  return {
    displays,
    currentDisplay,
    primaryDisplay,
    refreshDisplays,
    moveToDisplay,
  };
}
