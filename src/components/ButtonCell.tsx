import React, { memo, useEffect, useRef, useState } from 'react';
import { VD_ACTION_ICONS, IconNone, type VDIconProps } from './VDIcon';
import { VD } from '../design';
import { useTheme } from '../utils/theme';
import { playSound } from '../utils/sound';
import { BrandIconDisplay } from './BrandIconDisplay';
import { Glyph57View } from './Glyph57Editor';
import type { ButtonConfig, SoundProfileId } from '../types';

interface ButtonCellProps {
  button: ButtonConfig;
  accent: string;
  toggled?: boolean;
  isActive?: boolean;
  isHidden?: boolean;
  isRunning?: boolean;
  widgetData?: { line1: string; line2?: string };
  soundEnabled?: boolean;
  soundProfile?: SoundProfileId;
  /** Etiqueta con variables ya interpoladas (Feature 3). Sustituye al label del botón. */
  resolvedLabel?: string;
  onEdit: () => void;
  onExecute: () => void;
  onLongPress?: () => void;
  onDuplicate?: () => void;
  onClear?: () => void;
  onDragStart?: () => void;
  onDrop?: () => void;
}

const ACTION_ICONS: Record<string, React.ComponentType<VDIconProps>> = VD_ACTION_ICONS;

function ButtonCellInner({
  button, accent, toggled = false, isActive = false, isHidden = false, isRunning = false,
  widgetData, soundEnabled = false, soundProfile = 'click',
  resolvedLabel, onEdit, onExecute, onLongPress, onDuplicate, onClear, onDragStart, onDrop,
}: ButtonCellProps) {
  const VD = useTheme();
  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [flash, setFlash] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<number | null>(null);
  const longPressTriggered = useRef(false);
  const cellRef = useRef<HTMLDivElement>(null);
  // Callback refs: memo comparator ignores handler identity, so we keep fresh
  // copies without adding them to effect dependency arrays.
  const onLongPressRef = useRef(onLongPress);
  const onExecuteRef = useRef(onExecute);
  const soundEnabledRef = useRef(soundEnabled);
  const soundProfileRef = useRef(soundProfile);
  onLongPressRef.current = onLongPress;
  onExecuteRef.current = onExecute;
  soundEnabledRef.current = soundEnabled;
  soundProfileRef.current = soundProfile;
  const [isTouch] = useState(() => typeof window !== 'undefined' && 'ontouchstart' in window);

  if (isHidden) {
    return (
      <div style={{
        background: VD.elevated, border: `1px solid ${VD.border}`,
        borderRadius: VD.radius.lg, opacity: 0.2, pointerEvents: 'none',
      }} />
    );
  }

  const isEmpty = button.action.type === 'none' && !button.label && !button.icon && !button.imageData && !button.brandIcon;
  const hasCustomBg = !!button.bgColor;
  const hasLongPress = !isEmpty && !!onLongPress;

  // 5.3 — el pulso radial reemplaza el flash de fondo plano. La celda mantiene
  // su bg estable durante la ejecución; la "ondita" se renderiza encima como overlay.
  const bg = toggled
    ? VD.accentBg
    : dragOver
    ? VD.accentBg
    : hasCustomBg
    ? button.bgColor!
    : pressed
    ? VD.overlay
    : hovered && !isEmpty
    ? VD.elevatedHover
    : VD.elevated;

  const borderColor = flash || dragOver
    ? accent
    : toggled
    ? accent
    : hasCustomBg
    ? 'transparent'
    : pressed
    ? accent
    : hovered
    ? VD.borderStrong
    : VD.border;

  const displayLabel = resolvedLabel ?? (button.label || (button.action.type !== 'none' ? button.action.type.replace(/-/g, ' ').toUpperCase() : ''));
  const ActionIcon = ACTION_ICONS[button.action.type] ?? IconNone;
  const iconColor = isEmpty ? VD.textMuted : (button.fgColor || (toggled ? accent : VD.text));
  const multiCount = button.actions && button.actions.length > 1 ? button.actions.length : 0;

  function handleMouseDown() {
    setPressed(true);
    longPressTriggered.current = false;
    if (onLongPress && !isEmpty) {
      longPressTimer.current = window.setTimeout(() => {
        longPressTriggered.current = true;
        longPressTimer.current = null;
        setPressed(false);
        setFlash(true);
        setTimeout(() => setFlash(false), 300);
        if (soundEnabled) playSound(soundProfile);
        onLongPress();
      }, 500);
    }
  }

  function handleMouseUpOrLeave() {
    setPressed(false);
    if (longPressTimer.current !== null) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  function handleClick() {
    if (longPressTriggered.current) { longPressTriggered.current = false; return; }
    if (isEmpty) { onEdit(); return; }
    setFlash(true);
    setTimeout(() => setFlash(false), 300);
    if (soundEnabled) playSound(soundProfile);
    onExecute();
  }

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    // Long press already fired → suppress the contextmenu the browser generates
    // right after (timing varies by browser/OS but typically ~500 ms on touch).
    if (longPressTriggered.current) { longPressTriggered.current = false; return; }
    setContextMenu({ x: e.clientX, y: e.clientY });
  }

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [contextMenu]);

  // Non-passive touchstart listener: blocks the browser's native long-press
  // contextmenu when an alternate action is configured. React's synthetic
  // touch events are passive by default and cannot call preventDefault().
  useEffect(() => {
    const el = cellRef.current;
    if (!el || !hasLongPress) return;

    let timer: number | null = null;
    let fired = false;
    let lastTap = 0;

    const start = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      e.preventDefault(); // blocks native contextmenu + text selection on hold
      fired = false;
      setPressed(true);
      longPressTriggered.current = false;
      timer = window.setTimeout(() => {
        fired = true;
        timer = null;
        longPressTriggered.current = true;
        setPressed(false);
        setFlash(true);
        setTimeout(() => setFlash(false), 300);
        if (soundEnabledRef.current) playSound(soundProfileRef.current);
        onLongPressRef.current?.();
      }, 500);
    };

    const end = (e: TouchEvent) => {
      e.preventDefault();
      setPressed(false);
      if (timer !== null) { clearTimeout(timer); timer = null; }
      if (!fired) {
        const now = Date.now();
        if (now - lastTap < 320) {
          // Double-tap → alternate action
          lastTap = 0;
          setFlash(true);
          setTimeout(() => setFlash(false), 300);
          if (soundEnabledRef.current) playSound(soundProfileRef.current);
          onLongPressRef.current?.();
        } else {
          // Single tap → main action
          lastTap = now;
          setFlash(true);
          setTimeout(() => setFlash(false), 300);
          if (soundEnabledRef.current) playSound(soundProfileRef.current);
          onExecuteRef.current?.();
        }
      }
      fired = false;
    };

    const cancel = () => {
      setPressed(false);
      if (timer !== null) { clearTimeout(timer); timer = null; }
      fired = false;
    };

    el.addEventListener('touchstart', start, { passive: false });
    el.addEventListener('touchend', end, { passive: false });
    el.addEventListener('touchcancel', cancel);
    return () => {
      el.removeEventListener('touchstart', start);
      el.removeEventListener('touchend', end);
      el.removeEventListener('touchcancel', cancel);
      if (timer !== null) clearTimeout(timer);
    };
  }, [hasLongPress]);

  return (
    <>
      <div
        ref={cellRef}
        className="vd-btn"
        title={isEmpty ? 'Clic para configurar · Clic derecho para más opciones' : `${displayLabel} — clic para ejecutar`}
        draggable={!isEmpty}
        onClick={handleClick}
        onDoubleClick={() => {
          if (!hasLongPress) return;
          setFlash(true);
          setTimeout(() => setFlash(false), 300);
          if (soundEnabled) playSound(soundProfile);
          onLongPress!();
        }}
        onContextMenu={handleContextMenu}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUpOrLeave}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); handleMouseUpOrLeave(); }}
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = 'move';
          onDragStart?.();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          onDrop?.();
        }}
        style={{
          background: bg,
          border: `1px solid ${borderColor}`,
          borderRadius: VD.radius.lg,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          userSelect: 'none',
          position: 'relative',
          overflow: 'hidden',
          transition: 'background 0.1s, border-color 0.1s',
          minHeight: 0,
          gap: 6,
        }}
      >
        {/* Active state: thin green bar at top when external state matches (process running, device is default, etc.) */}
        {isActive && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            height: 2, background: '#4caf50',
            borderRadius: `${VD.radius.lg} ${VD.radius.lg} 0 0`,
          }} />
        )}

        {/* 5.3 — Pulso radial al ejecutar */}
        {flash && <span className="vd-flash-pulse" />}

        {/* Ejecución en curso — anillo pulsante */}
        {isRunning && <span className="vd-running-ring" />}

        {/* Brand icon as full-bleed animated background */}
        {button.brandIcon && !button.imageData && (
          <BrandIconDisplay
            iconKey={button.brandIcon}
            customBitmap={button.brandIconCustomBitmap}
            customColor={button.brandIconCustomColor}
            customPalette={button.brandIconCustomPalette}
            animated={toggled || (button.brandIconAlwaysAnimate ?? false)}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', borderRadius: VD.radius.md }}
          />
        )}

        {button.imageData && (
          <img
            src={button.imageData}
            alt=""
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }}
            draggable={false}
          />
        )}

        <div style={{ position: 'relative', textAlign: 'center', padding: '6px 4px' }}>
          {widgetData ? (
            /* Widget content — clock / weather / now-playing */
            <>
              <div style={{ fontFamily: VD.mono, fontSize: widgetData.line1.length > 8 ? 9 : 14, color: VD.text, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 84 }}>
                {widgetData.line1}
              </div>
              {widgetData.line2 && (
                <div style={{ fontFamily: VD.mono, fontSize: 7, color: VD.textMuted, marginTop: 3, letterSpacing: 0.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 84 }}>
                  {widgetData.line2}
                </div>
              )}
            </>
          ) : (
            <>
              {/* 2.1 — Glifo 5×7 personalizado (prioridad sobre íconos por defecto) */}
              {!button.imageData && !button.brandIcon && button.customGlyph57 && button.customGlyph57.length === 7 && (
                <div style={{ marginBottom: displayLabel ? 6 : 0, display: 'flex', justifyContent: 'center' }}>
                  <Glyph57View rows={button.customGlyph57} dotSize={4} gap={1} color={iconColor} />
                </div>
              )}
              {/* Show center icon only when: no brand icon, no custom glyph (or has explicit emoji override) */}
              {!button.imageData && !button.brandIcon && !button.customGlyph57 && (
                button.icon ? (
                  <div style={{ fontSize: isEmpty ? 20 : 24, color: iconColor, lineHeight: 1, marginBottom: displayLabel ? 6 : 0 }}>
                    {button.icon}
                  </div>
                ) : (
                  <div style={{ marginBottom: displayLabel ? 6 : 0, display: 'flex', justifyContent: 'center' }}>
                    <ActionIcon size={isEmpty ? 20 : 24} color={iconColor} />
                  </div>
                )
              )}
              {/* When brand icon is set but user also typed an emoji, show emoji on top */}
              {button.brandIcon && button.icon && (
                <div style={{ fontSize: isEmpty ? 20 : 24, color: 'rgba(255,255,255,0.9)', lineHeight: 1, marginBottom: displayLabel ? 6 : 0, textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
                  {button.icon}
                </div>
              )}
              {displayLabel && (
                <div style={{
                  fontFamily: VD.mono,
                  fontSize: 9,
                  letterSpacing: 1,
                  color: (button.imageData || button.brandIcon)
                    ? 'rgba(255,255,255,0.9)'
                    : (button.fgColor || (toggled ? accent : VD.textDim)),
                  textShadow: (button.imageData || button.brandIcon) ? '0 1px 3px rgba(0,0,0,0.8)' : 'none',
                  textTransform: 'uppercase',
                  lineHeight: 1.2,
                  maxWidth: 80,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {displayLabel}
                </div>
              )}
            </>
          )}
        </div>

        {/* Edit icon on hover */}
        {!isEmpty && (hovered || isTouch) && (
          <div
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            title="Editar botón"
            style={{
              position: 'absolute', top: 4, right: 4,
              width: 20, height: 20,
              background: 'rgba(0,0,0,0.75)',
              border: `1px solid ${VD.borderStrong}`,
              borderRadius: VD.radius.md,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, color: VD.textDim, zIndex: 2, lineHeight: 1,
            }}
          >
            ✎
          </div>
        )}

        {/* Multi-action badge */}
        {multiCount > 1 && !hovered && (
          <div style={{
            position: 'absolute', top: 4, left: 4,
            background: 'rgba(0,0,0,0.7)', borderRadius: VD.radius.sm,
            fontFamily: VD.mono, fontSize: 7, color: accent,
            padding: '1px 4px', lineHeight: 1.4,
          }}>
            ×{multiCount}
          </div>
        )}

        {/* Toggle indicator */}
        {button.isToggle && !hovered && (
          <div style={{
            position: 'absolute', top: 4, left: multiCount > 1 ? 28 : 4,
            width: 6, height: 6, borderRadius: 3,
            background: toggled ? accent : VD.textMuted,
            opacity: 0.8,
          }} />
        )}

        {/* Folder indicator */}
        {button.action.type === 'folder' && !hovered && (
          <div style={{
            position: 'absolute', bottom: 4, left: 4,
            fontFamily: VD.mono, fontSize: 7,
            color: accent, opacity: 0.7,
          }}>
            {(button.action.folderButtons?.length ?? 0)}
          </div>
        )}

        {/* Configured indicator dot */}
        {!isEmpty && (
          <div style={{
            position: 'absolute', bottom: 4, right: 4,
            width: 5, height: 5, borderRadius: 3,
            background: accent,
            opacity: hovered ? 0 : 0.7,
            transition: 'opacity 0.15s',
          }} />
        )}
      </div>

      {/* Right-click context menu */}
      {contextMenu && (
        <div
          ref={menuRef}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            zIndex: 9999,
            background: VD.surface,
            border: `1px solid ${VD.borderStrong}`,
            borderRadius: VD.radius.lg,
            overflow: 'hidden',
            boxShadow: VD.shadow.menu,
            minWidth: 150,
          }}
        >
          <ContextItem label="Editar" icon="✎" onClick={() => { setContextMenu(null); onEdit(); }} />
          {!isEmpty && onDuplicate && (
            <ContextItem label="Duplicar" icon="⊕" onClick={() => { setContextMenu(null); onDuplicate(); }} />
          )}
          {!isEmpty && onClear && (
            <ContextItem label="Limpiar botón" icon="○" onClick={() => { setContextMenu(null); onClear(); }} danger />
          )}
        </div>
      )}
    </>
  );
}

