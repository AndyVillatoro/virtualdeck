import React from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';
import type { ButtonConfig } from '../../types';

export interface TiraTactilHardwareProps {
  indice: number;
  botonIzq?: ButtonConfig;
  botonDer?: ButtonConfig;
  subAccionSeleccionada: 'izq' | 'der' | null;
  disabled?: boolean;
  onSelectGesto: (gesto: 'izq' | 'der') => void;
  onEditarGesto: (gesto: 'izq' | 'der') => void;
}

interface SectorTactilProps {
  label: string;
  prefijoGlifo: string;
  seleccionado: boolean;
  disabled: boolean;
  accent: string;
  accentBg: string;
  surface: string;
  border: string;
  textDim: string;
  radiusSm: number;
  mono: string;
  onClick: () => void;
  onDoubleClick: () => void;
}

function SectorTactil({
  label,
  prefijoGlifo,
  seleccionado,
  disabled,
  accent,
  accentBg,
  surface,
  border,
  textDim,
  radiusSm,
  mono,
  onClick,
  onDoubleClick,
}: SectorTactilProps) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      onDoubleClick={disabled ? undefined : onDoubleClick}
      title={label}
      style={{
        flex: 1,
        background: seleccionado ? accentBg : surface,
        border: `1px solid ${seleccionado ? accent : border}`,
        borderRadius: radiusSm,
        color: seleccionado ? accent : textDim,
        cursor: disabled ? 'default' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        padding: '6px 4px',
        fontFamily: mono,
        fontSize: 8,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        boxShadow: seleccionado ? `0 0 8px ${accentBg}` : 'none',
        transition: 'all 0.15s ease',
      }}
    >
      <DotGlyphIcon
        glyph={prefijoGlifo}
        size={10}
        color={seleccionado ? accent : textDim}
      />
      <span
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: 90,
        }}
      >
        {label}
      </span>
    </button>
  );
}

export function TiraTactilHardware({
  indice,
  botonIzq,
  botonDer,
  subAccionSeleccionada,
  disabled = false,
  onSelectGesto,
  onEditarGesto,
}: TiraTactilHardwareProps) {
  const VD = useTheme();
  const t = useT();

  const labelIzq = botonIzq?.label || t('disp.deslizarIzq');
  const labelDer = botonDer?.label || t('disp.deslizarDer');

  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: VD.elevated,
        border: `1px solid ${subAccionSeleccionada ? VD.borderStrong : VD.border}`,
        borderRadius: VD.radius.md,
        padding: `${VD.space.xs + 2}px ${VD.space.sm}px`,
        gap: VD.space.xs,
        opacity: disabled ? 0.5 : 1,
        transition: 'border-color 0.15s',
      }}
    >
      <div
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 8,
          color: VD.textMuted,
          fontFamily: VD.mono,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <DotGlyphIcon glyph="SWIPE" size={10} color={VD.textMuted} />
          <span>{t('disp.tira', { n: indice + 1 })}</span>
        </div>
        {subAccionSeleccionada && (
          <span style={{ color: VD.accent, fontWeight: 600 }}>
            {subAccionSeleccionada === 'der' ? t('disp.der').toUpperCase() : t('disp.izq').toUpperCase()}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: VD.space.xs, width: '100%' }}>
        <SectorTactil
          label={labelIzq}
          prefijoGlifo="PREV"
          seleccionado={subAccionSeleccionada === 'izq'}
          disabled={disabled}
          accent={VD.accent}
          accentBg={VD.accentBg}
          surface={VD.surface}
          border={VD.border}
          textDim={VD.textDim}
          radiusSm={VD.radius.sm}
          mono={VD.mono}
          onClick={() => onSelectGesto('izq')}
          onDoubleClick={() => onEditarGesto('izq')}
        />
        <SectorTactil
          label={labelDer}
          prefijoGlifo="NEXT"
          seleccionado={subAccionSeleccionada === 'der'}
          disabled={disabled}
          accent={VD.accent}
          accentBg={VD.accentBg}
          surface={VD.surface}
          border={VD.border}
          textDim={VD.textDim}
          radiusSm={VD.radius.sm}
          mono={VD.mono}
          onClick={() => onSelectGesto('der')}
          onDoubleClick={() => onEditarGesto('der')}
        />
      </div>
    </div>
  );
}
