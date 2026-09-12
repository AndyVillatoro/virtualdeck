import React from 'react';
import { Dot480Tile } from './Dot480Tile';
import { DotCanvasText } from './DotCanvasText';
import { DotArc } from './DotArc';
import { DotHalftone } from './DotHalftone';
import { DotEqualizer } from './DotEqualizer';

interface Props {
  surface: string;
  border: string;
  accent: string;
  text: string;
  textMuted: string;
}

export function SheetLifeSignals({ surface, border, accent, text, textMuted }: Props) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
      {/* 01 BOARDING PASS 14A */}
      <Dot480Tile title="HENRY LI" surface={surface} border={border}>
        <div style={{ margin: '4px 0 6px' }}>
          <DotCanvasText text="14A" size="large" dotSize={3.6} gap={1.8} litColor={text} />
        </div>
        <div style={{ fontSize: 9, color: textMuted, letterSpacing: 1, marginBottom: 8 }}>SFO — LHR</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: accent }} />
          <span style={{ fontSize: 9, color: text, letterSpacing: 1 }}>BOARDING</span>
        </div>
      </Dot480Tile>

      {/* 02 SUNBURST */}
      <Dot480Tile title="DAY 3 OF 7" surface={surface} border={border}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
          <svg width="68" height="68" viewBox="0 0 68 68">
            {/* Center circle */}
            <circle cx="34" cy="34" r="10" fill="rgba(255,255,255,0.85)" />
            <circle cx="34" cy="34" r="2.5" fill={accent} />
            {/* 12 radial rays of dots */}
            {Array.from({ length: 12 }).map((_, i) => {
              const angle = (i * 30 * Math.PI) / 180;
              const r1 = 15;
              const r2 = 22;
              const r3 = 29;
              return (
                <g key={i}>
                  <circle cx={34 + r1 * Math.cos(angle)} cy={34 + r1 * Math.sin(angle)} r="1.5" fill="rgba(255,255,255,0.7)" />
                  <circle cx={34 + r2 * Math.cos(angle)} cy={34 + r2 * Math.sin(angle)} r="1.5" fill="rgba(255,255,255,0.7)" />
                  <circle cx={34 + r3 * Math.cos(angle)} cy={34 + r3 * Math.sin(angle)} r="1.5" fill="rgba(255,255,255,0.7)" />
                </g>
              );
            })}
          </svg>
          <span style={{ fontSize: 8, color: textMuted, letterSpacing: 1, marginTop: 2 }}>SOLAR MATRIX</span>
        </div>
      </Dot480Tile>

      {/* 03 247 W GAUGE */}
      <Dot480Tile title="RIDE POWER" surface={surface} border={border}>
        <div style={{ position: 'relative', width: 72, height: 72, display: 'grid', placeItems: 'center', margin: '0 auto' }}>
          <DotArc value={75} radius={30} dotCount={28} dotSize={2.4} litColor={accent} unlitColor="rgba(255,255,255,0.2)" style={{ position: 'absolute', inset: 0 }} />
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: text }}>247</span>
            <span style={{ fontSize: 8, color: textMuted, marginLeft: 2 }}>W</span>
          </div>
        </div>
        <div style={{ textAlign: 'center', fontSize: 8, color: textMuted, marginTop: 4 }}>CADENCE 92 RPM</div>
      </Dot480Tile>

      {/* 04 MIDNIGHT CIRCUIT */}
      <Dot480Tile title="HENRY'S DESK" surface={surface} border={border}>
        <div style={{ fontSize: 9, fontWeight: 700, color: text, letterSpacing: 1, marginBottom: 6 }}>
          MIDNIGHT CIRCUIT
        </div>
        {/* Waveform split */}
        <div style={{ display: 'flex', gap: 2, height: 26, alignItems: 'center', position: 'relative', margin: '6px 0' }}>
          {[6, 12, 20, 14, 24, 18, 10, 16, 22, 18, 12, 8, 16, 20, 14].map((h, i) => (
            <div key={i} style={{ width: 2, height: h, background: i < 8 ? accent : 'rgba(255,255,255,0.4)', borderRadius: 1 }} />
          ))}
          <div style={{ position: 'absolute', left: '46%', width: 5, height: 5, borderRadius: '50%', background: accent }} />
        </div>
        <div style={{ fontSize: 8, color: textMuted }}>1:47 / 3:52</div>
      </Dot480Tile>

      {/* 05 BRUTALIST ARCHITECTURE HALFTONE */}
      <Dot480Tile title="ARCHITECTURE" surface={surface} border={border}>
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
          <DotHalftone width={74} height={74} dotSize={1.8} accentColor={accent} />
          {/* Top-right concentric ring badge */}
          <div style={{ position: 'absolute', top: 2, right: 4, width: 12, height: 12, borderRadius: '50%', border: '1.5px solid ' + accent }} />
        </div>
        <div style={{ textAlign: 'center', fontSize: 8, color: textMuted, marginTop: 4 }}>1-BIT DITHER</div>
      </Dot480Tile>

      {/* 06 BREATHING INHALE */}
      <Dot480Tile title="MEDITATION" surface={surface} border={border}>
        <div style={{ position: 'relative', width: 70, height: 70, display: 'grid', placeItems: 'center', margin: '0 auto' }}>
          {[14, 20, 26, 32].map((r, i) => (
            <DotArc key={i} value={100} radius={r} dotCount={12 + i * 6} dotSize={2} litColor={i === 2 ? accent : 'rgba(255,255,255,0.25)'} style={{ position: 'absolute', inset: 0 }} />
          ))}
          <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: 1, color: text }}>INHALE</span>
        </div>
        <div style={{ textAlign: 'center', fontSize: 8, color: textMuted, marginTop: 4 }}>4-7-8 RHYTHM</div>
      </Dot480Tile>

      {/* 07 METRO TRACK */}
      <Dot480Tile title="METRO" surface={surface} border={border}>
        <div style={{ marginBottom: 4 }}>
          <DotCanvasText text="02 MIN" size="large" dotSize={3.2} gap={1.6} litColor={text} />
        </div>
        {/* Track with station dots and train dot */}
        <div style={{ position: 'relative', height: 28, display: 'flex', alignItems: 'center', width: '100%', margin: '4px 0' }}>
          <svg width="100%" height="28" viewBox="0 0 120 28">
            {/* Dotted path */}
            <path d="M 10 20 L 50 20 Q 65 20 75 8 L 110 8" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.2" strokeDasharray="1,3" />
            {/* Stations */}
            <circle cx="10" cy="20" r="3" fill="none" stroke="#ffffff" strokeWidth="1" />
            <circle cx="110" cy="8" r="3" fill="none" stroke="#ffffff" strokeWidth="1" />
            {/* Active Train */}
            <circle cx="55" cy="20" r="3.5" fill={accent} />
          </svg>
        </div>
        <div style={{ fontSize: 8, color: textMuted }}>LINE 4 CENTRAL</div>
      </Dot480Tile>

      {/* 08 CODY DEER MASCOT */}
      <Dot480Tile title="CODY" surface={surface} border={border}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
          <div style={{ position: 'relative', width: 56, height: 50 }}>
            {/* Dot deer silhouette */}
            <svg width="56" height="50" viewBox="0 0 56 50">
              {/* Antlers */}
              <circle cx="16" cy="6" r="1.5" fill="#ffffff" />
              <circle cx="20" cy="10" r="1.5" fill="#ffffff" />
              <circle cx="36" cy="10" r="1.5" fill="#ffffff" />
              <circle cx="40" cy="6" r="1.5" fill="#ffffff" />
              {/* Head & Body */}
              <rect x="18" y="16" width="20" height="16" rx="4" fill="rgba(255,255,255,0.85)" />
              {/* Heart */}
              <g fill={accent} transform="translate(42, 6) scale(0.6)">
                <path d="M 5,2 A 3,3 0 0,0 0,6 C 0,10 5,14 5,14 C 5,14 10,10 10,6 A 3,3 0 0,0 5,2 Z" />
              </g>
              {/* Legs */}
              <rect x="20" y="32" width="3" height="12" fill="#ffffff" />
              <rect x="25" y="32" width="3" height="12" fill="#ffffff" />
              <rect x="30" y="32" width="3" height="12" fill="#ffffff" />
            </svg>
          </div>
          <span style={{ fontSize: 8, color: textMuted, letterSpacing: 1, marginTop: 2 }}>WANTS COFFEE</span>
        </div>
      </Dot480Tile>

      {/* 09 DEERFLOW VOICE AI */}
      <Dot480Tile title="DEERFLOW" statusDot statusDotColor={accent} surface={surface} border={border}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
          <div style={{ margin: '6px 0 8px' }}>
            <DotEqualizer columns={9} rows={7} dotSize={2.4} gap={1.8} litColor={accent} />
          </div>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, color: text }}>LISTENING</span>
        </div>
      </Dot480Tile>
    </div>
  );
}
