import React from 'react';
import { useTheme } from '../../utils/theme';

export interface ChipProps {
  activo: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
  /** Acento propio (p. ej. el del botón que se edita); por defecto el del tema. */
  accent?: string;
  disabled?: boolean;
  /** Ocupa el ancho disponible (para las filas de opciones del mismo peso). */
  ancho?: boolean;
  style?: React.CSSProperties;
}

/**
 * Ficha seleccionable: el patrón `activo ? accentBg : elevated` con borde de
 * acento que estaba escrito a mano en ~25 archivos, cada uno con su relleno y
 * su tamaño de letra. Es un `<button>`: tiene foco y responde al teclado.
 */
export function Chip({ activo, onClick, children, title, accent, disabled, ancho, style }: ChipProps) {
  const VD = useTheme();
  const ac = accent ?? VD.accent;
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      aria-pressed={activo}
      style={{
        flex: ancho ? 1 : undefined,
        minWidth: 0,
        padding: '4px 8px',
        minHeight: 24,
        background: activo ? VD.accentBg : VD.elevated,
        border: `1px solid ${activo ? ac : VD.border}`,
        borderRadius: VD.radius.sm,
        color: activo ? ac : VD.textDim,
        fontFamily: VD.mono,
        fontSize: VD.tipo.xs,
        letterSpacing: 1,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        transition: 'border-color 0.12s, background 0.12s',
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export interface OpcionSegmentado<T extends string | number> {
  valor: T;
  etiqueta: React.ReactNode;
  title?: string;
  disabled?: boolean;
}

/**
 * Fila de fichas excluyentes (tema, modo, tamaño...). Envuelve si no cabe:
 * nunca empuja el contenedor hacia fuera.
 */
export function Segmentado<T extends string | number>({
  opciones,
  valor,
  onChange,
  accent,
  etiquetaGrupo,
  repartir = false,
  style,
}: {
  opciones: readonly OpcionSegmentado<T>[];
  valor: T;
  onChange: (v: T) => void;
  accent?: string;
  /** Nombre del grupo para lectores de pantalla. */
  etiquetaGrupo?: string;
  /** Las fichas se reparten el ancho a partes iguales. */
  repartir?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <div role="group" aria-label={etiquetaGrupo} style={{ display: 'flex', flexWrap: 'wrap', gap: 4, minWidth: 0, ...style }}>
      {opciones.map((o) => (
        <Chip
          key={String(o.valor)}
          activo={valor === o.valor}
          onClick={() => onChange(o.valor)}
          title={o.title}
          disabled={o.disabled}
          accent={accent}
          ancho={repartir}
        >
          {o.etiqueta}
        </Chip>
      ))}
    </div>
  );
}
