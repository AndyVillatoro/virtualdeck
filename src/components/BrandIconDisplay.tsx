import React, { useMemo } from 'react';
import { useTheme } from '../utils/theme';
import { useCatalogoMarcas } from '../utils/catalogoMarcas';

interface BrandIconDisplayProps {
  iconKey: string;
  /** CSS size (px) for both width and height. Default 40. Pass 0 to rely on style prop instead. */
  size?: number;
  /** Optional delay offset in seconds to desync animations. */
  animDelay?: number;
  /** Whether animations are active. Default false (static). */
  animated?: boolean;
  /** Custom edited bitmap overriding the default. */
  customBitmap?: string[];
  /** Primary fill color for '#' dots in customBitmap. */
  customColor?: string;
  /** Per-letter color overrides for multi-color custom bitmaps. */
  customPalette?: Record<string, string>;
  style?: React.CSSProperties;
}

export function BrandIconDisplay({
  iconKey, size = 40, animDelay, animated = false,
  customBitmap, customColor, customPalette, style,
}: BrandIconDisplayProps) {
  const VD = useTheme();
  const catalogo = useCatalogoMarcas();
  const icon = catalogo?.BRAND_ICONS_MAP[iconKey];

  const svg = useMemo(() => {
    if (!catalogo || !icon) return null;
    if (customBitmap) {
      const palette = catalogo.mergePalette(iconKey, customPalette);
      return catalogo.generateSvgFromBitmap(customBitmap, customColor ?? icon.color, palette);
    }
    return catalogo.getCachedBrandIconSvg(iconKey);
  }, [catalogo, iconKey, customBitmap, customColor, customPalette, icon]);

  if (!icon || !svg) return null;

  const sizeStyle: React.CSSProperties = size > 0
    ? { width: size, height: size }
    : {};

  return (
    <div
      className="vd-brand-icon"
      data-anim={icon.anim}
      data-animated={animated ? 'true' : undefined}
      style={{
        flexShrink: 0,
        borderRadius: VD.radius.lg,
        overflow: 'hidden',
        ...sizeStyle,
        ...( animDelay !== undefined ? { '--vd-ad': `${animDelay}s` } as React.CSSProperties : {} ),
        ...style,
      }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
