import { CURRENT_CONFIG_VERSION } from './configMigration';
import type { ButtonConfig, DeckConfig, PageConfig } from '../types';

/**
 * La configuración de una instalación nueva.
 *
 * Vive aparte de `App` porque la necesitan dos sitios: la pantalla, y el hook
 * que gestiona la configuración.
 */

export const PAGES_DEFAULT: PageConfig[] = [
  { id: 'main', name: 'Main' },
];

export function makeDefaultButtons(pages: PageConfig[] = PAGES_DEFAULT): ButtonConfig[] {
  const btns: ButtonConfig[] = [];
  for (let page = 0; page < pages.length; page++) {
    const gs = pages[page]?.gridSize ?? 4;
    const gr = pages[page]?.gridRows ?? gs;
    const slots = gs * gr;
    for (let slot = 0; slot < Math.max(16, slots); slot++) {
      btns.push({ id: `${page}-${slot}`, page, label: '', icon: '', action: { type: 'none' } });
    }
  }
  return btns;
}

export const DEFAULT_CONFIG: DeckConfig = {
  pages: PAGES_DEFAULT,
  buttons: makeDefaultButtons(),
  accent: '#4a8ef0',
  wallpaper: 'solid',
  profiles: [],
  configVersion: CURRENT_CONFIG_VERSION,
  language: 'system',
  // onboardingCompleted intencionalmente SIN setear: una instalación nueva
  // (sin config en disco) dispara el onboarding. La migración v3→v4 lo marca
  // como true para usuarios existentes.
};
