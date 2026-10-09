import React from 'react';
import { useTheme } from '../../../utils/theme';
import { useT } from '../../../utils/i18n';
import { DotGlyphIcon } from '../../../components/dot480/DotGlyphIcon';

/** Ancho de la lengüeta plegada. Toda ella es el objetivo táctil. */
const ANCHO_LENGUETA = 28;

/**
 * El panel de música plegado en formato barra: una lengüeta vertical a todo el
 * alto, pegada al borde del panel. Pulsarla lo despliega.
 *
 * Enseña el glifo de onda, la palabra en vertical y un punto de estado con el
 * acento si está sonando, para que se vea que hay algo aunque esté plegado.
 */
export function LenguetaMusica({ lado, isPlaying, accent, onDesplegar }: {
  lado: 'left' | 'right';
  isPlaying: boolean;
  accent: string;
  onDesplegar: () => void;
}) {
  const VD = useTheme();
  const t = useT();
  const borde = lado === 'left'
    ? { borderRight: `1px solid ${VD.border}` }
    : { borderLeft: `1px solid ${VD.border}` };

  return (
    <button
      type="button"
      onClick={onDesplegar}
      title={t('music.expand')}
      aria-label={t('music.expand')}
      style={{
        width: ANCHO_LENGUETA, height: '100%', flexShrink: 0, padding: 0,
        background: VD.surface, border: 'none', ...borde, cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'space-between', gap: 8, paddingTop: 12, paddingBottom: 12,
      }}
    >
      <DotGlyphIcon glyph="AUDIO_WAVE" size={12} color={VD.textMuted} />
      <span style={{
        writingMode: 'vertical-rl', fontFamily: VD.mono, fontSize: 9,
        color: VD.textMuted, letterSpacing: 2,
      }}>
        {t('panel.music')}
      </span>
      <div style={{
        width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
        background: isPlaying ? accent : VD.textMuted,
      }} />
    </button>
  );
}
