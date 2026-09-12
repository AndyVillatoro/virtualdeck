import React from 'react';
import type { RGBStatus } from '../../types';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { estilo_btnStyle } from './estilos';

export interface BotonesNavegacionProps {
  effectiveAccent: string;
  onConfigExport?: () => void;
  onConfigImport?: () => void;
  onFloatingBar?: () => void;
  onWallpaper?: () => void;
  onRGB?: () => void;
  rgbStatus?: RGBStatus | null;
  compact?: boolean;
}

export function BotonesNavegacion({
  effectiveAccent,
  onConfigExport,
  onConfigImport,
  onFloatingBar,
  onWallpaper,
  onRGB,
  rgbStatus,
  compact = false,
}: BotonesNavegacionProps) {
  const VD = useTheme();
  const t = useT();
  const btnStyle = estilo_btnStyle(VD, compact);

  return (
    <>
      {onConfigExport && (
        <button onClick={onConfigExport} style={btnStyle} title={t('tip.export')}>
          ↗ EXP
        </button>
      )}
      {onConfigImport && (
        <button onClick={onConfigImport} style={btnStyle} title={t('tip.import')}>
          ↙ IMP
        </button>
      )}
      {onFloatingBar && (
        <button onClick={onFloatingBar} title={t('tip.bar')} style={btnStyle}>
          {t('bar.short')}
        </button>
      )}
      {onWallpaper && (
        <button onClick={onWallpaper} style={btnStyle}>
          {t('ui.wallpaper')}
        </button>
      )}
      {/* Conectado se marca con el acento, no con el verde del tema: es
          el mismo criterio que la barra de activo de las celdas. */}
      {onRGB && (
        <button
          onClick={onRGB}
          title={t('tip.rgb')}
          style={{
            ...btnStyle,
            borderColor: rgbStatus?.connected ? effectiveAccent : VD.border,
          }}
        >
          <span
            style={{
              marginRight: 4,
              color: rgbStatus?.connected ? effectiveAccent : VD.textMuted,
            }}
          >
            ●
          </span>
          RGB
        </button>
      )}
    </>
  );
}
