import type { ButtonConfig, SubButtonConfig } from '../../types';

/** Los cuatro cuadrantes con los que arranca un botón, vacíos si no los tenía. */
export function subButtonsIniciales(button: ButtonConfig): SubButtonConfig[] {
  if (button.subButtons && button.subButtons.length === 4) return button.subButtons;
  return Array.from({ length: 4 }, (_, i) => ({
    id: `${button.id}-q${i}`,
    label: '',
    action: { type: 'none' as const },
  }));
}