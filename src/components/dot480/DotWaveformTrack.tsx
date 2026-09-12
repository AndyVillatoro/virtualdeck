import React from 'react';
import { DotCanvasText } from './DotCanvasText';

export interface DotWaveformTrackProps {
  time?: string;
  subtext?: string;
  accentColor?: string;
  textColor?: string;
}

const BAR_HEIGHTS = [
  3, 6, 12, 18, 14, 20, 24, 18, 12, 8, 16, 22, 26, 20, 14, 10,
  16, 22, 18, 14, 20, 24, 16, 10, 6, 12, 18, 14, 8, 4
];

export function DotWaveformTrack({
  time = '01:47',
  subtext = 'BUILD THE SMALLER ONE.',
  accentColor = '#ff3b30',
  textColor = '#ffffff',
}: DotWaveformTrackProps) {
  const splitIdx = 14;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      <div style={{ marginBottom: 4 }}>
        <DotCanvasText text={time} size="large" dotSize={3.2} gap={1.6} litColor={textColor} />
      </div>

      {/* SYMMETRIC WAVEFORM */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          height: 32,
          position: 'relative',
          margin: '4px 0',
          width: '100%',
        }}
      >
        {BAR_HEIGHTS.map((h, i) => {
          const isLeft = i <= splitIdx;
          const color = isLeft ? accentColor : 'rgba(255, 255, 255, 0.4)';
          return (
            <div
              key={i}
              style={{
                width: 2,
                height: h,
                background: color,
                borderRadius: 1,
              }}
            />
          );
        })}

        {/* Cursor dot */}
        <div
          style={{
            position: 'absolute',
            left: '48%',
            bottom: 0,
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: accentColor,
            boxShadow: '0 0 6px ' + accentColor,
          }}
        />
      </div>

      {/* SUBTEXT */}
      <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.7)', letterSpacing: 1, marginTop: 4 }}>
        {subtext}
      </div>
    </div>
  );
}
