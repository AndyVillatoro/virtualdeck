import React from 'react';
import { useTheme } from '../../utils/theme';
import { useT, useFieldText } from '../../utils/i18n';
import { DotLabel } from '../../components/DotLabel';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';
import { SelectorTipoAccion } from './SelectorTipoAccion';
import { FORMULARIOS, type PropsFormulario } from './formularios';
import { FormMediaPlayPause } from './formularios/sistema';
import { ExtraActionRow } from './filas/FilaAccionExtra';
import type { ActionType, ButtonAction } from '../../types';

/** Tipos que no se ofrecen como paso de la secuencia. */
const EXCLUIR_EXTRA: ActionType[] = ['none', 'folder'];

/** El tope es 8 acciones en total: la principal más 7 pasos. */
const MAX_EXTRAS = 7;

interface SeccionAccionProps extends PropsFormulario {
  accent: string;
  /** Tipos que no se ofrecen (p. ej. `folder` en un control sin pantalla). */
  excluir?: ActionType[];
  /** En 2×2 la pulsación la resuelve cada cuadrante: la secuencia no corre. */
  is2x2Mode: boolean;
  extraActions: ButtonAction[];
  setExtraActions: React.Dispatch<React.SetStateAction<ButtonAction[]>>;
  showExtraPicker: boolean;
  setShowExtraPicker: (v: boolean) => void;
}

function moverPaso(
  setExtraActions: React.Dispatch<React.SetStateAction<ButtonAction[]>>,
  idx: number,
  delta: number,
) {
  setExtraActions((prev) => {
    const j = idx + delta;
    if (j < 0 || j >= prev.length) return prev;
    const next = [...prev];
    const temp = next[j];
    next[j] = next[idx];
    next[idx] = temp;
    return next;
  });
}

/**
 * La acción principal y, debajo, la secuencia que corre después al pulsar
 * (`button.actions`, roadmap 94). Vivía en AVANZADO, lejos de la acción, y el
 * dueño no sabía para qué servía.
 */
export function SeccionAccion(props: SeccionAccionProps) {
  const {
    action, setAction, accent, excluir, is2x2Mode,
    extraActions, setExtraActions, showExtraPicker, setShowExtraPicker,
  } = props;
  const VD = useTheme();
  const t = useT();
  const tf = useFieldText();

  const Formulario = FORMULARIOS[action.type] ?? FormMediaPlayPause;
  const puedeSecuencia = action.type !== 'none' && action.type !== 'folder' && !is2x2Mode;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Selector de tipos de acción */}
      <div>
        <DotLabel size={9} color={VD.textMuted} spacing={2} style={{ display: 'block', marginBottom: 8 }}>
          {tf('TIPO DE ACCIÓN')}
        </DotLabel>
        <SelectorTipoAccion
          seleccionado={action.type}
          onElegir={(type) => setAction({ type })}
          accent={accent}
          excluir={excluir}
        />
      </div>

      <div style={{ height: 1, background: VD.border }} />

      {/* Formulario específico de la acción seleccionada */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Formulario {...props} />
      </div>

      {/* Secuencia de acciones: pasos que se ejecutan después de la principal */}
      {puedeSecuencia && (
        <div>
          <div style={{ height: 1, background: VD.border, marginBottom: 12 }} />
          <DotLabel size={9} color={VD.textMuted} spacing={2} style={{ display: 'block', marginBottom: 6 }}>
            {t('ed.actionSequence')}
          </DotLabel>
          <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, lineHeight: 1.6, marginBottom: 4 }}>
            {t('ed.actionSequenceHint')}
          </div>
          <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textDim, lineHeight: 1.6, marginBottom: 4 }}>
            {t('ed.actionSequenceExample')}
          </div>
          <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textDim, lineHeight: 1.6, marginBottom: 10 }}>
            {t('ed.actionSequenceVsMacro')}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {extraActions.map((ea, idx) => (
              <ExtraActionRow
                key={idx}
                action={ea}
                stepIndex={idx}
                canMoveUp={idx > 0}
                canMoveDown={idx < extraActions.length - 1}
                onMoveUp={() => moverPaso(setExtraActions, idx, -1)}
                onMoveDown={() => moverPaso(setExtraActions, idx, 1)}
                onChange={(updated) => setExtraActions((prev) => prev.map((a, i) => (i === idx ? updated : a)))}
                onRemove={() => setExtraActions((prev) => prev.filter((_, i) => i !== idx))}
              />
            ))}
          </div>

          {extraActions.length < MAX_EXTRAS && !showExtraPicker && (
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
      )}
    </div>
  );
}
