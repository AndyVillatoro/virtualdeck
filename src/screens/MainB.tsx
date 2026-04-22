import React, { useState } from 'react';
import { VD } from '../design';
import { DotText } from '../components/DotText';
import { DotLabel } from '../components/DotLabel';
import { TitleBar } from '../components/TitleBar';
import { Wallpaper } from '../components/Wallpaper';

interface MainBProps {
  onFullscreen: () => void;
  onEditButton: (index: number) => void;
  onWallpaper: () => void;
  onToggleMonitor: () => void;
  accent: string;
}

const ALL_PAGES = ['MAIN', 'STREAM', 'WORK', 'MUSIC', 'MACROS'];

const BUTTON_DATA = [
  { w: 2, h: 1, kind: 'media' as const, label: 'NOW PLAYING', extra: 'Interstellar OST' },
  { w: 1, h: 1, kind: 'button' as const, label: 'MUTE', icon: '□', accent: false },
  { w: 1, h: 1, kind: 'button' as const, label: 'CAM', icon: '○', accent: false },
  { w: 1, h: 1, kind: 'button' as const, label: 'DISCORD', icon: '▲', accent: true },
  { w: 1, h: 1, kind: 'button' as const, label: 'CODE', icon: '◇', accent: false },
  { w: 1, h: 1, kind: 'button' as const, label: 'TERM', icon: '▷', accent: false },
  { w: 1, h: 1, kind: 'button' as const, label: 'FILES', icon: '▣', accent: false },
  { w: 1, h: 1, kind: 'button' as const, label: 'BROWSE', icon: '◉', accent: false },
  { w: 1, h: 1, kind: 'button' as const, label: 'OBS', icon: '●', accent: false },
  { w: 2, h: 1, kind: 'slider' as const, label: 'VOLUME', value: 64 },
  { w: 1, h: 1, kind: 'button' as const, label: 'PREV', icon: '◁◁', accent: false },
  { w: 1, h: 1, kind: 'button' as const, label: 'PLAY', icon: '▷', accent: true },
  { w: 1, h: 1, kind: 'button' as const, label: 'NEXT', icon: '▷▷', accent: false },
];

