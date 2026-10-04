import type { ControlSuperficie, EntradaSuperficie, ModeloSuperficie } from '../../types/superficies';

/**
 * Qué hueco de la página del dispositivo corresponde a cada control físico.
 *
 * La página de un N3 tiene 3 columnas y 6 filas (18 huecos):
 *
 * | huecos | control |
 * |---|---|
 * | 0–5   | teclas LCD 1–6 (fila a fila, de izquierda a derecha) |
 * | 6–8   | botones físicos 1–3 |
 * | 9–11  | perilla 1: girar a la izquierda, pulsar, girar a la derecha |
 * | 12–14 | perilla 2: ídem |
 * | 15–17 | perilla 3: ídem |
 *
 * Así el editor, el pintado, deshacer e importar/exportar funcionan sin
 * cambios: son huecos de una página normal.
 */
export interface DisposicionModelo {
  nombre: string;
  columnas: number;
  filas: number;
  teclas: number;
  botones: number;
  perillas: number;
  /** Lado en píxeles de la imagen de una tecla LCD. */
  ladoTecla: number;
  /** Giro en grados (sentido horario) que necesita la imagen antes de mandarla. Medido: 90 en el N3. */
  rotacion: number;
}

export const DISPOSICIONES: Record<ModeloSuperficie, DisposicionModelo> = {
  n3: {
    nombre: 'Stream Dock N3',
    columnas: 3, filas: 6,
    teclas: 6, botones: 3, perillas: 3,
    ladoTecla: 64,
    rotacion: 90,
  },
};

/** Hueco de la página para una entrada, o `null` si la entrada no dispara nada (un `up`). */
export function huecoDeEntrada(modelo: ModeloSuperficie, e: Pick<EntradaSuperficie, 'control' | 'indice' | 'gesto'>): number | null {
  const d = DISPOSICIONES[modelo];
  if (e.gesto === 'up') return null;
  if (e.control === 'key') return e.indice;
  if (e.control === 'button') return d.teclas + e.indice;
  const base = d.teclas + d.botones + e.indice * 3;
  if (e.gesto === 'izq') return base;
  if (e.gesto === 'der') return base + 2;
  return base + 1;
}

/** El control físico al que pertenece un hueco (para la pantalla de dispositivos). */
export function controlDeHueco(modelo: ModeloSuperficie, hueco: number):
  { control: ControlSuperficie; indice: number; gesto?: 'izq' | 'pulsar' | 'der' } | null {
  const d = DISPOSICIONES[modelo];
  if (hueco < 0) return null;
  if (hueco < d.teclas) return { control: 'key', indice: hueco };
  if (hueco < d.teclas + d.botones) return { control: 'button', indice: hueco - d.teclas };
  const resto = hueco - d.teclas - d.botones;
  if (resto >= d.perillas * 3) return null;
  const gestos = ['izq', 'pulsar', 'der'] as const;
  return { control: 'knob', indice: Math.floor(resto / 3), gesto: gestos[resto % 3] };
}
