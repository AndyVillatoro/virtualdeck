import React from 'react';
import { useTheme } from '../../utils/theme';
import { useT, useFieldText } from '../../utils/i18n';
import { DotLabel } from '../../components/DotLabel';
import { IconNone } from '../../components/VDIcon';
import { ACTION_TYPES, PRESET_CATEGORIES, type ButtonPreset } from './actionData';

/** Las categorias que declara `PRESET_CATEGORIES`, sin repetirlas a mano. */
type CategoriaPreset = (typeof PRESET_CATEGORIES)[number];
import { MacroEditor } from './MacroEditor';
import {
  Field, Btn, SensorPicker, FolderButtonSlot, ToggleOffActionPicker, BranchActionRow, ExtraActionRow,
  estiloEntrada,
} from './comunes';
import type {
  ActionType, AudioDevice, ButtonAction, FolderButton, RGBDeviceInfo, RGBProfile,
} from '../../types';

/**
 * Paso 1 de 3: que hace el boton.
 *
 * Presets rapidos arriba, catalogo de tipos de accion abajo, y el bloque de
 * acciones adicionales.
 */
interface PropsPasoAccion {
  accent: string;
  action: ButtonAction;
  setAction: React.Dispatch<React.SetStateAction<ButtonAction>>;
  applyPreset: (p: ButtonPreset) => void;
  extraActions: ButtonAction[];
  setExtraActions: React.Dispatch<React.SetStateAction<ButtonAction[]>>;
  filteredPresets: ButtonPreset[];
  presetCategory: CategoriaPreset;
  setPresetCategory: React.Dispatch<React.SetStateAction<CategoriaPreset>>;
  presetSearch: string;
  setPresetSearch: (s: string) => void;
  showExtraPicker: boolean;
  setShowExtraPicker: (v: boolean) => void;
}

