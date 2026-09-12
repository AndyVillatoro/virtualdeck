import React from 'react';
import { DotCanvasText } from './DotCanvasText';

export interface DotDungeon3DProps {
  score?: number;
  accentColor?: string;
  textColor?: string;
}

export function DotDungeon3D({
  score = 84,
  accentColor = '#ff3b30',
  textColor = '#ffffff',
}: DotDungeon3DProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      {/* 3D WIREFRAME CORRIDOR WITH RECTANGLES IN PERSPECTIVE */}
      <div style={{ position: 'relative', width: 90, height: 60, display: 'grid', placeItems: 'center' }}>
        <svg width="90" height="60" viewBox="0 0 90 60">
          {/* Receding rectangular corridor wireframe */}
          <rect x="5" y="5" width="80" height="50" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="0.8" strokeDasharray="1,2" />
          <rect x="18" y="14" width="54" height="32" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.8" strokeDasharray="1,2" />
          <rect x="30" y="22" width="30" height="16" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.8" strokeDasharray="1,2" />

          {/* Perspective vanishing lines */}
          <line x1="5" y1="5" x2="30" y2="22" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8" strokeDasharray="1,2" />
          <line x1="85" y1="5" x2="60" y2="22" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8" strokeDasharray="1,2" />
          <line x1="5" y1="55" x2="30" y2="38" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8" strokeDasharray="1,2" />
          <line x1="85" y1="55" x2="60" y2="38" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8" strokeDasharray="1,2" />

          {/* 8-bit Invader sprite in accent red in the center */}
          <g fill={accentColor} transform="translate(41, 26) scale(0.8)">
            <rect x="2" y="0" width="1" height="1" />
            <rect x="6" y="0" width="1" height="1" />
            <rect x="3" y="1" width="1" height="1" />
            <rect x="5" y="1" width="1" height="1" />
            <rect x="2" y="2" width="5" height="1" />
            <rect x="1" y="3" width="7" height="1" />
            <rect x="1" y="4" width="2" height="1" />
            <rect x="4" y="4" width="1" height="1" />
            <rect x="6" y="4" width="2" height="1" />
            <rect x="1" y="5" width="1" height="2" />
            <rect x="7" y="5" width="1" height="2" />
          </g>
        </svg>
      </div>

      {/* SCORE IN DOT MATRIX */}
      <div style={{ marginTop: 2 }}>
        <DotCanvasText text={String(score)} size="large" dotSize={2.8} gap={1.4} litColor={textColor} />
      </div>
    </div>
  );
}
