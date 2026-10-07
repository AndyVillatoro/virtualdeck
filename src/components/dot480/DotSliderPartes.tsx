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
}

export function CabeceraSlider({ target, etiqueta, varName, value, showValue, isDragging, accent }: PropsCabeceraSlider) {
  const VD = useTheme();
  const glyph = target === 'brightness' ? 'SUN' : target === 'variable' ? 'CODE' : 'VOLUME';
  const displayLabel = etiqueta || (target === 'brightness' ? 'BRILLO' : target === 'variable' ? (varName || 'VAR') : 'VOLUMEN');
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
        <DotGlyphIcon glyph={glyph} size={8} color={isDragging ? accent : VD.textMuted} />
        <span style={{
          fontFamily: VD.mono,
          fontSize: 7.5,
          fontWeight: 700,
          letterSpacing: 0.5,
          color: isDragging ? VD.text : VD.textDim,
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
          color: isDragging ? accent : VD.text,
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
}

export function PistaSlider({ value, min, max, orientation, accent, isDragging, trackRef, onPointerDown, onPointerMove, onPointerUp, onPointerCancel }: PropsPistaSlider) {
  const VD = useTheme();
  const ratio = Math.max(0, Math.min(1, (value - min) / (max - min || 1)));
  const numSegments = orientation === 'vertical' ? 12 : 16;
  const activeSegments = Math.round(ratio * numSegments);
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
        flexDirection: orientation === 'vertical' ? 'column-reverse' : 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: orientation === 'vertical' ? 2 : 2,
        padding: '4px 0',
        cursor: orientation === 'vertical' ? 'ns-resize' : 'ew-resize',
        touchAction: 'none',
      }}
    >
      {Array.from({ length: numSegments }, (_, i) => {
        const isActive = i < activeSegments;
        const isLeading = i === activeSegments - 1;

        if (orientation === 'vertical') {
          return (
            <div
              key={i}
              style={{
                width: '100%',
                height: 3,
                borderRadius: 1,
                background: isActive
                  ? (isLeading ? VD.text : accent)
                  : 'rgba(255, 255, 255, 0.08)',
                boxShadow: isActive && isDragging ? `0 0 4px ${accent}` : 'none',
                transition: 'background 0.06s ease',
                pointerEvents: 'none',
              }}
            />
          );
        }

        // Orientación Horizontal: Columnas de 3 micro-puntos LED discretos
        return (
          <div
            key={i}
            style={{
              flex: 1,
              height: 18,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1px 0',
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
                    ? (isLeading ? VD.text : accent)
                    : 'rgba(255, 255, 255, 0.08)',
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

export function EscalaSlider({ max }: { max: number }) {
  const VD = useTheme();
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      width: '100%',
      fontFamily: VD.mono,
      fontSize: 6,
      color: VD.textMuted,
      letterSpacing: 0.5,
      pointerEvents: 'none',
      lineHeight: 1,
    }}>
      <span>0</span>
      <span>•</span>
      <span>50</span>
      <span>•</span>
      <span>{max}</span>
    </div>
  );
}
