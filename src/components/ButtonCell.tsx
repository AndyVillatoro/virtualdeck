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
import { DotRotaryDial } from './dot480/DotRotaryDial';
import { DotContinuousSlider } from './dot480/DotContinuousSlider';
import { Subdivision2x2 } from './celda/Subdivision2x2';
import { colorDeFondo, colorDeBorde } from './celda/colores';
import type { ButtonConfig, SoundProfileId } from '../types';

interface ButtonCellProps {
  button: ButtonConfig;
  accent: string;
  toggled?: boolean;
  /** Estado toggle individual de los 4 cuadrantes (si subButtons existe) */
  subToggled?: boolean[];
  isActive?: boolean;
  isHidden?: boolean;
  isRunning?: boolean;
  isSelected?: boolean;
  widgetData?: { line1: string; line2?: string; tone?: 'warn' | 'crit' };
  soundEnabled?: boolean;
  soundProfile?: SoundProfileId;
  deckState?: Record<string, string>;
  onStateUpdate?: (k: string, v: string) => void;
  /** Etiqueta con variables ya interpoladas (Feature 3). Sustituye al label del botón. */
  resolvedLabel?: string;
  onEdit: () => void;
  onExecute: (target?: ButtonConfig) => void;
  onSelect?: () => void;
  onLongPress?: (target?: ButtonConfig) => void;
  onDuplicate?: () => void;
  onClear?: () => void;
  onDragStart?: () => void;
  /** Recibe el id del boton arrastrado, leido del propio evento. */
  onDrop?: (sourceId: string) => void;
  /** Rueda sobre un boton de ajuste: +1 hacia arriba, -1 hacia abajo. */
  onAdjustWheel?: (signo: 1 | -1) => void;
  /** Se llama tambien si el arrastre se cancela, no solo al soltar. */
  onDragEnd?: () => void;
  onTogglePin?: () => void;
  /** Menu de clic derecho. La barra flotante lo apaga: sus opciones son de la grilla. */
  showContextMenu?: boolean;
  onQuickSlider?: (target: 'volume' | 'brightness') => void;
}

function ButtonCellInner({
  button, accent, toggled = false, subToggled, isActive = false, isHidden = false, isRunning = false,
  isSelected = false,
  widgetData, soundEnabled = false, soundProfile = 'click',
  deckState, onStateUpdate,
  resolvedLabel, onEdit, onExecute, onSelect, onLongPress, onDuplicate, onClear, onTogglePin, onDragStart, onDrop, onDragEnd,
  onAdjustWheel,
  showContextMenu = true,
  onQuickSlider,
}: ButtonCellProps) {
  const VD = useTheme();
  const t = useT();
  const [hovered, setHovered] = useState(false);
  const [rotaryStep, setRotaryStep] = useState(0);
  const [lastRotaryDir, setLastRotaryDir] = useState<1 | -1>(1);
  const [lastRotaryTime, setLastRotaryTime] = useState(0);
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

  const hasSubButtons = !!(button.subButtons && button.subButtons.length === 4);
  const hasLongPress = !isEmpty && !!onLongPress && !hasSubButtons;

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
  // En kiosko y en la barra flotante no se secuestra el toque. Las celdas 2x2
  // manejan el toque en cada uno de sus cuadrantes independientes.
  usePulsacionTactil({
    ref: cellRef,
    activo: !isEmpty && !!onDrop && button.widget !== 'slider' && !hasSubButtons,
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
        draggable={!isEmpty && button.widget !== 'slider' && !hasSubButtons}
        onClick={(e) => {
          if (hasSubButtons || button.widget === 'slider') return;
          if (button.action.type === 'adjust') {
            const dir = (button.action.adjustDelta ?? 5) >= 0 ? 1 : -1;
            setRotaryStep((prev) => prev + dir);
            setLastRotaryDir(dir);
            setLastRotaryTime(Date.now());
          }
          raton.alClic(e);
        }}
        onContextMenu={raton.alMenuContextual}
        // La rueda solo hace algo en los botones de ajuste, y ahi ahorra tener
        // dos: arriba suma el paso, abajo lo resta.
        onWheel={button.widget === 'slider' ? undefined : button.action.type === 'adjust' ? (e) => {
          e.preventDefault();
          const dir = e.deltaY < 0 ? 1 : -1;
          onAdjustWheelRef.current?.(dir);
          setRotaryStep((prev) => prev + dir);
          setLastRotaryDir(dir);
          setLastRotaryTime(Date.now());
        } : undefined}
        onMouseDown={hasSubButtons || button.widget === 'slider' ? undefined : raton.alBajar}
        onMouseUp={hasSubButtons || button.widget === 'slider' ? undefined : raton.alSubirOSalir}
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
        {hasSubButtons ? (
          <Subdivision2x2
            subButtons={button.subButtons!}
            parentButton={button}
            accent={accent}
            subToggled={subToggled}
            soundEnabled={soundEnabled}
            soundProfile={soundProfile}
            onExecute={(target) => onExecuteRef.current?.(target)}
            onLongPress={onLongPress ? (target) => onLongPressRef.current?.(target) : undefined}
            onContextMenu={raton.alMenuContextual}
          />
        ) : button.widget === 'slider' ? (
          <DotContinuousSlider
            button={button}
            sliderConfig={button.sliderWidget}
            accent={accent}
            deckState={deckState}
            onStateUpdate={onStateUpdate}
            soundEnabled={soundEnabled}
            soundProfile={soundProfile}
            toggled={toggled}
          />
        ) : (
          <>
            {/* Center stack — icon, rotary encoder or live widget. The label is rendered separately as a bottom banner. */}
            <div style={{
              position: 'relative', textAlign: 'center', padding: '6px 4px',
              paddingBottom: displayLabel ? 22 : 6,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
              {button.action.type === 'adjust' ? (
                <DotRotaryDial
                  step={rotaryStep}
                  lastDir={lastRotaryDir}
                  lastActiveTime={lastRotaryTime}
                  accent={accent}
                  hovered={hovered}
                  delta={button.action.adjustDelta ?? 5}
                >
                  <ContenidoCentral
                    button={button}
                    isEmpty={isEmpty}
                    iconColor={iconColor}
                    ActionIcon={ActionIcon}
                    widgetData={widgetData}
                  />
                </DotRotaryDial>
              ) : (
                <ContenidoCentral
                  button={button}
                  isEmpty={isEmpty}
                  iconColor={iconColor}
                  ActionIcon={ActionIcon}
                  widgetData={widgetData}
                />
              )}
            </div>

            {displayLabel && (
              <RotuloCelda texto={displayLabel} button={button} accent={accent} toggled={toggled} />
            )}
          </>
        )}

      </div>

      {/* Right-click context menu */}
      {contextMenu && (
        <MenuContextual
          x={contextMenu.x}
          y={contextMenu.y}
          isEmpty={isEmpty}
          isPinned={button.pinned}
          onEdit={onEdit}
          onDuplicate={onDuplicate}
          onTogglePin={onTogglePin}
          onClear={onClear}
          onQuickSlider={onQuickSlider}
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
  && (prev.subToggled?.join(',') ?? '') === (next.subToggled?.join(',') ?? '')
  && (prev.widgetData?.line1 ?? null) === (next.widgetData?.line1 ?? null)
  && (prev.widgetData?.line2 ?? null) === (next.widgetData?.line2 ?? null)
  && (prev.widgetData?.tone ?? null) === (next.widgetData?.tone ?? null),
);
