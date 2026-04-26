import React, { useEffect, useState } from 'react';
import { VD, GLYPHS_5x7 } from '../design';
import { DotLabel } from './DotLabel';

interface Glyph57EditorProps {
  initial?: number[];
  accent: string;
  onSave: (rows: number[]) => void;
  onClose: () => void;
}

const EMPTY: number[] = [0, 0, 0, 0, 0, 0, 0];

// 2.1 — Editor 5×7 dot-matrix.
// Cada fila es un bitmask de 5 bits (4..0 = izquierda..derecha) — mismo formato
// que GLYPHS_5x7 en design.ts. El usuario dibuja → guardamos 7 enteros y
// ButtonCell lo renderiza como puntos (firma del producto).
export function Glyph57Editor({ initial, accent, onSave, onClose }: Glyph57EditorProps) {
  const [rows, setRows] = useState<number[]>(() => initial && initial.length === 7 ? [...initial] : [...EMPTY]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const togglePixel = (r: number, c: number) => {
    setRows((prev) => {
      const copy = [...prev];
      const bit = 1 << (4 - c);
      copy[r] = copy[r] ^ bit;
      return copy;
    });
  };

  const setAll = (val: 0 | 31) => setRows([val, val, val, val, val, val, val]);

  const loadFromChar = (ch: string) => {
    const g = GLYPHS_5x7[ch.toUpperCase()];
    if (g) setRows([...g]);
  };

  const cellPx = 28;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 220,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: VD.surface, border: `1px solid ${VD.borderStrong}`,
          borderRadius: VD.radius.lg, boxShadow: VD.shadow.modal,
          padding: 22, width: 'min(420px, 92vw)',
          display: 'flex', flexDirection: 'column', gap: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 6, height: 6, borderRadius: VD.radius.md, background: accent }} />
          <DotLabel size={11} color={VD.text} spacing={2}>EDITOR DE GLIFO 5×7</DotLabel>
          <div style={{ flex: 1 }} />
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: VD.textDim, cursor: 'pointer', fontSize: 18, lineHeight: 1 }}
          >×</button>
        </div>

        {/* Editing grid 5×7 */}
        <div style={{
          display: 'grid', gridTemplateColumns: `repeat(5, ${cellPx}px)`, gridTemplateRows: `repeat(7, ${cellPx}px)`,
          gap: 3, justifyContent: 'center', padding: 10,
          background: VD.bg, border: `1px solid ${VD.border}`, borderRadius: VD.radius.md,
        }}>
          {rows.flatMap((row, r) =>
            [4, 3, 2, 1, 0].map((col) => {
              const on = ((row >> col) & 1) === 1;
              const c = 4 - col;
              return (
                <div
                  key={`${r}-${col}`}
                  onClick={() => togglePixel(r, c)}
                  style={{
                    width: cellPx, height: cellPx,
                    borderRadius: '50%',
                    background: on ? accent : VD.dotIdle,
                    cursor: 'pointer',
                    transition: 'background 0.06s',
                  }}
                />
              );
            })
          )}
        </div>

        {/* Quick presets */}
        <div>
          <DotLabel size={8} color={VD.textMuted} spacing={2} style={{ display: 'block', marginBottom: 6 }}>
            CARGAR DESDE TIPOGRAFÍA
          </DotLabel>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {Object.keys(GLYPHS_5x7).filter((k) => k.match(/[A-Z0-9]/)).map((ch) => (
              <button
                key={ch}
                onClick={() => loadFromChar(ch)}
                title={`Cargar "${ch}"`}
                style={{
                  width: 22, height: 22,
                  background: VD.elevated, border: `1px solid ${VD.border}`,
                  fontFamily: VD.mono, fontSize: 10, color: VD.textDim,
                  cursor: 'pointer', borderRadius: VD.radius.sm,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >{ch}</button>
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button
            onClick={() => setAll(0)}
            style={{
              flex: 1, padding: '7px 10px',
              background: 'transparent', border: `1px solid ${VD.border}`,
              fontFamily: VD.mono, fontSize: 9, color: VD.textDim, cursor: 'pointer',
              borderRadius: VD.radius.sm, letterSpacing: 1,
            }}
          >LIMPIAR</button>
          <button
            onClick={() => setAll(31)}
            style={{
              flex: 1, padding: '7px 10px',
              background: 'transparent', border: `1px solid ${VD.border}`,
              fontFamily: VD.mono, fontSize: 9, color: VD.textDim, cursor: 'pointer',
              borderRadius: VD.radius.sm, letterSpacing: 1,
            }}
          >RELLENAR</button>
          <button
            onClick={() => { onSave(rows); onClose(); }}
            style={{
              flex: 1.5, padding: '7px 10px',
              background: VD.accentBg, border: `1px solid ${accent}`,
              fontFamily: VD.mono, fontSize: 9, color: accent, cursor: 'pointer',
              borderRadius: VD.radius.sm, letterSpacing: 1,
            }}
          >GUARDAR ✓</button>
        </div>

        {rows.every((r) => r === 0) && (
          <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, textAlign: 'center' }}>
            Vacío — guardar lo eliminará del botón
          </div>
        )}
      </div>
    </div>
  );
}

// Helper para renderizar un glifo 5×7 inline (usado por ButtonCell y preview).
export function Glyph57View({ rows, dotSize = 4, gap = 1, color }: {
  rows: number[];
  dotSize?: number;
  gap?: number;
  color: string;
}) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(5, ${dotSize}px)`,
      gridTemplateRows: `repeat(7, ${dotSize}px)`,
      gap,
    }}>
      {rows.flatMap((row, r) =>
        [4, 3, 2, 1, 0].map((col) => {
          const on = ((row >> col) & 1) === 1;
          return (
            <div
              key={`${r}-${col}`}
              style={{
                width: dotSize, height: dotSize,
                borderRadius: '50%',
                background: on ? color : VD.dotIdle,
              }}
            />
          );
        })
      )}
    </div>
  );
}
