/**
 * Modelos Ajazz. Adaptado del módulo MIT de Bitfocus
 * (`src/models/Ajazz-AKP03E.ts`, `Ajazz-AKP153.ts`, `Ajazz-AKP153E.ts`); ver
 * THIRD_PARTY_NOTICES.md.
 *
 * Los AKP153 y AKP153E son la familia HSV-293S con otra carcasa y otro VID/PID;
 * solo cambia la identidad USB.
 */

import type { LcdControl } from '../../../../src/types';
import { HSV_293S_2, HSV_293S_3 } from './hsv';
import { boton, modelo, perilla, tecla, type ControlModelo, type ModeloMirabox } from './tipos';

const LCD_64: LcdControl = { ancho: 64, alto: 64, rotacion: 270 };

const CONTROLES_AKP03E: ControlModelo[] = [
  tecla(0, 0, 0, 0x01, LCD_64, 0x01),
  tecla(1, 0, 1, 0x02, LCD_64, 0x02),
  tecla(2, 0, 2, 0x03, LCD_64, 0x03),
  tecla(3, 1, 0, 0x04, LCD_64, 0x04),
  tecla(4, 1, 1, 0x05, LCD_64, 0x05),
  tecla(5, 1, 2, 0x06, LCD_64, 0x06),
  boton(0, 2, 0, 0x25),
  boton(1, 2, 1, 0x30),
  boton(2, 2, 2, 0x31),
  perilla(0, 0, 3, 0x35, 0x50, 0x51),
  perilla(1, 1, 3, 0x33, 0x90, 0x91),
  perilla(2, 1, 4, 0x34, 0x60, 0x61),
];

export const AKP03E: ModeloMirabox = modelo({
  id: 'akp03e',
  nombre: 'Ajazz AKP03E',
  verificado: false,
  usbIds: [{ vendorId: 0x0300, productIds: [0x3002] }],
  controles: CONTROLES_AKP03E,
});

export const AKP153: ModeloMirabox = modelo({
  id: 'akp153',
  nombre: 'AJAZZ AKP-153',
  verificado: false,
  packetSize: HSV_293S_2.packetSize,
  usbIds: [
    { vendorId: 0x5548, productIds: [0x6674] },
    { vendorId: 0x0300, productIds: [0x1010] },
  ],
  controles: HSV_293S_2.controles,
});

export const AKP153E: ModeloMirabox = modelo({
  id: 'akp153e',
  nombre: 'AJAZZ AKP-153E',
  verificado: false,
  packetSize: HSV_293S_3.packetSize,
  usbIds: [{ vendorId: 0x0300, productIds: [0x3010] }],
  controles: HSV_293S_3.controles,
});
