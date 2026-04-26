import React, { memo, useEffect, useRef, useState } from 'react';
import { VD_ACTION_ICONS, IconNone, type VDIconProps } from './VDIcon';
import { VD } from '../design';
import { playSound } from '../utils/sound';
import { BrandIconDisplay } from './BrandIconDisplay';
import { Glyph57View } from './Glyph57Editor';
import type { ButtonConfig, SoundProfileId } from '../types';

interface ButtonCellProps {
  button: ButtonConfig;
  accent: string;
  toggled?: boolean;
  soundEnabled?: boolean;
  soundProfile?: SoundProfileId;
  onEdit: () => void;
  onExecute: () => void;
  onDuplicate?: () => void;
  onClear?: () => void;
  onDragStart?: () => void;
  onDrop?: () => void;
}

const ACTION_ICONS: Record<string, React.ComponentType<VDIconProps>> = VD_ACTION_ICONS;

function ButtonCellInner({
  button, accent, toggled = false, soundEnabled = false, soundProfile = 'click',
  onEdit, onExecute, onDuplicate, onClear, onDragStart, onDrop,
}: ButtonCellProps) {
  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [flash, setFlash] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isEmpty = button.action.type === 'none' && !button.label && !button.icon && !button.imageData && !button.brandIcon;
  const hasCustomBg = !!button.bgColor;

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

  const displayLabel = button.label || (button.action.type !== 'none' ? button.action.type.replace(/-/g, ' ').toUpperCase() : '');
  const ActionIcon = ACTION_ICONS[button.action.type] ?? IconNone;
  const iconColor = isEmpty ? VD.textMuted : (button.fgColor || (toggled ? accent : VD.text));
  const multiCount = button.actions && button.actions.length > 1 ? button.actions.length : 0;

  function handleClick() {
    if (isEmpty) { onEdit(); return; }
    setFlash(true);
    setTimeout(() => setFlash(false), 300);
    if (soundEnabled) playSound(soundProfile);
    onExecute();
  }

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [contextMenu]);

  return (
    <>
      <div
        className="vd-btn"
        title={isEmpty ? 'Clic para configurar · Clic derecho para más opciones' : `${displayLabel} — clic para ejecutar`}
        draggable={!isEmpty}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onMouseDown={() => setPressed(true)}
        onMouseUp={() => setPressed(false)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); setPressed(false); }}
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
        {/* 5.3 — Pulso radial al ejecutar */}
        {flash && <span className="vd-flash-pulse" />}

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
        </div>

        {/* Edit icon on hover */}
        {!isEmpty && hovered && (
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
  prev.accent === next.accent &&
  prev.soundEnabled === next.soundEnabled &&
  prev.soundProfile === next.soundProfile,
);

function ContextItem({ label, icon, onClick, danger }: { label: string; icon: string; onClick: () => void; danger?: boolean }) {
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
