import React, { useMemo } from 'react';
import { VD } from '../design';
import { BRAND_ICONS_MAP, getCachedBrandIconSvg, generateSvgFromBitmap, mergePalette } from '../data/brandIcons';

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
  const icon = BRAND_ICONS_MAP[iconKey];

  const svg = useMemo(() => {
    if (customBitmap && icon) {
      const palette = mergePalette(iconKey, customPalette);
      return generateSvgFromBitmap(customBitmap, customColor ?? icon.color, palette);
    }
    return getCachedBrandIconSvg(iconKey);
  }, [iconKey, customBitmap, customColor, customPalette, icon]);

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
