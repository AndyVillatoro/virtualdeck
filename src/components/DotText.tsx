import React, { CSSProperties } from 'react';
import { GLYPHS_5x7, VD } from '../design';

interface DotTextProps {
  text: string | number;
  dotSize?: number;
  gap?: number;
  color?: string;
  density?: number;
  style?: CSSProperties;
}

export function DotText({ text, dotSize = 6, gap = 2, color = VD.text, density = 1, style = {} }: DotTextProps) {
  const chars = String(text).toUpperCase().split('');
  return (
    <div style={{ display: 'inline-flex', gap: dotSize + gap * 2, alignItems: 'center', ...style }}>
      {chars.map((ch, i) => {
        const g = GLYPHS_5x7[ch] || GLYPHS_5x7[' '];
        return (
          <div
            key={i}
            style={{
              display: 'grid',
              gridTemplateRows: `repeat(7, ${dotSize}px)`,
              gridTemplateColumns: `repeat(5, ${dotSize}px)`,
              gap,
            }}
          >
            {g.map((row, r) =>
              [4, 3, 2, 1, 0].map((col) => {
                const on = (row >> col) & 1;
                return (
                  <div
                    key={`${r}-${col}`}
                    style={{
                      width: dotSize,
                      height: dotSize,
                      borderRadius: '50%',
                      background: on ? color : `rgba(255,255,255,${0.04 * density})`,
                    }}
                  />
                );
              })
            )}
          </div>
        );
      })}
    </div>
  );
}
