import type { RefObject, PointerEvent as EventoPuntero } from 'react';
import { useTheme } from '../../utils/theme';
import { DotGlyphIcon } from './DotGlyphIcon';
import type { SliderWidgetConfig } from '../../types';

type ManejadorPuntero = (e: EventoPuntero<HTMLDivElement>) => void;

export interface PropsCabeceraSlider {
  target: SliderWidgetConfig['target'];
  etiqueta?: string;
  varName?: string;
  value: number;
  showValue: boolean;
  isDragging: boolean;
  accent: string;
  colorPropio?: string;
}

export function CabeceraSlider({ target, etiqueta, varName, value, showValue, isDragging, accent, colorPropio }: PropsCabeceraSlider) {
  const VD = useTheme();
  const glyph = target === 'brightness' ? 'SUN' : target === 'variable' ? 'CODE' : 'VOLUME';
  const displayLabel = etiqueta || (target === 'brightness' ? 'BRILLO' : target === 'variable' ? (varName || 'VAR') : 'VOLUMEN');
  const colorTexto = colorPropio ?? VD.text;
  const colorAtenuado = colorPropio ? `color-mix(in srgb, ${colorPropio} 65%, transparent)` : VD.textMuted;
  const colorDim = colorPropio ? `color-mix(in srgb, ${colorPropio} 45%, transparent)` : VD.textDim;
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
      pointerEvents: 'none',
      gap: 4,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0, overflow: 'hidden' }}>
        <DotGlyphIcon glyph={glyph} size={8} color={isDragging ? accent : colorAtenuado} />
        <span style={{
          fontFamily: VD.mono,
          fontSize: 7.5,
          fontWeight: 700,
          letterSpacing: 0.5,
          color: isDragging ? colorTexto : colorDim,
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {displayLabel}
        </span>
      </div>

      {showValue && (
        <span style={{
          fontFamily: VD.mono,
          fontSize: 8,
          fontWeight: 700,
          letterSpacing: 0.5,
          color: isDragging ? accent : colorTexto,
          background: isDragging ? `${accent}18` : 'transparent',
          padding: '1px 3px',
          borderRadius: VD.radius.sm,
        }}>
          {Math.round(value)}{target === 'variable' ? '' : '%'}
        </span>
      )}
    </div>
  );
}

export interface PropsPistaSlider {
  value: number;
  min: number;
  max: number;
  orientation: 'horizontal' | 'vertical';
  accent: string;
  isDragging: boolean;
  trackRef: RefObject<HTMLDivElement>;
  onPointerDown: ManejadorPuntero;
  onPointerMove: ManejadorPuntero;
  onPointerUp: ManejadorPuntero;
  onPointerCancel: ManejadorPuntero;
  colorPropio?: string;
}

export function PistaSlider({ value, min, max, orientation, accent, isDragging, trackRef, onPointerDown, onPointerMove, onPointerUp, onPointerCancel, colorPropio }: PropsPistaSlider) {
  const VD = useTheme();
  const ratio = Math.max(0, Math.min(1, (value - min) / (max - min || 1)));
  const vertical = orientation === 'vertical';
  const numSegments = vertical ? 12 : 16;
  const activeSegments = Math.round(ratio * numSegments);
  const colorTexto = colorPropio ?? VD.text;
  const colorIdle = colorPropio ? `color-mix(in srgb, ${colorPropio} 25%, transparent)` : VD.dotIdle;
  return (
    <div
      ref={trackRef}
      data-slider-track="true"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      style={{
        flex: 1,
        width: '100%',
        display: 'flex',
        flexDirection: vertical ? 'column-reverse' : 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        padding: '4px 0',
        cursor: vertical ? 'ns-resize' : 'ew-resize',
        touchAction: 'none',
      }}
    >
      {Array.from({ length: numSegments }, (_, i) => {
        const isActive = i < activeSegments;
        const isLeading = i === activeSegments - 1;
        return (
          <div
            key={i}
            style={{
              flex: 1,
              width: vertical ? 18 : undefined,
              height: vertical ? undefined : 18,
              display: 'flex',
              flexDirection: vertical ? 'row' : 'column',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: vertical ? '0 1px' : '1px 0',
              borderRadius: 1,
              pointerEvents: 'none',
            }}
          >
            {[0, 1, 2].map((dotIdx) => (
              <div
                key={dotIdx}
                style={{
                  width: 2.5,
                  height: 2.5,
                  borderRadius: '50%',
                  background: isActive
                    ? (isLeading ? colorTexto : accent)
                    : colorIdle,
                  boxShadow: isActive && isDragging ? `0 0 2px ${accent}` : 'none',
                  transition: 'background 0.06s ease',
                  pointerEvents: 'none',
                }}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

export function EscalaSlider({ max, orientation = 'horizontal', colorPropio }: { max: number; orientation?: 'horizontal' | 'vertical'; colorPropio?: string }) {
  const VD = useTheme();
  const vertical = orientation === 'vertical';
  const marcas = vertical ? [max, 50, 0] : [0, 50, max];
  const colorAtenuado = colorPropio ? `color-mix(in srgb, ${colorPropio} 65%, transparent)` : VD.textMuted;
  return (
    <div style={{
      display: 'flex',
      flexDirection: vertical ? 'column' : 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: vertical ? undefined : '100%',
      height: vertical ? '100%' : undefined,
      fontFamily: VD.mono,
      fontSize: 6,
      color: colorAtenuado,
      letterSpacing: 0.5,
      pointerEvents: 'none',
      lineHeight: 1,
    }}>
      {marcas.map((m, i) => (
        <span key={m}>{!vertical && i === 1 ? `• ${m} •` : m}</span>
      ))}
    </div>
  );
}