// Memoizado: la grilla re-renderiza al editar un solo botón. Solo redibuja
// si cambia el botón (referencia), su estado toggled, el accent o el sonido.
// Los handlers cambian de identidad por render del padre — los ignoramos a propósito.
export const ButtonCell = memo(ButtonCellInner, (prev, next) =>
  prev.button === next.button &&
  prev.toggled === next.toggled &&
  prev.isActive === next.isActive &&
  prev.isHidden === next.isHidden &&
  prev.isRunning === next.isRunning &&
  prev.accent === next.accent &&
  prev.soundEnabled === next.soundEnabled &&
  prev.soundProfile === next.soundProfile &&
  prev.resolvedLabel === next.resolvedLabel &&
  (prev.widgetData?.line1 ?? null) === (next.widgetData?.line1 ?? null) &&
  (prev.widgetData?.line2 ?? null) === (next.widgetData?.line2 ?? null),
);

function ContextItem({ label, icon, onClick, danger }: { label: string; icon: string; onClick: () => void; danger?: boolean }) {
  const VD = useTheme();
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '9px 14px',
        background: hov ? VD.elevated : 'transparent',
        cursor: 'pointer',
        fontFamily: VD.mono, fontSize: 11,
        color: danger ? VD.danger : VD.text,
        letterSpacing: 0.5,
        transition: 'background 0.1s',
        borderBottom: `1px solid ${VD.border}`,
      }}
    >
      <span style={{ fontSize: 13, opacity: 0.7 }}>{icon}</span>
      {label}
    </div>
  );
}
