import React, { useState } from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';
import { resolveDotGlyph } from '../../components/dot480/resolveDotGlyph';
import type { ControlSuperficie } from '../../types/superficies';
import {
  PRESETS_PERILLA,
  PRESETS_BOTON,
  PRESETS_TIRA,
  type PresetDock,
  type PresetHueco,
} from '../../data/presetsDock';
import { describirPreset } from './describirAccion';

export interface SelectorPresetsControlProps {
  control: ControlSuperficie;
  onAplicar: (huecos: PresetHueco[]) => void;
  disabled?: boolean;
}

function obtenerPresetsPorControl(control: ControlSuperficie): PresetDock[] {
  if (control === 'knob') return PRESETS_PERILLA;
  if (control === 'swipe') return PRESETS_TIRA;
  return PRESETS_BOTON;
}

function ItemPreset({
  preset,
  control,
  onAplicar,
  disabled,
}: {
  preset: PresetDock;
  control: ControlSuperficie;
  onAplicar: (huecos: PresetHueco[]) => void;
  disabled?: boolean;
}) {
  const VD = useTheme();
  const t = useT();
  const [hovered, setHovered] = useState(false);

  const glifo = resolveDotGlyph(preset.icon) || 'DOTS';
  const colorGlifo = preset.huecos[0]?.fgColor || VD.accent;
  const lineas = describirPreset(preset, control, t);
  const tituloCompleto = `${t(preset.nombre)}\n${lineas
    .map((l) => `${l.gesto ? `${l.gesto} · ` : ''}${l.desc}${l.otraVez ? `\n  ${l.otraVez}` : ''}`)
    .join('\n')}`;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onAplicar(preset.huecos)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={tituloCompleto}
      style={{
        width: '100%',
        background: hovered && !disabled ? VD.elevatedHover : VD.elevated,
        border: `1px solid ${hovered && !disabled ? VD.accent : VD.border}`,
        borderRadius: VD.radius.sm,
        padding: `${VD.space.sm}px`,
        cursor: disabled ? 'default' : 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: VD.space.xs,
        textAlign: 'left',
        opacity: disabled ? 0.5 : 1,
        transition: 'background 0.12s, border-color 0.12s',
        outline: 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: VD.space.xs,
          overflow: 'hidden',
          minWidth: 0,
        }}
      >
        <DotGlyphIcon glyph={glifo} size={14} color={colorGlifo} />
        <span
          style={{
            fontSize: 9.5,
            color: VD.text,
            fontFamily: VD.mono,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            whiteSpace: 'normal',
            overflowWrap: 'anywhere',
            lineHeight: 1.25,
            minWidth: 0,
            flex: 1,
          }}
        >
          {t(preset.nombre)}
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          paddingLeft: 18,
          overflow: 'hidden',
          minWidth: 0,
        }}
      >
        {lineas.map((linea, idx) => (
          <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 8,
                fontFamily: VD.mono,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                display: 'flex',
                gap: 4,
                minWidth: 0,
                alignItems: 'baseline',
              }}
            >
              {linea.gesto && (
                <span style={{ color: VD.textMuted, flexShrink: 0 }}>
                  {linea.gesto} ·
                </span>
              )}
              <span
                style={{
                  color: VD.text,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  whiteSpace: 'normal',
                  overflowWrap: 'anywhere',
                  lineHeight: 1.25,
                  minWidth: 0,
                  flex: 1,
                }}
              >
                {linea.desc}
              </span>
            </div>
            {linea.otraVez && (
              <div
                style={{
                  fontSize: 7.5,
                  color: VD.textMuted,
                  fontFamily: VD.mono,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  whiteSpace: 'normal',
                  overflowWrap: 'anywhere',
                  lineHeight: 1.2,
                  paddingLeft: linea.gesto ? 10 : 0,
                  opacity: 0.85,
                  minWidth: 0,
                }}
              >
                {linea.otraVez}
              </div>
            )}
          </div>
        ))}
      </div>
    </button>
  );
}

export function SelectorPresetsControl({
  control,
  onAplicar,
  disabled = false,
}: SelectorPresetsControlProps) {
  const VD = useTheme();
  const t = useT();
  const presets = obtenerPresetsPorControl(control);

  if (presets.length === 0) {
    return (
      <div
        style={{
          fontSize: 8.5,
          color: VD.textMuted,
          fontFamily: VD.mono,
          textTransform: 'uppercase',
          padding: VD.space.sm,
        }}
      >
        {t('disp.presets.sinPresets')}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: VD.space.xs }}>
      <label
        style={{
          fontSize: 8.5,
          color: VD.textMuted,
          fontFamily: VD.mono,
          textTransform: 'uppercase',
          letterSpacing: 1,
        }}
      >
        {t('disp.presets.titulo')}
      </label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: VD.space.xs }}>
        {presets.map((preset) => (
          <ItemPreset
            key={preset.id}
            preset={preset}
            control={control}
            onAplicar={onAplicar}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}

