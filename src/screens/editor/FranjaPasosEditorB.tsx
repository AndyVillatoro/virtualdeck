import React from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';

/** Claves i18n de los pasos (el texto se resuelve con t() en render). */
export const STEPS = ['ed.step.action', 'ed.step.config', 'ed.step.style'];

interface FranjaPasosEditorBProps {
  is2x2Mode: boolean;
  step: number;
  onPaso: (i: number) => void;
}

/** Franja bajo la cabecera: pasos 01–03 o aviso de modo 2×2. */
export function FranjaPasosEditorB({ is2x2Mode, step, onPaso }: FranjaPasosEditorBProps) {
  const VD = useTheme();
  const t = useT();
  const accent = VD.accent;
  if (is2x2Mode) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderBottom: `1px solid ${VD.border}`, flexShrink: 0 }}>
        <DotGlyphIcon glyph="FULLSCREEN" size={10} color={accent} />
        <span style={{ fontFamily: VD.mono, fontSize: 10, color: VD.text, letterSpacing: '1px' }}>
          {t('ed.mode.split2x2')}
        </span>
        <span style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted }}>
          · {t('ed.mode.hint')}
        </span>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', padding: '16px 24px', gap: 4, borderBottom: `1px solid ${VD.border}`, flexShrink: 0 }}>
      {STEPS.map((s, i) => (
        <div key={s} style={{ flex: 1, cursor: 'pointer' }} onClick={() => onPaso(i)}>
          <div style={{ height: 2, background: i <= step ? accent : VD.border, transition: 'background 0.2s' }} />
          <div style={{ marginTop: 8, fontFamily: VD.mono, fontSize: 10, letterSpacing: 2, color: i === step ? VD.text : i < step ? VD.textDim : VD.textMuted }}>
            {String(i + 1).padStart(2, '0')} · {t(s)}
          </div>
        </div>
      ))}
    </div>
  );
}
