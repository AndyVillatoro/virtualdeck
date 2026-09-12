import React from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { DotGlyphIcon } from '../dot480/DotGlyphIcon';
import { estilo_iconBtnStyle } from './estilos';

export interface ControlesVentanaProps {
  onFullscreen?: () => void;
  compact?: boolean;
}

export function ControlesVentana({ onFullscreen, compact = false }: ControlesVentanaProps) {
  const VD = useTheme();
  const t = useT();
  const iconBtnStyle = estilo_iconBtnStyle(VD, compact);
  const glyphSize = compact ? 10 : 12;

  return (
    <>
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
