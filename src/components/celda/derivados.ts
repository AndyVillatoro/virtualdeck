import type React from 'react';
import { VD_ACTION_ICONS, IconNone, type VDIconProps } from '../VDIcon';
import type { VDTokens } from '../../design';
import type { ButtonConfig } from '../../types';

/**
 * Lo que la celda deduce del botón antes de dibujarse.
 *
 * Estaba suelto en medio del componente, cinco expresiones con sus ternarios y
 * sus `||`, entre los hooks y el JSX. Aquí se lee de una vez y —lo que
 * importa— se puede razonar sobre ello sin tener el render delante.
 */
export interface DerivadosCelda {
  /** Sin acción, sin nombre y sin ninguna imagen: la celda está libre. */
  isEmpty: boolean;
  /** Lo que se enseña: el nombre puesto, o el tipo de acción a falta de él. */
  displayLabel: string;
  ActionIcon: React.ComponentType<VDIconProps>;
  iconColor: string;
  /** Cuántas acciones encadena, si son más de una. 0 = no se enseña. */
  multiCount: number;
  /** El texto del globo de ayuda al pasar por encima. */
  titulo: string;
}

const ICONOS: Record<string, React.ComponentType<VDIconProps>> = VD_ACTION_ICONS;

export function derivarCelda(
  button: ButtonConfig,
  { accent, toggled, resolvedLabel, VD, t }:
  {
    accent: string; toggled: boolean; resolvedLabel?: string; VD: VDTokens;
    t: (k: string, v?: Record<string, string | number>) => string;
  },
): DerivadosCelda {
  const isEmpty = button.action.type === 'none'
    && !button.label && !button.icon && !button.imageData && !button.brandIcon;

  const porDefecto = button.action.type !== 'none'
    ? button.action.type.replace(/-/g, ' ').toUpperCase()
    : '';

  const displayLabel = resolvedLabel ?? (button.label || porDefecto);

  return {
    isEmpty,
    displayLabel,
    titulo: isEmpty ? t('cell.tipEmpty') : t('cell.tipFilled', { etiqueta: displayLabel }),
    ActionIcon: ICONOS[button.action.type] ?? IconNone,
    iconColor: isEmpty ? VD.textMuted : (button.fgColor || (toggled ? accent : VD.text)),
    multiCount: button.actions && button.actions.length > 1 ? button.actions.length : 0,
  };
}
