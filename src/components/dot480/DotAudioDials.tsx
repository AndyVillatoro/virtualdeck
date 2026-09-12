import React, { useState } from 'react';
import { DotCanvasText } from './DotCanvasText';
import { DotArc } from './DotArc';

export interface DotAudioDialsProps {
  speakerInit?: number;
  micInit?: number;
  accentColor?: string;
  textColor?: string;
  mutedColor?: string;
}

export function DotAudioDials({
  speakerInit = 72,
  micInit = 48,
  accentColor = '#ff3b30',
  textColor = '#ffffff',
  mutedColor = '#666666',
}: DotAudioDialsProps) {
  const [speakerVal, setSpeakerVal] = useState(speakerInit);
  const [micVal, setMicVal] = useState(micInit);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', width: '100%', padding: '4px 0' }}>
      {/* SPEAKER DIAL */}
      <div
        onClick={() => setSpeakerVal((prev) => (prev >= 90 ? 20 : prev + 10))}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
      >
        <span style={{ fontSize: 8, color: mutedColor, letterSpacing: 1, marginBottom: 2 }}>SPEAKER</span>
        <div style={{ position: 'relative', width: 66, height: 66, display: 'grid', placeItems: 'center' }}>
          <DotArc
            value={speakerVal}
            radius={27}
            dotCount={24}
            dotSize={2.4}
            litColor={textColor}
            unlitColor="rgba(255,255,255,0.06)"
            style={{ position: 'absolute', inset: 0 }}
          />
          <DotCanvasText text={String(speakerVal)} size="large" dotSize={2.8} gap={1.4} litColor={textColor} />
        </div>
      </div>

      {/* MIC DIAL */}
      <div
        onClick={() => setMicVal((prev) => (prev >= 90 ? 10 : prev + 10))}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
      >
        <span style={{ fontSize: 8, color: mutedColor, letterSpacing: 1, marginBottom: 2 }}>MIC</span>
        <div style={{ position: 'relative', width: 66, height: 66, display: 'grid', placeItems: 'center' }}>
          <DotArc
            value={micVal}
            radius={27}
            dotCount={24}
            dotSize={2.4}
            litColor={accentColor}
            unlitColor="rgba(255,255,255,0.06)"
            style={{ position: 'absolute', inset: 0 }}
          />
          <DotCanvasText text={String(micVal)} size="large" dotSize={2.8} gap={1.4} litColor={textColor} />
        </div>
      </div>
    </div>
  );
}
