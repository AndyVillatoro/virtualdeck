import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { VD_ACTION_ICONS, IconNone, type VDIconProps } from './VDIcon';
import { useTheme } from '../utils/theme';
import { useT } from '../utils/i18n';
import { BrandIconDisplay } from './BrandIconDisplay';
import { ContenidoCentral } from './celda/ContenidoCentral';
import { Insignias } from './celda/Insignias';
import { usePulsacionTactil, EVENTO_SOBRE, EVENTO_FUERA, EVENTO_SOLTAR } from './celda/usePulsacionTactil';
import { usePulsacionRaton } from './celda/usePulsacionRaton';
import { MenuContextual } from './celda/MenuContextual';
import { colorDeFondo, colorDeBorde } from './celda/colores';
import type { ButtonConfig, SoundProfileId } from '../types';

interface ButtonCellProps {
  button: ButtonConfig;
  accent: string;
  toggled?: boolean;
  isActive?: boolean;
  isHidden?: boolean;
  isRunning?: boolean;
  isSelected?: boolean;
  widgetData?: { line1: string; line2?: string; tone?: 'warn' | 'crit' };
  soundEnabled?: boolean;
  soundProfile?: SoundProfileId;
  /** Etiqueta con variables ya interpoladas (Feature 3). Sustituye al label del botón. */
  resolvedLabel?: string;
  onEdit: () => void;
  onExecute: () => void;
  onSelect?: () => void;
  onLongPress?: () => void;
  onDuplicate?: () => void;
  onClear?: () => void;
  onDragStart?: () => void;
  /** Recibe el id del boton arrastrado, leido del propio evento. */
  onDrop?: (sourceId: string) => void;
  /** Rueda sobre un boton de ajuste: +1 hacia arriba, -1 hacia abajo. */
  onAdjustWheel?: (signo: 1 | -1) => void;
  /** Se llama tambien si el arrastre se cancela, no solo al soltar. */
  onDragEnd?: () => void;
  /**
   * Menu de clic derecho. La barra flotante lo apaga: sus opciones (editar,
   * duplicar, vaciar) son de la grilla y ahi no significan nada.
   */
  showContextMenu?: boolean;
}

const ACTION_ICONS: Record<string, React.ComponentType<VDIconProps>> = VD_ACTION_ICONS;

