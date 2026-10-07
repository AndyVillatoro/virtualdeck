import React from 'react';
import type { RGBStatus } from '../../types';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { DotGlyphIcon } from '../dot480/DotGlyphIcon';
import { estilo_btnStyle } from './estilos';
import { useTamanoVentana } from '../../utils/useTamanoVentana';

export interface BotonesNavegacionProps {
  effectiveAccent: string;
  onFloatingBar?: () => void;
  onWallpaper?: () => void;
  onRGB?: () => void;
  onDispositivos?: () => void;
  rgbStatus?: RGBStatus | null;
  compact?: boolean;
}

export function BotonesNavegacion({
  effectiveAccent,
  onFloatingBar,
  onWallpaper,
  onRGB,
  onDispositivos,
  rgbStatus,
  compact = false,
}: BotonesNavegacionProps) {
  const VD = useTheme();
  const t = useT();
  const btnStyle = estilo_btnStyle(VD, compact);
  // Por debajo de ~900 px los botones con texto no caben junto a los
  // controles de la ventana: quedan solo los iconos (cada uno con su `title`).
  const { ancho } = useTamanoVentana();
  const soloIcono = ancho < 900;
  const rotulo = (texto: string) => (soloIcono ? null : <span>{texto}</span>);

  return (
    <>
      {onFloatingBar && (
        <button onClick={onFloatingBar} title={t('tip.bar')} style={{ ...btnStyle, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <DotGlyphIcon glyph="TERMINAL" size={9} color={VD.textDim} />
          {rotulo(t('bar.short'))}
        </button>
      )}
      {onWallpaper && (
        <button onClick={onWallpaper} title={t('ui.wallpaper')} style={{ ...btnStyle, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <DotGlyphIcon glyph="SPARKLE" size={9} color={VD.textDim} />
          {rotulo(t('ui.wallpaper'))}
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
          {rotulo('RGB')}
        </button>
      )}
      {onDispositivos && (
        <button
          onClick={onDispositivos}
          title={t('disp.titulo')}
          style={{ ...btnStyle, display: 'inline-flex', alignItems: 'center', gap: 4 }}
        >
          <DotGlyphIcon glyph="USB_PLUG" size={9} color={VD.textDim} />
          {rotulo(t('disp.nav'))}
        </button>
      )}
    </>
  );
}
