import React, { useCallback, useEffect, useRef } from 'react';
import { VD } from '../design';

// HSV/HEX helpers — duplicados a propósito de BrandIconEditor para que este
// componente sea autónomo (BrandIconEditor mantiene los suyos por su flujo
// específico de paleta). Si alguno cambia aquí, el otro no se ve afectado.
function clamp01(v: number) { return Math.max(0, Math.min(1, v)); }
export function hexToRgb(hex: string): [number, number, number] {
  const m = (hex || '').replace('#', '').padEnd(6, '0').slice(0, 6);
  const n = parseInt(m, 16);
  if (Number.isNaN(n)) return [255, 255, 255];
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}
export function rgbToHex(r: number, g: number, b: number): string {
  const t = (v: number) => Math.round(clamp01(v / 255) * 255).toString(16).padStart(2, '0');
  return `#${t(r)}${t(g)}${t(b)}`;
}
function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min; let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  return [h, s, max];
}
function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const c = v * s, hh = (h % 360) / 60, x = c * (1 - Math.abs((hh % 2) - 1));
  let r = 0, g = 0, b = 0;
  if (hh < 1) [r, g, b] = [c, x, 0];
  else if (hh < 2) [r, g, b] = [x, c, 0];
  else if (hh < 3) [r, g, b] = [0, c, x];
  else if (hh < 4) [r, g, b] = [0, x, c];
  else if (hh < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = v - c;
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

interface ColorPickerProps {
  value: string;
  onChange: (hex: string) => void;
  showHexInput?: boolean;
  height?: number;
}

export function ColorPicker({ value, onChange, showHexInput = true, height = 130 }: ColorPickerProps) {
  const [r, g, b] = hexToRgb(value);
  const [h, s, v] = rgbToHsv(r, g, b);
  const svRef = useRef<HTMLDivElement | null>(null);
  const dragKind = useRef<'sv' | 'hue' | null>(null);

  const setFromSV = useCallback((clientX: number, clientY: number, hue: number) => {
    const el = svRef.current; if (!el) return;
    const rect = el.getBoundingClientRect();
    const ns = clamp01((clientX - rect.left) / rect.width);
    const nv = clamp01(1 - (clientY - rect.top) / rect.height);
    const [rr, gg, bb] = hsvToRgb(hue, ns, nv);
    onChange(rgbToHex(rr, gg, bb));
  }, [onChange]);

  const setFromHue = useCallback((clientX: number, target: HTMLElement, sv: number, vv: number) => {
    const rect = target.getBoundingClientRect();
    const nh = clamp01((clientX - rect.left) / rect.width) * 360;
    const [rr, gg, bb] = hsvToRgb(nh, sv || 1, vv || 1);
    onChange(rgbToHex(rr, gg, bb));
  }, [onChange]);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (dragKind.current === 'sv') setFromSV(e.clientX, e.clientY, h);
    }
    function onUp() { dragKind.current = null; }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [h, setFromSV]);

  const hueColor = `hsl(${h.toFixed(0)}, 100%, 50%)`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div
        ref={svRef}
        onMouseDown={(e) => { dragKind.current = 'sv'; setFromSV(e.clientX, e.clientY, h); }}
        style={{
          position: 'relative', width: '100%', height,
          background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hueColor})`,
          borderRadius: VD.radius.md, border: `1px solid ${VD.border}`,
          cursor: 'crosshair', userSelect: 'none',
        }}
      >
        <div style={{
          position: 'absolute',
          left: `${s * 100}%`, top: `${(1 - v) * 100}%`,
          width: 12, height: 12, marginLeft: -6, marginTop: -6,
          border: '2px solid #fff', borderRadius: '50%',
          boxShadow: '0 0 0 1px rgba(0,0,0,0.6)',
          pointerEvents: 'none',
        }} />
      </div>

      <div
        onMouseDown={(e) => {
          setFromHue(e.clientX, e.currentTarget, s, v);
          const target = e.currentTarget;
          const move = (ev: MouseEvent) => setFromHue(ev.clientX, target, s, v);
          const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
          window.addEventListener('mousemove', move);
          window.addEventListener('mouseup', up);
        }}
        style={{
          position: 'relative', width: '100%', height: 14,
          background: 'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)',
          borderRadius: VD.radius.md, border: `1px solid ${VD.border}`, cursor: 'pointer',
        }}
      >
        <div style={{
          position: 'absolute',
          left: `${(h / 360) * 100}%`, top: -2, bottom: -2,
          width: 4, marginLeft: -2,
          background: '#fff', borderRadius: VD.radius.sm,
          boxShadow: '0 0 0 1px rgba(0,0,0,0.7)',
          pointerEvents: 'none',
        }} />
      </div>

      {showHexInput && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 24, height: 24, background: value,
            border: `1px solid ${VD.border}`, borderRadius: VD.radius.sm, flexShrink: 0,
          }} />
          <input
            value={value.toUpperCase()}
            onChange={(e) => {
              const v = e.target.value.trim();
              if (/^#?[0-9a-fA-F]{6}$/.test(v)) onChange(v.startsWith('#') ? v : `#${v}`);
            }}
            style={{
              flex: 1, background: VD.elevated, border: `1px solid ${VD.border}`,
              padding: '4px 8px', color: VD.text, fontFamily: VD.mono, fontSize: 10,
              outline: 'none', borderRadius: VD.radius.sm, letterSpacing: 1,
            }}
          />
        </div>
      )}
    </div>
  );
}
