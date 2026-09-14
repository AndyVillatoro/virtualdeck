import React, { useEffect, useState, useRef, useCallback } from 'react';
import { GLYPHS_5x7 } from '../design';
import { useTheme } from '../utils/theme';
import { useT } from '../utils/i18n';
import { DotLabel } from './DotLabel';
import { DotGlyphIcon } from './dot480/DotGlyphIcon';

export interface Glyph57EditorProps {
  initial?: number[];
  accent: string;
  onSave: (rows: number[]) => void;
  onClose: () => void;
}

const EMPTY: number[] = [0, 0, 0, 0, 0, 0, 0];

/** Presets de símbolos icónicos pre-calculados en matriz 5×7 */
export const SYMBOL_PRESETS_5X7: Record<string, number[]> = {
  'PLAY': [16, 24, 28, 30, 28, 24, 16],
  'PAUSE': [27, 27, 27, 27, 27, 27, 27],
  'STOP': [0, 31, 31, 31, 31, 31, 0],
  'NEXT': [0, 17, 25, 29, 25, 17, 0],
  'PREV': [0, 17, 19, 23, 19, 17, 0],
  'HEART': [0, 10, 31, 31, 14, 4, 0],
  'CHECK': [0, 1, 2, 4, 20, 8, 0],
  'CROSS': [17, 17, 10, 4, 10, 17, 17],
  'UP': [4, 14, 21, 4, 4, 4, 4],
  'DOWN': [4, 4, 4, 4, 21, 14, 4],
  'LEFT': [0, 4, 8, 31, 8, 4, 0],
  'RIGHT': [0, 4, 2, 31, 2, 4, 0],
  'BOLT': [6, 12, 31, 3, 6, 12, 8],
  'BELL': [4, 14, 14, 14, 31, 0, 4],
  'LOCK': [14, 17, 17, 31, 27, 31, 31],
  'AUDIO': [1, 3, 15, 31, 15, 3, 1],
};

/**
 * 2.1 — Diseñador interactivo de glifos Dot-Matrix 5×7 (DOT / 480 OLED Micro Interface).
 *
 * Permite dibujar, pintar por arrastre continuo con ratón o dedo táctil,
 * desplazar en 4 direcciones, invertir, voltear en espejo y elegir presets.
 */
