import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useTheme } from '../utils/theme';
import { useT } from '../utils/i18n';
import { Insignias } from './celda/Insignias';
import { usePulsacionTactil } from './celda/usePulsacionTactil';
import { useArrastreCelda } from './celda/useArrastreCelda';
import { CapasDeFondo } from './celda/CapasDeFondo';
import { derivarCelda } from './celda/derivados';
import { usePulsacionRaton } from './celda/usePulsacionRaton';
import { MenuContextual } from './celda/MenuContextual';
import { DotRadialSweep } from './dot480/DotRadialSweep';
import { colorDeFondo, colorDeBorde } from './celda/colores';
import { CuerpoCelda } from './celda/CuerpoCelda';
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
  onCopy?: () => void;
  onPaste?: () => void;
  canPaste?: boolean;
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

function useRotaryHandler(
  button: ButtonConfig,
  onAdjustWheelRef: React.MutableRefObject<((signo: 1 | -1) => void) | undefined>,
) {
  const [rotaryStep, setRotaryStep] = useState(0);
  const [lastRotaryDir, setLastRotaryDir] = useState<1 | -1>(1);
  const [lastRotaryTime, setLastRotaryTime] = useState(0);

  const stepRotary = useCallback((dir: 1 | -1) => {
    setRotaryStep((prev) => prev + dir);
    setLastRotaryDir(dir);
    setLastRotaryTime(Date.now());
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const dir = e.deltaY < 0 ? 1 : -1;
    onAdjustWheelRef.current?.(dir);
    stepRotary(dir);
  }, [onAdjustWheelRef, stepRotary]);

  const handleAdjustClick = useCallback(() => {
    const delta = button.action.adjustDelta ?? 5;
    stepRotary(delta >= 0 ? 1 : -1);
  }, [button.action.adjustDelta, stepRotary]);

  return { rotaryStep, lastRotaryDir, lastRotaryTime, handleWheel, handleAdjustClick };
}

