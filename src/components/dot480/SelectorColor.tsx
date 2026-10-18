import React, { useCallback, useEffect, useRef } from 'react';
import { useTheme } from '../../utils/theme';
import { clamp01 as acotar01, hexToRgb as hexARgb, rgbToHex as rgbAHex, rgbToHsv as rgbAHsv, hsvToRgb as hsvARgb } from '../../comun/color';

interface SelectorColorProps {
  value: string;
  onChange: (hex: string) => void;
}

// (helpers movidos a src/comun/color.ts, re-exportados con alias)
/**
 * EditorPuntos — selector de color HSV en línea con caja SV y barra de tono.
 * Viene del editor de marca original, con la estética DOT (sin blancos puros).
 */
export function SelectorColor({ value, onChange }: SelectorColorProps) {
  const VD = useTheme();
  const [r, g, b] = hexARgb(value);
  const [h, s, v] = rgbAHsv(r, g, b);

  const cajaRef = useRef<HTMLDivElement | null>(null);
  const arrastreRef = useRef(false);

  const fijarDesdeCaja = useCallback(
    (clientX: number, clientY: number, tono: number) => {
      const el = cajaRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const ns = acotar01((clientX - rect.left) / rect.width);
      const nv = acotar01(1 - (clientY - rect.top) / rect.height);
      const [rr, gg, bb] = hsvARgb(tono, ns, nv);
      onChange(rgbAHex(rr, gg, bb));
    },
    [onChange],
  );

  useEffect(() => {
    function alMover(e: MouseEvent) {
      if (arrastreRef.current) fijarDesdeCaja(e.clientX, e.clientY, h);
    }
    function alSoltar() {
      arrastreRef.current = false;
    }
    window.addEventListener('mousemove', alMover);
    window.addEventListener('mouseup', alSoltar);
    return () => {
      window.removeEventListener('mousemove', alMover);
      window.removeEventListener('mouseup', alSoltar);
    };
  }, [h, fijarDesdeCaja]);

  function alCambiarTono(clientX: number, destino: HTMLElement, sat: number, val: number) {
    const rect = destino.getBoundingClientRect();
    const nh = acotar01((clientX - rect.left) / rect.width) * 360;
    const [rr, gg, bb] = hsvARgb(nh, sat || 1, val || 1);
    onChange(rgbAHex(rr, gg, bb));
  }

  const colorTono = `hsl(${h.toFixed(0)}, 100%, 50%)`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div
        ref={cajaRef}
        onMouseDown={(e) => {
          arrastreRef.current = true;
          fijarDesdeCaja(e.clientX, e.clientY, h);
        }}
        style={{
          position: 'relative',
          width: '100%',
          height: 130,
          background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${colorTono})`,
          borderRadius: VD.radius.md,
          border: `1px solid ${VD.border}`,
          cursor: 'crosshair',
          userSelect: 'none',
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
        onMouseDown={(e) => {
          const destino = e.currentTarget;
          alCambiarTono(e.clientX, destino, s, v);
          const alMover = (ev: MouseEvent) => alCambiarTono(ev.clientX, destino, s, v);
          const alSoltar = () => {
            window.removeEventListener('mousemove', alMover);
            window.removeEventListener('mouseup', alSoltar);
          };
          window.addEventListener('mousemove', alMover);
          window.addEventListener('mouseup', alSoltar);
        }}
        style={{
          position: 'relative',
          width: '100%',
          height: 14,
          background:
            'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)',
          borderRadius: VD.radius.md,
          border: `1px solid ${VD.border}`,
          cursor: 'pointer',
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
    </div>
  );
}
