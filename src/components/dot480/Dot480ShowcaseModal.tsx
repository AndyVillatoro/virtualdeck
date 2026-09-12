import React, { useEffect, useState } from 'react';
import { DotCanvasText } from './DotCanvasText';
import { DotArc } from './DotArc';
import { DotEqualizer } from './DotEqualizer';
import { DotHalftone } from './DotHalftone';
import { Dot480Tile } from './Dot480Tile';
import { ACCENT_PRESETS } from '../../design';

interface Dot480ShowcaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialAccent?: string;
}

export function Dot480ShowcaseModal({ isOpen, onClose, initialAccent = '#ff3b30' }: Dot480ShowcaseModalProps) {
  const [accent, setAccent] = useState(initialAccent);
  const [isCementMode, setIsCementMode] = useState(false);
  const [timeStr, setTimeStr] = useState('10:42');
  const [isPlaying, setIsPlaying] = useState(true);
  const [sliderVal, setSliderVal] = useState(62);
  const [toggle1, setToggle1] = useState(true);
  const [toggle2, setToggle2] = useState(false);
  const [cpuVal, setCpuVal] = useState(42);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      setTimeStr(h + ':' + m);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCpuVal((prev) => Math.min(95, Math.max(20, prev + Math.floor(Math.random() * 9) - 4)));
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  if (!isOpen) return null;

  const colors = isCementMode
    ? {
        modalBg: '#1c2027',
        surface: '#262c36',
        border: '#384152',
        borderSubtle: '#2c3340',
        text: '#e2e8f0',
        textDim: '#94a3b8',
        textMuted: '#64748b',
        accent,
      }
    : {
        modalBg: '#070809',
        surface: '#111315',
        border: '#1f2229',
        borderSubtle: '#17191e',
        text: '#f1f3f6',
        textDim: '#8c929e',
        textMuted: '#525763',
        accent,
      };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.88)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        boxSizing: 'border-box',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: colors.modalBg,
          border: '1px solid ' + colors.border,
          borderRadius: 16,
          width: '100%',
          maxWidth: 960,
          maxHeight: '92vh',
          overflowY: 'auto',
          boxShadow: '0 25px 65px rgba(0,0,0,0.85)',
          padding: '24px 28px',
          boxSizing: 'border-box',
          color: colors.text,
          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        }}
      >
        {/* Encabezado del Sistema Visual */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
              <DotCanvasText text="DOT / 480" size="large" dotSize={4} gap={2} litColor={colors.text} />
              <span
                style={{
                  fontSize: 10,
                  padding: '3px 8px',
                  borderRadius: 4,
                  background: accent + '22',
                  color: accent,
                  border: '1px solid ' + accent + '55',
                  letterSpacing: 1,
                }}
              >
                PROTOTIPO V1.0
              </span>
            </div>
            <div style={{ fontSize: 11, color: colors.textMuted, letterSpacing: 1.5, marginTop: 4 }}>
              OLED MICRO INTERFACE SYSTEM · 4PX GRID
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              type="button"
              onClick={() => setIsCementMode(!isCementMode)}
              style={{
                background: colors.surface,
                border: '1px solid ' + colors.border,
                color: colors.textDim,
                fontSize: 11,
                padding: '6px 12px',
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              {isCementMode ? '🔘 Cemento Industrial' : '⬛ Negro OLED Puro'}
            </button>

            <div style={{ display: 'flex', gap: 4 }}>
              {ACCENT_PRESETS.slice(0, 5).map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setAccent(color)}
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: color,
                    border: accent === color ? '2px solid #ffffff' : '1px solid transparent',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: '1px solid ' + colors.border,
                color: colors.textMuted,
                width: 28,
                height: 28,
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 14,
                display: 'grid',
                placeItems: 'center',
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Cuadrícula 3x3 de Módulos Físicos DOT / 480 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 12,
            marginBottom: 24,
          }}
        >
          {/* MÓDULO 01: HOME */}
          <Dot480Tile
            index="01"
            title="HOME"
            statusDot
            statusDotColor={accent}
            surface={colors.surface}
            border={colors.border}
            sideRailIcons={['📈', '🎵', '⚙️']}
          >
            <div style={{ marginBottom: 4 }}>
              <DotCanvasText text={timeStr} size="large" dotSize={3.5} gap={1.8} litColor={colors.text} />
            </div>
            <div style={{ fontSize: 9, color: colors.textMuted, letterSpacing: 1, marginBottom: 8 }}>
              MAY 20 TUE
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: colors.text }}>78%</span>
              <DotArc value={78} radius={12} dotCount={14} dotSize={2.5} litColor={accent} />
            </div>
          </Dot480Tile>

          {/* MÓDULO 02: MUSIC */}
          <Dot480Tile
            index="02"
            title="MUSIC"
            surface={colors.surface}
            border={colors.border}
            sideRailIcons={['❤️', '📋', '🔊']}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <DotHalftone width={54} height={54} dotSize={1.8} accentColor={accent} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.text, letterSpacing: 1 }}>
                  DAYLIGHT
                </div>
                <div style={{ fontSize: 9, color: colors.textMuted, marginBottom: 6 }}>
                  RETRO WAVE
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setIsPlaying(!isPlaying)}
                    style={{
                      background: accent,
                      border: 'none',
                      color: '#ffffff',
                      borderRadius: 4,
                      fontSize: 10,
                      padding: '3px 8px',
                      cursor: 'pointer',
                    }}
                  >
                    {isPlaying ? '❚❚' : '▶'}
                  </button>
                  <DotArc value={45} radius={10} dotCount={10} dotSize={2} litColor={accent} />
                </div>
              </div>
            </div>
          </Dot480Tile>

          {/* MÓDULO 03: TIMER */}
          <Dot480Tile
            index="03"
            title="TIMER"
            surface={colors.surface}
            border={colors.border}
            sideRailIcons={['🔄', '🏁', '🗑️']}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
              <div style={{ position: 'relative', width: 68, height: 68, display: 'grid', placeItems: 'center' }}>
                <DotArc
                  value={72}
                  radius={28}
                  dotCount={28}
                  dotSize={2.8}
                  litColor={accent}
                  style={{ position: 'absolute', inset: 0 }}
                />
                <div style={{ fontSize: 11, fontWeight: 700 }}>12:48</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 8, color: colors.textMuted }}>STATUS</span>
                <span style={{ fontSize: 10, color: accent, fontWeight: 700 }}>RUNNING</span>
              </div>
            </div>
          </Dot480Tile>

          {/* MÓDULO 04: WEATHER */}
          <Dot480Tile
            index="04"
            title="WEATHER"
            surface={colors.surface}
            border={colors.border}
            sideRailIcons={['🎯', '☂️', '🔄']}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 8, color: colors.textMuted, letterSpacing: 1 }}>TOKYO</div>
                <div style={{ margin: '4px 0' }}>
                  <DotCanvasText text="24°" size="large" dotSize={3.5} gap={1.8} litColor={colors.text} />
                </div>
                <div style={{ fontSize: 8, color: colors.textMuted }}>M 26° / L 18°</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <svg width="40" height="28" viewBox="0 0 40 28">
                  {[
                    [14, 4], [18, 2], [22, 2], [26, 4], [30, 8], [32, 14],
                    [32, 20], [28, 24], [22, 24], [16, 24], [10, 24], [6, 20],
                    [4, 14], [8, 8]
                  ].map(([cx, cy], i) => (
                    <circle key={i} cx={cx} cy={cy} r="1.8" fill={accent} />
                  ))}
                </svg>
                <div style={{ fontSize: 8, color: colors.textDim, marginTop: 4 }}>CLOUDY</div>
              </div>
            </div>
          </Dot480Tile>

          {/* MÓDULO 05: FITNESS & SENSORS */}
          <Dot480Tile
            index="05"
            title="FITNESS"
            surface={colors.surface}
            border={colors.border}
          >
            <div style={{ fontSize: 9, color: colors.textMuted, marginBottom: 4 }}>MOVE 62%</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ position: 'relative', width: 56, height: 56, display: 'grid', placeItems: 'center' }}>
                <DotArc value={62} radius={22} dotCount={22} dotSize={2.8} litColor={accent} style={{ position: 'absolute' }} />
                <DotArc value={44} radius={14} dotCount={14} dotSize={2.4} litColor="#ffffff" style={{ position: 'absolute' }} />
              </div>
              <div>
                <DotEqualizer columns={7} rows={7} dotSize={2.5} gap={2} litColor={accent} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 7, color: colors.textMuted, marginTop: 4 }}>
                  <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
                </div>
              </div>
            </div>
          </Dot480Tile>

          {/* MÓDULO 06: MESSAGES */}
          <Dot480Tile
            index="06"
            title="MESSAGES"
            statusDot
            statusDotColor={accent}
            surface={colors.surface}
            border={colors.border}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    border: '1px dashed ' + colors.textMuted,
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: 9,
                    color: colors.text,
                  }}
                >
                  A
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8 }}>
                    <strong style={{ color: colors.text }}>ALEX</strong>
                    <span style={{ color: colors.textMuted }}>10:30</span>
                  </div>
                  <div style={{ fontSize: 8, color: colors.textDim, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    SEE YOU SOON.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    border: '1px dashed ' + colors.textMuted,
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: 9,
                    color: colors.text,
                  }}
                >
                  M
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8 }}>
                    <strong style={{ color: colors.text }}>MAYA</strong>
                    <span style={{ color: colors.textMuted }}>09:12</span>
                  </div>
                  <div style={{ fontSize: 8, color: colors.textDim, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    REPORT READY.
                  </div>
                </div>
              </div>
            </div>
          </Dot480Tile>

          {/* MÓDULO 07: CAMERA / OBS */}
          <Dot480Tile
            index="07"
            title="CAMERA"
            statusDot
            statusDotColor={accent}
            surface={colors.surface}
            border={colors.border}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: 8, color: colors.textMuted }}>
                <span>⌜ ⌝</span>
                <span style={{ color: accent }}>● REC</span>
                <span>⌞ ⌟</span>
              </div>
              <button
                type="button"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'transparent',
                  border: '2px solid ' + accent,
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <span style={{ width: 14, height: 14, borderRadius: '50%', background: accent }} />
              </button>
            </div>
          </Dot480Tile>

          {/* MÓDULO 08: SETTINGS */}
          <Dot480Tile
            index="08"
            title="SETTINGS"
            surface={colors.surface}
            border={colors.border}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 9 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: colors.textDim }}>WI-FI</span>
                <span style={{ color: colors.text, fontWeight: 700 }}>ON &gt;</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: colors.textDim }}>BLUETOOTH</span>
                <button
                  type="button"
                  onClick={() => setToggle1(!toggle1)}
                  style={{
                    width: 28,
                    height: 14,
                    borderRadius: 7,
                    background: toggle1 ? accent : colors.border,
                    border: 'none',
                    cursor: 'pointer',
                    position: 'relative',
                    padding: 0,
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: 2,
                      left: toggle1 ? 16 : 2,
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: '#ffffff',
                      transition: 'left 0.15s',
                    }}
                  />
                </button>
              </div>

              <div
                style={{
                  border: '1px dashed ' + accent,
                  borderRadius: 6,
                  padding: '4px 6px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ color: accent, fontWeight: 700 }}>BRIGHTNESS</span>
                <span style={{ color: colors.text }}>80%</span>
              </div>
            </div>
          </Dot480Tile>

          {/* MÓDULO 09: SYSTEM TELEMETRY */}
          <Dot480Tile
            index="09"
            title="SYSTEM"
            surface={colors.surface}
            border={colors.border}
          >
            <div style={{ fontSize: 9, marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: colors.textMuted }}>CPU USAGE</span>
              <span style={{ color: colors.text, fontWeight: 700 }}>{cpuVal}%</span>
            </div>
            <div style={{ display: 'flex', gap: 3, marginBottom: 10 }}>
              {Array.from({ length: 20 }).map((_, i) => (
                <span
                  key={i}
                  style={{
                    width: 3,
                    height: 3,
                    borderRadius: '50%',
                    background: i < Math.round((cpuVal / 100) * 20) ? accent : colors.border,
                  }}
                />
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: colors.textMuted, borderTop: '1px solid ' + colors.borderSubtle, paddingTop: 6 }}>
              <span>HENRY / 480</span>
              <span>V1.0.0</span>
            </div>
          </Dot480Tile>
        </div>

        {/* Barra de Componentes del Sistema de Diseño */}
        <div
          style={{
            borderTop: '1px solid ' + colors.border,
            paddingTop: 16,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 9,
            color: colors.textMuted,
            letterSpacing: 1,
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>TOGGLE</span>
            <button
              type="button"
              onClick={() => setToggle2(!toggle2)}
              style={{ width: 32, height: 16, borderRadius: 8, background: toggle2 ? accent : colors.border, border: 'none', cursor: 'pointer', position: 'relative', padding: 0 }}
            >
              <span style={{ position: 'absolute', top: 2, left: toggle2 ? 18 : 2, width: 12, height: 12, borderRadius: '50%', background: '#ffffff', transition: 'left 0.15s' }} />
            </button>
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <span style={{ border: '1px solid ' + colors.border, padding: '4px 10px', borderRadius: 12, color: colors.text }}>ACTION</span>
            <span style={{ border: '1px dashed ' + accent, padding: '4px 10px', borderRadius: 12, color: accent }}>DESTRUCTIVE</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>SLIDER</span>
            <input type="range" min="0" max="100" value={sliderVal} onChange={(e) => setSliderVal(Number(e.target.value))} style={{ accentColor: accent, width: 90, cursor: 'pointer' }} />
            <span style={{ color: colors.text, minWidth: 24 }}>{sliderVal}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>STATUS</span>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: accent }} />
            <span style={{ width: 6, height: 6, borderRadius: '50%', border: '1px solid ' + colors.textMuted }} />
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: colors.border }} />
          </div>
        </div>
      </div>
    </div>
  );
}
