import React, { createContext, useContext, useEffect } from 'react';
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

  // El atributo lleva el tema **resuelto**, no el que hay en la configuracion.
  // Lo ponia `App` con `config.theme` tal cual, asi que con «sistema» quedaba
  // `data-theme="system"` y las reglas CSS de `[data-theme='light']` no
  // casaban nunca — justo en la opcion que trae puesta la aplicacion.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isLight ? 'light' : 'dark');
  }, [isLight]);

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
