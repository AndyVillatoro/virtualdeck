import React, { useEffect, useState } from 'react';

interface DotEqualizerProps {
  columns?: number;
  rows?: number;
  dotSize?: number;
  gap?: number;
  litColor?: string;
  unlitColor?: string;
  animated?: boolean;
  style?: React.CSSProperties;
}

export function DotEqualizer({
  columns = 7,
  rows = 8,
  dotSize = 3,
  gap = 2,
  litColor = '#ff3b30',
  unlitColor = 'rgba(255, 255, 255, 0.06)',
  animated = true,
  style,
}: DotEqualizerProps) {
  const [levels, setLevels] = useState<number[]>(() =>
    Array.from({ length: columns }, () => Math.floor(Math.random() * rows) + 1)
  );

  useEffect(() => {
    if (!animated) return;
    const timer = setInterval(() => {
      setLevels((prev) =>
        prev.map(() => Math.floor(Math.random() * (rows - 1)) + 1)
      );
    }, 120);
    return () => clearInterval(timer);
  }, [animated, rows]);

  const width = columns * (dotSize + gap) - gap;
  const height = rows * (dotSize + gap) - gap;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={style}
    >
      {levels.map((lvl, colIdx) => {
        const x = colIdx * (dotSize + gap);
        const dots = [];

        for (let r = 0; r < rows; r++) {
          const y = (rows - 1 - r) * (dotSize + gap);
          const isLit = r < lvl;

          dots.push(
            <circle
              key={`${colIdx}-${r}`}
              cx={x + dotSize / 2}
              cy={y + dotSize / 2}
              r={dotSize / 2}
              fill={isLit ? litColor : unlitColor}
            />
          );
        }
        return dots;
      })}
    </svg>
  );
}
