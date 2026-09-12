import React from 'react';
import { Dot480Tile } from './Dot480Tile';
import { DotCanvasText } from './DotCanvasText';
import { DotArc } from './DotArc';
import { DotAudioDials } from './DotAudioDials';
import { DotVibePad } from './DotVibePad';
import { DotMidiFaders } from './DotMidiFaders';
import { DotWaveformTrack } from './DotWaveformTrack';
import { DotChecklist } from './DotChecklist';
import { DotDungeon3D } from './DotDungeon3D';

interface Props {
  surface: string;
  border: string;
  accent: string;
  text: string;
  textMuted: string;
}

export function SheetToolDeck({ surface, border, accent, text, textMuted }: Props) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
      {/* 01 AUDIO */}
      <Dot480Tile title="AUDIO" surface={surface} border={border}>
        <DotAudioDials accentColor={accent} textColor={text} mutedColor={textMuted} />
      </Dot480Tile>

      {/* 02 VIBE PAD */}
      <Dot480Tile title="VIBE PAD" surface={surface} border={border}>
        <DotVibePad accentColor={accent} surfaceColor={surface} borderColor={border} />
      </Dot480Tile>

      {/* 03 MIDI 01 */}
      <Dot480Tile title="MIDI 01" surface={surface} border={border}>
        <DotMidiFaders chord="AM7" accentColor={accent} textColor={text} />
      </Dot480Tile>

      {/* 04 RECORDER */}
      <Dot480Tile title="RECORDER" surface={surface} border={border}>
        <DotWaveformTrack time="01:47" subtext="BUILD THE SMALLER ONE." accentColor={accent} textColor={text} />
      </Dot480Tile>

      {/* 05 RADIO */}
      <Dot480Tile title="RADIO" surface={surface} border={border}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
          <div style={{ marginBottom: 4 }}>
            <DotCanvasText text="CH 07" size="large" dotSize={3} gap={1.5} litColor={text} />
          </div>
          <div style={{ position: 'relative', width: 62, height: 62, display: 'grid', placeItems: 'center', margin: '2px 0' }}>
            <DotArc value={100} radius={26} dotCount={24} dotSize={2.4} litColor="rgba(255,255,255,0.4)" style={{ position: 'absolute', inset: 0 }} />
            {/* 12 o'clock indicator dot */}
            <div style={{ position: 'absolute', top: 5, width: 5, height: 5, borderRadius: '50%', background: accent }} />
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>HOLD</span>
          </div>
          <span style={{ fontSize: 8, color: textMuted, letterSpacing: 1, marginTop: 2 }}>READY</span>
        </div>
      </Dot480Tile>

      {/* 06 INTERPRETER */}
      <Dot480Tile title="INTERPRETER" statusDot statusDotColor={accent} surface={surface} border={border}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
          <div style={{ margin: '2px 0 6px' }}>
            <DotCanvasText text="EN -> ZH" size="large" dotSize={2.8} gap={1.4} litColor={text} />
          </div>
          {/* Dual waveform */}
          <div style={{ display: 'flex', gap: 2, height: 16, alignItems: 'center', marginBottom: 4 }}>
            {[4, 8, 14, 10, 16, 12, 6, 10, 14, 8, 4, 12, 16, 8].map((h, i) => (
              <div key={i} style={{ width: 2, height: h, background: accent, borderRadius: 1 }} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 2, height: 16, alignItems: 'center', marginBottom: 6 }}>
            {[6, 12, 16, 8, 14, 10, 4, 14, 12, 6, 10, 14, 8, 4].map((h, i) => (
              <div key={i} style={{ width: 2, height: h, background: 'rgba(255,255,255,0.45)', borderRadius: 1 }} />
            ))}
          </div>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1 }}>BEGIN NOW</span>
        </div>
      </Dot480Tile>

      {/* 07 THERMAL */}
      <Dot480Tile title="THERMAL" surface={surface} border={border}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
          {/* False-color thermal simulation */}
          <div
            style={{
              width: 80,
              height: 60,
              borderRadius: 6,
              background: 'radial-gradient(circle at 50% 45%, #ffffff 0%, #ffeb3b 25%, #ff5722 55%, #9c27b0 80%, #1a0826 100%)',
              position: 'relative',
              display: 'grid',
              placeItems: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
            }}
          >
            {/* Thermal crosshair ring */}
            <div style={{ width: 16, height: 16, borderRadius: '50%', border: '1.5px solid #ff3b30', display: 'grid', placeItems: 'center' }}>
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#ff3b30' }} />
            </div>
            <span style={{ position: 'absolute', bottom: 3, right: 5, fontSize: 7, color: '#ffffff', fontFamily: 'monospace' }}>36.8°C</span>
          </div>
          <span style={{ fontSize: 8, color: textMuted, letterSpacing: 1, marginTop: 4 }}>PUPPY INFRARED</span>
        </div>
      </Dot480Tile>

      {/* 08 LEVEL 03 */}
      <Dot480Tile title="LEVEL 03" surface={surface} border={border}>
        <DotDungeon3D score={84} accentColor={accent} textColor={text} />
      </Dot480Tile>

      {/* 09 SHOPPING */}
      <Dot480Tile title="SHOPPING" surface={surface} border={border}>
        <DotChecklist accentColor={accent} textColor={text} />
      </Dot480Tile>
    </div>
  );
}
