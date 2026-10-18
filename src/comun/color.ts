/**
 * Conversión de color pura compartida por el renderer y el proceso principal.
 *
 * Antes vivía duplicada en `src/components/ColorPicker.tsx` y en
 * `src/components/dot480/SelectorColor.tsx` (HSV) y en
 * `electron/main/rgb/color.ts` (hex↔RGB con OpenRGB). Un único dueño evita que
 * una corrección se quede solo en un lado.
 *
 * Sin React, DOM ni Electron (regla `comun-es-puro`).
 */

/** Recorta a 0..1. */
export function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

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

export function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
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

export function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
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