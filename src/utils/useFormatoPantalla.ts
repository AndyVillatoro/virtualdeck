import { useTamanoVentana } from './useTamanoVentana';

/**
 * Forma de la ventana, para que las pantallas se reorganicen igual:
 * - `barra`: baja y ancha (ancho/alto ≥ 2 y alto ≤ 600), como un monitor de
 *   barra de 1280×480. Ahí el alto es lo escaso: nada de franjas apiladas.
 * - `estrecha`: menos de 900 px de ancho.
 * - `normal`: el resto.
 * Compartido por Dispositivos, el panel de música, el kiosko y la principal
 * (roadmap 108–110).
 */
export type FormatoPantalla = 'normal' | 'barra' | 'estrecha';

export function formatoDe(ancho: number, alto: number): FormatoPantalla {
  if (alto > 0 && alto <= 600 && ancho / alto >= 2) return 'barra';
  if (ancho < 900) return 'estrecha';
  return 'normal';
}

export function useFormatoPantalla(): { formato: FormatoPantalla; ancho: number; alto: number } {
  const { ancho, alto } = useTamanoVentana();
  return { formato: formatoDe(ancho, alto), ancho, alto };
}
