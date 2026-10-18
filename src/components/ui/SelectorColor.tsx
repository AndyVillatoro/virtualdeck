import React, { useCallback, useEffect, useRef } from 'react';
import { useTheme } from '../../utils/theme';
import { clamp01, hexToRgb, rgbToHex, rgbToHsv, hsvToRgb } from '../../comun/color';

export interface SelectorColorProps {
  value: string;
  onChange: (hex: string) => void;
  /**
   * Al soltar tras arrastrar, al confirmar con teclado o al introducir un HEX
   * válido: momento de escribir fuera (p. ej. el gestor RGB escribe al hardware
   * al soltar y no en cada píxel).
   */
  onCommit?: (hex: string) => void;
  /** Muestra la fila inferior con muestra de color y entrada HEX (#RRGGBB). */
  showHexInput?: boolean;
  /** Alto de la caja SV en píxeles (múltiplo de 4; por defecto 128, o 96 en modo compacto). */
  height?: number;
  /** Variante compacta para paneles de poca altura (como 1280×480). */
  compacto?: boolean;
  /** Muestras rápidas opcionales debajo del selector. */
  swatches?: readonly string[];
}

function normalizarHex(entrada: string): string | null {
  const limpio = entrada.trim();
  if (!/^#?[0-9a-fA-F]{6}$/.test(limpio)) return null;
  return limpio.startsWith('#') ? limpio.toLowerCase() : `#${limpio.toLowerCase()}`;
}

function pasoTecla(shiftKey: boolean, base: number, fino: number): number {
  return shiftKey ? fino : base;
}

/**
 * Selector de color HSV unificado (caja saturación/valor + barra de tono +
 * entrada HEX y muestras opcionales).
 *
 * Reemplaza a los antiguos `components/ColorPicker.tsx` y
 * `components/dot480/SelectorColor.tsx` bajo estética DOT estricta:
 * colores vía `useTheme()`, grilla de 4 px, sin blanco puro `#ffffff` y
 * accesible con teclado (flechas en la caja SV y en la barra de tono).
 */
export function SelectorColor({
  value,
  onChange,
  onCommit,
  showHexInput = true,
  height,
  compacto = false,
  swatches,
}: SelectorColorProps) {
  const VD = useTheme();
  const altoCaja = height ?? (compacto ? 96 : 128);
  const [r, g, b] = hexToRgb(value);
  const [h, s, v] = rgbToHsv(r, g, b);

  const svRef = useRef<HTMLDivElement | null>(null);
  const hueRef = useRef<HTMLDivElement | null>(null);
  const dragKind = useRef<'sv' | 'hue' | null>(null);
  const ultimoRef = useRef(value);
  const commitRef = useRef(onCommit);
  commitRef.current = onCommit;

  useEffect(() => {
    ultimoRef.current = value;
  }, [value]);

  const emitir = useCallback(
    (hex: string, confirmar = false) => {
      ultimoRef.current = hex;
      onChange(hex);
      if (confirmar) commitRef.current?.(hex);
    },
    [onChange],
  );

  const fijarDesdeSV = useCallback(
    (clientX: number, clientY: number, tono: number) => {
      const el = svRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const ns = clamp01((clientX - rect.left) / rect.width);
      const nv = clamp01(1 - (clientY - rect.top) / rect.height);
      const [rr, gg, bb] = hsvToRgb(tono, ns, nv);
      emitir(rgbToHex(rr, gg, bb));
    },
    [emitir],
  );

  const fijarDesdeTono = useCallback(
    (clientX: number, sat: number, val: number) => {
      const el = hueRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const nh = clamp01((clientX - rect.left) / rect.width) * 360;
      const [rr, gg, bb] = hsvToRgb(nh, sat || 1, val || 1);
      emitir(rgbToHex(rr, gg, bb));
    },
    [emitir],
  );

  useEffect(() => {
    function alMover(e: MouseEvent) {
      if (dragKind.current === 'sv') fijarDesdeSV(e.clientX, e.clientY, h);
      else if (dragKind.current === 'hue') fijarDesdeTono(e.clientX, s, v);
    }
    function alSoltar() {
      if (dragKind.current !== null) {
        commitRef.current?.(ultimoRef.current);
        dragKind.current = null;
      }
    }
    window.addEventListener('mousemove', alMover);
    window.addEventListener('mouseup', alSoltar);
    return () => {
      window.removeEventListener('mousemove', alMover);
      window.removeEventListener('mouseup', alSoltar);
    };
  }, [h, s, v, fijarDesdeSV, fijarDesdeTono]);

  const alTeclaSV = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const d = pasoTecla(e.shiftKey, 0.05, 0.01);
    let ns = s;
    let nv = v;
    if (e.key === 'ArrowRight') ns = clamp01(s + d);
    else if (e.key === 'ArrowLeft') ns = clamp01(s - d);
    else if (e.key === 'ArrowUp') nv = clamp01(v + d);
    else if (e.key === 'ArrowDown') nv = clamp01(v - d);
    else return;
    e.preventDefault();
    const [rr, gg, bb] = hsvToRgb(h, ns, nv);
    emitir(rgbToHex(rr, gg, bb), true);
  };

  const alTeclaTono = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const d = pasoTecla(e.shiftKey, 5, 1);
    let nh: number;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') nh = (h + d) % 360;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') nh = (h - d + 360) % 360;
    else if (e.key === 'Home') nh = 0;
    else if (e.key === 'End') nh = 360;
    else return;
    e.preventDefault();
    const [rr, gg, bb] = hsvToRgb(nh, s || 1, v || 1);
    emitir(rgbToHex(rr, gg, bb), true);
  };

  const colorTono = `hsl(${h.toFixed(0)}, 100%, 50%)`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div
        ref={svRef}
        role="slider"
        tabIndex={0}
        aria-label="SV"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(v * 100)}
        onKeyDown={alTeclaSV}
        onMouseDown={(e) => {
          dragKind.current = 'sv';
          fijarDesdeSV(e.clientX, e.clientY, h);
        }}
        style={{
          position: 'relative',
          width: '100%',
          height: altoCaja,
          background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, hsl(0, 0%, 100%), ${colorTono})`,
          borderRadius: VD.radius.md,
          border: `1px solid ${VD.border}`,
          cursor: 'crosshair',
          userSelect: 'none',
          outline: 'none',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: `${s * 100}%`,
            top: `${(1 - v) * 100}%`,
            width: 12,
            height: 12,
            marginLeft: -6,
            marginTop: -6,
            border: `2px solid ${VD.text}`,
            borderRadius: '50%',
            boxShadow: '0 0 0 1px rgba(0,0,0,0.6)',
            pointerEvents: 'none',
          }}
        />
      </div>

      <div
        ref={hueRef}
        role="slider"
        tabIndex={0}
        aria-label="HUE"
        aria-valuemin={0}
        aria-valuemax={360}
        aria-valuenow={Math.round(h)}
        onKeyDown={alTeclaTono}
        onMouseDown={(e) => {
          dragKind.current = 'hue';
          fijarDesdeTono(e.clientX, s, v);
        }}
        style={{
          position: 'relative',
          width: '100%',
          height: 16,
          background:
            'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)',
          borderRadius: VD.radius.md,
          border: `1px solid ${VD.border}`,
          cursor: 'pointer',
          userSelect: 'none',
          outline: 'none',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: `${(h / 360) * 100}%`,
            top: -2,
            bottom: -2,
            width: 4,
            marginLeft: -2,
            background: VD.text,
            borderRadius: VD.radius.sm,
            boxShadow: '0 0 0 1px rgba(0,0,0,0.7)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {showHexInput && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 24,
              height: 24,
              background: value,
              border: `1px solid ${VD.border}`,
              borderRadius: VD.radius.sm,
              flexShrink: 0,
            }}
          />
          <input
            aria-label="HEX"
            value={value.toUpperCase()}
            onChange={(e) => {
              const hex = normalizarHex(e.target.value);
              if (hex) emitir(hex, true);
            }}
            style={{
              flex: 1,
              minHeight: 24,
              background: VD.elevated,
              border: `1px solid ${VD.border}`,
              padding: '4px 8px',
              color: VD.text,
              fontFamily: VD.mono,
              fontSize: VD.tipo.sm,
              outline: 'none',
              borderRadius: VD.radius.sm,
              letterSpacing: 1,
            }}
          />
        </div>
      )}

      {swatches && swatches.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {swatches.map((hex) => {
            const activo = hex.toLowerCase() === value.toLowerCase();
            return (
              <button
                key={hex}
                type="button"
                title={hex}
                aria-label={hex}
                onClick={() => emitir(hex, true)}
                style={{
                  width: 20,
                  height: 20,
                  padding: 0,
                  background: hex,
                  border: `2px solid ${activo ? VD.text : VD.border}`,
                  borderRadius: VD.radius.sm,
                  cursor: 'pointer',
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
