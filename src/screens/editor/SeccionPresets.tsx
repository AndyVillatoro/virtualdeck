import React from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { DotGlyphIcon, resolveDotGlyph } from '../../components/dot480/DotGlyphIcon';
import { ACTION_TYPES, PRESET_CATEGORIES, type ButtonPreset } from './actionData';
import type { PresetDock } from '../../data/presetsDock';
import { obtenerHuecoDePreset } from './useDockPresets';

interface SeccionPresetsProps {
  accent: string;
  filteredPresets: ButtonPreset[];
  dockPresets: PresetDock[];
  esDock: boolean;
  dockGesto?: 'izq' | 'pulsar' | 'der';
  presetCategory: string;
  setPresetCategory: (c: any) => void;
  presetSearch: string;
  setPresetSearch: (s: string) => void;
  onApplyPreset: (p: ButtonPreset) => void;
  onApplyDockPreset: (p: PresetDock) => void;
}

export function SeccionPresets({
  accent,
  filteredPresets,
  dockPresets,
  esDock,
  dockGesto,
  presetCategory,
  setPresetCategory,
  presetSearch,
  setPresetSearch,
  onApplyPreset,
  onApplyDockPreset,
}: SeccionPresetsProps) {
  const VD = useTheme();
  const t = useT();

  const query = presetSearch.trim().toLowerCase();

  const matchingDockPresets = dockPresets.filter((dp) => {
    if (!query) return presetCategory === 'DOCK';
    const nombre = t(dp.nombre).toLowerCase();
    const id = dp.id.toLowerCase();
    const coincideHueco = dp.huecos.some((h) => h.label.toLowerCase().includes(query));
    return nombre.includes(query) || id.includes(query) || coincideHueco;
  });

  const categories = esDock ? ['DOCK', ...PRESET_CATEGORIES] : PRESET_CATEGORIES;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Buscador y categorías */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <input
          value={presetSearch}
          onChange={(e) => setPresetSearch(e.target.value)}
          placeholder={t('ed.searchPresets')}
          style={{
            background: VD.elevated,
            border: `1px solid ${VD.border}`,
            padding: '4px 8px',
            color: VD.text,
            fontFamily: VD.mono,
            fontSize: 9,
            outline: 'none',
            borderRadius: VD.radius.sm,
            width: 140,
          }}
        />

        {!presetSearch && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {categories.map((cat) => {
              const isSel = presetCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setPresetCategory(cat)}
                  style={{
                    padding: '3px 8px',
                    border: `1px solid ${isSel ? accent : VD.border}`,
                    background: isSel ? VD.accentBg : 'transparent',
                    fontFamily: VD.mono,
                    fontSize: 8,
                    letterSpacing: 1,
                    color: isSel ? accent : VD.textMuted,
                    cursor: 'pointer',
                    borderRadius: VD.radius.sm,
                  }}
                >
                  {cat === 'DOCK' ? t('cat.DOCK') : t(`cat.${cat}`)}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Grid de Presets */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {/* Presets de dock */}
        {matchingDockPresets.map((dp) => {
          const hueco = obtenerHuecoDePreset(dp, dockGesto);
          const glifo = resolveDotGlyph(dp.icon) || 'DOTS';
          const fg = hueco.fgColor || VD.text;
          const bg = hueco.bgColor || VD.elevated;
          return (
            <div
              key={`dock-${dp.id}`}
              onClick={() => onApplyDockPreset(dp)}
              title={`${t(dp.nombre)} · ${hueco.label}`}
              style={{
                width: 72,
                height: 72,
                borderRadius: VD.radius.lg,
                background: bg,
                border: `1px solid ${VD.border}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                gap: 4,
                padding: 4,
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = accent)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = VD.border)}
            >
              <DotGlyphIcon glyph={glifo} size={16} color={fg} showRecessed />
              <div
                style={{
                  fontFamily: VD.mono,
                  fontSize: 7.5,
                  color: fg,
                  textAlign: 'center',
                  maxWidth: 64,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontWeight: 600,
                }}
              >
                {t(dp.nombre)}
              </div>
              <div
                style={{
                  fontFamily: VD.mono,
                  fontSize: 7,
                  color: VD.textDim,
                  textAlign: 'center',
                  maxWidth: 64,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {hueco.label}
              </div>
            </div>
          );
        })}

        {/* Presets generales estándar */}
        {filteredPresets.map((preset, i) => {
          const dotGlyph = (preset.icon && resolveDotGlyph(preset.icon))
            || ACTION_TYPES.find((at) => at.type === preset.action.type)?.glyph
            || 'DOTS';
          const fg = preset.fgColor || VD.text;
          const bg = preset.bgColor || VD.elevated;
          return (
            <div
              key={`std-${i}`}
              onClick={() => onApplyPreset(preset)}
              title={t('editor.applyPreset', { nombre: preset.label })}
              style={{
                width: 72,
                height: 72,
                borderRadius: VD.radius.lg,
                background: bg,
                border: `1px solid ${VD.border}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                gap: 4,
                padding: 4,
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = accent)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = VD.border)}
            >
              <DotGlyphIcon glyph={dotGlyph} size={16} color={fg} showRecessed />
              <div
                style={{
                  fontFamily: VD.mono,
                  fontSize: 8,
                  color: fg || VD.textDim,
                  textAlign: 'center',
                  maxWidth: 64,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {preset.label}
              </div>
            </div>
          );
        })}

        {filteredPresets.length === 0 && matchingDockPresets.length === 0 && (
          <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, padding: '8px 0' }}>
            {t('ed.noPresets')}
          </div>
        )}
      </div>
    </div>
  );
}
