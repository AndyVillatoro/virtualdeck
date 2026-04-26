import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { VD } from '../design';
import { DotLabel } from './DotLabel';
import { BrandIconDisplay } from './BrandIconDisplay';
import { BRAND_ICONS_MAP, ICON_SIZE } from '../data/brandIcons';

interface BrandIconEditorProps {
  iconKey: string;
  customBitmap?: string[];
  customColor?: string;
  customPalette?: Record<string, string>;
  onSave: (bitmap: string[], color: string, palette: Record<string, string>) => void;
  onClose: () => void;
  accent: string;
}

// SVG canvas geometry — kept independent from data/brandIcons.ts so the editor
// can render in any size while the icon's preview uses its own viewBox.
const CANVAS_PX = 360;       // editing surface (square)
const CELL_PX = CANVAS_PX / ICON_SIZE;
const DOT_R = CELL_PX * 0.32;

// Letter pool used to assign multi-color codes. We avoid '#' (legacy primary),
// '.', ' '. Order chosen so the first auto-assigned letters are unambiguous.
const LETTER_POOL = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ@$%&+';

function normalizeBitmapPreserveLetters(bitmap: string[]): string[] {
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

function hexEq(a: string, b: string): boolean {
  return (a || '').toLowerCase() === (b || '').toLowerCase();
}

function findLetterForColor(
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

function nextFreeLetter(palette: Record<string, string>, bitmap: string[]): string {
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

// ── Inline HSV picker ───────────────────────────────────────────────────────
function ColorPicker({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const [r, g, b] = hexToRgb(value);
  const [h, s, v] = rgbToHsv(r, g, b);

  // The component is uncontrolled-on-drag for performance: we update a ref then
  // call onChange via rAF to avoid React re-rendering on every mouse move.
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

// ── Editor ────────────────────────────────────────────────────────────────────
export function BrandIconEditor({
  iconKey, customBitmap, customColor, customPalette, onSave, onClose, accent,
}: BrandIconEditorProps) {
  const icon = BRAND_ICONS_MAP[iconKey];
  const original = icon?.bitmap ?? [];
  const originalColor = icon?.color ?? '#ffffff';
  // The icon's built-in (read-only) palette is merged so multi-color icons
  // such as TikTok / Slack / Chrome / Firefox keep their letters available.
  const builtInPalette = icon?.palette ?? {};

  const [bitmap, setBitmap] = useState<string[]>(
    () => normalizeBitmapPreserveLetters(customBitmap ?? original)
  );
  const [primaryColor, setPrimaryColor] = useState<string>(customColor ?? originalColor);
  const [palette, setPalette] = useState<Record<string, string>>(
    () => ({ ...builtInPalette, ...(customPalette ?? {}) })
  );
  const [activeColor, setActiveColor] = useState<string>(customColor ?? originalColor);
  const [erasing, setErasing] = useState(false);

  // Drawing — refs avoid React re-renders during pointer drag
  const drawingRef = useRef(false);
  const drawValueRef = useRef<string>('#');     // letter to write
  const lastCellRef = useRef<{ r: number; c: number } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Apply pending paints in a single batch on the next animation frame for
  // smooth dragging. This is the main performance optimization: the previous
  // implementation called setBitmap on every mousemove which re-rendered 289
  // cells. Now we keep a working copy in a ref and flush via rAF.
  const workingRef = useRef<string[]>(bitmap);
  const pendingRef = useRef(false);
  useEffect(() => { workingRef.current = bitmap; }, [bitmap]);

  const flush = useCallback(() => {
    pendingRef.current = false;
    setBitmap([...workingRef.current]); // shallow clone for React change detection
  }, []);
  const schedule = useCallback(() => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    requestAnimationFrame(flush);
  }, [flush]);

  const writeCell = useCallback((row: number, col: number, ch: string) => {
    if (row < 0 || row >= ICON_SIZE || col < 0 || col >= ICON_SIZE) return;
    const cur = workingRef.current[row];
    if (!cur || cur[col] === ch) return;
    const chars = cur.split('');
    chars[col] = ch;
    const next = workingRef.current.slice();
    next[row] = chars.join('');
    workingRef.current = next;
    schedule();
  }, [schedule]);

  // Convert pointer event coords → cell row/col
  const pointerToCell = useCallback((e: { clientX: number; clientY: number }): { r: number; c: number } | null => {
    const svg = svgRef.current; if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0) return null;
    const px = ((e.clientX - rect.left) / rect.width) * ICON_SIZE;
    const py = ((e.clientY - rect.top) / rect.height) * ICON_SIZE;
    const c = Math.floor(px), r = Math.floor(py);
    if (r < 0 || r >= ICON_SIZE || c < 0 || c >= ICON_SIZE) return null;
    return { r, c };
  }, []);

  // Bresenham-like fill so dragging fast doesn't leave gaps
  const paintLine = useCallback((from: { r: number; c: number } | null, to: { r: number; c: number }, ch: string) => {
    if (!from) { writeCell(to.r, to.c, ch); return; }
    let x0 = from.c, y0 = from.r;
    const x1 = to.c, y1 = to.r;
    const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
    const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    while (true) {
      writeCell(y0, x0, ch);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }, [writeCell]);

  // Decide which letter represents the active color (creating a new palette
  // entry on demand). Erase mode always writes '.'.
  const letterFor = useCallback((color: string): string => {
    if (erasing) return '.';
    const existing = findLetterForColor(color, palette, primaryColor);
    if (existing) return existing;
    // First custom paint — convert '#' to active primary if it matches?
    // No: keep '#' as the legacy primary slot. Allocate new letter.
    const letter = nextFreeLetter(palette, workingRef.current);
    setPalette(p => ({ ...p, [letter]: color }));
    return letter;
  }, [erasing, palette, primaryColor]);

  function handlePointerDown(e: React.PointerEvent<SVGSVGElement>) {
    e.preventDefault();
    const cell = pointerToCell(e); if (!cell) return;
    const row = workingRef.current[cell.r]; if (!row) return;
    const isOn = row[cell.c] !== '.';
    const eraseThis = erasing || e.button === 2 || (isOn && hexEq(palette[row[cell.c]] ?? primaryColor, activeColor));
    const ch = eraseThis ? '.' : letterFor(activeColor);
    drawValueRef.current = ch;
    drawingRef.current = true;
    lastCellRef.current = cell;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    writeCell(cell.r, cell.c, ch);
  }

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!drawingRef.current) return;
    const cell = pointerToCell(e); if (!cell) return;
    paintLine(lastCellRef.current, cell, drawValueRef.current);
    lastCellRef.current = cell;
  }

  function handlePointerUp() {
    drawingRef.current = false;
    lastCellRef.current = null;
  }

  function handleReset() {
    setBitmap(normalizeBitmapPreserveLetters(original));
    workingRef.current = normalizeBitmapPreserveLetters(original);
    setPrimaryColor(originalColor);
    setActiveColor(originalColor);
    setPalette({ ...builtInPalette });
  }

  function handleClear() {
    const blank: string[] = [];
    for (let i = 0; i < ICON_SIZE; i++) blank.push('.'.repeat(ICON_SIZE));
    setBitmap(blank);
    workingRef.current = blank;
  }

  // Compress palette before saving — drop entries that are not used in the
  // bitmap so we don't bloat the config file.
  function handleSave() {
    const used = new Set<string>();
    for (const row of bitmap) for (const c of row) if (c !== '.') used.add(c);
    const trimmed: Record<string, string> = {};
    for (const k of Object.keys(palette)) {
      if (used.has(k) && !(k in builtInPalette)) trimmed[k] = palette[k];
    }
    onSave(bitmap, primaryColor, trimmed);
    onClose();
  }

  // Active palette colors used in current bitmap (for "Used colors" strip).
  const usedColors = useMemo(() => {
    const seen = new Set<string>();
    const out: { letter: string; hex: string }[] = [];
    for (const row of bitmap) {
      for (const ch of row) {
        if (ch === '.' || seen.has(ch)) continue;
        seen.add(ch);
        const hex = ch === '#' ? primaryColor : (palette[ch] ?? primaryColor);
        out.push({ letter: ch, hex });
      }
    }
    return out;
  }, [bitmap, palette, primaryColor]);

  const dotCount = useMemo(() => {
    let n = 0;
    for (const row of bitmap) for (const c of row) if (c !== '.') n++;
    return n;
  }, [bitmap]);

  // Pre-render dot circles via memo — keeps paint efficient.
  const circles = useMemo(() => {
    const out: React.ReactElement[] = [];
    for (let r = 0; r < ICON_SIZE; r++) {
      const row = bitmap[r] ?? '';
      for (let c = 0; c < ICON_SIZE; c++) {
        const ch = row[c]; if (!ch || ch === '.') continue;
        const hex = ch === '#' ? primaryColor : (palette[ch] ?? primaryColor);
        out.push(
          <circle
            key={`${r}-${c}`}
            cx={c + 0.5} cy={r + 0.5}
            r={0.32}
            fill={hex}
          />
        );
      }
    }
    return out;
  }, [bitmap, palette, primaryColor]);

  // Static grid lines as a single <path> — far cheaper than 289 divs.
  const gridPath = useMemo(() => {
    let d = '';
    for (let i = 0; i <= ICON_SIZE; i++) {
      d += `M${i} 0V${ICON_SIZE} M0 ${i}H${ICON_SIZE} `;
    }
    return d;
  }, []);

  const swatchSize = 22;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 250,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.9)',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        onContextMenu={e => e.preventDefault()}
        style={{
          background: VD.surface, border: `1px solid ${VD.borderStrong}`,
          borderRadius: VD.radius.lg, boxShadow: VD.shadow.modal,
          display: 'flex', flexDirection: 'column',
          width: 'min(840px, 96vw)', maxHeight: '94vh',
        }}
      >
        {/* Header */}
        <div style={{
          height: 44, borderBottom: `1px solid ${VD.border}`,
          display: 'flex', alignItems: 'center', padding: '0 16px', gap: 10, flexShrink: 0,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: VD.radius.md, background: accent }} />
          <DotLabel size={10} color={VD.text} spacing={2}>
            EDITOR DE ICONO · {icon?.label?.toUpperCase() ?? iconKey.toUpperCase()}
          </DotLabel>
          <div style={{ flex: 1 }} />
          <span style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted }}>{dotCount} PUNTOS</span>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none',
            color: VD.textDim, fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: '0 4px',
          }}>×</button>
        </div>

        {/* Body */}
        <div style={{ display: 'flex', gap: 0, overflow: 'hidden' }}>

          {/* Grid canvas */}
          <div style={{
            padding: 16, flex: '0 0 auto',
            borderRight: `1px solid ${VD.border}`,
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            <DotLabel size={8} color={VD.textMuted} spacing={2} style={{ display: 'block' }}>
              CLIC = PINTAR · CLIC DERECHO = BORRAR · ARRASTRAR = TRAZO
            </DotLabel>

            <svg
              ref={svgRef}
              viewBox={`0 0 ${ICON_SIZE} ${ICON_SIZE}`}
              width={CANVAS_PX}
              height={CANVAS_PX}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onPointerLeave={handlePointerUp}
              style={{
                background: VD.bg, borderRadius: VD.radius.md,
                border: `1px solid ${VD.borderStrong}`,
                cursor: erasing ? 'cell' : 'crosshair',
                touchAction: 'none', userSelect: 'none',
                display: 'block',
              }}
            >
              {/* Background cells (subtle checker for "off" state) */}
              <rect width={ICON_SIZE} height={ICON_SIZE} fill={VD.bg} />
              <path d={gridPath} stroke={VD.border} strokeWidth={0.02} fill="none" />
              {circles}
              {/* hover ring is omitted for perf — pointer movement is what matters */}
            </svg>

            {/* Tool row */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => setErasing(!erasing)}
                style={{
                  padding: '5px 10px',
                  border: `1px solid ${erasing ? accent : VD.border}`,
                  background: erasing ? VD.accentBg : 'transparent',
                  color: erasing ? accent : VD.textDim,
                  fontFamily: VD.mono, fontSize: 9, letterSpacing: 1,
                  cursor: 'pointer', borderRadius: VD.radius.sm,
                }}
              >
                {erasing ? '◉ BORRADOR' : '○ BORRADOR'}
              </button>
              <button onClick={handleClear} style={{
                padding: '5px 10px', border: `1px solid ${VD.border}`,
                background: 'transparent', color: VD.textDim,
                fontFamily: VD.mono, fontSize: 9, letterSpacing: 1, cursor: 'pointer', borderRadius: VD.radius.sm,
              }}>
                LIMPIAR TODO
              </button>
            </div>
          </div>

          {/* Right panel */}
          <div style={{
            flex: 1, padding: 16, minWidth: 280,
            display: 'flex', flexDirection: 'column', gap: 14,
            overflowY: 'auto',
          }}>
            {/* Preview */}
            <div>
              <DotLabel size={8} color={VD.textMuted} spacing={2} style={{ display: 'block', marginBottom: 8 }}>
                VISTA PREVIA
              </DotLabel>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ width: 60, height: 60, borderRadius: VD.radius.lg, background: VD.elevated, border: `1px solid ${VD.borderStrong}`, position: 'relative', overflow: 'hidden' }}>
                  <BrandIconDisplay
                    iconKey={iconKey} customBitmap={bitmap} customColor={primaryColor} customPalette={palette}
                    animated={false}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', borderRadius: VD.radius.md }}
                  />
                </div>
                <div style={{ width: 60, height: 60, borderRadius: VD.radius.lg, background: VD.elevated, border: `1px solid ${VD.borderStrong}`, position: 'relative', overflow: 'hidden' }}>
                  <BrandIconDisplay
                    iconKey={iconKey} customBitmap={bitmap} customColor={primaryColor} customPalette={palette}
                    animated={true}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', borderRadius: VD.radius.md }}
                  />
                  <div style={{ position: 'absolute', bottom: 2, right: 4, fontFamily: VD.mono, fontSize: 6, color: accent, opacity: 0.7 }}>ANIM</div>
                </div>
                <div style={{ flex: 1, borderRadius: VD.radius.lg, background: VD.elevated, border: `1px solid ${VD.borderStrong}`, position: 'relative', overflow: 'hidden', minHeight: 60 }}>
                  <BrandIconDisplay
                    iconKey={iconKey} customBitmap={bitmap} customColor={primaryColor} customPalette={palette}
                    animated={true}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', borderRadius: VD.radius.md }}
                  />
                </div>
              </div>
            </div>

            {/* Active color */}
            <div>
              <DotLabel size={8} color={VD.textMuted} spacing={2} style={{ display: 'block', marginBottom: 8 }}>
                COLOR ACTIVO
              </DotLabel>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: VD.radius.md,
                  background: activeColor,
                  border: `1px solid ${VD.borderStrong}`, flexShrink: 0,
                }} />
                <input
                  value={activeColor}
                  onChange={e => {
                    const v = e.target.value;
                    setActiveColor(v);
                    if (/^#[0-9a-fA-F]{6}$/.test(v)) {
                      // If primary slot color is changed when active matches, sync
                      if (hexEq(v, primaryColor) || hexEq(activeColor, primaryColor)) {
                        // user might be tweaking the primary
                      }
                    }
                  }}
                  placeholder="#ffffff"
                  style={{
                    background: VD.elevated, border: `1px solid ${VD.border}`,
                    color: VD.text, fontFamily: VD.mono, fontSize: 11,
                    padding: '5px 10px', outline: 'none', borderRadius: VD.radius.sm, flex: 1,
                  }}
                />
                <button
                  onClick={() => setPrimaryColor(activeColor)}
                  title="Definir como color principal (#)"
                  style={{
                    padding: '5px 8px', border: `1px solid ${hexEq(activeColor, primaryColor) ? accent : VD.border}`,
                    background: hexEq(activeColor, primaryColor) ? VD.accentBg : 'transparent',
                    color: hexEq(activeColor, primaryColor) ? accent : VD.textDim,
                    fontFamily: VD.mono, fontSize: 9, letterSpacing: 1, cursor: 'pointer', borderRadius: VD.radius.sm,
                  }}
                >
                  PRINCIPAL
                </button>
              </div>

              {/* Inline HSV picker */}
              <ColorPicker value={activeColor} onChange={setActiveColor} />
            </div>

            {/* Palette swatches */}
            <div>
              <DotLabel size={8} color={VD.textMuted} spacing={2} style={{ display: 'block', marginBottom: 8 }}>
                PALETA
              </DotLabel>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {/* Original brand color */}
                {originalColor && (
                  <button
                    onClick={() => setActiveColor(originalColor)}
                    title={`Original: ${originalColor}`}
                    style={{
                      width: swatchSize, height: swatchSize, borderRadius: VD.radius.md,
                      background: originalColor,
                      border: `2px solid ${hexEq(activeColor, originalColor) ? VD.text : VD.border}`,
                      cursor: 'pointer', padding: 0,
                    }}
                  />
                )}
                {/* Built-in icon palette */}
                {Object.entries(builtInPalette).map(([k, c]) => (
                  <button
                    key={`bi-${k}`} onClick={() => setActiveColor(c)} title={`${k}: ${c}`}
                    style={{
                      width: swatchSize, height: swatchSize, borderRadius: VD.radius.md, background: c,
                      border: `2px solid ${hexEq(activeColor, c) ? VD.text : VD.border}`,
                      cursor: 'pointer', padding: 0,
                    }}
                  />
                ))}
                {/* Common palette */}
                {['#ffffff', '#000000', '#ff3b3b', '#ff7f00', '#ffcc00',
                  '#3bff6e', '#3bc8ff', '#4a8ef0', '#cc44ff', '#ff44a8'].map(c => (
                  <button
                    key={c} onClick={() => setActiveColor(c)} title={c}
                    style={{
                      width: swatchSize, height: swatchSize, borderRadius: VD.radius.md, background: c,
                      border: `2px solid ${hexEq(activeColor, c) ? VD.text : VD.border}`,
                      cursor: 'pointer', padding: 0,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Used colors in current bitmap */}
            {usedColors.length > 0 && (
              <div>
                <DotLabel size={8} color={VD.textMuted} spacing={2} style={{ display: 'block', marginBottom: 8 }}>
                  COLORES EN USO ({usedColors.length})
                </DotLabel>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {usedColors.map(uc => (
                    <button
                      key={uc.letter} onClick={() => setActiveColor(uc.hex)} title={`${uc.letter}: ${uc.hex}`}
                      style={{
                        width: swatchSize, height: swatchSize, borderRadius: VD.radius.md, background: uc.hex,
                        border: `2px solid ${hexEq(activeColor, uc.hex) ? VD.text : VD.border}`,
                        cursor: 'pointer', padding: 0,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, lineHeight: 1.6 }}>
              17×17 · Soporta multi-color · Animaciones siguen el patrón de puntos
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          height: 50, borderTop: `1px solid ${VD.border}`,
          display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8, flexShrink: 0,
        }}>
          <button onClick={handleReset} style={{
            padding: '7px 14px', border: `1px solid ${VD.border}`,
            background: 'transparent', fontFamily: VD.mono, fontSize: 9,
            letterSpacing: 1, color: VD.textMuted, cursor: 'pointer', borderRadius: VD.radius.sm,
          }}>
            RESTAURAR ORIGINAL
          </button>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{
            padding: '7px 14px', border: `1px solid ${VD.border}`,
            background: 'transparent', fontFamily: VD.mono, fontSize: 9,
            letterSpacing: 1, color: VD.textDim, cursor: 'pointer', borderRadius: VD.radius.sm,
          }}>
            CANCELAR
          </button>
          <button onClick={handleSave} style={{
            padding: '7px 20px', background: accent, border: 'none',
            fontFamily: VD.mono, fontSize: 9, letterSpacing: 1,
            color: '#fff', cursor: 'pointer', borderRadius: VD.radius.sm,
          }}>
            GUARDAR ICONO ✓
          </button>
        </div>
      </div>
    </div>
  );
}
