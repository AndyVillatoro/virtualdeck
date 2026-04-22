import React, { CSSProperties } from 'react';
import { VD } from '../design';

interface DotLabelProps {
  children: React.ReactNode;
  size?: number;
  color?: string;
  spacing?: number;
  style?: CSSProperties;
}

export function DotLabel({ children, size = 14, color = VD.text, spacing = 1, style = {} }: DotLabelProps) {
  return (
    <span
      style={{
        fontFamily: VD.dots,
        fontSize: size,
        color,
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
