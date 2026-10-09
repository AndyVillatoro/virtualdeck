/**
 * Tipos y constructores de la tabla de modelos Mirabox/Ajazz/Stream Dock.
 *
 * Portada del módulo MIT `companion-surface-mirabox-stream-dock` de Bitfocus
 * (`src/models/*.ts` y `src/streamdock.ts`); ver THIRD_PARTY_NOTICES.md. No se
 * usa código de OpenDeck ni de opendeck-akp03 (GPL).
 *
 * Cada modelo guarda los controles **en el orden de los huecos** de su página
 * (teclas, botones, perillas, tiras) y, por cada código del byte 9, el gesto
 * que produce. `modelo()` deriva de ahí el mapa que usa el driver.
 */

import type {
  ControlSuperficie, DisposicionSuperficie, GestoSuperficie, LcdControl,
} from '../../../../src/types';

/** Una entrada del protocolo: a qué control e índice corresponde un código. */
interface EntradaFisica {
  control: ControlSuperficie;
  indice: number;
  /** Gesto fijo (giros, tiras y protocolos sin `up`). Si falta, lo decide el byte 10. */
  gesto?: GestoSuperficie;
}

/** Una entrada declarada por el modelo, antes de volcarla al mapa del driver. */
interface EntradaModelo {
  codigo: number;
  gesto: GestoSuperficie;
  /** `true` = gesto fijo (el byte 10 no importa): protocolo viejo o `push`. */
  fijo: boolean;
}

export interface ControlModelo {
  tipo: ControlSuperficie;
  /** Índice 0-based dentro de su tipo. */
  indice: number;
  fila: number;
  columna: number;
  /** Solo en `key`: tamaño y giro de su pantalla. */
  lcd?: LcdControl;
  /** Id de la salida LCD en el protocolo; no siempre es `indice + 1`. */
  lcdId?: number;
  entradas: EntradaModelo[];
}

export interface ModeloMirabox {
  id: string;
  nombre: string;
  /** `true` solo si se probó con hardware real. */
  verificado: boolean;
  usbIds: Array<{ vendorId: number; productIds: number[] }>;
  /** Interfaz HID de control (Bitfocus exige `interface === 0`). */
  interfazControl: number;
  /** Bytes útiles por paquete de salida (1024 salvo los modelos viejos). */
  packetSize: number;
  controles: ControlModelo[];
  /** Código del byte 9 → entrada (lo arma `modelo()`). */
  entradas: Record<number, EntradaFisica>;
}

export const TAMANO_PAQUETE = 1024;

/** Tecla con LCD. `pulso` = protocolo sin `up` (un solo evento al pulsar). */
export function tecla(
  indice: number, fila: number, columna: number, codigo: number,
  lcd: LcdControl, lcdId: number, pulso = false,
): ControlModelo {
  return {
    tipo: 'key', indice, fila, columna, lcd, lcdId,
    entradas: [{ codigo, gesto: 'down', fijo: pulso }],
  };
}

/** Botón sin LCD. `pulso` = protocolo sin `up`. */
export function boton(indice: number, fila: number, columna: number, codigo: number, pulso = false): ControlModelo {
  return {
    tipo: 'button', indice, fila, columna,
    entradas: [{ codigo, gesto: 'down', fijo: pulso }],
  };
}

/** Perilla: pulsar (código), girar a la izquierda, girar a la derecha. */
export function perilla(
  indice: number, fila: number, columna: number,
  pulsar: number, izq: number, der: number, pulso = false,
): ControlModelo {
  return {
    tipo: 'knob', indice, fila, columna,
    entradas: [
      { codigo: pulsar, gesto: 'down', fijo: pulso },
      { codigo: izq, gesto: 'izq', fijo: true },
      { codigo: der, gesto: 'der', fijo: true },
    ],
  };
}

/** Tira táctil: deslizar a la izquierda o a la derecha (sin `up`). */
export function tira(indice: number, fila: number, columna: number, izq: number, der: number): ControlModelo {
  return {
    tipo: 'swipe', indice, fila, columna,
    entradas: [
      { codigo: izq, gesto: 'izq', fijo: true },
      { codigo: der, gesto: 'der', fijo: true },
    ],
  };
}

/** Cierra una definición y deriva el mapa del driver. */
export function modelo(base: Omit<ModeloMirabox, 'entradas' | 'interfazControl' | 'packetSize'> & {
  interfazControl?: number;
  packetSize?: number;
}): ModeloMirabox {
  const entradas: Record<number, EntradaFisica> = {};
  for (const control of base.controles) {
    for (const entrada of control.entradas) {
      entradas[entrada.codigo] = {
        control: control.tipo,
        indice: control.indice,
        gesto: entrada.fijo ? entrada.gesto : undefined,
      };
    }
  }
  return {
    ...base,
    interfazControl: base.interfazControl ?? 0,
    packetSize: base.packetSize ?? TAMANO_PAQUETE,
    entradas,
  };
}

/** La parte de un modelo que ve el renderer (sin datos del driver). */
export function disposicionDe(m: ModeloMirabox): DisposicionSuperficie {
  return {
    nombre: m.nombre,
    verificado: m.verificado,
    controles: m.controles.map((c) => ({
      tipo: c.tipo,
      indice: c.indice,
      fila: c.fila,
      columna: c.columna,
      ...(c.lcd ? { lcd: c.lcd } : {}),
    })),
  };
}

/** Rejilla de teclas en fila-mayor: códigos por fila y ids de LCD por fila. */
export function rejilla(
  codigos: number[][],
  lcdIds: number[][],
  lcd: LcdControl,
  pulso = false,
): ControlModelo[] {
  const controles: ControlModelo[] = [];
  let indice = 0;
  codigos.forEach((filaCodigos, fila) => {
    filaCodigos.forEach((codigo, columna) => {
      controles.push(tecla(indice, fila, columna, codigo, lcd, lcdIds[fila][columna], pulso));
      indice += 1;
    });
  });
  return controles;
}
