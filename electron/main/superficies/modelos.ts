/**
 * Modelos de controlador físico soportados por el driver HID.
 *
 * La tabla del N3 (VID/PID y mapa de códigos de entrada) está adaptada del
 * módulo MIT `companion-surface-mirabox-stream-dock` de Bitfocus
 * (`src/models/N3-293N3.ts` y `src/models/list.ts`); ver THIRD_PARTY_NOTICES.md.
 * No se usa código de OpenDeck ni de opendeck-akp03 (GPL).
 */

import type { ControlSuperficie, GestoSuperficie, ModeloSuperficie } from '../../../src/types';

/** Una entrada física del modelo: a qué control e índice corresponde cada código. */
export interface EntradaFisica {
  control: ControlSuperficie;
  /** Índice 0-based dentro de su tipo de control. */
  indice: number;
  /**
   * Gesto fijo (los giros mandan un solo evento, sin `up`). Si falta, el byte
   * de estado del reporte decide `down` (1) o `up` (0).
   */
  gesto?: GestoSuperficie;
}

export interface ModeloMirabox {
  modelo: ModeloSuperficie;
  nombre: string;
  usbIds: Array<{ vendorId: number; productIds: number[] }>;
  /**
   * Interfaz HID de control. Bitfocus exige `interface === 0` (`src/main.ts`);
   * en el N3 real esa es la colección vendor-defined 0xFFA0/usage 1. La
   * interfaz 1 es un teclado HID y no debe abrirse.
   */
  interfazControl: number;
  /** Teclas LCD. Una imagen para una tecla fuera de rango no se manda. */
  teclas: number;
  /** Código del reporte (byte 9) → entrada. */
  entradas: Record<number, EntradaFisica>;
}

const N3: ModeloMirabox = {
  modelo: 'n3',
  nombre: 'Stream Dock N3',
  teclas: 6,
  usbIds: [
    { vendorId: 0x5548, productIds: [0x1001] },
    { vendorId: 0x6602, productIds: [0x1003] },
    { vendorId: 0x6603, productIds: [0x1003] },
  ],
  interfazControl: 0,
  entradas: {
    0x01: { control: 'key', indice: 0 },
    0x02: { control: 'key', indice: 1 },
    0x03: { control: 'key', indice: 2 },
    0x04: { control: 'key', indice: 3 },
    0x05: { control: 'key', indice: 4 },
    0x06: { control: 'key', indice: 5 },
    0x25: { control: 'button', indice: 0 },
    0x30: { control: 'button', indice: 1 },
    0x31: { control: 'button', indice: 2 },
    0x35: { control: 'knob', indice: 0 },
    0x50: { control: 'knob', indice: 0, gesto: 'izq' },
    0x51: { control: 'knob', indice: 0, gesto: 'der' },
    0x33: { control: 'knob', indice: 1 },
    0x90: { control: 'knob', indice: 1, gesto: 'izq' },
    0x91: { control: 'knob', indice: 1, gesto: 'der' },
    0x34: { control: 'knob', indice: 2 },
    0x60: { control: 'knob', indice: 2, gesto: 'izq' },
    0x61: { control: 'knob', indice: 2, gesto: 'der' },
  },
};

export const MODELOS: ModeloMirabox[] = [N3];

/** El modelo al que pertenece un par VID/PID, o `null` si no es de la familia. */
export function modeloPorVidPid(vendorId: number, productId: number): ModeloMirabox | null {
  for (const modelo of MODELOS) {
    if (modelo.usbIds.some((u) => u.vendorId === vendorId && u.productIds.includes(productId))) {
      return modelo;
    }
  }
  return null;
}

/** El modelo por su identificador estable (`PageConfig.superficie.modelo`). */
export function modeloPorId(id: ModeloSuperficie): ModeloMirabox | null {
  return MODELOS.find((m) => m.modelo === id) ?? null;
}
