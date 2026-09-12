import React from 'react';

interface DotHalftoneProps {
  width?: number;
  height?: number;
  dotSize?: number;
  accentColor?: string;
  style?: React.CSSProperties;
}

export function DotHalftone({
  width = 90,
  height = 90,
  dotSize = 2,
  accentColor = '#ff3b30',
  style,
}: DotHalftoneProps) {
  const step = dotSize + 2;
  const cols = Math.floor(width / step);
  const rows = Math.floor(height / step);

  const dots = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const diag = (c + r) % 4 === 0;
      const isBlock = c > cols * 0.35 && r > rows * 0.35 && (c + r) % 2 === 0;
      const isSun = (c - cols * 0.8) ** 2 + (r - rows * 0.25) ** 2 < 10;

      let fill = 'rgba(255,255,255,0.03)';
      if (isSun) fill = accentColor;
      else if (isBlock) fill = 'rgba(255,255,255,0.85)';
      else if (diag) fill = 'rgba(255,255,255,0.22)';

      dots.push(
        <circle
          key={`${r}-${c}`}
          cx={c * step + dotSize / 2}
          cy={r * step + dotSize / 2}
          r={isSun ? dotSize : dotSize / 2}
          fill={fill}
        />
      );
    }
  }

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={style}>
      {dots}
    </svg>
  );
}
