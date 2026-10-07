import React, { createContext, useContext, useEffect } from 'react';
import { VD, VD_LIGHT, textoSobre, type VDTokens } from '../design';
import type { ThemeMode } from '../types';

const ThemeContext = createContext<VDTokens>(VD);

export function ThemeProvider({
  theme,
  accent,
  children,
}: {
  theme?: ThemeMode;
  accent?: string;
  children: React.ReactNode;
}) {
  const isLight =
    theme === 'light' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-color-scheme: light)').matches);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isLight ? 'light' : 'dark');
  }, [isLight]);

  const base: VDTokens = isLight ? VD_LIGHT : VD;
  const tokens: VDTokens =
    accent && accent !== base.accent
      ? { ...base, accent, accentBg: `${accent}24`, onAccent: textoSobre(accent) }
      : { ...base, onAccent: textoSobre(base.accent) };

  return <ThemeContext.Provider value={tokens}>{children}</ThemeContext.Provider>;
}

export function useTheme(): VDTokens {
  return useContext(ThemeContext);
}
