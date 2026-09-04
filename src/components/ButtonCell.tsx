import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useTheme } from '../utils/theme';
import { useT } from '../utils/i18n';
import { ContenidoCentral } from './celda/ContenidoCentral';
import { Insignias } from './celda/Insignias';
import { usePulsacionTactil } from './celda/usePulsacionTactil';
import { useArrastreCelda } from './celda/useArrastreCelda';
import { CapasDeFondo } from './celda/CapasDeFondo';
import { RotuloCelda } from './celda/RotuloCelda';
import { derivarCelda } from './celda/derivados';
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
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const cellRef = useRef<HTMLDivElement>(null);
  // Callback refs: memo comparator ignores handler identity, so we keep fresh
  // copies without adding them to effect dependency arrays. Las del sonido se
  // fueron con `usePulsacionRaton`, que ahora es el unico que lo dispara.
  const onLongPressRef = useRef(onLongPress);
  const onExecuteRef = useRef(onExecute);
  const onAdjustWheelRef = useRef(onAdjustWheel);
  onLongPressRef.current = onLongPress;
  onExecuteRef.current = onExecute;
  onAdjustWheelRef.current = onAdjustWheel;
  const [isTouch] = useState(() => typeof window !== 'undefined' && 'ontouchstart' in window);

  const { isEmpty, displayLabel, ActionIcon, iconColor, multiCount, titulo } =
    derivarCelda(button, { accent, toggled, resolvedLabel, VD, t });

  const hasLongPress = !isEmpty && !!onLongPress;

  const raton = usePulsacionRaton({
    isEmpty, hasLongPress, soundEnabled, soundProfile,
    onEdit, onExecute, onLongPress, onSelect,
    showContextMenu,
    abrirMenu: (x, y) => setContextMenu({ x, y }),
  });
  const { pressed, flash, destellar } = raton;

  const arrastre = useArrastreCelda({
    ref: cellRef, idBoton: button.id, onDragStart, onDragEnd, onDrop,
    alEmpezarArrastre: raton.alEmpezarArrastre, setPressed: raton.setPressed,
  });
  const { dragOver } = arrastre;

  // 5.3 — el pulso radial reemplaza el flash de fondo plano. La celda mantiene
  // su bg estable durante la ejecución; la "ondita" se renderiza encima como overlay.
  const estado = { toggled, dragOver, pressed, hovered, flash, isEmpty, bgPropio: button.bgColor };
  const bg = colorDeFondo(estado, VD);
  const borderColor = colorDeBorde(estado, VD, accent);

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
        title={titulo}
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
        {...arrastre.props}
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

        <CapasDeFondo button={button} toggled={toggled} />

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

        {displayLabel && (
          <RotuloCelda texto={displayLabel} button={button} accent={accent} toggled={toggled} />
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
