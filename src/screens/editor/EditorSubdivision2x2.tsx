import React, { useState } from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { DotLabel } from '../../components/DotLabel';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';
import { ACTION_TYPES } from './actionData';
import type { ActionType, SubButtonConfig } from '../../types';

interface EditorSubdivision2x2Props {
  parentId: string;
  subButtons: SubButtonConfig[];
  onChange: (subs: SubButtonConfig[]) => void;
  accent: string;
}

const GLYPH_OPTIONS = [
  'PLAY', 'PAUSE', 'NEXT', 'PREV', 'MUTE', 'SPEAKER', 'MIC',
  'ARROW_UP', 'ARROW_DOWN', 'ARROW_LEFT', 'ARROW_RIGHT',
  'TERMINAL', 'CODE', 'WEB', 'GEAR', 'CLOCK', 'ADD', 'SUBTRACT',
  'CHECK', 'CLOSE', 'EDIT', 'SPARKLE', 'BELL',
];

export const SUBDIVISION_PRESETS = [
  {
    id: 'media',
    nameKey: 'ed.split.presetMedia',
    glyph: 'PLAY',
    buttons: [
      { idSuffix: 'q0', label: 'PREV', dotGlyph: 'PREV', action: { type: 'media-prev' as ActionType } },
      { idSuffix: 'q1', label: 'NEXT', dotGlyph: 'NEXT', action: { type: 'media-next' as ActionType } },
      { idSuffix: 'q2', label: 'PLAY', dotGlyph: 'PLAY', action: { type: 'media-play-pause' as ActionType }, isToggle: true },
      { idSuffix: 'q3', label: 'MUTE', dotGlyph: 'MUTE', action: { type: 'mute' as ActionType }, isToggle: true },
    ],
  },
  {
    id: 'arrows',
    nameKey: 'ed.split.presetArrows',
    glyph: 'ARROW_UP',
    buttons: [
      { idSuffix: 'q0', label: 'UP', dotGlyph: 'ARROW_UP', action: { type: 'hotkey' as ActionType, hotkey: 'Up' } },
      { idSuffix: 'q1', label: 'DOWN', dotGlyph: 'ARROW_DOWN', action: { type: 'hotkey' as ActionType, hotkey: 'Down' } },
      { idSuffix: 'q2', label: 'LEFT', dotGlyph: 'ARROW_LEFT', action: { type: 'hotkey' as ActionType, hotkey: 'Left' } },
      { idSuffix: 'q3', label: 'RIGHT', dotGlyph: 'ARROW_RIGHT', action: { type: 'hotkey' as ActionType, hotkey: 'Right' } },
    ],
  },
  {
    id: 'shortcuts',
    nameKey: 'ed.split.presetShortcuts',
    glyph: 'TERMINAL',
    buttons: [
      { idSuffix: 'q0', label: 'TERM', dotGlyph: 'TERMINAL', action: { type: 'script' as ActionType, script: 'wt' } },
      { idSuffix: 'q1', label: 'CODE', dotGlyph: 'CODE', action: { type: 'app' as ActionType, appPath: 'code' } },
      { idSuffix: 'q2', label: 'WEB', dotGlyph: 'WEB', action: { type: 'web' as ActionType, url: 'https://' } },
      { idSuffix: 'q3', label: 'CONF', dotGlyph: 'GEAR', action: { type: 'none' as ActionType } },
    ],
  },
  {
    id: 'audio',
    nameKey: 'ed.split.presetAudio',
    glyph: 'SPEAKER',
    buttons: [
      { idSuffix: 'q0', label: 'VOL+', dotGlyph: 'ARROW_UP', action: { type: 'volume-up' as ActionType } },
      { idSuffix: 'q1', label: 'VOL-', dotGlyph: 'ARROW_DOWN', action: { type: 'volume-down' as ActionType } },
      { idSuffix: 'q2', label: 'MUTE', dotGlyph: 'MUTE', action: { type: 'mute' as ActionType }, isToggle: true },
      { idSuffix: 'q3', label: 'MIC', dotGlyph: 'MIC', action: { type: 'audio-device' as ActionType } },
    ],
  },
];

const QUAD_KEYS = [
  { idx: 0, code: 'TL', labelKey: 'ed.quadrant.tl' },
  { idx: 1, code: 'TR', labelKey: 'ed.quadrant.tr' },
  { idx: 2, code: 'BL', labelKey: 'ed.quadrant.bl' },
  { idx: 3, code: 'BR', labelKey: 'ed.quadrant.br' },
];

