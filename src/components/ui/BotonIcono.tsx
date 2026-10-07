import React from 'react';
import { useTheme } from '../../utils/theme';
import { DotGlyphIcon } from '../dot480/DotGlyphIcon';

export interface BotonIconoProps {
  /** Nombre del glifo DOT 8×8. */
  glifo: string;
  /**
   * Obligatorio: un botón que solo enseña un icono no dice qué hace. Va a
   * `title` y a `aria-label`. Antes había ~25 sin ninguno de los dos.
   */
  title: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  /** Lado del área pulsable en px. 32 o más en pantallas táctiles (kiosko, barra flotante). */
  tamano?: number;
  /** Lado del glifo en px; por defecto, ~40 % del botón. */
  tamanoGlifo?: number;
  color?: string;
  /** Rojo de peligro (borrar, cerrar sin guardar). */
  peligro?: boolean;
  /** Con fondo y borde (por defecto, transparente). */
  conMarco?: boolean;
  disabled?: boolean;
  style?: React.CSSProperties;
}

/**
 * Botón de solo icono, con nombre accesible obligatorio y un área pulsable
 * que no depende del tamaño del glifo.
 */
export function BotonIcono({
  glifo,
  title,
  onClick,
  tamano = 24,
  tamanoGlifo,
  color,
  peligro,
  conMarco,
  disabled,
  style,
}: BotonIconoProps) {
  const VD = useTheme();
  const c = color ?? (peligro ? VD.danger : VD.textDim);
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      style={{
        width: tamano,
        height: tamano,
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        background: conMarco ? VD.elevated : 'transparent',
        border: conMarco ? `1px solid ${VD.border}` : 'none',
        borderRadius: VD.radius.sm,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        ...style,
      }}
    >
      <DotGlyphIcon glyph={glifo} size={tamanoGlifo ?? Math.max(8, Math.round(tamano * 0.4))} color={c} />
    </button>
  );
}
