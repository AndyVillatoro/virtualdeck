import React from 'react';
import type { RGBStatus } from '../../types';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { DotGlyphIcon } from '../dot480/DotGlyphIcon';
import { estilo_btnStyle } from './estilos';

export interface BotonesNavegacionProps {
  effectiveAccent: string;
  onConfigExport?: () => void;
  onConfigImport?: () => void;
  onFloatingBar?: () => void;
  onWallpaper?: () => void;
  onRGB?: () => void;
  onOpenDot480?: () => void;
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
  onOpenDot480,
  rgbStatus,
  compact = false,
}: BotonesNavegacionProps) {
  const VD = useTheme();
  const t = useT();
  const btnStyle = estilo_btnStyle(VD, compact);

  return (
    <>
      {onOpenDot480 && (
        <button
          onClick={onOpenDot480}
          title="DOT / 480 OLED Micro Interface"
          style={{
            ...btnStyle,
            borderColor: effectiveAccent,
            color: effectiveAccent,
            fontFamily: VD.mono,
            fontWeight: 700,
            letterSpacing: 0.5,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <DotGlyphIcon glyph="DOTS" size={10} color={effectiveAccent} />
          <span>DOT</span>
        </button>
      )}
      {onConfigExport && (
        <button
          onClick={onConfigExport}
          style={{ ...btnStyle, display: 'inline-flex', alignItems: 'center', gap: 4 }}
          title={t('tip.export')}
        >
          <DotGlyphIcon glyph="EXPORT" size={9} color={VD.textDim} />
          <span>EXP</span>
        </button>
      )}
      {onConfigImport && (
        <button
          onClick={onConfigImport}
          style={{ ...btnStyle, display: 'inline-flex', alignItems: 'center', gap: 4 }}
          title={t('tip.import')}
        >
          <DotGlyphIcon glyph="IMPORT" size={9} color={VD.textDim} />
          <span>IMP</span>
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
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <DotGlyphIcon
            glyph="DOTS"
            size={8}
            color={rgbStatus?.connected ? effectiveAccent : VD.textMuted}
          />
          <span>RGB</span>
        </button>
      )}
    </>
  );
}
