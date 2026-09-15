import type { ButtonConfig } from '../../types';

/** Campos visibles que bastan para considerar configurado un botón. */
const CAMPOS_CON_CONTENIDO = [
  'label',
  'sublabel',
  'icon',
  'imageData',
  'brandIcon',
  'widget',
  'customGlyph57',
  'globalHotkey',
  'bgColor',
  'fgColor',
  'longPressAction',
] as const;

/**
 * Un botón cuenta como configurado si trae acción (o secuencia), contenido
 * visible, toggle con apagado o cuadrantes 2×2. Función pura: antes vivía
 * como una cadena de `||` dentro de `EditorB` y sola aportaba ~16 ramas.
 */
export function botonConfigurado(button: ButtonConfig): boolean {
  if (button.action.type !== 'none') return true;
  if (button.actions && button.actions.length > 1) return true;
  if (button.isToggle && button.actionToggleOff && button.actionToggleOff.type !== 'none') return true;
  if (button.subButtons && button.subButtons.length === 4) return true;
  return CAMPOS_CON_CONTENIDO.some((c) => !!button[c]);
}
