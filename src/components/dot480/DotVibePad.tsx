import React, { useState } from 'react';

export interface DotVibePadProps {
  accentColor?: string;
  surfaceColor?: string;
  borderColor?: string;
}

const PAD_ITEMS = [
  { id: 'play', glyph: '▶', hasBadge: false },
  { id: 'grid', glyph: '::', hasBadge: false },
  { id: 'undo', glyph: '↰', hasBadge: false },
  { id: 'redo', glyph: '↱', hasBadge: false },
  { id: 'node', glyph: '⚯', hasBadge: false },
  { id: 'term', glyph: '>_', hasBadge: false },
  { id: 'mic', glyph: '🎙', hasBadge: false },
  { id: 'web', glyph: '🌐', hasBadge: false },
  { id: 'list', glyph: '☰', hasBadge: false },
  { id: 'code', glyph: '</>', hasBadge: false },
  { id: 'check', glyph: '✓', hasBadge: true },
  { id: 'close', glyph: '✕', hasBadge: false },
  { id: 'gear', glyph: '⚙', hasBadge: false },
  { id: 'spark', glyph: '✦', hasBadge: false },
  { id: 'up', glyph: '↑', hasBadge: false },
  { id: 'down', glyph: '↓', hasBadge: false },
];

export function DotVibePad({
  accentColor = '#ff3b30',
  surfaceColor = '#111315',
  borderColor = 'rgba(255, 255, 255, 0.12)',
}: DotVibePadProps) {
  const [activePad, setActivePad] = useState<string | null>('check');

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 4,
        width: '100%',
        maxWidth: 160,
        margin: '0 auto',
      }}
    >
      {PAD_ITEMS.map((item) => {
        const isSelected = activePad === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => setActivePad(item.id)}
            style={{
              aspectRatio: '1',
              display: 'grid',
              placeItems: 'center',
              position: 'relative',
              background: isSelected ? accentColor + '28' : surfaceColor,
              border: '1px dashed ' + (isSelected ? accentColor : borderColor),
              borderRadius: 4,
              color: isSelected ? accentColor : 'rgba(255, 255, 255, 0.85)',
              fontSize: 9,
              fontFamily: '"JetBrains Mono", monospace',
              cursor: 'pointer',
              padding: 0,
              boxSizing: 'border-box',
              transition: 'transform 0.08s ease',
            }}
          >
            <span>{item.glyph}</span>
            {item.hasBadge && (
              <span
                style={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  width: 3.5,
                  height: 3.5,
                  borderRadius: '50%',
                  background: accentColor,
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
