import React, { createContext, useContext, useEffect } from 'react';
import { VD, VD_LIGHT, VD_DOT480, type VDTokens } from '../design';
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

  const isDot480 = theme === 'dot480';

  useEffect(() => {
    const resolvedTheme = isDot480 ? 'dot480' : isLight ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', resolvedTheme);
  }, [isLight, isDot480]);

  const base: VDTokens = isDot480 ? VD_DOT480 : isLight ? VD_LIGHT : VD;
  const tokens: VDTokens =
    accent && accent !== base.accent
      ? { ...base, accent, accentBg: `${accent}20` }
      : base;

  return <ThemeContext.Provider value={tokens}>{children}</ThemeContext.Provider>;
}

export function useTheme(): VDTokens {
  return useContext(ThemeContext);
}
