import React, { useState } from 'react';
import { DotCanvasText } from './DotCanvasText';
import { SheetToolDeck } from './SheetToolDeck';
import { SheetLifeSignals } from './SheetLifeSignals';
import { SheetHardwareCasing } from './SheetHardwareCasing';
import { ACCENT_PRESETS } from '../../design';
import { DotGlyphIcon } from './DotGlyphIcon';

interface Dot480ShowcaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialAccent?: string;
}

type SheetTab = 'tooldeck' | 'lifesignals' | 'hardware';

export function Dot480ShowcaseModal({ isOpen, onClose, initialAccent = '#ff3b30' }: Dot480ShowcaseModalProps) {
  const [accent, setAccent] = useState(initialAccent);
  const [isCementMode, setIsCementMode] = useState(false);
  const [activeSheet, setActiveSheet] = useState<SheetTab>('tooldeck');
  const [sliderVal, setSliderVal] = useState(62);
  const [toggleVal, setToggleVal] = useState(true);

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
        borderSubtle: '#16181d',
        text: '#ffffff',
        textDim: '#a1a1aa',
        textMuted: '#52525b',
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
        padding: 16,
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
          maxWidth: 940,
          maxHeight: '94vh',
          overflowY: 'auto',
          boxShadow: '0 25px 65px rgba(0,0,0,0.85)',
          padding: '20px 24px',
          boxSizing: 'border-box',
          color: colors.text,
          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        }}
      >
        {/* ENCABEZADO Y SELECTORES */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
              <DotCanvasText text="DOT / 480" size="large" dotSize={4} gap={2} litColor={colors.text} />
              <span
                style={{
                  fontSize: 10,
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: accent + '22',
                  color: accent,
                  border: '1px solid ' + accent + '55',
                  letterSpacing: 1,
                  fontWeight: 700,
                }}
              >
                ESP-MOSAICO ARCHETYPES
              </span>
            </div>
            <div style={{ fontSize: 10, color: colors.textMuted, letterSpacing: 1.5 }}>
              OLED MICRO INTERFACE SYSTEM · 4PX GRID · HENRY LI
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setIsCementMode(!isCementMode)}
              style={{
                background: colors.surface,
                border: '1px solid ' + colors.border,
                color: colors.textDim,
                fontSize: 10,
                padding: '6px 12px',
                borderRadius: 6,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <DotGlyphIcon glyph="DOTS" size={10} color={isCementMode ? '#8a919e' : '#ffffff'} />
              <span>{isCementMode ? 'CEMENT MODE' : 'OLED BLACK'}</span>
            </button>

            {/* Presets de acento */}
            <div style={{ display: 'flex', gap: 4 }}>
              {ACCENT_PRESETS.slice(0, 6).map((color) => (
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
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <DotGlyphIcon glyph="CLOSE" size={10} color={colors.textMuted} />
            </button>
          </div>
        </div>

        {/* PESTAÑAS DE LÁMINAS */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, borderBottom: '1px solid ' + colors.border, paddingBottom: 10 }}>
          {[
            { id: 'tooldeck' as const, label: '01 TOOL DECK (PX-05)', desc: '4x4 Macros, Dials & Faders' },
            { id: 'lifesignals' as const, label: '02 LIFE SIGNALS (PX-02)', desc: '14A, Sunburst, Inhale & Metro' },
            { id: 'hardware' as const, label: '03 HARDWARE CASING', desc: 'Tactile Right Rail Cards' },
          ].map((tab) => {
            const isActive = activeSheet === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSheet(tab.id)}
                style={{
                  background: isActive ? accent + '22' : 'transparent',
                  border: '1px solid ' + (isActive ? accent : colors.border),
                  borderRadius: 6,
                  padding: '6px 12px',
                  color: isActive ? accent : colors.textDim,
                  cursor: 'pointer',
                  fontSize: 10,
                  fontWeight: isActive ? 700 : 400,
                  letterSpacing: 0.5,
                  textAlign: 'left',
                }}
              >
                <div>{tab.label}</div>
                <div style={{ fontSize: 8, color: colors.textMuted, marginTop: 2 }}>{tab.desc}</div>
              </button>
            );
          })}
        </div>

        {/* CONTENIDO DE LA LÁMINA SELECCIONADA */}
        <div style={{ marginBottom: 20 }}>
          {activeSheet === 'tooldeck' && (
            <SheetToolDeck
              surface={colors.surface}
              border={colors.border}
              accent={accent}
              text={colors.text}
              textMuted={colors.textMuted}
            />
          )}

          {activeSheet === 'lifesignals' && (
            <SheetLifeSignals
              surface={colors.surface}
              border={colors.border}
              accent={accent}
              text={colors.text}
              textMuted={colors.textMuted}
            />
          )}

          {activeSheet === 'hardware' && (
            <SheetHardwareCasing
              surface={colors.surface}
              border={colors.border}
              accent={accent}
              text={colors.text}
              textMuted={colors.textMuted}
            />
          )}
        </div>

        {/* BARRA INFERIOR DE TOKENS FÍSICOS */}
        <div
          style={{
            borderTop: '1px solid ' + colors.border,
            paddingTop: 12,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 9,
            color: colors.textMuted,
            letterSpacing: 1,
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>TOGGLE</span>
            <button
              type="button"
              onClick={() => setToggleVal(!toggleVal)}
              style={{ width: 32, height: 16, borderRadius: 8, background: toggleVal ? accent : colors.border, border: 'none', cursor: 'pointer', position: 'relative', padding: 0 }}
            >
              <span style={{ position: 'absolute', top: 2, left: toggleVal ? 18 : 2, width: 12, height: 12, borderRadius: '50%', background: '#ffffff', transition: 'left 0.15s' }} />
            </button>
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <span style={{ border: '1px solid ' + colors.border, padding: '3px 8px', borderRadius: 10, color: colors.text }}>ACTION</span>
            <span style={{ border: '1px dashed ' + accent, padding: '3px 8px', borderRadius: 10, color: accent }}>DESTRUCTIVE</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>SLIDER</span>
            <input type="range" min="0" max="100" value={sliderVal} onChange={(e) => setSliderVal(Number(e.target.value))} style={{ accentColor: accent, width: 80, cursor: 'pointer' }} />
            <span style={{ color: colors.text, minWidth: 20 }}>{sliderVal}</span>
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
