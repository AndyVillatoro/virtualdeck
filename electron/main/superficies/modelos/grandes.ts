/**
 * Modelos grandes: 293V3, M18V3 y Stream Dock XL. Adaptado del módulo MIT de
 * Bitfocus (`src/models/293V3.ts`, `M18V3.ts`, `Mirabox-XL.ts`); ver
 * THIRD_PARTY_NOTICES.md.
 *
 * El XL añade dos balancines de tres botones cada uno (sin pantalla); su tira
 * de LEDs lateral queda fuera de la tabla (ver informe).
 */

import { boton, modelo, rejilla, type ControlModelo, type ModeloMirabox } from './tipos';

const CODIGOS_15 = [
  [0x01, 0x02, 0x03, 0x04, 0x05],
  [0x06, 0x07, 0x08, 0x09, 0x0a],
  [0x0b, 0x0c, 0x0d, 0x0e, 0x0f],
];
const LCD_IDS_15 = [
  [0x0b, 0x0c, 0x0d, 0x0e, 0x0f],
  [0x06, 0x07, 0x08, 0x09, 0x0a],
  [0x01, 0x02, 0x03, 0x04, 0x05],
];

export const V293: ModeloMirabox = modelo({
  id: '293v3',
  nombre: 'Stream Dock 293V3',
  verificado: false,
  usbIds: [{ vendorId: 0x6603, productIds: [0x1005, 0x1006] }],
  controles: rejilla(CODIGOS_15, LCD_IDS_15, { ancho: 112, alto: 112, rotacion: 180 }),
});

export const M18V3: ModeloMirabox = modelo({
  id: 'm18v3',
  nombre: 'Stream Dock M18V3',
  verificado: false,
  usbIds: [{ vendorId: 0x6603, productIds: [0x1012] }],
  controles: [
    ...rejilla(CODIGOS_15, LCD_IDS_15, { ancho: 60, alto: 60, rotacion: 0 }),
    boton(0, 3, 1, 0x25),
    boton(1, 3, 2, 0x30),
    boton(2, 3, 3, 0x31),
  ],
});

const CODIGOS_XL = [
  [0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08],
  [0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f, 0x10],
  [0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18],
  [0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f, 0x20],
];
const LCD_IDS_XL = [
  [0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f, 0x20],
  [0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18],
  [0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f, 0x10],
  [0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08],
];

/** Balancín izquierdo (columna 0) y derecho (columna 9): arriba, pulsar, abajo. */
const BALANCINES: ControlModelo[] = [
  boton(0, 0, 0, 0x21),
  boton(1, 1, 0, 0x22),
  boton(2, 2, 0, 0x23),
  boton(3, 0, 9, 0x24),
  boton(4, 1, 9, 0x25),
  boton(5, 2, 9, 0x26),
];

export const MIRABOX_XL: ModeloMirabox = modelo({
  id: 'mirabox-xl',
  nombre: 'Stream Dock XL',
  verificado: false,
  usbIds: [{ vendorId: 0x5548, productIds: [0x1031, 0x1028] }],
  controles: [
    ...rejilla(CODIGOS_XL, LCD_IDS_XL, { ancho: 80, alto: 80, rotacion: 180 }),
    ...BALANCINES,
  ],
});
