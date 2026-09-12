import React, { useState } from 'react';
import { DotCanvasText } from './DotCanvasText';

export interface DotMidiFadersProps {
  chord?: string;
  accentColor?: string;
  textColor?: string;
}

export function DotMidiFaders({
  chord = 'AM7',
  accentColor = '#ff3b30',
  textColor = '#ffffff',
}: DotMidiFadersProps) {
  const [faders, setFaders] = useState([70, 35, 60]);
  const [activeChannel, setActiveChannel] = useState(3);

  const handleFaderClick = (index: number) => {
    setFaders((prev) => {
      const next = [...prev];
      next[index] = next[index] >= 80 ? 25 : next[index] + 25;
      return next;
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      {/* CHORD TITLE */}
      <div style={{ margin: '2px 0 6px' }}>
        <DotCanvasText text={chord} size="large" dotSize={3.2} gap={1.6} litColor={textColor} />
      </div>

      {/* CHANNEL LEDS */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' }}>
        {[0, 1, 2, 3, 4, 5, 6].map((ch) => {
          const isSelected = ch === activeChannel;
          return (
            <span
              key={ch}
              onClick={() => setActiveChannel(ch)}
              style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: isSelected ? accentColor : 'rgba(255,255,255,0.22)',
                cursor: 'pointer',
                display: 'inline-block',
              }}
            />
          );
        })}
      </div>

      {/* 3 VERTICAL FADERS */}
      <div style={{ display: 'flex', justifyContent: 'space-around', width: '80%', height: 48, alignItems: 'center' }}>
        {faders.map((val, idx) => (
          <div
            key={idx}
            onClick={() => handleFaderClick(idx)}
            style={{
              position: 'relative',
              width: 18,
              height: '100%',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            {/* Dotted vertical track line */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                width: 1,
                borderLeft: '1px dotted rgba(255, 255, 255, 0.4)',
              }}
            />
            {/* Horizontal slider thumb */}
            <div
              style={{
                position: 'absolute',
                bottom: `${val}%`,
                width: 14,
                height: 4,
                background: '#ffffff',
                borderRadius: 1,
                transform: 'translateY(50%)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
