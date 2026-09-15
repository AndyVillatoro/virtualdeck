import React, { useCallback, useRef, useEffect } from 'react';
import { useTheme } from '../utils/theme';
import { ICON_SIZE } from '../data/brandIconTypes';

// SVG canvas geometry — kept independent from data/brandIcons.ts so the editor
// can render in any size while the icon's preview uses its own viewBox.
export const CANVAS_PX = 360; // editing surface (square)

// Letter pool used to assign multi-color codes. We avoid '#' (legacy primary),
// '.', ' '. Order chosen so the first auto-assigned letters are unambiguous.
const LETTER_POOL = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ@$%&+';

export function normalizeBitmapPreserveLetters(bitmap: string[]): string[] {
  const rows: string[] = [];
  for (let y = 0; y < ICON_SIZE; y++) {
    const row = bitmap[y] ?? '';
    let n = '';
    for (let x = 0; x < ICON_SIZE; x++) {
      const ch = row[x] ?? '.';
      n += (ch === '.' || ch === ' ') ? '.' : ch;
    }
    rows.push(n);
  }
  return rows;
}

export function hexEq(a: string, b: string): boolean {
  return (a || '').toLowerCase() === (b || '').toLowerCase();
}

export function findLetterForColor(
  color: string,
  palette: Record<string, string>,
  primary: string,
): string | null {
  if (hexEq(color, primary)) return '#';
  for (const [k, v] of Object.entries(palette)) {
    if (hexEq(v, color)) return k;
  }
  return null;
}

export function nextFreeLetter(palette: Record<string, string>, bitmap: string[]): string {
  const used = new Set<string>(['#', '.', ' ', ...Object.keys(palette)]);
  for (const row of bitmap) for (const c of row) used.add(c);
  for (const c of LETTER_POOL) if (!used.has(c)) return c;
  return '?';
}

// ── HSV / HEX helpers ───────────────────────────────────────────────────────
function clamp01(v: number) { return Math.max(0, Math.min(1, v)); }

function hexToRgb(hex: string): [number, number, number] {
  const m = (hex || '').replace('#', '').padEnd(6, '0').slice(0, 6);
  const n = parseInt(m, 16);
  if (Number.isNaN(n)) return [255, 255, 255];
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function rgbToHex(r: number, g: number, b: number): string {
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
  let r: number, g: number, b: number;
  if (hh < 1) [r, g, b] = [c, x, 0];
  else if (hh < 2) [r, g, b] = [x, c, 0];
  else if (hh < 3) [r, g, b] = [0, c, x];
  else if (hh < 4) [r, g, b] = [0, x, c];
  else if (hh < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = v - c;
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

// ── Inline HSV picker ───────────────────────────────────────────────────────
export function BrandColorPicker({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const VD = useTheme();
  const [r, g, b] = hexToRgb(value);
  const [h, s, v] = rgbToHsv(r, g, b);

  const svRef = useRef<HTMLDivElement | null>(null);
  const dragKind = useRef<'sv' | 'hue' | null>(null);

  const setFromSV = useCallback((clientX: number, clientY: number, hue: number) => {
    const el = svRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const ns = clamp01((clientX - r.left) / r.width);
    const nv = clamp01(1 - (clientY - r.top) / r.height);
    const [rr, gg, bb] = hsvToRgb(hue, ns, nv);
    onChange(rgbToHex(rr, gg, bb));
  }, [onChange]);

  const setFromHue = useCallback((clientX: number, target: HTMLElement, sv: number, vv: number) => {
    const r = target.getBoundingClientRect();
    const nh = clamp01((clientX - r.left) / r.width) * 360;
    const [rr, gg, bb] = hsvToRgb(nh, sv || 1, vv || 1);
    onChange(rgbToHex(rr, gg, bb));
  }, [onChange]);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragKind.current) return;
      if (dragKind.current === 'sv') {
        setFromSV(e.clientX, e.clientY, h);
      }
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
      {/* SV box */}
      <div
        ref={svRef}
        onMouseDown={(e) => {
          dragKind.current = 'sv';
          setFromSV(e.clientX, e.clientY, h);
        }}
        style={{
          position: 'relative',
          width: '100%', height: 130,
          background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hueColor})`,
          borderRadius: VD.radius.md, border: `1px solid ${VD.border}`,
          cursor: 'crosshair', userSelect: 'none',
        }}
      >
        <div style={{
          position: 'absolute',
          left: `${s * 100}%`, top: `${(1 - v) * 100}%`,
          width: 12, height: 12,
          marginLeft: -6, marginTop: -6,
          border: '2px solid #fff', borderRadius: '50%',
          boxShadow: '0 0 0 1px rgba(0,0,0,0.6)',
          pointerEvents: 'none',
        }} />
      </div>

      {/* Hue slider */}
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
          position: 'relative',
          width: '100%', height: 14,
          background: 'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)',
          borderRadius: VD.radius.md, border: `1px solid ${VD.border}`,
          cursor: 'pointer',
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
    </div>
  );
}