function ButtonCellInner(props: ButtonCellProps) {
  const {
    button, accent, subToggled, widgetData, deckState, onStateUpdate,
    resolvedLabel, onEdit, onExecute, onSelect, onLongPress, onDuplicate, onCopy, onPaste, canPaste, onClear, onTogglePin, onDragStart, onDrop, onDragEnd,
    onAdjustWheel, onQuickSlider,
  } = props;
  const toggled = Boolean(props.toggled);
  const soundProfile = props.soundProfile ?? 'click';
  const showContextMenu = props.showContextMenu !== false;

  const VD = useTheme();
  const t = useT();
  const [hovered, setHovered] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const cellRef = useRef<HTMLDivElement>(null);

  const onLongPressRef = useRef(onLongPress);
  const onExecuteRef = useRef(onExecute);
  const onAdjustWheelRef = useRef(onAdjustWheel);
  onLongPressRef.current = onLongPress;
  onExecuteRef.current = onExecute;
  onAdjustWheelRef.current = onAdjustWheel;
  const [isTouch] = useState(() => typeof window !== 'undefined' && 'ontouchstart' in window);

  const { isEmpty, displayLabel, ActionIcon, iconColor, multiCount, titulo } =
    derivarCelda(button, { accent, toggled, resolvedLabel, VD, t });

  const hasSubButtons = Boolean(button.subButtons && button.subButtons.length === 4);
  const isSlider = button.widget === 'slider';
  const isAdjust = button.action.type === 'adjust';
  const hasLongPress = !isEmpty && Boolean(onLongPress) && !hasSubButtons;

  const { rotaryStep, lastRotaryDir, lastRotaryTime, handleWheel, handleAdjustClick } =
    useRotaryHandler(button, onAdjustWheelRef);

  const raton = usePulsacionRaton({
    isEmpty, hasLongPress, soundEnabled: Boolean(props.soundEnabled), soundProfile,
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

  const estado = { toggled, dragOver, pressed, hovered, flash, isEmpty, bgPropio: button.bgColor };
  const bg = colorDeFondo(estado, VD);
  const borderColor = colorDeBorde(estado, VD, accent);

  useEffect(() => {
    if (!contextMenu) return;
    const cerrar = () => setContextMenu(null);
    document.addEventListener('click', cerrar);
    document.addEventListener('contextmenu', cerrar);
    return () => {
      document.removeEventListener('click', cerrar);
      document.removeEventListener('contextmenu', cerrar);
    };
  }, [contextMenu]);

  const canDrag = !isEmpty && !isSlider && !hasSubButtons;

  usePulsacionTactil({
    ref: cellRef,
    activo: canDrag && Boolean(onDrop),
    idBoton: button.id,
    setPressed: raton.setPressed,
    destellar,
    yaDisparoRef: raton.yaDisparo,
    alPulsar: useCallback(() => onExecuteRef.current?.(), []),
  });

  if (props.isHidden) {
    return (
      <div style={{
        background: VD.elevated, border: `1px solid ${VD.border}`,
        borderRadius: VD.radius.lg, opacity: 0.2, pointerEvents: 'none',
      }} />
    );
  }

  const handleCellClick = (e: React.MouseEvent) => {
    if (hasSubButtons || isSlider) return;
    if (isAdjust) handleAdjustClick();
    raton.alClic(e);
  };

  const interactiveMouseProps = hasSubButtons || isSlider ? {} : {
    onMouseDown: raton.alBajar,
    onMouseUp: raton.alSubirOSalir,
  };

  return (
    <>
      <div
        ref={cellRef}
        className="vd-btn"
        title={titulo}
        draggable={canDrag}
        onClick={handleCellClick}
        onContextMenu={raton.alMenuContextual}
        onWheel={!isSlider && isAdjust ? handleWheel : undefined}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); raton.alSubirOSalir(); }}
        {...interactiveMouseProps}
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
          width: '100%',
          height: '100%',
        }}
      >
        <Insignias
          button={button}
          accent={accent}
          isEmpty={isEmpty}
          isActive={Boolean(props.isActive)}
          isSelected={Boolean(props.isSelected)}
          hovered={hovered}
          isTouch={isTouch}
          toggled={toggled}
          multiCount={multiCount}
          onEdit={onEdit}
        />

        {flash && <DotRadialSweep accent={accent} />}
        {props.isRunning && <span className="vd-running-ring" />}

        <CapasDeFondo button={button} toggled={toggled} />

        <CuerpoCelda
          button={button}
          accent={accent}
          toggled={toggled}
          subToggled={subToggled}
          hasSubButtons={hasSubButtons}
          soundEnabled={Boolean(props.soundEnabled)}
          soundProfile={soundProfile}
          deckState={deckState}
          onStateUpdate={onStateUpdate}
          onExecute={(target) => onExecuteRef.current?.(target)}
          onLongPress={onLongPress ? (target) => onLongPressRef.current?.(target) : undefined}
          onContextMenu={raton.alMenuContextual}
          isEmpty={isEmpty}
          iconColor={iconColor}
          ActionIcon={ActionIcon}
          widgetData={widgetData}
          displayLabel={displayLabel}
          rotaryStep={rotaryStep}
          lastRotaryDir={lastRotaryDir}
          lastRotaryTime={lastRotaryTime}
          hovered={hovered}
        />
      </div>

      {contextMenu && (
        <MenuContextual
          x={contextMenu.x}
          y={contextMenu.y}
          isEmpty={isEmpty}
          isPinned={button.pinned}
          onEdit={onEdit}
          onDuplicate={onDuplicate}
          onCopy={onCopy}
          onPaste={onPaste}
          canPaste={canPaste}
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
 */
const REDIBUJAN = [
  'button', 'toggled', 'isActive', 'isHidden', 'isRunning', 'isSelected',
  'accent', 'showContextMenu', 'soundEnabled', 'soundProfile', 'resolvedLabel', 'canPaste',
] as const;

function arrayIgual(a?: boolean[], b?: boolean[]): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

function widgetDataIgual(
  a?: { line1: string; line2?: string; tone?: 'warn' | 'crit' },
  b?: { line1: string; line2?: string; tone?: 'warn' | 'crit' },
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.line1 === b.line1 && a.line2 === b.line2 && a.tone === b.tone;
}

function celdasSonIguales(prev: ButtonCellProps, next: ButtonCellProps): boolean {
  for (const k of REDIBUJAN) {
    if (prev[k] !== next[k]) return false;
  }
  if (!arrayIgual(prev.subToggled, next.subToggled)) return false;
  return widgetDataIgual(prev.widgetData, next.widgetData);
}

export const ButtonCell = memo(ButtonCellInner, celdasSonIguales);
