import React, { useState } from 'react';
import { DotGlyphIcon } from './DotGlyphIcon';

export interface DotVibePadProps {
  accentColor?: string;
  surfaceColor?: string;
  borderColor?: string;
}

const PAD_ITEMS = [
  { id: 'play', glyph: 'PLAY', hasBadge: false },
  { id: 'grid', glyph: 'DOTS', hasBadge: false },
  { id: 'undo', glyph: 'ARROW_LEFT', hasBadge: false },
  { id: 'redo', glyph: 'ARROW_RIGHT', hasBadge: false },
  { id: 'wave', glyph: 'AUDIO_WAVE', hasBadge: false },
  { id: 'term', glyph: 'TERMINAL', hasBadge: false },
  { id: 'mic', glyph: 'MIC', hasBadge: false },
  { id: 'web', glyph: 'WEB', hasBadge: false },
  { id: 'speaker', glyph: 'SPEAKER', hasBadge: false },
  { id: 'code', glyph: 'CODE', hasBadge: false },
  { id: 'check', glyph: 'CHECK', hasBadge: true },
  { id: 'close', glyph: 'CLOSE', hasBadge: false },
  { id: 'gear', glyph: 'GEAR', hasBadge: false },
  { id: 'spark', glyph: 'SPARKLE', hasBadge: false },
  { id: 'up', glyph: 'ARROW_UP', hasBadge: false },
  { id: 'down', glyph: 'ARROW_DOWN', hasBadge: false },
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
              cursor: 'pointer',
              padding: 0,
              boxSizing: 'border-box',
              transition: 'transform 0.08s ease',
            }}
          >
            <DotGlyphIcon
              glyph={item.glyph}
              size={12}
              color={isSelected ? accentColor : 'rgba(255, 255, 255, 0.85)'}
              dimColor="rgba(255, 255, 255, 0.06)"
              showRecessed
            />
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
