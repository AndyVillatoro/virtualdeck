import type { VDTokens } from '../../design';

/**
 * Los colores de una celda según su estado.
 *
 * Estaban como dos cadenas de seis ternarios dentro del cuerpo del componente,
 * y eran la mitad de su complejidad ciclomática. Aquí, además, se ve el orden
 * de prioridades de un vistazo, que es lo que de verdad hay que entender:
 * el arrastre y el toggle mandan sobre el color propio del botón, y el color
 * propio manda sobre el hover.
 */

export interface EstadoCelda {
  toggled: boolean;
  dragOver: boolean;
  pressed: boolean;
  hovered: boolean;
  flash: boolean;
  isEmpty: boolean;
  /** Color de fondo elegido por el usuario para este botón, si lo hay. */
  bgPropio?: string;
}

export function colorDeFondo(e: EstadoCelda, VD: VDTokens): string {
  if (e.toggled || e.dragOver) return VD.accentBg;
  if (e.bgPropio) return e.bgPropio;
  if (e.pressed) return VD.overlay;
  if (e.hovered && !e.isEmpty) return VD.elevatedHover;
  return VD.elevated;
}

export function colorDeBorde(e: EstadoCelda, VD: VDTokens, accent: string): string {
  if (e.flash || e.dragOver || e.toggled || e.pressed) return accent;
  // Un botón con color propio no lleva borde: el color ya lo delimita, y un
  // borde encima lo ensucia.
  if (e.bgPropio) return 'transparent';
  if (e.hovered) return VD.borderStrong;
  return VD.border;
}
