import React, { useState } from 'react';
import { DotCanvasText } from './DotCanvasText';
import { DotArc } from './DotArc';
import { DotRightRail } from './DotRightRail';

interface Props {
  surface: string;
  border: string;
  accent: string;
  text: string;
  textMuted: string;
}

export function SheetHardwareCasing({ surface, border, accent, text, textMuted }: Props) {
  const [isPlaying, setIsPlaying] = useState(true);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
      {/* 01 CLOCK & HEALTH */}
      <div style={{ background: surface, border: '1px solid ' + border, borderRadius: 12, display: 'flex', overflow: 'hidden', height: 160 }}>
        <div style={{ flex: 1, padding: 12, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: textMuted }}>
            <span>🔋 80%</span>
          </div>
          <div>
            <DotCanvasText text="09:41" size="large" dotSize={3.4} gap={1.6} litColor={text} />
            <div style={{ fontSize: 8, color: textMuted, letterSpacing: 1, marginTop: 4 }}>TUE 09 JUL</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(0,0,0,0.3)', padding: '3px 6px', borderRadius: 8, border: '1px solid ' + accent + '55' }}>
              <span style={{ fontSize: 7, color: accent }}>🚴</span>
              <span style={{ fontSize: 8, fontWeight: 700, color: text }}>46.8 km</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(0,0,0,0.3)', padding: '3px 6px', borderRadius: 8, border: '1px solid ' + border }}>
              <span style={{ fontSize: 7 }}>🔥</span>
              <span style={{ fontSize: 8, color: textMuted }}>1,250</span>
            </div>
          </div>
        </div>
        <DotRightRail icons={['📈', '🎵', '⚙️']} activeIdx={0} accentColor={accent} borderColor={border} />
      </div>

      {/* 02 MUSIC PLAYER */}
      <div style={{ background: surface, border: '1px solid ' + border, borderRadius: 12, display: 'flex', overflow: 'hidden', height: 160 }}>
        <div style={{ flex: 1, padding: 12, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ width: 36, height: 36, borderRadius: 6, background: '#333338', display: 'grid', placeItems: 'center', fontSize: 14 }}>
              👤
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: text }}>Bleed</div>
              <div style={{ fontSize: 8, color: textMuted }}>Nothing</div>
            </div>
          </div>
          {/* Progress */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 7, color: textMuted, marginBottom: 2 }}>
              <span>1:24</span><span>3:46</span>
            </div>
            <div style={{ height: 3, background: border, borderRadius: 2, position: 'relative' }}>
              <div style={{ width: '40%', height: '100%', background: accent, borderRadius: 2 }} />
            </div>
          </div>
          {/* Controls */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
            <button type="button" style={{ background: 'none', border: 'none', color: text, fontSize: 11, cursor: 'pointer' }}>⏮</button>
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              style={{ width: 26, height: 26, borderRadius: '50%', background: accent, border: 'none', color: '#ffffff', fontSize: 11, cursor: 'pointer', display: 'grid', placeItems: 'center' }}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button type="button" style={{ background: 'none', border: 'none', color: text, fontSize: 11, cursor: 'pointer' }}>⏭</button>
          </div>
        </div>
        <DotRightRail icons={['❤️', '📋', '🔊']} activeIdx={0} accentColor={accent} borderColor={border} />
      </div>

      {/* 03 RIDE GAUGE */}
      <div style={{ background: surface, border: '1px solid ' + border, borderRadius: 12, display: 'flex', overflow: 'hidden', height: 160 }}>
        <div style={{ flex: 1, padding: 12, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ alignSelf: 'flex-start', fontSize: 8, color: textMuted, letterSpacing: 1 }}>RIDE</div>
          <div style={{ position: 'relative', width: 70, height: 70, display: 'grid', placeItems: 'center' }}>
            <DotArc value={72} radius={28} dotCount={24} dotSize={2.5} litColor={accent} style={{ position: 'absolute', inset: 0 }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: text }}>46.8</div>
              <div style={{ fontSize: 7, color: textMuted }}>km · 72%</div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: 7, color: textMuted }}>
            <span>1:45:32 TIME</span><span>1,250 KCAL</span>
          </div>
        </div>
        <DotRightRail icons={['🔄', '🏁', '🗑️']} activeIdx={1} accentColor={accent} borderColor={border} />
      </div>

      {/* 04 WEATHER */}
      <div style={{ background: surface, border: '1px solid ' + border, borderRadius: 12, display: 'flex', overflow: 'hidden', height: 160 }}>
        <div style={{ flex: 1, padding: 12, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 8, color: textMuted, letterSpacing: 1 }}>LONDON</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: text }}>18°</div>
              <div style={{ fontSize: 7, color: textMuted }}>PARTLY CLOUDY</div>
            </div>
            <div style={{ fontSize: 24 }}>⛅</div>
          </div>
          <div style={{ fontSize: 7, color: textMuted }}>H 20°  L 12°  💧 20%</div>
        </div>
        <DotRightRail icons={['🎯', '☂️', '🔄']} activeIdx={0} accentColor={accent} borderColor={border} />
      </div>

      {/* 05 SETTINGS */}
      <div style={{ background: surface, border: '1px solid ' + border, borderRadius: 12, display: 'flex', overflow: 'hidden', height: 160 }}>
        <div style={{ flex: 1, padding: 12, display: 'flex', flexDirection: 'column', justifyContent: 'space-around', fontSize: 8 }}>
          <div style={{ color: textMuted, letterSpacing: 1 }}>SETTINGS</div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Wi-Fi</span><span style={{ color: accent, fontWeight: 700 }}>On</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Bluetooth</span><span style={{ color: accent, fontWeight: 700 }}>On</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Brightness</span><span>80%</span>
          </div>
        </div>
        <DotRightRail icons={['⚙️', '🌙', '🔒']} activeIdx={0} accentColor={accent} borderColor={border} />
      </div>

      {/* 06 VOICE AI */}
      <div style={{ background: surface, border: '1px solid ' + border, borderRadius: 12, display: 'flex', overflow: 'hidden', height: 160 }}>
        <div style={{ flex: 1, padding: 12, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ alignSelf: 'flex-start', fontSize: 8, color: textMuted, letterSpacing: 1 }}>VOICE AI</div>
          <div style={{ display: 'flex', gap: 2, height: 40, alignItems: 'center' }}>
            {[4, 10, 16, 26, 36, 22, 38, 22, 36, 26, 16, 10, 4].map((h, i) => (
              <div key={i} style={{ width: 2.5, height: h, background: i >= 4 && i <= 8 ? accent : text, borderRadius: 1 }} />
            ))}
          </div>
          <div style={{ fontSize: 8, color: textMuted }}>How can I help?</div>
        </div>
        <DotRightRail icons={['🎙️', '⌨️', '✕']} activeIdx={0} accentColor={accent} borderColor={border} />
      </div>
    </div>
  );
}
