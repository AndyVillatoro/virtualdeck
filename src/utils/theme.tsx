import React, { createContext, useContext } from 'react';
import { VD, VD_LIGHT, type VDTokens } from '../design';

const ThemeContext = createContext<VDTokens>(VD);

export function ThemeProvider({
  theme,
  accent,
  children,
}: {
  theme?: 'dark' | 'light' | 'system';
  accent?: string;
  children: React.ReactNode;
}) {
  const isLight =
    theme === 'light' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-color-scheme: light)').matches);

  const base: VDTokens = isLight ? VD_LIGHT : VD;
  const tokens: VDTokens =
    accent && accent !== base.accent
      ? { ...base, accent, accentBg: `${accent}20` }
      : base;

  return <ThemeContext.Provider value={tokens}>{children}</ThemeContext.Provider>;
}

export function useTheme(): VDTokens {
  return useContext(ThemeContext);
}