export function MainB({ onFullscreen, onEditButton, onWallpaper, onToggleMonitor, accent }: MainBProps) {
  const [activePage, setActivePage] = useState(0);
  const [volume, setVolume] = useState(64);

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
      <Wallpaper kind="photo" />
      {/* vignette overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(10,10,13,0.4) 0%, rgba(10,10,13,0.7) 100%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <TitleBar
          pageName=""
          accent={accent}
          onFullscreen={onFullscreen}
          onWallpaper={onWallpaper}
        />

        {/* Page tabs */}
        <div
          style={{
            display: 'flex',
            padding: '16px 24px 0',
            gap: 2,
            borderBottom: `1px solid ${VD.border}`,
            background: 'rgba(0,0,0,0.2)',
            backdropFilter: 'blur(20px)',
            flexShrink: 0,
          }}
        >
          {ALL_PAGES.map((p, i) => (
            <div
              key={p}
              onClick={() => setActivePage(i)}
              style={{
                padding: '10px 18px',
                fontFamily: VD.mono,
                fontSize: 11,
                letterSpacing: 2,
                color: i === activePage ? '#fff' : VD.textDim,
                borderBottom: i === activePage ? `2px solid ${accent}` : '2px solid transparent',
                position: 'relative',
                top: 1,
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              {p}
            </div>
          ))}
          <div style={{ flex: 1 }} />
          <div
            onClick={onToggleMonitor}
            style={{
              padding: '10px 8px',
              color: VD.textMuted,
              fontSize: 14,
              cursor: 'pointer',
              userSelect: 'none',
            }}
            title="Toggle system monitor"
          >
            ◈
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          {/* Main grid */}
          <div
            style={{
              flex: 1,
              padding: 20,
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gridTemplateRows: 'repeat(4, 1fr)',
              gap: 10,
            }}
          >
            {BUTTON_DATA.map((b, i) => (
              <div
                key={i}
                onClick={() => b.kind === 'button' ? onEditButton(i) : undefined}
                style={{
                  gridColumn: `span ${b.w}`,
                  gridRow: `span ${b.h}`,
                  background: 'rgba(20,20,26,0.5)',
                  backdropFilter: 'blur(20px)',
                  border: `1px solid ${b.kind === 'button' && b.accent ? accent + '40' : VD.border}`,
                  borderRadius: 3,
                  padding: b.kind === 'button' ? 0 : 14,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: b.kind === 'button' ? 'center' : 'stretch',
                  justifyContent: 'center',
                  position: 'relative',
                  cursor: b.kind === 'button' ? 'pointer' : 'default',
                  boxShadow:
                    b.kind === 'button' && b.accent
                      ? `inset 0 0 0 1px ${accent}60, 0 0 30px ${accent}20`
                      : 'none',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => {
                  if (b.kind === 'button') {
                    (e.currentTarget as HTMLDivElement).style.background = 'rgba(30,30,36,0.7)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (b.kind === 'button') {
                    (e.currentTarget as HTMLDivElement).style.background = 'rgba(20,20,26,0.5)';
                  }
                }}
              >
                {b.kind === 'button' && (
                  <>
                    <div
                      style={{
                        fontSize: 28,
                        color: b.accent ? accent : '#fff',
                        marginBottom: 8,
                        fontFamily: VD.mono,
                      }}
                    >
                      {b.icon}
                    </div>
                    <DotLabel size={9} color={b.accent ? '#fff' : VD.textDim} spacing={1.5}>
                      {b.label}
                    </DotLabel>
                  </>
                )}

                {b.kind === 'media' && (
                  <>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        marginBottom: 'auto',
                      }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 2,
                          background: `linear-gradient(135deg, ${accent}, #ff3d3d)`,
                          flexShrink: 0,
                        }}
                      />
                      <div>
                        <DotLabel size={9} color={VD.textDim} spacing={1.5}>
                          {b.label}
                        </DotLabel>
                        <div style={{ fontSize: 13, color: '#fff', marginTop: 4, fontFamily: VD.font }}>
                          {b.extra}
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        marginTop: 12,
                        height: 2,
                        background: VD.border,
                        borderRadius: 1,
                        position: 'relative',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          width: '42%',
                          background: accent,
                          borderRadius: 1,
                        }}
                      />
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginTop: 6,
                        fontFamily: VD.mono,
                        fontSize: 9,
                        color: VD.textMuted,
                      }}
                    >
                      <span>1:42</span>
                      <span>3:58</span>
                    </div>
                  </>
                )}

                {b.kind === 'slider' && (
                  <>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        marginBottom: 8,
                      }}
                    >
                      <DotLabel size={9} color={VD.textDim} spacing={1.5}>
                        {b.label}
                      </DotLabel>
                      <span style={{ fontFamily: VD.mono, fontSize: 18, color: '#fff' }}>{volume}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={volume}
                      onChange={(e) => setVolume(parseInt(e.target.value))}
                      style={{
                        width: '100%',
                        accentColor: accent,
                        cursor: 'pointer',
                      }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                      {Array.from({ length: 11 }).map((_, ti) => (
                        <div
                          key={ti}
                          style={{
                            width: 1,
                            height: 4,
                            background: ti === Math.round(volume / 10) ? accent : VD.textMuted,
                          }}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Right metric panel */}
          <div
            style={{
              width: 240,
              borderLeft: `1px solid ${VD.border}`,
              padding: 20,
              background: 'rgba(0,0,0,0.3)',
              backdropFilter: 'blur(20px)',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              flexShrink: 0,
            }}
          >
            <DotLabel size={10} color={VD.textMuted} spacing={2}>
              SYSTEM
            </DotLabel>

            {/* CPU bar chart */}
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: 8,
                }}
              >
                <span style={{ fontFamily: VD.mono, fontSize: 10, color: VD.textDim, letterSpacing: 2 }}>
                  CPU
                </span>
                <DotText text="24" dotSize={4} gap={1} color="#fff" />
              </div>
              <div style={{ height: 24, display: 'flex', gap: 2, alignItems: 'flex-end' }}>
                {Array.from({ length: 32 }).map((_, bi) => (
                  <div
                    key={bi}
                    style={{
                      flex: 1,
                      background: bi < 24 ? (bi > 26 ? accent : '#fff') : VD.border,
                      opacity: bi < 24 ? (bi / 32) * 0.8 + 0.2 : 1,
                      height: `${(Math.sin(bi * 0.4) * 0.5 + 0.5) * 100}%`,
                      minHeight: 2,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* RAM */}
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: 8,
                }}
              >
                <span style={{ fontFamily: VD.mono, fontSize: 10, color: VD.textDim, letterSpacing: 2 }}>
                  RAM
                </span>
                <DotText text="41" dotSize={4} gap={1} color="#fff" />
              </div>
              <div style={{ height: 4, background: VD.border, position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, width: '41%', background: '#fff' }} />
              </div>
              <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, marginTop: 4 }}>
                13.1 / 32.0 GB
              </div>
            </div>

            {/* GPU */}
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: 8,
                }}
              >
                <span style={{ fontFamily: VD.mono, fontSize: 10, color: VD.textDim, letterSpacing: 2 }}>
                  GPU
                </span>
                <DotText text="08" dotSize={4} gap={1} color="#fff" />
              </div>
              <div style={{ height: 4, background: VD.border, position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, width: '8%', background: '#fff' }} />
              </div>
              <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, marginTop: 4 }}>
                RTX 4070 · 48°C
              </div>
            </div>

            <div style={{ marginTop: 'auto' }}>
              <DotLabel
                size={10}
                color={VD.textMuted}
                spacing={2}
                style={{ marginBottom: 10, display: 'block' }}
              >
                NETWORK
              </DotLabel>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontFamily: VD.mono,
                  fontSize: 10,
                  color: '#fff',
                }}
              >
                <span>↓ 12.4 MB/s</span>
                <span>↑ 0.8 MB/s</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