export function PasoAccion({ accent, action, setAction, applyPreset, extraActions, setExtraActions, filteredPresets, presetCategory, setPresetCategory, presetSearch, setPresetSearch, showExtraPicker, setShowExtraPicker }: PropsPasoAccion) {
  const VD = useTheme();
  const t = useT();
  const tf = useFieldText();
  const inputStyle = estiloEntrada(VD);

  return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Presets */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
            <DotLabel size={9} color={VD.textMuted} spacing={2}>{tf('PRESETS RÁPIDOS')}</DotLabel>
            <input
              value={presetSearch}
              onChange={(e) => setPresetSearch(e.target.value)}
              placeholder={tf("Buscar preset...")}
              style={{
                background: VD.elevated, border: `1px solid ${VD.border}`,
                padding: '3px 8px', color: VD.text, fontFamily: VD.mono, fontSize: 9,
                outline: 'none', borderRadius: VD.radius.sm, width: 120,
              }}
            />
            {!presetSearch && (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {PRESET_CATEGORIES.map((cat) => (
                  <button key={cat} onClick={() => setPresetCategory(cat)} style={{
                    padding: '3px 8px', border: `1px solid ${presetCategory === cat ? accent : VD.border}`,
                    background: presetCategory === cat ? VD.accentBg : 'transparent',
                    fontFamily: VD.mono, fontSize: 8, letterSpacing: 1,
                    color: presetCategory === cat ? accent : VD.textMuted,
                    cursor: 'pointer', borderRadius: VD.radius.sm,
                  }}>
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {filteredPresets.map((preset, i) => {
              const PresetIcon = ACTION_TYPES.find(at => at.type === preset.action.type)?.Icon;
              return (
                <div
                  key={i}
                  onClick={() => applyPreset(preset)}
                  title={t('editor.applyPreset', { nombre: preset.label })}
                  style={{
                    width: 70, height: 70, borderRadius: VD.radius.lg,
                    background: preset.bgColor || VD.elevated,
                    border: `1px solid ${VD.border}`,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', gap: 4,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = accent)}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = VD.border)}
                >
                  {preset.icon ? (
                    <div style={{ fontSize: 18, color: preset.fgColor || VD.text, lineHeight: 1 }}>
                      {preset.icon}
                    </div>
                  ) : PresetIcon ? (
                    <PresetIcon size={20} color={preset.fgColor || VD.text} />
                  ) : (
                    <div style={{ fontSize: 18, color: preset.fgColor || VD.text, lineHeight: 1 }}>○</div>
                  )}
                  <div style={{ fontFamily: VD.mono, fontSize: 8, color: preset.fgColor || VD.textDim, textAlign: 'center', maxWidth: 62, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {preset.label}
                  </div>
                </div>
              );
            })}
            {filteredPresets.length === 0 && (
              <div style={{ fontFamily: VD.mono, fontSize: 10, color: VD.textMuted, padding: '8px 0' }}>{tf('Sin resultados')}</div>
            )}
          </div>
        </div>

        <div style={{ height: 1, background: VD.border }} />

        {/* Action types */}
        <div>
          <DotLabel size={9} color={VD.textMuted} spacing={2} style={{ display: 'block', marginBottom: 10 }}>
            {tf('TIPO DE ACCIÓN')}
          </DotLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {ACTION_TYPES.map((at) => {
              const Icon = at.Icon;
              const active = action.type === at.type;
              return (
                <div
                  key={at.type}
                  onClick={() => setAction({ type: at.type })}
                  style={{
                    background: active ? VD.accentBg : VD.elevated,
                    border: `1px solid ${active ? accent : VD.border}`,
                    borderRadius: VD.radius.lg, padding: '8px 10px',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                  }}
                >
                  <Icon size={16} color={active ? accent : VD.textMuted} strokeWidth={1.5} />
                  <div>
                    <div style={{ fontFamily: VD.mono, fontSize: 9, color: active ? VD.text : VD.textDim, letterSpacing: 0.5 }}>{t(at.label)}</div>
                    <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, marginTop: 1 }}>{t(at.desc)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Multi-action sequence */}
        {action.type !== 'none' && action.type !== 'folder' && (
          <div>
            <div style={{ height: 1, background: VD.border, marginBottom: 12 }} />
            <DotLabel size={9} color={VD.textMuted} spacing={2} style={{ display: 'block', marginBottom: 8 }}>
              SECUENCIA DE ACCIONES (OPCIONAL)
            </DotLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {extraActions.map((ea, idx) => (
                <ExtraActionRow
                  key={idx}
                  action={ea}
                  onChange={(updated) => setExtraActions(prev => prev.map((a, i) => i === idx ? updated : a))}
                  onRemove={() => setExtraActions(prev => prev.filter((_, i) => i !== idx))}
                />
              ))}
            </div>
            {extraActions.length < 3 && !showExtraPicker && (
              <button onClick={() => setShowExtraPicker(true)} style={{
                marginTop: 6, padding: '5px 12px',
                background: 'transparent', border: `1px dashed ${VD.border}`,
                fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, cursor: 'pointer',
                borderRadius: VD.radius.sm, letterSpacing: 1,
              }}>
                {tf('+ AÑADIR ACCIÓN ADICIONAL')}
              </button>
            )}
            {showExtraPicker && (
              <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
                {ACTION_TYPES.filter(at => at.type !== 'none' && at.type !== 'folder').map(at => {
                  const Icon = at.Icon;
                  return (
                    <div key={at.type} onClick={() => {
                      setExtraActions(prev => [...prev, { type: at.type }]);
                      setShowExtraPicker(false);
                    }} style={{
                      background: VD.elevated, border: `1px solid ${VD.border}`,
                      borderRadius: VD.radius.md, padding: '5px 8px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 5,
                    }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = accent)}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = VD.border)}
                    >
                      <Icon size={12} color={VD.textMuted} strokeWidth={1.5} />
                      <span style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textDim }}>{t(at.label)}</span>
                    </div>
                  );
                })}
                <div onClick={() => setShowExtraPicker(false)} style={{
                  background: VD.elevated, border: `1px solid ${VD.border}`,
                  borderRadius: VD.radius.md, padding: '5px 8px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontFamily: VD.mono, fontSize: 9, color: VD.danger }}>{t('ed.cancelCapture')}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
  );
}
