import React from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { useDisplays } from '../../utils/useDisplays';
import { DotGlyphIcon } from '../dot480/DotGlyphIcon';
import { estilo_iconBtnStyle } from './estilos';

export interface ControlesVentanaProps {
  onFullscreen?: () => void;
  compact?: boolean;
}

export function ControlesVentana({ onFullscreen, compact = false }: ControlesVentanaProps) {
  const VD = useTheme();
  const t = useT();
  const { displays, moveToDisplay } = useDisplays();
  const iconBtnStyle = estilo_iconBtnStyle(VD, compact);
  const glyphSize = compact ? 10 : 12;

  const currentIdx = displays.findIndex((d) => d.isCurrent);
  const handleNextDisplay = () => {
    if (displays.length <= 1) return;
    const nextIdx = (currentIdx + 1) % displays.length;
    moveToDisplay(displays[nextIdx].id);
  };

  return (
    <>
      {displays.length > 1 && (
        <button
          onClick={handleNextDisplay}
          title={t('set.monSwitchQuick', {
            current: (currentIdx >= 0 ? currentIdx + 1 : 1).toString(),
            total: displays.length.toString(),
          })}
          style={{
            ...iconBtnStyle,
            gap: 3,
            fontFamily: VD.mono,
            fontSize: 8,
            fontWeight: 700,
            padding: '0 4px',
            width: 'auto',
          }}
        >
          <DotGlyphIcon glyph="MONITOR" size={glyphSize} color={VD.textDim} />
          <span style={{ fontSize: 7, letterSpacing: 0.5, color: VD.textMuted }}>
            {`${currentIdx >= 0 ? currentIdx + 1 : 1}/${displays.length}`}
          </span>
        </button>
      )}
      {onFullscreen && (
        <button onClick={onFullscreen} title={t('tip.fullscreen')} style={iconBtnStyle}>
          <DotGlyphIcon glyph="FULLSCREEN" size={glyphSize} color={VD.textDim} />
        </button>
      )}
      <button
        onClick={() => window.electronAPI?.window.minimize()}
        title={t('tip.minimize')}
        style={iconBtnStyle}
      >
        <DotGlyphIcon glyph="MINIMIZE" size={glyphSize} color={VD.textDim} />
      </button>
      <button
        onClick={() => window.electronAPI?.window.close()}
        title={t('tip.close')}
        style={{ ...iconBtnStyle, color: VD.danger }}
      >
        <DotGlyphIcon glyph="CLOSE" size={glyphSize} color={VD.danger} />
      </button>
    </>
  );
}
