import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTheme } from '../../utils/theme';
import { playSound } from '../../utils/sound';
import { DotGlyphIcon } from './DotGlyphIcon';
import type { ButtonConfig, SliderWidgetConfig, SoundProfileId } from '../../types';

export interface DotContinuousSliderProps {
  button: ButtonConfig;
  sliderConfig?: SliderWidgetConfig;
  accent: string;
  deckState?: Record<string, string>;
  onStateUpdate?: (k: string, v: string) => void;
  soundEnabled?: boolean;
  soundProfile?: SoundProfileId;
  toggled?: boolean;
}

/**
 * Widget táctil continuo de barra / fader estilo DOT / 480 OLED Micro Interface.
 * Soporta arrastre continuo táctil (Surface Pro, tablets, pantallas táctiles) y ratón,
 * con control nativo de volumen del sistema, brillo de pantalla o variables de estado.
 */
export function DotContinuousSlider({
  sliderConfig,
  accent,
  deckState,
  onStateUpdate,
  soundEnabled = false,
  soundProfile = 'click',
}: DotContinuousSliderProps) {
  const VD = useTheme();
  const cfg = sliderConfig ?? { target: 'volume' };
  const target = cfg.target ?? 'volume';
  const orientation = cfg.orientation ?? 'horizontal';
  const min = cfg.min ?? 0;
  const max = cfg.max ?? 100;
  const step = cfg.step ?? (target === 'variable' ? 1 : 5);
  const showValue = cfg.showValue !== false;

  // Estado local para respuesta inmediata (0ms latencia táctil)
  const [value, setValue] = useState<number>(() => {
    if (target === 'variable' && cfg.varName) {
      const parsed = parseFloat(deckState?.[cfg.varName] ?? '0');
      return isNaN(parsed) ? 0 : Math.max(min, Math.min(max, parsed));
    }
    return 50;
  });

  const [isDragging, setIsDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const lastDispatchedRef = useRef<number>(value);
  const latestTargetValRef = useRef<number>(value);
  const throttleTimerRef = useRef<number | null>(null);
  const startPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasDraggedRef = useRef(false);

  // Sincronización inicial y al cambiar foco
  const sincronizar = useCallback(async () => {
    if (typeof window === 'undefined' || !window.electronAPI) return;
    if (target === 'volume') {
      const vol = await window.electronAPI.launch?.getVolume?.();
      if (typeof vol === 'number' && !isNaN(vol)) {
        const clamped = Math.max(min, Math.min(max, vol));
        setValue(clamped);
        lastDispatchedRef.current = clamped;
        latestTargetValRef.current = clamped;
      }
    } else if (target === 'brightness') {
      const bri = await window.electronAPI.launch?.getBrightness?.();
      if (typeof bri === 'number' && !isNaN(bri)) {
        const clamped = Math.max(min, Math.min(max, bri));
        setValue(clamped);
        lastDispatchedRef.current = clamped;
        latestTargetValRef.current = clamped;
      }
    }
  }, [target, min, max]);

  useEffect(() => {
    if (target === 'variable') {
      if (cfg.varName && deckState) {
        const parsed = parseFloat(deckState[cfg.varName] ?? '0');
        if (!isNaN(parsed)) {
          const clamped = Math.max(min, Math.min(max, parsed));
          setValue(clamped);
          latestTargetValRef.current = clamped;
        }
      }
      return;
    }
    sincronizar();
    window.addEventListener('focus', sincronizar);
    return () => window.removeEventListener('focus', sincronizar);
  }, [target, cfg.varName, deckState, sincronizar, min, max]);

  // Despacho de valor a API / estado (con throttling ~40ms para no saturar Win32/DDC)
  const despachar = useCallback((nuevoVal: number, forzar = false) => {
    latestTargetValRef.current = nuevoVal;

    const ejecutarIpc = (val: number) => {
      lastDispatchedRef.current = val;
      if (target === 'volume') {
        window.electronAPI?.launch?.setVolume?.(Math.round(val)).catch(() => {});
      } else if (target === 'brightness') {
        window.electronAPI?.launch?.brightness?.(Math.round(val)).catch(() => {});
      } else if (target === 'variable' && cfg.varName) {
        onStateUpdate?.(cfg.varName, String(Math.round(val)));
      }
    };

    if (forzar) {
      if (throttleTimerRef.current !== null) {
        window.clearTimeout(throttleTimerRef.current);
        throttleTimerRef.current = null;
      }
      ejecutarIpc(nuevoVal);
      return;
    }

    if (throttleTimerRef.current === null) {
      throttleTimerRef.current = window.setTimeout(() => {
        throttleTimerRef.current = null;
        if (latestTargetValRef.current !== lastDispatchedRef.current) {
          ejecutarIpc(latestTargetValRef.current);
        }
      }, 40);
    }
  }, [target, cfg.varName, onStateUpdate]);

  // Cálculo de ratio y valor según evento de puntero
  const calcularValor = useCallback((clientX: number, clientY: number): number => {
    if (!trackRef.current) return latestTargetValRef.current;
    const rect = trackRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return latestTargetValRef.current;
    const ratio = orientation === 'vertical'
      ? (rect.bottom - clientY) / rect.height
      : (clientX - rect.left) / rect.width;
    const clampRatio = Math.max(0, Math.min(1, ratio));
    const raw = min + clampRatio * (max - min);
    const stepped = Math.round(raw / step) * step;
    return Math.max(min, Math.min(max, stepped));
  }, [orientation, min, max, step]);

  // Manejo de eventos de puntero (ratón y toque)
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch {}
    setIsDragging(true);
    startPosRef.current = { x: e.clientX, y: e.clientY };
    hasDraggedRef.current = false;
    const v = calcularValor(e.clientX, e.clientY);
    setValue(v);
    despachar(v);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.stopPropagation();
    const dist = Math.hypot(e.clientX - startPosRef.current.x, e.clientY - startPosRef.current.y);
    if (dist > 6) {
      hasDraggedRef.current = true;
    }
    const v = calcularValor(e.clientX, e.clientY);
    setValue(v);
    despachar(v);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.stopPropagation();
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
    setIsDragging(false);

    // Si fue un toque estático (sin deslizar), reproducir el sonido de clic configurado
    if (!hasDraggedRef.current && soundEnabled) {
      playSound(soundProfile ?? 'click');
    }

    const v = calcularValor(e.clientX, e.clientY);
    setValue(v);
    despachar(v, true);
  };

  const onPointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.stopPropagation();
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
    setIsDragging(false);
    despachar(latestTargetValRef.current, true);
  };

  const onWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    const dir = e.deltaY < 0 ? 1 : -1;
    const next = Math.max(min, Math.min(max, Math.round((value + dir * step) / step) * step));
    setValue(next);
    despachar(next, true);
  };

  const ratio = Math.max(0, Math.min(1, (value - min) / (max - min || 1)));
  const numSegments = orientation === 'vertical' ? 12 : 16;
  const activeSegments = Math.round(ratio * numSegments);

  // Icono y etiqueta técnica
  const glyph = target === 'brightness' ? 'SUN' : target === 'variable' ? 'CODE' : 'VOLUME';
  const displayLabel = cfg.label || (target === 'brightness' ? 'BRILLO' : target === 'variable' ? (cfg.varName || 'VAR') : 'VOLUMEN');

  return (
    <div
      data-widget="slider"
      data-target={target}
      onWheel={onWheel}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      style={{
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        padding: '5px 6px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        userSelect: 'none',
        touchAction: 'none',
      }}
    >
      {/* Cabecera técnica */}
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

      {/* Pista interactiva de puntos (Track) */}
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
                    ? (isLeading ? '#ffffff' : accent)
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
                      ? (isLeading ? '#ffffff' : accent)
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

      {/* Marcas de escala y calibración */}
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
    </div>
  );
}
