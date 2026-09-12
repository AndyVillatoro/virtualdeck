import React from 'react';
import { GLYPHS_5X7, GLYPHS_7X9 } from './DotMatrixGlyphs';

interface DotCanvasTextProps {
  text: string;
  dotSize?: number;
  gap?: number;
  litColor?: string;
  unlitColor?: string;
  size?: 'small' | 'large';
  style?: React.CSSProperties;
}

export function DotCanvasText({
  text,
  dotSize = 3,
  gap = 1.5,
  litColor = '#ffffff',
  unlitColor = 'rgba(255, 255, 255, 0.04)',
  size = 'small',
  style,
}: DotCanvasTextProps) {
  const glyphs = size === 'large' ? GLYPHS_7X9 : GLYPHS_5X7;
  const cols = size === 'large' ? 7 : 5;
  const rows = size === 'large' ? 7 : 7;
  const charSpacing = dotSize * 1.5;

  const chars = text.toUpperCase().split('');
  const totalWidth = chars.length * (cols * (dotSize + gap) + charSpacing) - charSpacing;
  const totalHeight = rows * (dotSize + gap) - gap;

  return (
    <svg
      width={totalWidth}
      height={totalHeight}
      viewBox={`0 0 ${totalWidth} ${totalHeight}`}
      style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
    >
      {chars.map((char, charIdx) => {
        const matrix = glyphs[char] || glyphs[' '];
        const offsetX = charIdx * (cols * (dotSize + gap) + charSpacing);

        return (
          <g key={charIdx} transform={`translate(${offsetX}, 0)`}>
            {matrix.map((rowMask, rIdx) => {
              const y = rIdx * (dotSize + gap);
              const dots = [];

              for (let c = 0; c < cols; c++) {
                const bit = (rowMask >> (cols - 1 - c)) & 1;
                const x = c * (dotSize + gap);
                dots.push(
                  <circle
                    key={`${rIdx}-${c}`}
                    cx={x + dotSize / 2}
                    cy={y + dotSize / 2}
                    r={dotSize / 2}
                    fill={bit ? litColor : unlitColor}
                  />
                );
              }
              return dots;
            })}
          </g>
        );
      })}
    </svg>
  );
}
