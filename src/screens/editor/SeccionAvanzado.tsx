import React from 'react';
import { useTheme } from '../../utils/theme';
import { useT, useFieldText } from '../../utils/i18n';
import { DotLabel } from '../../components/DotLabel';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';
import { EditorSubdivision2x2 } from './EditorSubdivision2x2';
import { Btn, ExtraActionRow } from './comunes';
import { SelectorTipoAccion } from './SelectorTipoAccion';
import type { ActionType, ButtonAction, SubButtonConfig } from '../../types';

const EXCLUIR_EXTRA: ActionType[] = ['none', 'folder'];

interface SeccionAvanzadoProps {
  parentId: string;
  is2x2Mode: boolean;
  /** Página de un dock físico: el aparato no ejecuta cuadrantes. */
  esDock?: boolean;
  setIs2x2Mode: (v: boolean) => void;
  subButtons: SubButtonConfig[];
  setSubButtons: React.Dispatch<React.SetStateAction<SubButtonConfig[]>>;
  action: ButtonAction;
  extraActions: ButtonAction[];
  setExtraActions: React.Dispatch<React.SetStateAction<ButtonAction[]>>;
  showExtraPicker: boolean;
  setShowExtraPicker: (v: boolean) => void;
  accent: string;
}

export function SeccionAvanzado({
  parentId,
  is2x2Mode,
  esDock = false,
  setIs2x2Mode,
  subButtons,
  setSubButtons,
  action,
  extraActions,
  setExtraActions,
  showExtraPicker,
  setShowExtraPicker,
  accent,
}: SeccionAvanzadoProps) {
  const VD = useTheme();
  const t = useT();
  const tf = useFieldText();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 1. Subdivisión 2×2 */}
      {esDock ? (
        <div>
          <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, lineHeight: 1.6 }}>
            {tf('El aparato no ejecuta cuadrantes 2×2: este control no los admite.')}
          </div>
          {is2x2Mode && (
            <Btn
              onClick={() => setIs2x2Mode(false)}
              style={{ marginTop: 8, borderColor: VD.danger, color: VD.danger }}
            >
              {tf('QUITAR CUADRANTES')}
            </Btn>
          )}
        </div>
      ) : (
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 8 }}>
            <input
              type="checkbox"
              checked={is2x2Mode}
              onChange={(e) => setIs2x2Mode(e.target.checked)}
              style={{ accentColor: accent }}
            />
            <DotGlyphIcon glyph="FULLSCREEN" size={10} color={is2x2Mode ? accent : VD.textMuted} />
            <span style={{ fontFamily: VD.mono, fontSize: 9, letterSpacing: 1, color: is2x2Mode ? VD.text : VD.textDim, fontWeight: 600 }}>
              {t('ed.mode.split2x2')}
            </span>
          </label>
          <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, marginLeft: 22, marginBottom: is2x2Mode ? 12 : 0 }}>
            {t('ed.mode.hint')}
          </div>

          {is2x2Mode && (
            <div style={{ borderTop: `1px solid ${VD.border}`, paddingTop: 12 }}>
              <EditorSubdivision2x2
                parentId={parentId}
                subButtons={subButtons}
                onChange={setSubButtons}
                accent={accent}
              />
            </div>
          )}
        </div>
      )}

      <div style={{ height: 1, background: VD.border }} />

      {/* 2. Secuencia de acciones adicionales (multi-paso) */}
      <div>
        <DotLabel size={9} color={VD.textMuted} spacing={2} style={{ display: 'block', marginBottom: 6 }}>
          {t('ed.actionSequence')}
        </DotLabel>
        <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, marginBottom: 10 }}>
          {t('ed.actionSequenceHint')}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {extraActions.map((ea, idx) => (
            <ExtraActionRow
              key={idx}
              action={ea}
              stepIndex={idx}
              canMoveUp={idx > 0}
              canMoveDown={idx < extraActions.length - 1}
              onMoveUp={() => {
                if (idx <= 0) return;
                setExtraActions((prev) => {
                  const next = [...prev];
                  const temp = next[idx - 1];
                  next[idx - 1] = next[idx];
                  next[idx] = temp;
                  return next;
                });
              }}
              onMoveDown={() => {
                if (idx >= extraActions.length - 1) return;
                setExtraActions((prev) => {
                  const next = [...prev];
                  const temp = next[idx + 1];
                  next[idx + 1] = next[idx];
                  next[idx] = temp;
                  return next;
                });
              }}
              onChange={(updated) => setExtraActions((prev) => prev.map((a, i) => (i === idx ? updated : a)))}
              onRemove={() => setExtraActions((prev) => prev.filter((_, i) => i !== idx))}
            />
          ))}
        </div>

        {action.type !== 'none' && action.type !== 'folder' && extraActions.length < 8 && !showExtraPicker && (
          <button
            type="button"
            onClick={() => setShowExtraPicker(true)}
            style={{
              marginTop: 8,
              padding: '6px 12px',
              background: 'transparent',
              border: `1px dashed ${VD.border}`,
              fontFamily: VD.mono,
              fontSize: 9,
              color: VD.textMuted,
              cursor: 'pointer',
              borderRadius: VD.radius.sm,
              letterSpacing: 1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <DotGlyphIcon glyph="ADD" size={8} color={VD.textMuted} />
            <span>{t('ed.addExtraAction')}</span>
          </button>
        )}

        {showExtraPicker && (
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <SelectorTipoAccion
              excluir={EXCLUIR_EXTRA}
              compacto
              accent={accent}
              onElegir={(type) => {
                setExtraActions((prev) => [...prev, { type }]);
                setShowExtraPicker(false);
              }}
            />
            <button
              type="button"
              onClick={() => setShowExtraPicker(false)}
              style={{
                alignSelf: 'flex-start',
                background: VD.elevated,
                border: `1px solid ${VD.border}`,
                borderRadius: VD.radius.sm,
                padding: '4px 8px',
                cursor: 'pointer',
                fontFamily: VD.mono,
                fontSize: 9,
                color: VD.danger,
                boxSizing: 'border-box',
                outline: 'none',
              }}
            >
              {t('ed.cancelCapture')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
