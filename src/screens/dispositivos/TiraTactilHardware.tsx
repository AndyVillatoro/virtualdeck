import React, { useState } from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';
import { decodificarArrastrePlugin, type CargaArrastrePlugin } from '../../utils/plugins/arrastrePlugin';
import type { ButtonConfig } from '../../types';

export interface TiraTactilHardwareProps {
  indice: number;
  botonIzq?: ButtonConfig;
  botonDer?: ButtonConfig;
  subAccionSeleccionada: 'izq' | 'der' | null;
  disabled?: boolean;
  onSelectGesto: (gesto: 'izq' | 'der') => void;
  onEditarGesto: (gesto: 'izq' | 'der') => void;
  onDropPluginGesto?: (gesto: 'izq' | 'der', carga: CargaArrastrePlugin) => void;
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
  onDropPlugin?: (carga: CargaArrastrePlugin) => void;
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
  onDropPlugin,
}: SectorTactilProps) {
  const [dragOver, setDragOver] = useState(false);
  const activo = seleccionado || dragOver;

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      onDoubleClick={disabled ? undefined : onDoubleClick}
      onDragOver={(e) => {
        if (disabled || !onDropPlugin) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        setDragOver(false);
        if (disabled || !onDropPlugin) return;
        e.preventDefault();
        const carga = decodificarArrastrePlugin(e.dataTransfer.getData('text/plain'));
        if (carga) onDropPlugin(carga);
      }}
      title={label}
      style={{
        flex: 1,
        minWidth: 0,
        background: activo ? accentBg : surface,
        border: `1px solid ${activo ? accent : border}`,
        borderRadius: radiusSm,
        color: activo ? accent : textDim,
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
        boxShadow: activo ? `0 0 8px ${accentBg}` : 'none',
        transition: 'all 0.15s ease',
      }}
    >
      <DotGlyphIcon
        glyph={prefijoGlifo}
        size={10}
        color={activo ? accent : textDim}
      />
      <span
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: 90,
          minWidth: 0,
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
  onDropPluginGesto,
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
          onDropPlugin={onDropPluginGesto ? (c) => onDropPluginGesto('izq', c) : undefined}
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
          onDropPlugin={onDropPluginGesto ? (c) => onDropPluginGesto('der', c) : undefined}
        />
      </div>
    </div>
  );
}
