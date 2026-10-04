import React from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import type { ButtonConfig } from '../../types';

interface BotonFisicoHardwareProps {
  indice: number; // 0..2 (botones físicos 1..3 del N3)
  boton?: ButtonConfig;
  seleccionado: boolean;
  disabled?: boolean;
  onSelect: () => void;
  onEditar: () => void;
}

export function BotonFisicoHardware({
  indice,
  boton,
  seleccionado,
  disabled = false,
  onSelect,
  onEditar,
}: BotonFisicoHardwareProps) {
  const VD = useTheme();
  const t = useT();

  const etiqueta = boton?.label || t('disp.boton', { n: indice + 1 });

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onSelect}
      onDoubleClick={disabled ? undefined : onEditar}
      style={{
        height: 34,
        background: seleccionado ? VD.accentBg : VD.elevated,
        border: `1px solid ${seleccionado ? VD.accent : VD.borderStrong}`,
        borderRadius: VD.radius.md,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: VD.space.xs,
        cursor: disabled ? 'default' : 'pointer',
        fontFamily: VD.mono,
        fontSize: 9,
        color: seleccionado ? VD.accent : VD.textDim,
        boxShadow: seleccionado
          ? `0 0 0 1px ${VD.accent}, 0 2px 4px rgba(0, 0, 0, 0.4)`
          : '0 2px 0 var(--vd-border-strong, rgba(0,0,0,0.3))',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.15s ease',
        padding: `0 ${VD.space.sm}px`,
        overflow: 'hidden',
      }}
    >
      <span style={{ fontSize: 8, color: VD.textMuted }}>
        {`B${indice + 1}`}
      </span>
      <span
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: 90,
          color: boton?.label ? VD.text : VD.textMuted,
        }}
      >
        {etiqueta}
      </span>
    </button>
  );
}
