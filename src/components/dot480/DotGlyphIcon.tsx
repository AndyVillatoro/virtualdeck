import React from 'react';
import { DOT_GLYPHS_8X8, resolveDotGlyph } from './dotGlyphsCatalog';

export { DOT_GLYPHS_8X8, ALL_DOT_GLYPHS, resolveDotGlyph } from './dotGlyphsCatalog';

export interface DotGlyphIconProps {
  glyph: string;
  size?: number;
  color?: string;
  dimColor?: string;
  showRecessed?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

/**
 * Componente oficial para renderizar iconos dot-matrix auténticos de 8×8 puntos.
 * Elimina el uso de emojis y gráficos vectoriales heterogéneos.
 */
export function DotGlyphIcon({
  glyph,
  size = 16,
  color = '#e6e8eb',
  dimColor = 'rgba(255, 255, 255, 0.04)',
  showRecessed = false,
  style,
  className,
}: DotGlyphIconProps) {
  const resolved = resolveDotGlyph(glyph) ?? 'DOTS';
  const rows = DOT_GLYPHS_8X8[resolved] ?? DOT_GLYPHS_8X8.DOTS;

  const dotRadius = 0.42;
  const pitch = 1.0;

  return (
    <svg
      viewBox="0 0 8 8"
      width={size}
      height={size}
      className={className}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        flexShrink: 0,
        shapeRendering: 'geometricPrecision',
        ...style,
      }}
    >
      {rows.map((rowMask, y) => (
        <React.Fragment key={y}>
          {Array.from({ length: 8 }, (_, x) => {
            const isLit = Boolean((rowMask >> (7 - x)) & 1);
            if (!isLit && !showRecessed) return null;
            return (
              <circle
                key={x}
                cx={x * pitch + 0.5}
                cy={y * pitch + 0.5}
                r={dotRadius}
                fill={isLit ? color : dimColor}
              />
            );
          })}
        </React.Fragment>
      ))}
    </svg>
  );
}
