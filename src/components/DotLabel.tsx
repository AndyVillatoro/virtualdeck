import React, { CSSProperties } from 'react';
import { useTheme } from '../utils/theme';

interface DotLabelProps {
  children: React.ReactNode;
  size?: number;
  color?: string;  // sin valor: se toma del tema
  spacing?: number;
  style?: CSSProperties;
}

export function DotLabel({ children, size = 14, color, spacing = 1, style = {} }: DotLabelProps) {
  const VD = useTheme();
  const tinta = color ?? VD.text;
  return (
    <span
      style={{
        fontFamily: VD.dots,
        fontSize: size,
        color: tinta,
        letterSpacing: spacing,
        textTransform: 'uppercase',
        lineHeight: 1,
        ...style,
      }}
    >
      {children}
    </span>
  );
}
