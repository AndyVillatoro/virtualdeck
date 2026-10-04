/**
 * Stream Dock N3 (TreasLin/Mirabox). Adaptado del módulo MIT de Bitfocus
 * (`src/models/N3-293N3.ts`); ver THIRD_PARTY_NOTICES.md.
 *
 * Es el único modelo **verificado** con hardware real (serial 81D0DA78211F):
 * la rotación que funciona en este aparato es 90° en sentido horario, no el
 * 270° que declara Bitfocus.
 */

import type { LcdControl } from '../../../../src/types';
import { boton, modelo, perilla, tecla, type ControlModelo, type ModeloMirabox } from './tipos';

const LCD: LcdControl = { ancho: 64, alto: 64, rotacion: 90 };

const CONTROLES: ControlModelo[] = [
  tecla(0, 0, 0, 0x01, LCD, 0x01),
  tecla(1, 0, 1, 0x02, LCD, 0x02),
  tecla(2, 0, 2, 0x03, LCD, 0x03),
  tecla(3, 1, 0, 0x04, LCD, 0x04),
  tecla(4, 1, 1, 0x05, LCD, 0x05),
  tecla(5, 1, 2, 0x06, LCD, 0x06),
  boton(0, 2, 0, 0x25),
  boton(1, 2, 1, 0x30),
  boton(2, 2, 2, 0x31),
  perilla(0, 0, 3, 0x35, 0x50, 0x51),
  perilla(1, 1, 3, 0x33, 0x90, 0x91),
  perilla(2, 1, 4, 0x34, 0x60, 0x61),
];

export const N3: ModeloMirabox = modelo({
  id: 'n3',
  nombre: 'Stream Dock N3',
  verificado: true,
  usbIds: [
    { vendorId: 0x5548, productIds: [0x1001] },
    { vendorId: 0x6602, productIds: [0x1003] },
    { vendorId: 0x6603, productIds: [0x1003] },
  ],
  controles: CONTROLES,
});
