import React from 'react';
import { useTheme } from '../../utils/theme';
import { textoSobre } from '../../design';
import { useT } from '../../utils/i18n';
import { DotGlyphIcon } from '../dot480/DotGlyphIcon';
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
  /** T-HW-12 — el botón es fijo y se ve desde otra página de su grupo. */
  esFija?: boolean;
  nombrePaginaOriginal?: string;
  onEdit: () => void;
}

function InsigniaEditar({ visible, onEdit }: { visible: boolean; onEdit: () => void }) {
  const VD = useTheme();
  const t = useT();
  if (!visible) return null;
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onEdit(); }}
      title={t('cell.edit')}
      style={{
        position: 'absolute', top: 4, right: 4, width: 20, height: 20,
        // Colores fijos OLED (#111315 fondo, #e6e8eb glifo):
        // van sobre imagen o color arbitrario, así que no dependen del tema.
        background: '#111315',
        border: '1px solid #26292e',
        borderRadius: VD.radius.md,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        lineHeight: 1,
        pointerEvents: 'auto',
        cursor: 'pointer',
      }}
    >
      <DotGlyphIcon glyph="EDIT" size={10} color="#e6e8eb" />
    </div>
  );
}

function InsigniaPinFijo({
  esFija, hovered, accent, nombrePaginaOriginal, defaultPageName,
}: {
  esFija?: boolean;
  hovered: boolean;
  accent: string;
  nombrePaginaOriginal?: string;
  defaultPageName: string;
}) {
  const t = useT();
  if (!esFija) return null;
  return (
    <div
      title={t('btn.fijoHint', { pagina: nombrePaginaOriginal || defaultPageName })}
      style={{
        position: 'absolute', top: 4, right: hovered ? 26 : 4,
        width: 12, height: 12,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'auto',
      }}
    >
      <DotGlyphIcon glyph="PIN" size={8} color={accent} />
    </div>
  );
}

function InsigniaMultiToggle({
  multiCount, isToggle, toggled, hovered, accent,
}: {
  multiCount: number;
  isToggle?: boolean;
  toggled: boolean;
  hovered: boolean;
  accent: string;
}) {
  const VD = useTheme();
  if (hovered) return null;
  return (
    <>
      {multiCount > 1 && (
        <div style={{
          position: 'absolute', top: 4, left: 4,
          background: 'rgba(0,0,0,0.7)', borderRadius: VD.radius.sm,
          fontFamily: VD.mono, fontSize: 7, color: accent,
          padding: '1px 4px', lineHeight: 1.4,
        }}>x{multiCount}</div>
      )}
      {isToggle && (
        <div style={{
          position: 'absolute', top: 4,
          left: multiCount > 1 ? 28 : 4,
          width: 6, height: 6, borderRadius: 3,
          background: toggled ? accent : VD.textMuted, opacity: 0.8,
        }} />
      )}
    </>
  );
}

export function Insignias({
  button, accent, isEmpty, isActive, isSelected, hovered, isTouch, toggled, multiCount, esFija, nombrePaginaOriginal, onEdit,
}: Props) {
  const VD = useTheme();
  const t = useT();
  const carpeta = button.action.type === 'folder';

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 4,
      }}
    >
      {/* Barra de acento arriba: algo de fuera coincide con este botón — el proceso
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
          borderRadius: '50%', background: accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          lineHeight: 1,
        }}>
          <DotGlyphIcon glyph="CHECK" size={8} color={textoSobre(accent)} />
        </div>
      )}

      {/* En pantalla táctil no hay cursor, así que el lápiz se queda fijo. */}
      <InsigniaEditar visible={!isEmpty && (hovered || isTouch)} onEdit={onEdit} />

      <InsigniaMultiToggle
        multiCount={multiCount}
        isToggle={button.isToggle}
        toggled={toggled}
        hovered={hovered}
        accent={accent}
      />

      {carpeta && !hovered && (
        <div style={{
          position: 'absolute', bottom: 4, left: 4,
          fontFamily: VD.mono, fontSize: 7, color: accent, opacity: 0.8,
          display: 'inline-flex', alignItems: 'center', gap: 3,
        }}>
          <DotGlyphIcon glyph="FOLDER" size={6} color={accent} />
          <span>{button.action.folderButtons?.length ?? 0}</span>
        </div>
      )}

      {/* T-HW-12 / T-HW-20 — Botón fijo visto desde otra página de su grupo: la
          chincheta arriba a la derecha. Al pasar el cursor se desplaza a la
          izquierda del lápiz para que se pueda ver su título con la página de origen. */}
      <InsigniaPinFijo
        esFija={esFija}
        hovered={hovered}
        accent={accent}
        nombrePaginaOriginal={nombrePaginaOriginal}
        defaultPageName={t('page.defaultName', { n: button.page + 1 })}
      />

      {!isEmpty && (
        <div style={{
          position: 'absolute', bottom: 4, right: 4,
          width: 5, height: 5, borderRadius: 3, background: accent,
          opacity: hovered ? 0 : 0.7, transition: 'opacity 0.15s',
        }} />
      )}
    </div>
  );
}
