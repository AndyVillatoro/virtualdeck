import React from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';
import type { ButtonConfig } from '../../types';

interface PerillaRotativaHardwareProps {
  indice: number;
  botonIzq?: ButtonConfig;
  botonPulsar?: ButtonConfig;
  botonDer?: ButtonConfig;
  subAccionSeleccionada: 'izq' | 'pulsar' | 'der' | null;
  disabled?: boolean;
  onSelectGesto: (gesto: 'izq' | 'pulsar' | 'der') => void;
  onEditarGesto: (gesto: 'izq' | 'pulsar' | 'der') => void;
}

interface BotonSubAccionProps {
  prefijoGlifo: string;
  label: string;
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

function BotonSubAccion({
  prefijoGlifo,
  label,
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
}: BotonSubAccionProps) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      onDoubleClick={disabled ? undefined : onDoubleClick}
      title={label}
      style={{
        flex: 1,
        minWidth: 0,
        background: seleccionado ? accentBg : surface,
        border: `1px solid ${seleccionado ? accent : border}`,
        color: seleccionado ? accent : textDim,
        fontSize: 7.5,
        fontFamily: mono,
        padding: '3px 2px',
        textAlign: 'center',
        borderRadius: radiusSm,
        cursor: disabled ? 'default' : 'pointer',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
      }}
    >
      <DotGlyphIcon
        glyph={prefijoGlifo}
        size={8}
        color={seleccionado ? accent : textDim}
      />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
        {label}
      </span>
    </button>
  );
}

function DialSvg({
  sub,
  accent,
  borderStrong,
  trama,
  surface,
  elevatedHover,
  textMuted,
}: {
  sub: 'izq' | 'pulsar' | 'der' | null;
  accent: string;
  borderStrong: string;
  trama: string;
  surface: string;
  elevatedHover: string;
  textMuted: string;
}) {
  const cTop = sub === 'pulsar' ? accent : `rgba(${trama}, 0.2)`;
  const cDer = sub === 'der' ? accent : `rgba(${trama}, 0.1)`;
  const cIzq = sub === 'izq' ? accent : `rgba(${trama}, 0.1)`;
  const cMuted = `rgba(${trama}, 0.08)`;

  return (
    <svg viewBox="0 0 54 54" style={{ width: '100%', height: '100%' }}>
      <circle cx="27" cy="5" r="1.6" fill={cTop} />
      <circle cx="35.4" cy="7.2" r="1.2" fill={cDer} />
      <circle cx="42.5" cy="11.5" r="1.2" fill={cDer} />
      <circle cx="47" cy="18.6" r="1.2" fill={cDer} />
      <circle cx="49" cy="27" r="1.6" fill={cDer} />
      <circle cx="47" cy="35.4" r="1.2" fill={cMuted} />
      <circle cx="42.5" cy="42.5" r="1.2" fill={cMuted} />
      <circle cx="35.4" cy="47" r="1.2" fill={cMuted} />
      <circle cx="27" cy="49" r="1.6" fill={`rgba(${trama}, 0.2)`} />
      <circle cx="18.6" cy="47" r="1.2" fill={cMuted} />
      <circle cx="11.5" cy="42.5" r="1.2" fill={cMuted} />
      <circle cx="7" cy="35.4" r="1.2" fill={cMuted} />
      <circle cx="5" cy="27" r="1.6" fill={cIzq} />
      <circle cx="7" cy="18.6" r="1.2" fill={cIzq} />
      <circle cx="11.5" cy="11.5" r="1.2" fill={cIzq} />
      <circle cx="18.6" cy="7.2" r="1.2" fill={cIzq} />

      <circle
        cx="27"
        cy="27"
        r="17"
        fill={surface}
        stroke={sub === 'pulsar' ? accent : borderStrong}
        strokeWidth="1.5"
      />
      <circle cx="27" cy="27" r="13" fill={elevatedHover} />
      <rect
        x="25.5"
        y="15"
        width="3"
        height="6"
        rx="1"
        fill={sub ? accent : textMuted}
      />
    </svg>
  );
}

export function PerillaRotativaHardware({
  indice,
  botonIzq,
  botonPulsar,
  botonDer,
  subAccionSeleccionada,
  disabled = false,
  onSelectGesto,
  onEditarGesto,
}: PerillaRotativaHardwareProps) {
  const VD = useTheme();
  const t = useT();

  const labelPulsar = botonPulsar?.label || t('disp.pulsar');
  const labelIzq = botonIzq?.label || t('disp.izq');
  const labelDer = botonDer?.label || t('disp.der');

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: VD.elevated,
        border: `1px solid ${subAccionSeleccionada ? VD.borderStrong : VD.border}`,
        borderRadius: VD.radius.md,
        padding: `${VD.space.sm}px ${VD.space.xs}px`,
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
          fontSize: 8,
          color: VD.textMuted,
          fontFamily: VD.mono,
          padding: `0 ${VD.space.xs}px`,
        }}
      >
        <span>{t('disp.perilla', { n: indice + 1 })}</span>
        {subAccionSeleccionada && (
          <span style={{ color: VD.accent, fontWeight: 600 }}>
            {subAccionSeleccionada.toUpperCase()}
          </span>
        )}
      </div>

      <div
        onClick={disabled ? undefined : () => onSelectGesto('pulsar')}
        onDoubleClick={disabled ? undefined : () => onEditarGesto('pulsar')}
        style={{
          position: 'relative',
          width: 50,
          height: 50,
          cursor: disabled ? 'default' : 'pointer',
        }}
      >
        <DialSvg
          sub={subAccionSeleccionada}
          accent={VD.accent}
          borderStrong={VD.borderStrong}
          trama={VD.trama}
          surface={VD.surface}
          elevatedHover={VD.elevatedHover}
          textMuted={VD.textMuted}
        />
      </div>

      <div style={{ display: 'flex', gap: 2, width: '100%' }}>
        <BotonSubAccion
          prefijoGlifo="ROTATE_CCW"
          label={labelIzq}
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
        <BotonSubAccion
          prefijoGlifo="KNOB_PRESS"
          label={labelPulsar}
          seleccionado={subAccionSeleccionada === 'pulsar'}
          disabled={disabled}
          accent={VD.accent}
          accentBg={VD.accentBg}
          surface={VD.surface}
          border={VD.border}
          textDim={VD.textDim}
          radiusSm={VD.radius.sm}
          mono={VD.mono}
          onClick={() => onSelectGesto('pulsar')}
          onDoubleClick={() => onEditarGesto('pulsar')}
        />
        <BotonSubAccion
          prefijoGlifo="ROTATE_CW"
          label={labelDer}
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
