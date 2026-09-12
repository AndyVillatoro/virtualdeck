import React from 'react';
import { DotGlyphIcon } from './DotGlyphIcon';

export interface DotRightRailProps {
  icons: string[];
  activeIdx?: number;
  onSelect?: (idx: number) => void;
  accentColor?: string;
  borderColor?: string;
}

export function DotRightRail({
  icons,
  activeIdx = 0,
  onSelect,
  accentColor = '#ff3b30',
  borderColor = 'rgba(255, 255, 255, 0.08)',
}: DotRightRailProps) {
  return (
    <div
      style={{
        width: 32,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-around',
        borderLeft: '1px solid ' + borderColor,
        padding: '4px 0',
        flexShrink: 0,
        boxSizing: 'border-box',
      }}
    >
      {icons.map((icon, idx) => {
        const isActive = idx === activeIdx;
        return (
          <button
            key={idx}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.(idx);
            }}
            style={{
              width: 24,
              height: 24,
              display: 'grid',
              placeItems: 'center',
              background: isActive ? accentColor + '22' : 'transparent',
              border: isActive ? '1px solid ' + accentColor : '1px solid transparent',
              borderRadius: 6,
              color: isActive ? accentColor : 'rgba(255, 255, 255, 0.45)',
              cursor: 'pointer',
              padding: 0,
              transition: 'all 0.15s ease',
            }}
          >
            <DotGlyphIcon
              glyph={icon}
              size={12}
              color={isActive ? accentColor : 'rgba(255, 255, 255, 0.45)'}
              showRecessed
            />
          </button>
        );
      })}
    </div>
  );
}
