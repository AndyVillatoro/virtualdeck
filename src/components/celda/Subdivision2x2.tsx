import React, { memo, useCallback, useRef, useState } from 'react';
import { useTheme } from '../../utils/theme';
import { DotGlyphIcon } from '../dot480/DotGlyphIcon';
import { DotRadialSweep } from '../dot480/DotRadialSweep';
import { playSound } from '../../utils/sound';
import type { ButtonConfig, SubButtonConfig, SoundProfileId } from '../../types';

export interface Subdivision2x2Props {
  subButtons: SubButtonConfig[];
  parentButton: ButtonConfig;
  accent: string;
  subToggled?: boolean[];
  soundEnabled?: boolean;
  soundProfile?: SoundProfileId;
  onExecute: (target?: ButtonConfig) => void;
  onLongPress?: (target?: ButtonConfig) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

const MS_DESTELLO = 420;
const MS_LARGA = 500;

export const Subdivision2x2 = memo(function Subdivision2x2({
  subButtons,
  parentButton,
  accent,
  subToggled = [false, false, false, false],
  soundEnabled = false,
  soundProfile = 'click',
  onExecute,
  onLongPress,
  onContextMenu,
}: Subdivision2x2Props) {
  const VD = useTheme();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [flashIdx, setFlashIdx] = useState<number | null>(null);
  const timerLarga = useRef<number | null>(null);
  const yaDisparoLarga = useRef(false);
  const ultimoDisparo = useRef(0);

  const ejecutarCuadrante = useCallback((sub: SubButtonConfig, idx: number, e?: React.SyntheticEvent) => {
    if (e) e.stopPropagation();
    const ahora = Date.now();
    if (ahora - ultimoDisparo.current < 250) return;
    ultimoDisparo.current = ahora;

    if (yaDisparoLarga.current) {
      yaDisparoLarga.current = false;
      return;
    }

    setFlashIdx(idx);
    setTimeout(() => setFlashIdx(null), MS_DESTELLO);

    if (soundEnabled) playSound(soundProfile);

    const syntheticBtn: ButtonConfig = {
      id: sub.id,
      page: parentButton.page,
      label: sub.label || '',
      sublabel: sub.sublabel,
      icon: sub.icon,
      bgColor: sub.bgColor,
      fgColor: sub.fgColor,
      action: sub.action,
      actions: sub.actions,
      isToggle: sub.isToggle,
      actionToggleOff: sub.actionToggleOff,
      longPressAction: sub.longPressAction,
    };

    onExecute(syntheticBtn);
  }, [parentButton.page, soundEnabled, soundProfile, onExecute]);

  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const touchCancelado = useRef(false);

  const alIniciarToque = useCallback((sub: SubButtonConfig, idx: number, e: React.TouchEvent) => {
    e.stopPropagation();
    if (e.touches.length !== 1) return;
    touchCancelado.current = false;
    touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    setHoveredIdx(idx);
    yaDisparoLarga.current = false;

    if (sub.longPressAction && sub.longPressAction.type !== 'none' && onLongPress) {
      timerLarga.current = window.setTimeout(() => {
        yaDisparoLarga.current = true;
        setFlashIdx(idx);
        setTimeout(() => setFlashIdx(null), MS_DESTELLO);
        if (soundEnabled) playSound(soundProfile);
        const syntheticBtn: ButtonConfig = {
          id: sub.id,
          page: parentButton.page,
          label: sub.label || '',
          action: sub.action,
          longPressAction: sub.longPressAction,
        };
        onLongPress(syntheticBtn);
      }, MS_LARGA);
    }
  }, [parentButton.page, soundEnabled, soundProfile, onLongPress]);

  const alMoverToque = useCallback((e: React.TouchEvent) => {
    if (!touchStartPos.current || touchCancelado.current) return;
    const dx = Math.abs(e.touches[0].clientX - touchStartPos.current.x);
    const dy = Math.abs(e.touches[0].clientY - touchStartPos.current.y);
    if (dx > 12 || dy > 12) {
      touchCancelado.current = true;
      setHoveredIdx(null);
      if (timerLarga.current !== null) {
        clearTimeout(timerLarga.current);
        timerLarga.current = null;
      }
    }
  }, []);

  const alFinalizarToque = useCallback((sub: SubButtonConfig, idx: number, e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setHoveredIdx(null);
    if (timerLarga.current !== null) {
      clearTimeout(timerLarga.current);
      timerLarga.current = null;
    }
    if (touchCancelado.current) {
      touchCancelado.current = false;
      return;
    }
    if (yaDisparoLarga.current) {
      yaDisparoLarga.current = false;
      return;
    }
    ejecutarCuadrante(sub, idx, e);
  }, [ejecutarCuadrante]);

  const alCancelarToque = useCallback(() => {
    setHoveredIdx(null);
    touchCancelado.current = false;
    touchStartPos.current = null;
    if (timerLarga.current !== null) {
      clearTimeout(timerLarga.current);
      timerLarga.current = null;
    }
  }, []);

  const alBajar = useCallback((sub: SubButtonConfig, e: React.MouseEvent) => {
    e.stopPropagation();
    yaDisparoLarga.current = false;
    if (!sub.longPressAction || sub.longPressAction.type === 'none' || !onLongPress) return;

    timerLarga.current = window.setTimeout(() => {
      yaDisparoLarga.current = true;
      if (soundEnabled) playSound(soundProfile);
      const syntheticBtn: ButtonConfig = {
        id: sub.id,
        page: parentButton.page,
        label: sub.label || '',
        action: sub.action,
        longPressAction: sub.longPressAction,
      };
      onLongPress(syntheticBtn);
    }, MS_LARGA);
  }, [parentButton.page, soundEnabled, soundProfile, onLongPress]);

  const alSubirOSalir = useCallback(() => {
    if (timerLarga.current !== null) {
      clearTimeout(timerLarga.current);
      timerLarga.current = null;
    }
  }, []);

  // Asegurar siempre 4 cuadrantes (TL, TR, BL, BR)
  const cuadrantes: SubButtonConfig[] = Array.from({ length: 4 }, (_, i) => {
    return subButtons[i] || {
      id: `${parentButton.id}-q${i}`,
      label: '',
      action: { type: 'none' },
    };
  });

  return (
    <div
      draggable={false}
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '1fr 1fr',
        gap: 2,
        width: '100%',
        height: '100%',
        padding: 3,
        boxSizing: 'border-box',
        background: '#070809',
        borderRadius: VD.radius.lg,
        overflow: 'hidden',
        touchAction: 'none',
      }}
      onContextMenu={onContextMenu}
    >
      {cuadrantes.map((sub, idx) => {
        const isToggled = !!subToggled[idx];
        const isHovered = hoveredIdx === idx;
        const isFlashing = flashIdx === idx;

        // Color de fondo del cuadrante
        const quadBg = isFlashing
          ? `${accent}33`
          : isToggled
            ? (sub.bgColor ? sub.bgColor : `${accent}22`)
            : isHovered
              ? (sub.bgColor ? `${sub.bgColor}dd` : 'rgba(255, 255, 255, 0.08)')
              : (sub.bgColor || '#111315');

        const quadBorder = isToggled
          ? `1px solid ${accent}`
          : isHovered
            ? '1px solid rgba(255, 255, 255, 0.22)'
            : '1px solid rgba(255, 255, 255, 0.07)';

        const glyphName = (sub.dotGlyph || sub.icon || '').toUpperCase();
        const displayColor = isToggled
          ? accent
          : (sub.fgColor || (isHovered ? VD.text : VD.textDim));

        return (
          <div
            key={sub.id || `${parentButton.id}-q${idx}`}
            draggable={false}
            style={{
              position: 'relative',
              background: quadBg,
              border: quadBorder,
              borderRadius: VD.radius.sm,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              padding: '2px 4px',
              cursor: 'pointer',
              userSelect: 'none',
              overflow: 'hidden',
              minWidth: 0,
              minHeight: 0,
              touchAction: 'manipulation',
              transition: 'background 0.12s ease, border-color 0.12s ease',
            }}
            onTouchStart={(e) => alIniciarToque(sub, idx, e)}
            onTouchMove={alMoverToque}
            onTouchEnd={(e) => alFinalizarToque(sub, idx, e)}
            onTouchCancel={alCancelarToque}
            onClick={(e) => ejecutarCuadrante(sub, idx, e)}
            onMouseDown={(e) => alBajar(sub, e)}
            onMouseUp={alSubirOSalir}
            onMouseEnter={() => setHoveredIdx(idx)}
            onMouseLeave={() => {
              setHoveredIdx(null);
              alSubirOSalir();
            }}
          >
            {/* 5.3 — Barrido de matriz de puntos compacto al pulsar */}
            {isFlashing && <DotRadialSweep accent={accent} compact />}

            {/* Indicador LED de Toggle ON (micro-dot de acento en esquina) */}
            {isToggled && (
              <span
                style={{
                  position: 'absolute',
                  top: 3,
                  right: 3,
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  background: accent,
                  boxShadow: `0 0 5px ${accent}`,
                }}
              />
            )}

            {/* Glifo dot-matrix */}
            {glyphName ? (
              <DotGlyphIcon
                glyph={glyphName}
                size={14}
                color={displayColor}
                showRecessed={!isToggled}
              />
            ) : (
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: displayColor, opacity: 0.3 }} />
            )}

            {sub.label ? (
              <span
                style={{
                  fontFamily: VD.mono,
                  fontSize: 8,
                  fontWeight: 600,
                  letterSpacing: '0.5px',
                  color: displayColor,
                  textTransform: 'uppercase',
                  maxWidth: '100%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  lineHeight: 1,
                }}
              >
                {sub.label}
              </span>
            ) : null}

            {sub.sublabel ? (
              <span
                style={{
                  fontFamily: VD.mono,
                  fontSize: 6.5,
                  letterSpacing: '0.4px',
                  color: isToggled ? `${accent}cc` : VD.textDim,
                  textTransform: 'uppercase',
                  maxWidth: '100%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  lineHeight: 1,
                }}
              >
                {sub.sublabel}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
});

