import React from 'react';
import type { useTheme } from '../../utils/theme';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';

/** El inspector sin control elegido: qué dice y el botón de cerrar. */
export function PanelVacio({
  vd,
  texto,
  ancho,
  onCerrar,
  t,
}: {
  vd: ReturnType<typeof useTheme>;
  texto: string;
  ancho?: number;
  onCerrar?: () => void;
  t: (key: string) => string;
}) {
  const w = ancho ?? 290;
  return (
    <aside
      style={{
        width: w,
        minWidth: w,
        maxWidth: w,
        background: vd.surface,
        borderLeft: `1px solid ${vd.border}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: vd.space.lg,
        textAlign: 'center',
        color: vd.textMuted,
        fontFamily: vd.mono,
        fontSize: 9.5,
        lineHeight: 1.6,
        flexShrink: 0,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {onCerrar && (
        <button
          type="button"
          onClick={onCerrar}
          title={t('disp.cerrar')}
          style={{
            position: 'absolute',
            top: vd.space.md,
            right: vd.space.md,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '2px 4px',
            color: vd.textMuted,
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          <DotGlyphIcon glyph="CLOSE" size={10} color={vd.textMuted} />
        </button>
      )}
      <DotGlyphIcon glyph="DOTS" size={24} color={vd.textMuted} />
      <p style={{ marginTop: vd.space.sm, maxWidth: '100%', wordBreak: 'break-word' }}>{texto}</p>
    </aside>
  );
}