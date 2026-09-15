import React from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { DotLabel } from '../../components/DotLabel';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';

interface CabeceraEditorBProps {
  buttonId: string;
  is2x2Mode: boolean;
  onCambiarModo: (modo2x2: boolean) => void;
  onClose: () => void;
}

/** Cabecera del editor: título, selector de modo 1×1 / 2×2 y cierre. */
export function CabeceraEditorB({ buttonId, is2x2Mode, onCambiarModo, onClose }: CabeceraEditorBProps) {
  const VD = useTheme();
  const t = useT();
  const accent = VD.accent;
  return (
    <div style={{
      height: 44, borderBottom: `1px solid ${VD.border}`,
      display: 'flex', alignItems: 'center', padding: '0 16px', gap: 10, flexShrink: 0,
    }}>
      <div style={{ width: 6, height: 6, borderRadius: VD.radius.md, background: accent }} />
      <DotLabel size={11} color={VD.text} spacing={2}>{t('ed.title')}</DotLabel>
      <span style={{ fontFamily: VD.mono, fontSize: 10, color: VD.textMuted }}>· {buttonId.toUpperCase()}</span>

      {/* Selector de modo: 1x1 Estándar vs 2x2 Cuadrantes */}
      <div style={{ display: 'flex', gap: 2, background: VD.elevated, padding: 2, borderRadius: VD.radius.sm, border: `1px solid ${VD.border}`, marginLeft: 16 }}>
        <button
          onClick={() => onCambiarModo(false)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 8px', border: 'none', borderRadius: VD.radius.sm,
            background: !is2x2Mode ? accent : 'transparent',
            color: !is2x2Mode ? '#fff' : VD.textDim,
            fontFamily: VD.mono, fontSize: 9, letterSpacing: '1px',
            cursor: 'pointer',
          }}
        >
          <DotGlyphIcon glyph="DOTS" size={8} color={!is2x2Mode ? '#fff' : VD.textDim} />
          <span>{t('ed.mode.standard')}</span>
        </button>
        <button
          onClick={() => onCambiarModo(true)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 8px', border: 'none', borderRadius: VD.radius.sm,
            background: is2x2Mode ? accent : 'transparent',
            color: is2x2Mode ? '#fff' : VD.textDim,
            fontFamily: VD.mono, fontSize: 9, letterSpacing: '1px',
            cursor: 'pointer',
          }}
        >
          <DotGlyphIcon glyph="FULLSCREEN" size={8} color={is2x2Mode ? '#fff' : VD.textDim} />
          <span>{t('ed.mode.split2x2')}</span>
        </button>
      </div>

      <div style={{ flex: 1 }} />
      <button onClick={onClose} style={{ color: VD.textDim, background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 4 }}>
        <DotGlyphIcon glyph="CLOSE" size={12} color={VD.textDim} />
      </button>
    </div>
  );
}
