import React from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
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

  return (
    <div
      style={{
        height: 30,
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: 16,
        borderBottom: `1px solid ${VD.border}`,
        fontFamily: VD.mono,
        fontSize: 9,
        letterSpacing: 2,
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
        title="Activar modo kiosko (oculta UI, ESC pide PIN)"
        style={{
          background: 'transparent',
          border: `1px solid ${VD.border}`,
          color: VD.textDim,
          fontFamily: VD.mono,
          fontSize: 9,
          letterSpacing: 1,
          padding: '3px 8px',
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
        style={{
          background: 'transparent',
          border: `1px solid ${VD.border}`,
          color: VD.textDim,
          fontFamily: VD.mono,
          fontSize: 9,
          letterSpacing: 1,
          padding: '3px 8px',
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