export function EditorSubdivision2x2({
  parentId,
  subButtons,
  onChange,
  accent,
}: EditorSubdivision2x2Props) {
  const VD = useTheme();
  const t = useT();
  const [selectedIdx, setSelectedIdx] = useState<number>(0);

  // Asegurar siempre 4 cuadrantes
  const normalized: SubButtonConfig[] = Array.from({ length: 4 }, (_, i) => {
    return subButtons[i] || {
      id: `${parentId}-q${i}`,
      label: '',
      action: { type: 'none' },
    };
  });

  const activeSub = normalized[selectedIdx];

  const updateActiveSub = (patch: Partial<SubButtonConfig>) => {
    const next = [...normalized];
    next[selectedIdx] = { ...activeSub, ...patch };
    onChange(next);
  };

  const applyPreset = (preset: typeof SUBDIVISION_PRESETS[0]) => {
    const next: SubButtonConfig[] = preset.buttons.map((b) => ({
      id: `${parentId}-${b.idSuffix}`,
      label: b.label,
      dotGlyph: b.dotGlyph,
      action: { ...b.action },
      isToggle: b.isToggle,
    }));
    onChange(next);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Barra de Presets 2×2 */}
      <div>
        <DotLabel size={9} color={VD.textMuted} spacing={2}>{t('ed.split.presets')}</DotLabel>
        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          {SUBDIVISION_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => applyPreset(p)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 12px',
                background: VD.surface,
                border: `1px solid ${VD.border}`,
                borderRadius: VD.radius.sm,
                color: VD.text,
                fontFamily: VD.mono,
                fontSize: 10,
                letterSpacing: '1px',
                cursor: 'pointer',
                transition: 'border-color 0.15s ease, background 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = accent;
                e.currentTarget.style.background = VD.elevated;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = VD.border;
                e.currentTarget.style.background = VD.surface;
              }}
            >
              <DotGlyphIcon glyph={p.glyph} size={10} color={accent} />
              <span>{t(p.nameKey)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Selector interactivo de cuadrantes (TL, TR, BL, BR) */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        <div style={{ width: 140, flexShrink: 0 }}>
          <DotLabel size={9} color={VD.textMuted} spacing={2}>{t('ed.quadrant.selected')}</DotLabel>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gridTemplateRows: '1fr 1fr',
              gap: 4,
              width: 130,
              height: 130,
              marginTop: 8,
              padding: 4,
              background: '#070809',
              borderRadius: VD.radius.md,
              border: `1px solid ${VD.borderStrong}`,
            }}
          >
            {QUAD_KEYS.map((q) => {
              const isSel = selectedIdx === q.idx;
              const sub = normalized[q.idx];
              const glyph = (sub.dotGlyph || sub.icon || '').toUpperCase();

              return (
                <div
                  key={q.idx}
                  onClick={() => setSelectedIdx(q.idx)}
                  style={{
                    background: isSel ? `${accent}25` : '#111315',
                    border: isSel ? `1.5px solid ${accent}` : `1px solid ${VD.border}`,
                    borderRadius: VD.radius.sm,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 3,
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'border-color 0.12s ease',
                  }}
                >
                  <span style={{ position: 'absolute', top: 3, left: 4, fontFamily: VD.mono, fontSize: 7, color: isSel ? accent : VD.textMuted }}>
                    {q.code}
                  </span>
                  {glyph ? (
                    <DotGlyphIcon glyph={glyph} size={12} color={isSel ? accent : VD.text} />
                  ) : (
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: isSel ? accent : VD.textDim }} />
                  )}
                  <span style={{ fontFamily: VD.mono, fontSize: 8, color: isSel ? accent : VD.textDim, fontWeight: 600 }}>
                    {sub.label || `Q${q.idx + 1}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Panel de configuración del cuadrante seleccionado */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Cabecera del cuadrante activo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${VD.border}`, paddingBottom: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: accent }} />
            <span style={{ fontFamily: VD.mono, fontSize: 11, fontWeight: 600, color: VD.text, letterSpacing: '1px' }}>
              {t(QUAD_KEYS[selectedIdx].labelKey)}
            </span>
          </div>

          {/* Fila: Acción del cuadrante */}
          <div>
            <DotLabel size={9} color={VD.textMuted} spacing={2}>{t('ed.split.action')}</DotLabel>
            <select
              value={activeSub.action.type}
              onChange={(e) => updateActiveSub({ action: { ...activeSub.action, type: e.target.value as ActionType } })}
              style={{
                width: '100%',
                marginTop: 6,
                padding: '6px 10px',
                background: VD.surface,
                border: `1px solid ${VD.border}`,
                color: VD.text,
                fontFamily: VD.mono,
                fontSize: 11,
                borderRadius: VD.radius.sm,
                outline: 'none',
              }}
            >
              {ACTION_TYPES.map((a) => (
                <option key={a.type} value={a.type}>
                  {t(a.label)}
                </option>
              ))}
            </select>
          </div>

          {/* Parámetros específicos de la acción */}
          {activeSub.action.type === 'hotkey' && (
            <div>
              <DotLabel size={9} color={VD.textMuted} spacing={2}>HOTKEY</DotLabel>
              <input
                type="text"
                placeholder="ej. Ctrl+Shift+P, Up, F5"
                value={activeSub.action.hotkey || ''}
                onChange={(e) => updateActiveSub({ action: { ...activeSub.action, hotkey: e.target.value } })}
                style={{
                  width: '100%',
                  marginTop: 6,
                  padding: '6px 10px',
                  background: VD.surface,
                  border: `1px solid ${VD.border}`,
                  color: VD.text,
                  fontFamily: VD.mono,
                  fontSize: 11,
                  borderRadius: VD.radius.sm,
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}

          {activeSub.action.type === 'web' && (
            <div>
              <DotLabel size={9} color={VD.textMuted} spacing={2}>URL</DotLabel>
              <input
                type="text"
                placeholder="https://..."
                value={activeSub.action.url || ''}
                onChange={(e) => updateActiveSub({ action: { ...activeSub.action, url: e.target.value } })}
                style={{
                  width: '100%',
                  marginTop: 6,
                  padding: '6px 10px',
                  background: VD.surface,
                  border: `1px solid ${VD.border}`,
                  color: VD.text,
                  fontFamily: VD.mono,
                  fontSize: 11,
                  borderRadius: VD.radius.sm,
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}

          {activeSub.action.type === 'app' && (
            <div>
              <DotLabel size={9} color={VD.textMuted} spacing={2}>RUTA APP</DotLabel>
              <input
                type="text"
                placeholder="notepad.exe, code, etc."
                value={activeSub.action.appPath || ''}
                onChange={(e) => updateActiveSub({ action: { ...activeSub.action, appPath: e.target.value } })}
                style={{
                  width: '100%',
                  marginTop: 6,
                  padding: '6px 10px',
                  background: VD.surface,
                  border: `1px solid ${VD.border}`,
                  color: VD.text,
                  fontFamily: VD.mono,
                  fontSize: 11,
                  borderRadius: VD.radius.sm,
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}

          {activeSub.action.type === 'script' && (
            <div>
              <DotLabel size={9} color={VD.textMuted} spacing={2}>COMANDO SCRIPT</DotLabel>
              <input
                type="text"
                placeholder="wt, powershell -c ..., etc."
                value={activeSub.action.script || ''}
                onChange={(e) => updateActiveSub({ action: { ...activeSub.action, script: e.target.value } })}
                style={{
                  width: '100%',
                  marginTop: 6,
                  padding: '6px 10px',
                  background: VD.surface,
                  border: `1px solid ${VD.border}`,
                  color: VD.text,
                  fontFamily: VD.mono,
                  fontSize: 11,
                  borderRadius: VD.radius.sm,
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}

          {/* Fila: Etiqueta y Toggle */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <DotLabel size={9} color={VD.textMuted} spacing={2}>{t('ed.split.label')}</DotLabel>
              <input
                type="text"
                maxLength={8}
                placeholder="PLAY, MUTE..."
                value={activeSub.label || ''}
                onChange={(e) => updateActiveSub({ label: e.target.value.toUpperCase() })}
                style={{
                  width: '100%',
                  marginTop: 6,
                  padding: '6px 10px',
                  background: VD.surface,
                  border: `1px solid ${VD.border}`,
                  color: VD.text,
                  fontFamily: VD.mono,
                  fontSize: 11,
                  borderRadius: VD.radius.sm,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 16 }}>
                <input
                  type="checkbox"
                  checked={!!activeSub.isToggle}
                  onChange={(e) => updateActiveSub({ isToggle: e.target.checked })}
                  style={{ accentColor: accent }}
                />
                <span style={{ fontFamily: VD.mono, fontSize: 10, color: VD.text, letterSpacing: '0.5px' }}>
                  {t('ed.split.toggle')}
                </span>
              </label>
            </div>
          </div>

          {/* Selector de Glifo Dot-Matrix */}
          <div>
            <DotLabel size={9} color={VD.textMuted} spacing={2}>{t('ed.split.icon')}</DotLabel>
            <div
              style={{
                display: 'flex',
                gap: 6,
                flexWrap: 'wrap',
                marginTop: 6,
                maxHeight: 90,
                overflowY: 'auto',
                padding: 6,
                background: VD.elevated,
                borderRadius: VD.radius.sm,
                border: `1px solid ${VD.border}`,
              }}
            >
              {GLYPH_OPTIONS.map((g) => {
                const isSelectedGlyph = (activeSub.dotGlyph || activeSub.icon || '').toUpperCase() === g;
                return (
                  <button
                    key={g}
                    onClick={() => updateActiveSub({ dotGlyph: g, icon: g })}
                    style={{
                      width: 28,
                      height: 28,
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: isSelectedGlyph ? `${accent}33` : VD.surface,
                      border: isSelectedGlyph ? `1px solid ${accent}` : `1px solid ${VD.border}`,
                      borderRadius: VD.radius.sm,
                      cursor: 'pointer',
                    }}
                    title={g}
                  >
                    <DotGlyphIcon glyph={g} size={12} color={isSelectedGlyph ? accent : VD.text} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