function ButtonCellInner({
  button, accent, toggled = false, isActive = false, isHidden = false, isRunning = false,
  isSelected = false,
  widgetData, soundEnabled = false, soundProfile = 'click',
  resolvedLabel, onEdit, onExecute, onSelect, onLongPress, onDuplicate, onClear, onDragStart, onDrop, onDragEnd,
  onAdjustWheel,
  showContextMenu = true,
}: ButtonCellProps) {
  const VD = useTheme();
  const t = useT();
  const [hovered, setHovered] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const cellRef = useRef<HTMLDivElement>(null);
  // Callback refs: memo comparator ignores handler identity, so we keep fresh
  // copies without adding them to effect dependency arrays. Las del sonido se
  // fueron con `usePulsacionRaton`, que ahora es el unico que lo dispara.
  const onLongPressRef = useRef(onLongPress);
  const onExecuteRef = useRef(onExecute);
  const onDropRef = useRef(onDrop);
  const onAdjustWheelRef = useRef(onAdjustWheel);
  onLongPressRef.current = onLongPress;
  onExecuteRef.current = onExecute;
  onDropRef.current = onDrop;
  onAdjustWheelRef.current = onAdjustWheel;
  const [isTouch] = useState(() => typeof window !== 'undefined' && 'ontouchstart' in window);

  const isEmpty = button.action.type === 'none' && !button.label && !button.icon && !button.imageData && !button.brandIcon;

  const hasLongPress = !isEmpty && !!onLongPress;

  const raton = usePulsacionRaton({
    isEmpty, hasLongPress, soundEnabled, soundProfile,
    onEdit, onExecute, onLongPress, onSelect,
    showContextMenu,
    abrirMenu: (x, y) => setContextMenu({ x, y }),
  });
  const { pressed, flash, destellar } = raton;

  // 5.3 — el pulso radial reemplaza el flash de fondo plano. La celda mantiene
  // su bg estable durante la ejecución; la "ondita" se renderiza encima como overlay.
  const estado = { toggled, dragOver, pressed, hovered, flash, isEmpty, bgPropio: button.bgColor };
  const bg = colorDeFondo(estado, VD);
  const borderColor = colorDeBorde(estado, VD, accent);

  const displayLabel = resolvedLabel ?? (button.label || (button.action.type !== 'none' ? button.action.type.replace(/-/g, ' ').toUpperCase() : ''));
  const ActionIcon = ACTION_ICONS[button.action.type] ?? IconNone;
  const iconColor = isEmpty ? VD.textMuted : (button.fgColor || (toggled ? accent : VD.text));
  const multiCount = button.actions && button.actions.length > 1 ? button.actions.length : 0;

  useEffect(() => {
    if (!contextMenu) return;
    const cerrar = () => setContextMenu(null);
    // Tambien con el clic **derecho**: pulsando con el derecho en otra celda
    // no hay evento `click`, asi que el menu de la primera se quedaba abierto
    // encima mientras se abria el de la segunda.
    //
    // No se usa `mousedown`, que seria lo obvio: llega antes que el `click` de
    // las propias entradas del menu y se las comeria.
    document.addEventListener('click', cerrar);
    document.addEventListener('contextmenu', cerrar);
    return () => {
      document.removeEventListener('click', cerrar);
      document.removeEventListener('contextmenu', cerrar);
    };
  }, [contextMenu]);

  // Con el dedo, mantener pulsado arrastra. Solo donde eso significa algo: la
  // rejilla principal, que es la unica que sabe recolocar botones (`onDrop`).
  // En kiosko y en la barra flotante no se secuestra el toque.
  usePulsacionTactil({
    ref: cellRef,
    activo: !isEmpty && !!onDrop,
    idBoton: button.id,
    setPressed: raton.setPressed,
    destellar,
    yaDisparoRef: raton.yaDisparo,
    alPulsar: useCallback(() => onExecuteRef.current?.(), []),
  })

  // El otro extremo del arrastre tactil: esta celda como destino.
  useEffect(() => {
    const el = cellRef.current;
    if (!el) return;
    const sobre = () => setDragOver(true);
    const fuera = () => setDragOver(false);
    const soltar = (e: Event) => {
      setDragOver(false);
      onDropRef.current?.((e as CustomEvent<string>).detail);
    };
    el.addEventListener(EVENTO_SOBRE, sobre);
    el.addEventListener(EVENTO_FUERA, fuera);
    el.addEventListener(EVENTO_SOLTAR, soltar);
    return () => {
      el.removeEventListener(EVENTO_SOBRE, sobre);
      el.removeEventListener(EVENTO_FUERA, fuera);
      el.removeEventListener(EVENTO_SOLTAR, soltar);
    };
  }, []);

  // Botón oculto por visibilidad condicional: placeholder inerte. Va DESPUÉS de
  // todos los hooks (Rules of Hooks: no se pueden llamar tras un return temprano).
  if (isHidden) {
    return (
      <div style={{
        background: VD.elevated, border: `1px solid ${VD.border}`,
        borderRadius: VD.radius.lg, opacity: 0.2, pointerEvents: 'none',
      }} />
    );
  }

  return (
    <>
      <div
        ref={cellRef}
        className="vd-btn"
        title={isEmpty ? t('cell.tipEmpty') : t('cell.tipFilled', { etiqueta: displayLabel })}
        draggable={!isEmpty}
        onClick={raton.alClic}
        onContextMenu={raton.alMenuContextual}
        // La rueda solo hace algo en los botones de ajuste, y ahi ahorra tener
        // dos: arriba suma el paso, abajo lo resta.
        onWheel={button.action.type === 'adjust' ? (e) => {
          e.preventDefault();
          onAdjustWheelRef.current?.(e.deltaY < 0 ? 1 : -1);
        } : undefined}
        onMouseDown={raton.alBajar}
        onMouseUp={raton.alSubirOSalir}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); raton.alSubirOSalir(); }}
        onDragStart={(e) => {
          raton.alEmpezarArrastre();
          e.dataTransfer.effectAllowed = 'move';
          // El estandar exige adjuntar datos para que el arrastre arranque.
          // Sin esto, Chromium inicia el gesto pero no lo trata como un
          // arrastre con carga: el drop no llega y el boton nunca se mueve.
          e.dataTransfer.setData('text/plain', button.id);
          onDragStart?.();
        }}
        onDragEnd={() => {
          onDragEnd?.();
          setDragOver(false);
          raton.setPressed(false);
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
          // El id viaja dentro del propio arrastre, no en un estado de React.
          //
          // Esta celda esta memoizada y el comparador ignora los handlers a
          // proposito, asi que `onDrop` sigue siendo el que se creo antes de
          // empezar a arrastrar: si leyera el id del estado del padre, veria
          // el valor viejo (null) y el drop no haria nada. Eso es exactamente
          // lo que pasaba.
          onDrop?.(e.dataTransfer.getData('text/plain'));
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
          minWidth: 0,
          gap: 6,
          // Cells fill their grid track. The grid container itself is sized
          // (by parent) to keep tracks square — see MainB / FullscreenB.
          width: '100%',
          height: '100%',
        }}
      >
        <Insignias
          button={button}
          accent={accent}
          isEmpty={isEmpty}
          isActive={isActive}
          isSelected={isSelected}
          hovered={hovered}
          isTouch={isTouch}
          toggled={toggled}
          multiCount={multiCount}
          onEdit={onEdit}
        />

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

        {/* Center stack — icon or live widget. The label is rendered separately as a bottom banner. */}
        <div style={{
          position: 'relative', textAlign: 'center', padding: '6px 4px',
          paddingBottom: displayLabel ? 22 : 6,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <ContenidoCentral
            button={button}
            isEmpty={isEmpty}
            iconColor={iconColor}
            ActionIcon={ActionIcon}
            widgetData={widgetData}
          />
        </div>

        {/* Label banner — pinned at the bottom, always rendered when there's a label
             (even when a widget is showing) so the user's button name remains visible. */}
        {displayLabel && (
          <div style={{
            position: 'absolute', left: 0, right: 0, bottom: 0,
            padding: '3px 6px 4px',
            background: (button.imageData || button.brandIcon)
              ? 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.75) 60%)'
              : 'rgba(0,0,0,0.35)',
            fontFamily: VD.mono,
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: 0.4,
            color: (button.imageData || button.brandIcon)
              ? '#fff'
              : (button.fgColor || (toggled ? accent : VD.text)),
            textShadow: (button.imageData || button.brandIcon) ? '0 1px 2px rgba(0,0,0,0.9)' : 'none',
            textTransform: 'uppercase',
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            textAlign: 'center',
            pointerEvents: 'none',
            zIndex: 1,
          }}>
            {displayLabel}
          </div>
        )}

      </div>

      {/* Right-click context menu */}
      {contextMenu && (
        <MenuContextual
          x={contextMenu.x}
          y={contextMenu.y}
          isEmpty={isEmpty}
          onEdit={onEdit}
          onDuplicate={onDuplicate}
          onClear={onClear}
          onCerrar={() => setContextMenu(null)}
        />
      )}
    </>
  );
}

/**
 * Props que obligan a redibujar la celda.
 *
 * Como lista y no como cadena de `&&`: añadir una prop que deba redibujar es
 * añadir un nombre aqui, y olvidarse de una deja de ser un `&&` perdido en
 * medio de trece.
 */
const REDIBUJAN = [
  'button', 'toggled', 'isActive', 'isHidden', 'isRunning', 'isSelected',
  'accent', 'showContextMenu', 'soundEnabled', 'soundProfile', 'resolvedLabel',
] as const;

// Memoizado: la grilla re-renderiza al editar un solo boton, y sin esto se
// redibujarian las treinta celdas. Los handlers cambian de identidad en cada
// render del padre, asi que se ignoran a proposito — por eso el id del boton
// arrastrado viaja en el `dataTransfer` y no en un estado (ver `onDrop`).
export const ButtonCell = memo(ButtonCellInner, (prev, next) =>
  REDIBUJAN.every((k) => prev[k] === next[k])
  && (prev.widgetData?.line1 ?? null) === (next.widgetData?.line1 ?? null)
  && (prev.widgetData?.line2 ?? null) === (next.widgetData?.line2 ?? null)
  && (prev.widgetData?.tone ?? null) === (next.widgetData?.tone ?? null),
);
