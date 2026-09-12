import React from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { estilo_iconBtnStyle } from './estilos';

export interface ControlesVentanaProps {
  onFullscreen?: () => void;
  compact?: boolean;
}

export function ControlesVentana({ onFullscreen, compact = false }: ControlesVentanaProps) {
  const VD = useTheme();
  const t = useT();
  const iconBtnStyle = estilo_iconBtnStyle(VD, compact);

  return (
    <>
      {onFullscreen && (
        <button onClick={onFullscreen} title={t('tip.fullscreen')} style={iconBtnStyle}>
          ⤢
        </button>
      )}
      <button
        onClick={() => window.electronAPI?.window.minimize()}
        title={t('tip.minimize')}
        style={iconBtnStyle}
      >
        —
      </button>
      <button
        onClick={() => window.electronAPI?.window.close()}
        title={t('tip.close')}
        style={{ ...iconBtnStyle, color: VD.danger }}
      >
        ×
      </button>
    </>
  );
}
