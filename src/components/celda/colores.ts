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

/** El fondo sin la confirmación de pulsación: color propio > pressed > hover. */
function fondoBase(e: EstadoCelda, VD: VDTokens): string {
  if (e.bgPropio) return e.bgPropio;
  if (e.pressed) return VD.overlay;
  if (e.hovered && !e.isEmpty) return VD.elevatedHover;
  return VD.elevated;
}

/**
 * Mezcla hacia el acento conservando el fondo: el tinte de confirmación de la
 * pulsación. Va con `color-mix` para que valga igual sobre un fondo del tema
 * que sobre el color propio del botón (que antes no reaccionaba al pulsar).
 */
function tintarConAcento(color: string, accent: string, peso: number): string {
  return `color-mix(in srgb, ${color} ${100 - peso}%, ${accent})`;
}

export function colorDeFondo(e: EstadoCelda, VD: VDTokens): string {
  if (e.toggled || e.dragOver) return VD.accentBg;
  const base = fondoBase(e, VD);
  // El flash delata la pulsación aunque el botón tenga color propio.
  if (e.flash) return tintarConAcento(base, VD.accent, 22);
  if (e.bgPropio && e.pressed) return tintarConAcento(base, VD.accent, 16);
  return base;
}

export function colorDeBorde(e: EstadoCelda, VD: VDTokens, accent: string): string {
  if (e.flash || e.dragOver || e.toggled || e.pressed) return accent;
  // Un botón con color propio no lleva borde: el color ya lo delimita, y un
  // borde encima lo ensucia.
  if (e.bgPropio) return 'transparent';
  if (e.hovered) return VD.borderStrong;
  return VD.border;
}
