import React from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import type { ButtonConfig } from '../../types';

/**
 * Las marcas pequeñas de las esquinas de una celda.
 *
 * Son seis capas superpuestas —activo, seleccionado, editar, ×N acciones,
 * toggle, carpeta, punto de configurado— y cada una con su condición. Juntas
 * eran un tercio de la complejidad de la celda, y ninguna tiene que ver con
 * las otras: separarlas deja el cuerpo de la celda con la estructura, y aquí
 * los adornos.
 *
 * Casi todas se esconden con el cursor encima, para dejar sitio al lápiz de
 * editar sin que se amontonen.
 */

interface Props {
  button: ButtonConfig;
  accent: string;
  isEmpty: boolean;
  isActive: boolean;
  isSelected: boolean;
  hovered: boolean;
  isTouch: boolean;
  toggled: boolean;
  multiCount: number;
  onEdit: () => void;
}

export function Insignias({
  button, accent, isEmpty, isActive, isSelected, hovered, isTouch, toggled, multiCount, onEdit,
}: Props) {
  const VD = useTheme();
  const t = useT();
  const carpeta = button.action.type === 'folder';

  return (
    <>
      {/* Barra verde arriba: algo de fuera coincide con este botón — el proceso
          está abierto, el dispositivo es el predeterminado. */}
      {isActive && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          // El acento, no un verde fijo: si el usuario elige un color de
          // acento, la barra de «este es el que esta puesto» tiene que ir con
          // el. Estaba clavada en #4caf50 y era de lo poco que no cambiaba.
          height: 2, background: accent,
          borderRadius: `${VD.radius.lg} ${VD.radius.lg} 0 0`,
        }} />
      )}

      {isSelected && (
        <div style={{
          position: 'absolute', top: 4, left: 4, width: 16, height: 16,
          borderRadius: '50%', background: accent, zIndex: 3,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, color: '#fff', fontWeight: 700, lineHeight: 1,
        }}>✓</div>
      )}

      {/* En pantalla táctil no hay cursor, así que el lápiz se queda fijo. */}
      {!isEmpty && (hovered || isTouch) && (
        <div
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          title={t('cell.edit')}
          style={{
            position: 'absolute', top: 4, right: 4, width: 20, height: 20,
            background: 'rgba(0,0,0,0.75)',
            border: `1px solid ${VD.borderStrong}`, borderRadius: VD.radius.md,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, color: VD.textDim, zIndex: 2, lineHeight: 1,
          }}
        >✎</div>
      )}

      {multiCount > 1 && !hovered && (
        <div style={{
          position: 'absolute', top: 4, left: 4,
          background: 'rgba(0,0,0,0.7)', borderRadius: VD.radius.sm,
          fontFamily: VD.mono, fontSize: 7, color: accent,
          padding: '1px 4px', lineHeight: 1.4,
        }}>×{multiCount}</div>
      )}

      {button.isToggle && !hovered && (
        <div style={{
          position: 'absolute', top: 4,
          // Se corre a la derecha si la insignia de ×N ya ocupa esa esquina.
          left: multiCount > 1 ? 28 : 4,
          width: 6, height: 6, borderRadius: 3,
          background: toggled ? accent : VD.textMuted, opacity: 0.8,
        }} />
      )}

      {carpeta && !hovered && (
        <div style={{
          position: 'absolute', bottom: 4, left: 4,
          fontFamily: VD.mono, fontSize: 7, color: accent, opacity: 0.7,
        }}>{button.action.folderButtons?.length ?? 0}</div>
      )}

      {!isEmpty && (
        <div style={{
          position: 'absolute', bottom: 4, right: 4,
          width: 5, height: 5, borderRadius: 3, background: accent,
          opacity: hovered ? 0 : 0.7, transition: 'opacity 0.15s',
        }} />
      )}
    </>
  );
}
