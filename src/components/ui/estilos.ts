import type React from 'react';
import type { VDTokens } from '../../design';

/**
 * Estilos de campo compartidos. Había cuatro variantes de caja de texto y dos
 * de desplegable para lo mismo (editor, ajustes, macros, buscador de presets),
 * cada una con su fondo, relleno y tamaño de letra.
 *
 * - `normal`: formularios con aire (editor).
 * - `compacto`: paneles estrechos (ajustes, filas de una lista).
 */
export type TamanoCampo = 'normal' | 'compacto';

export function estiloCampo(VD: VDTokens, tamano: TamanoCampo = 'normal'): React.CSSProperties {
  const compacto = tamano === 'compacto';
  return {
    width: '100%',
    minWidth: 0,
    boxSizing: 'border-box',
    background: VD.bg,
    border: `1px solid ${VD.border}`,
    borderRadius: VD.radius.sm,
    padding: compacto ? '4px 8px' : '8px 12px',
    minHeight: compacto ? 24 : 32,
    color: VD.text,
    fontFamily: VD.mono,
    fontSize: compacto ? VD.tipo.sm : VD.tipo.md,
    outline: 'none',
  };
}

export function estiloDesplegable(VD: VDTokens, tamano: TamanoCampo = 'normal'): React.CSSProperties {
  return { ...estiloCampo(VD, tamano), cursor: 'pointer' };
}

/** Botón de texto secundario (contorno). El primario va con `VD.accent` de fondo y `VD.onAccent` de letra. */
export function estiloBotonTexto(VD: VDTokens, primario = false, accent?: string): React.CSSProperties {
  const ac = accent ?? VD.accent;
  return {
    padding: '4px 12px',
    minHeight: 24,
    background: primario ? ac : VD.elevated,
    border: `1px solid ${primario ? ac : VD.border}`,
    borderRadius: VD.radius.sm,
    color: primario ? VD.onAccent : VD.textDim,
    fontFamily: VD.mono,
    fontSize: VD.tipo.xs,
    letterSpacing: 1,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  };
}
