import React, { useState } from 'react';
import { DotCanvasText } from './DotCanvasText';
import { DotGlyphIcon } from './DotGlyphIcon';

export interface DotChecklistProps {
  accentColor?: string;
  textColor?: string;
}

export function DotChecklist({
  accentColor = '#ff3b30',
  textColor = '#ffffff',
}: DotChecklistProps) {
  const [items, setItems] = useState([
    { id: '1', text: 'MILK', checked: true },
    { id: '2', text: 'COFFEE', active: true, checked: false },
    { id: '3', text: 'RAMEN', checked: false },
  ]);

  const toggleItem = (id: string) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, checked: !it.checked } : it))
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', padding: '0 4px' }}>
      <div style={{ marginBottom: 6 }}>
        <DotCanvasText text="5 LEFT" size="large" dotSize={2.8} gap={1.4} litColor={textColor} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map((it) => (
          <div
            key={it.id}
            onClick={() => toggleItem(it.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}
          >
            {/* Dotted circle checkbox */}
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                border: '1px dotted rgba(255,255,255,0.5)',
                display: 'grid',
                placeItems: 'center',
                background: it.active ? accentColor + '22' : 'transparent',
              }}
            >
              {it.checked && <DotGlyphIcon glyph="CHECK" size={8} color={textColor} />}
              {!it.checked && it.active && (
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: accentColor }} />
              )}
            </div>
            <span
              style={{
                fontSize: 9,
                color: it.checked ? 'rgba(255,255,255,0.45)' : textColor,
                textDecoration: it.checked ? 'line-through' : 'none',
                letterSpacing: 1,
              }}
            >
              {it.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
