import React from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { useFormatoPantalla } from '../../utils/useFormatoPantalla';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';

interface BarraSuperiorFullscreenProps {
  accent?: string;
  dayStr: string;
  dateStr: string;
  onEnterKiosk: () => void;
  onExit: () => void;
}

export function BarraSuperiorFullscreen({
  accent,
  dayStr,
  dateStr,
  onEnterKiosk,
  onExit,
}: BarraSuperiorFullscreenProps) {
  const VD = useTheme();
  const t = useT();
  // En `barra` el alto es lo escaso: 40 → 32 px y todo un punto más pequeño.
  // En kiosko la barra ni se monta (la oculta `FullscreenB`).
  const compacta = useFormatoPantalla().formato === 'barra';

  return (
    <div
      style={{
        height: compacta ? 32 : 40,
        display: 'flex',
        alignItems: 'center',
        padding: compacta ? '0 12px' : '0 20px',
        gap: compacta ? 8 : 16,
        borderBottom: `1px solid ${VD.border}`,
        fontFamily: VD.mono,
        fontSize: compacta ? 8 : 9,
        letterSpacing: compacta ? 1 : 2,
        color: VD.textDim,
        flexShrink: 0,
        position: 'relative',
        zIndex: 1,
      }}
    >
      <DotGlyphIcon glyph="DOTS" size={6} color={accent} />
      <span>{t('full.title')}</span>
      <div style={{ flex: 1 }} />
      <span>
        {dayStr} {dateStr}
      </span>
      <button
        onClick={onEnterKiosk}
        title={t('full.kioskTip')}
        style={{
          background: 'transparent',
          border: `1px solid ${VD.border}`,
          color: VD.textDim,
          fontFamily: VD.mono,
          fontSize: compacta ? 8 : 9,
          letterSpacing: 1,
          padding: compacta ? '0 8px' : '0 12px',
          minHeight: compacta ? 24 : 32,
          cursor: 'pointer',
          marginRight: 4,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
        }}
      >
        <DotGlyphIcon glyph="LOCK" size={8} color={accent} />
        {t('full.kioskBadge')}
      </button>
      <button
        onClick={onExit}
        title={t('full.exit')}
        style={{
          background: 'transparent',
          border: `1px solid ${VD.border}`,
          color: VD.textDim,
          fontFamily: VD.mono,
          fontSize: compacta ? 8 : 9,
          letterSpacing: 1,
          padding: compacta ? '0 8px' : '0 12px',
          minHeight: compacta ? 24 : 32,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
        }}
      >
        <DotGlyphIcon glyph="CLOSE" size={8} color={VD.textDim} />
        {t('full.exit')}
      </button>
    </div>
  );
}

