import React, { useCallback, useEffect, useRef } from 'react';
import { useTheme } from '../utils/theme';
import { clamp01, hexToRgb, rgbToHex, rgbToHsv, hsvToRgb } from '../comun/color';

// HSV/HEX helpers — duplicados a propósito para que este componente sea
// autónomo (dot480/SelectorColor.tsx mantiene los suyos por su propio flujo).
// Si alguno cambia aquí, el otro no se ve afectado.
//
// Por eso ya no se exportan: nadie de fuera los usaba, y el `export` sugería
// lo contrario de lo que dice este comentario.
// (helpers movidos a src/comun/color.ts)

interface ColorPickerProps {
  value: string;
  onChange: (hex: string) => void;
  /**
   * Al soltar tras arrastrar (o al clicar): momento de escribir fuera.
   * Separado de `onChange` a propósito — ver abajo.
   */
  onCommit?: (hex: string) => void;
  showHexInput?: boolean;
  height?: number;
}

export function ColorPicker({ value, onChange, onCommit, showHexInput = true, height = 130 }: ColorPickerProps) {
  const VD = useTheme();
  const [r, g, b] = hexToRgb(value);
  const [h, s, v] = rgbToHsv(r, g, b);
  const svRef = useRef<HTMLDivElement | null>(null);
  const dragKind = useRef<'sv' | 'hue' | null>(null);
  // Lo último emitido: `value` puede ir un render por detrás al soltar.
  const ultimoRef = useRef(value);
  // El commit cambia en cada render si llega en línea: por referencia.
  const commitRef = useRef(onCommit);
  commitRef.current = onCommit;
  useEffect(() => { ultimoRef.current = value; }, [value]);

  const setFromSV = useCallback((clientX: number, clientY: number, hue: number) => {
    const el = svRef.current; if (!el) return;
    const rect = el.getBoundingClientRect();
    const ns = clamp01((clientX - rect.left) / rect.width);
    const nv = clamp01(1 - (clientY - rect.top) / rect.height);
    const [rr, gg, bb] = hsvToRgb(hue, ns, nv);
    const hex = rgbToHex(rr, gg, bb);
    ultimoRef.current = hex;
    onChange(hex);
  }, [onChange]);

  const setFromHue = useCallback((clientX: number, target: HTMLElement, sv: number, vv: number) => {
    const rect = target.getBoundingClientRect();
    const nh = clamp01((clientX - rect.left) / rect.width) * 360;
    const [rr, gg, bb] = hsvToRgb(nh, sv || 1, vv || 1);
    const hex = rgbToHex(rr, gg, bb);
    ultimoRef.current = hex;
    onChange(hex);
  }, [onChange]);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (dragKind.current === 'sv') setFromSV(e.clientX, e.clientY, h);
    }
    // El commit va al soltar, no por píxel: quien escribe fuera (el gestor
    // RGB manda al hardware y relee) no puede ir al ritmo del ratón. Sin
    // esto, cada píxel disparaba una ronda IPC y la relectura devolvía el
    // selector al color del aparato — «selecciona pero se queda trabado».
    function onUp() {
      if (dragKind.current === 'sv') commitRef.current?.(ultimoRef.current);
      dragKind.current = null;
    }
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
          border: '2px solid #e6e8eb', borderRadius: '50%',
          boxShadow: '0 0 0 1px rgba(0,0,0,0.6)',
          pointerEvents: 'none',
        }} />
      </div>

      <div
        onMouseDown={(e) => {
          setFromHue(e.clientX, e.currentTarget, s, v);
          const target = e.currentTarget;
          const move = (ev: MouseEvent) => setFromHue(ev.clientX, target, s, v);
          const up = () => {
            commitRef.current?.(ultimoRef.current);
            window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up);
          };
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
          background: '#e6e8eb', borderRadius: VD.radius.sm,
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
              const val = e.target.value.trim();
              if (/^#?[0-9a-fA-F]{6}$/.test(val)) {
                const hex = val.startsWith('#') ? val : `#${val}`;
                ultimoRef.current = hex;
                onChange(hex);
                // Acción discreta, no arrastre: se escribe fuera al momento.
                commitRef.current?.(hex);
              }
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
