import React from 'react';

interface DotArcProps {
  value: number; // 0 to 100
  radius?: number;
  dotCount?: number;
  dotSize?: number;
  litColor?: string;
  unlitColor?: string;
  startAngle?: number;
  endAngle?: number;
  style?: React.CSSProperties;
}

export function DotArc({
  value,
  radius = 28,
  dotCount = 24,
  dotSize = 3,
  litColor = '#ff3b30',
  unlitColor = 'rgba(255, 255, 255, 0.08)',
  startAngle = 140,
  endAngle = 400,
  style,
}: DotArcProps) {
  const activeDots = Math.round((Math.max(0, Math.min(100, value)) / 100) * dotCount);
  const totalAngle = endAngle - startAngle;
  const angleStep = totalAngle / (dotCount - 1);

  const dots = [];
  const cx = radius + dotSize + 2;
  const cy = radius + dotSize + 2;
  const size = cx * 2;

  for (let i = 0; i < dotCount; i++) {
    const angleDeg = startAngle + i * angleStep;
    const angleRad = (angleDeg * Math.PI) / 180;
    const x = cx + radius * Math.cos(angleRad);
    const y = cy + radius * Math.sin(angleRad);
    const isLit = i < activeDots;

    dots.push(
      <circle
        key={i}
        cx={x}
        cy={y}
        r={dotSize / 2}
        fill={isLit ? litColor : unlitColor}
      />
    );
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={style}>
      {dots}
    </svg>
  );
}
