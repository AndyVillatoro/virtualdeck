import React, { useEffect, useState } from 'react';
import { VD } from '../design';
import { DotText } from '../components/DotText';
import { DotLabel } from '../components/DotLabel';
import { Wallpaper } from '../components/Wallpaper';

interface FullscreenBProps {
  onExit: () => void;
  accent: string;
}

const GRID_BTNS = [
  { label: 'SCENE 1', sub: 'GAMING', active: true },
  { label: 'SCENE 2', sub: 'PODCAST', active: false },
  { label: 'SCENE 3', sub: 'BRB', active: false },
  { label: 'MIC',     sub: 'ON',   dot: '#00ff88', active: false },
  { label: 'CAM',     sub: 'ON',   dot: '#00ff88', active: false },
  { label: 'REC',     sub: 'OFF',  dot: '#ff3d3d', active: false },
  { label: 'LIGHT',   sub: '80%',  active: false },
  { label: 'FAN',     sub: 'MID',  active: false },
  { label: 'LOCK',    sub: '',     active: false },
];

const NETWORK_BARS = Array.from({ length: 24 }, (_, i) => 20 + Math.sin(i) * 30 + i * 1.5);

export function FullscreenB({ onExit, accent }: FullscreenBProps) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');

  const dayStr = now.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
  const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: VD.bg,
        color: VD.text,
        fontFamily: VD.font,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Wallpaper kind="dotgrid" />

      {/* Top thin strip */}
      <div
        style={{
          height: 28,
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          gap: 16,
          borderBottom: `1px solid ${VD.border}`,
          fontFamily: VD.mono,
          fontSize: 9,
          letterSpacing: 2,
          color: VD.textDim,
          flexShrink: 0,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <span style={{ color: '#00ff88' }}>●</span>
        <span>VIRTUALDECK · KIOSK MODE</span>
        <div style={{ flex: 1 }} />
        <span>{dayStr} {dateStr}</span>
        <span>WIFI −42DBM</span>
        <span>BAT 84%</span>
        <button
          onClick={onExit}
          style={{
            background: 'transparent',
            border: `1px solid ${VD.border}`,
            color: VD.textMuted,
            fontFamily: VD.mono,
            fontSize: 9,
            letterSpacing: 1,
            padding: '3px 8px',
            cursor: 'pointer',
          }}
          title="Exit kiosk"
        >
          EXIT ⤡
        </button>
      </div>

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0, position: 'relative', zIndex: 1 }}>
        {/* Left: clock + metrics */}
        <div
          style={{
            width: '38%',
            padding: '40px 40px 40px 50px',
            borderRight: `1px solid ${VD.border}`,
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
          }}
        >
          <DotLabel size={11} color={VD.textMuted} spacing={3} style={{ marginBottom: 16, display: 'block' }}>
            LOCAL TIME
          </DotLabel>
          <DotText text={hours} dotSize={16} gap={4} color="#fff" />
          <div style={{ height: 16 }} />
          <DotText text={minutes} dotSize={16} gap={4} color="#fff" style={{ opacity: 0.7 }} />

          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { l: 'CPU', v: '24', note: '48°C · 4.2 GHz' },
              { l: 'RAM', v: '41', note: '13.1 / 32 GB' },
              { l: 'GPU', v: '08', note: 'RTX 4070' },
            ].map((m) => (
              <div key={m.l} style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
                <span
                  style={{
                    fontFamily: VD.mono,
                    fontSize: 11,
                    color: VD.textDim,
                    letterSpacing: 2,
                    width: 40,
                    flexShrink: 0,
                  }}
                >
                  {m.l}
                </span>
                <DotText text={m.v} dotSize={4} gap={1} color="#fff" />
                <span style={{ fontFamily: VD.mono, fontSize: 10, color: VD.textMuted }}>{m.note}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: 3×3 grid */}
        <div
          style={{
            flex: 1,
            padding: 30,
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gridTemplateRows: 'repeat(3, 1fr)',
            gap: 10,
          }}
        >
          {GRID_BTNS.map((b, i) => (
            <div
              key={i}
              style={{
                background: b.active ? 'rgba(255,61,61,0.08)' : 'rgba(20,20,26,0.5)',
                border: `1px solid ${b.active ? '#ff3d3d60' : VD.border}`,
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.background = b.active
                  ? 'rgba(255,61,61,0.14)'
                  : 'rgba(30,30,36,0.7)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.background = b.active
                  ? 'rgba(255,61,61,0.08)'
                  : 'rgba(20,20,26,0.5)';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, letterSpacing: 1 }}>
                  {String(i + 1).padStart(2, '0')}
                </div>
                {b.dot && (
                  <div
                    style={{ width: 6, height: 6, borderRadius: '50%', background: b.dot }}
                  />
                )}
              </div>
              <div>
                <DotLabel size={18} color={b.active ? '#ff3d3d' : '#fff'} spacing={2}>
                  {b.label}
                </DotLabel>
                {b.sub && (
                  <div
                    style={{
                      fontFamily: VD.mono,
                      fontSize: 10,
                      color: VD.textDim,
                      marginTop: 6,
                      letterSpacing: 1,
                    }}
                  >
                    {b.sub}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom widgets strip */}
      <div
        style={{
          height: 120,
          borderTop: `1px solid ${VD.border}`,
          padding: '16px 24px',
          display: 'flex',
          gap: 14,
          background: 'rgba(0,0,0,0.3)',
          backdropFilter: 'blur(20px)',
          flexShrink: 0,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* NOW PLAYING */}
        <div
          style={{
            flex: 1,
            border: `1px solid ${VD.border}`,
            padding: 14,
            display: 'flex',
            gap: 12,
            alignItems: 'center',
          }}
        >
          <div
            style={{
              width: 60,
              height: 60,
              background: 'linear-gradient(135deg,#333,#111)',
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <DotLabel size={10} color={VD.textMuted} spacing={2}>
              NOW PLAYING
            </DotLabel>
            <div
              style={{
                color: '#fff',
                fontFamily: VD.font,
                fontSize: 14,
                marginTop: 6,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              Interstellar — Main Theme
            </div>
            <div
              style={{
                height: 2,
                background: VD.border,
                marginTop: 8,
                position: 'relative',
              }}
            >
              <div style={{ position: 'absolute', inset: 0, width: '42%', background: '#fff' }} />
            </div>
          </div>
        </div>

        {/* NETWORK */}
        <div style={{ width: 220, border: `1px solid ${VD.border}`, padding: 14, flexShrink: 0 }}>
          <DotLabel size={10} color={VD.textMuted} spacing={2}>
            NETWORK
          </DotLabel>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 10,
              color: '#fff',
              fontFamily: VD.mono,
              fontSize: 12,
            }}
          >
            <span>↓ 12.4 MB/s</span>
            <span>↑ 0.8</span>
          </div>
          <div
            style={{
              height: 20,
              display: 'flex',
              gap: 2,
              alignItems: 'flex-end',
              marginTop: 8,
            }}
          >
            {NETWORK_BARS.map((h, bi) => (
              <div
                key={bi}
                style={{
                  flex: 1,
                  background: '#fff',
                  height: `${Math.min(100, Math.max(5, h))}%`,
                  opacity: 0.8,
                }}
              />
            ))}
          </div>
        </div>

        {/* PAGE DOTS */}
        <div
          style={{
            width: 180,
            border: `1px solid ${VD.border}`,
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <DotLabel size={10} color={VD.textMuted} spacing={2}>
            PAGE
          </DotLabel>
          <DotText text="01/04" dotSize={3} gap={1} color="#fff" />
          <div style={{ display: 'flex', gap: 4 }}>
            {[0, 1, 2, 3].map((pi) => (
              <div
                key={pi}
                style={{ flex: 1, height: 3, background: pi === 0 ? '#ff3d3d' : VD.border }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