export function Glyph57Editor({ initial, accent, onSave, onClose }: Glyph57EditorProps) {
  const t = useT();
  const VD = useTheme();

  const [rows, setRows] = useState<number[]>(() =>
    initial && initial.length === 7 ? [...initial] : [...EMPTY]
  );
  const [history, setHistory] = useState<number[][]>([]);
  const [activeTab, setActiveTab] = useState<'symbols' | 'font'>('symbols');

  // Estado para arrastre continuo táctil / ratón
  const isPointerDownRef = useRef(false);
  const drawModeRef = useRef<boolean>(true); // true = pintar, false = borrar

  const registrarPaso = useCallback(() => {
    setHistory((prev) => [...prev.slice(-20), rows]);
  }, [rows]);

  const deshacer = useCallback(() => {
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      const anterior = prev[prev.length - 1];
      setRows(anterior);
      return prev.slice(0, -1);
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        deshacer();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, deshacer]);

  const aplicarPixel = (r: number, c: number, valor: boolean) => {
    setRows((prev) => {
      const bit = 1 << (4 - c);
      const row = prev[r];
      const yaEncendido = ((row >> (4 - c)) & 1) === 1;
      if (yaEncendido === valor) return prev;
      const copy = [...prev];
      copy[r] = valor ? row | bit : row & ~bit;
      return copy;
    });
  };

  const onPointerDownDot = (r: number, c: number) => {
    registrarPaso();
    isPointerDownRef.current = true;
    const actualmenteEncendido = ((rows[r] >> (4 - c)) & 1) === 1;
    drawModeRef.current = !actualmenteEncendido;
    aplicarPixel(r, c, drawModeRef.current);
  };

  const onPointerEnterDot = (r: number, c: number) => {
    if (!isPointerDownRef.current) return;
    aplicarPixel(r, c, drawModeRef.current);
  };

  const alTerminarPuntero = () => {
    isPointerDownRef.current = false;
  };

  // Transformaciones
  const shift = (dx: number, dy: number) => {
    registrarPaso();
    setRows((prev) => {
      let nuevo = [...prev];
      if (dy === -1) nuevo = nuevo.slice(1).concat([0]);
      else if (dy === 1) nuevo = [0].concat(nuevo.slice(0, 6));

      if (dx === -1) nuevo = nuevo.map((r) => (r << 1) & 31);
      else if (dx === 1) nuevo = nuevo.map((r) => r >> 1);
      return nuevo;
    });
  };

  const invertir = () => {
    registrarPaso();
    setRows((prev) => prev.map((r) => (~r) & 31));
  };

  const voltearH = () => {
    registrarPaso();
    setRows((prev) =>
      prev.map((r) =>
        ((r & 1) << 4) |
        (((r >> 1) & 1) << 3) |
        (((r >> 2) & 1) << 2) |
        (((r >> 3) & 1) << 1) |
        ((r >> 4) & 1)
      )
    );
  };

  const voltearV = () => {
    registrarPaso();
    setRows((prev) => [...prev].reverse());
  };

  const setAll = (val: 0 | 31) => {
    registrarPaso();
    setRows([val, val, val, val, val, val, val]);
  };

  const cargarPreset = (matriz: number[]) => {
    registrarPaso();
    setRows([...matriz]);
  };

  const cellPx = 28;

  return (
    <div
      onClick={onClose}
      onPointerUp={alTerminarPuntero}
      onPointerCancel={alTerminarPuntero}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 220,
        background: 'rgba(7, 8, 9, 0.88)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: VD.surface,
          border: `1px solid ${VD.borderStrong}`,
          borderRadius: VD.radius.lg,
          boxShadow: VD.shadow.modal,
          padding: 20,
          width: 'min(440px, 94vw)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {/* Cabecera modal */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 6, height: 6, borderRadius: VD.radius.md, background: accent }} />
          <DotLabel size={11} color={VD.text} spacing={2}>
            {t('glyph.title')}
          </DotLabel>
          <div style={{ flex: 1 }} />
          {history.length > 0 && (
            <button
              onClick={deshacer}
              title={t('glyph.undo')}
              style={{
                background: 'transparent',
                border: `1px solid ${VD.border}`,
                color: VD.textDim,
                borderRadius: VD.radius.sm,
                padding: '3px 7px',
                fontFamily: VD.mono,
                fontSize: 9,
                cursor: 'pointer',
              }}
            >
              {t('glyph.undo')}
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: VD.textDim,
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <DotGlyphIcon glyph="CLOSE" size={10} color={VD.textDim} />
          </button>
        </div>

        {/* Rejilla de edición central + Previews laterales */}
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', justifyContent: 'center' }}>
          {/* Rejilla interactiva 5×7 */}
          <div
            onPointerLeave={alTerminarPuntero}
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(5, ${cellPx}px)`,
              gridTemplateRows: `repeat(7, ${cellPx}px)`,
              gap: 3,
              padding: 8,
              background: '#070809',
              border: `1px solid ${VD.border}`,
              borderRadius: VD.radius.md,
              userSelect: 'none',
              touchAction: 'none',
            }}
          >
            {rows.flatMap((row, r) =>
              [4, 3, 2, 1, 0].map((col) => {
                const on = ((row >> col) & 1) === 1;
                const c = 4 - col;
                return (
                  <div
                    key={`${r}-${col}`}
                    onPointerDown={() => onPointerDownDot(r, c)}
                    onPointerEnter={() => onPointerEnterDot(r, c)}
                    style={{
                      width: cellPx,
                      height: cellPx,
                      borderRadius: '50%',
                      background: on ? accent : 'rgba(255, 255, 255, 0.06)',
                      boxShadow: on ? `0 0 6px ${accent}66` : undefined,
                      cursor: 'crosshair',
                      transition: 'background 0.05s',
                    }}
                  />
                );
              })
            )}
          </div>

          {/* Panel lateral de vista previa y botones de desplazamiento */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
            <DotLabel size={8} color={VD.textMuted} spacing={1}>
              {t('glyph.preview')}
            </DotLabel>
            {/* Celda OLED simulada */}
            <div
              style={{
                width: 54,
                height: 54,
                borderRadius: VD.radius.md,
                background: '#070809',
                border: `1px solid ${accent}44`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'inset 0 0 8px rgba(0,0,0,0.8)',
              }}
            >
              <Glyph57View rows={rows} dotSize={5} gap={1} color={accent} />
            </div>

            {/* Shift pad */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 20px)', gap: 2, marginTop: 4 }}>
              <div />
              <button onClick={() => shift(0, -1)} style={padBtnStyle(VD)}>▲</button>
              <div />
              <button onClick={() => shift(-1, 0)} style={padBtnStyle(VD)}>◀</button>
              <div />
              <button onClick={() => shift(1, 0)} style={padBtnStyle(VD)}>▶</button>
              <div />
              <button onClick={() => shift(0, 1)} style={padBtnStyle(VD)}>▼</button>
              <div />
            </div>
          </div>
        </div>

        {/* Herramientas de transformación rápida */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
          <button onClick={invertir} style={toolBtnStyle(VD)}>{t('glyph.invert')}</button>
          <button onClick={voltearH} style={toolBtnStyle(VD)}>{t('glyph.flipH')}</button>
          <button onClick={voltearV} style={toolBtnStyle(VD)}>{t('glyph.flipV')}</button>
          <button onClick={() => setAll(0)} style={toolBtnStyle(VD)}>{t('ui.clear')}</button>
          <button onClick={() => setAll(31)} style={toolBtnStyle(VD)}>{t('ui.fill')}</button>
        </div>

        {/* Selector de pestañas de presets */}
        <div style={{ display: 'flex', gap: 6, borderBottom: `1px solid ${VD.border}`, paddingBottom: 4 }}>
          <button
            onClick={() => setActiveTab('symbols')}
            style={{
              background: 'transparent',
              border: 'none',
              fontFamily: VD.mono,
              fontSize: 9,
              cursor: 'pointer',
              color: activeTab === 'symbols' ? accent : VD.textMuted,
              fontWeight: activeTab === 'symbols' ? 'bold' : 'normal',
            }}
          >
            {t('glyph.symbols')}
          </button>
          <button
            onClick={() => setActiveTab('font')}
            style={{
              background: 'transparent',
              border: 'none',
              fontFamily: VD.mono,
              fontSize: 9,
              cursor: 'pointer',
              color: activeTab === 'font' ? accent : VD.textMuted,
              fontWeight: activeTab === 'font' ? 'bold' : 'normal',
            }}
          >
            {t('glyph.fromFont')}
          </button>
        </div>

        {/* Contenedor de presets */}
        <div style={{ maxHeight: 72, overflowY: 'auto', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {activeTab === 'symbols'
            ? Object.entries(SYMBOL_PRESETS_5X7).map(([name, data]) => (
                <button
                  key={name}
                  onClick={() => cargarPreset(data)}
                  title={name}
                  style={{
                    padding: '3px 6px',
                    background: VD.elevated,
                    border: `1px solid ${VD.border}`,
                    fontFamily: VD.mono,
                    fontSize: 8,
                    color: VD.textDim,
                    cursor: 'pointer',
                    borderRadius: VD.radius.sm,
                  }}
                >
                  {name}
                </button>
              ))
            : Object.keys(GLYPHS_5x7)
                .filter((k) => k.match(/[A-Z0-9]/))
                .map((ch) => (
                  <button
                    key={ch}
                    onClick={() => {
                      const g = GLYPHS_5x7[ch];
                      if (g) cargarPreset(g);
                    }}
                    title={t('glyph.load', { ch })}
                    style={{
                      width: 20,
                      height: 20,
                      background: VD.elevated,
                      border: `1px solid ${VD.border}`,
                      fontFamily: VD.mono,
                      fontSize: 9,
                      color: VD.textDim,
                      cursor: 'pointer',
                      borderRadius: VD.radius.sm,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {ch}
                  </button>
                ))}
        </div>

        {/* Botones de acción inferior */}
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '8px 10px',
              background: 'transparent',
              border: `1px solid ${VD.border}`,
              fontFamily: VD.mono,
              fontSize: 9,
              color: VD.textDim,
              cursor: 'pointer',
              borderRadius: VD.radius.sm,
              letterSpacing: 1,
            }}
          >
            {t('ui.cancel')}
          </button>
          <button
            onClick={() => {
              onSave(rows);
              onClose();
            }}
            style={{
              flex: 1.5,
              padding: '8px 10px',
              background: VD.accentBg,
              border: `1px solid ${accent}`,
              fontFamily: VD.mono,
              fontSize: 9,
              color: accent,
              cursor: 'pointer',
              borderRadius: VD.radius.sm,
              letterSpacing: 1,
            }}
          >
            {t('ui.save')}
          </button>
        </div>

        {rows.every((r) => r === 0) && (
          <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, textAlign: 'center' }}>
            {t('glyph.empty')}
          </div>
        )}
      </div>
    </div>
  );
}

function toolBtnStyle(VD: any): React.CSSProperties {
  return {
    padding: '4px 7px',
    background: 'transparent',
    border: `1px solid ${VD.border}`,
    fontFamily: VD.mono,
    fontSize: 8,
    color: VD.textDim,
    cursor: 'pointer',
    borderRadius: VD.radius.sm,
    letterSpacing: 0.5,
  };
}

function padBtnStyle(VD: any): React.CSSProperties {
  return {
    width: 20,
    height: 20,
    background: VD.elevated,
    border: `1px solid ${VD.border}`,
    fontFamily: VD.mono,
    fontSize: 8,
    color: VD.textDim,
    cursor: 'pointer',
    borderRadius: VD.radius.sm,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  };
}

/** Helper para renderizar un glifo 5×7 inline (usado por ButtonCell y preview). */
export function Glyph57View({
  rows,
  dotSize = 4,
  gap = 1,
  color,
}: {
  rows: number[];
  dotSize?: number;
  gap?: number;
  color: string;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(5, ${dotSize}px)`,
        gridTemplateRows: `repeat(7, ${dotSize}px)`,
        gap,
      }}
    >
      {rows.flatMap((row, r) =>
        [4, 3, 2, 1, 0].map((col) => {
          const on = ((row >> col) & 1) === 1;
          return (
            <div
              key={`${r}-${col}`}
              style={{
                width: dotSize,
                height: dotSize,
                borderRadius: '50%',
                background: on ? color : 'rgba(255, 255, 255, 0.06)',
              }}
            />
          );
        })
      )}
    </div>
  );
}
