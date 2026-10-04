/**
 * Stream Dock N4. Adaptado del módulo MIT de Bitfocus (`src/models/N4-1234.ts`
 * y `N4-1245.ts`); ver THIRD_PARTY_NOTICES.md.
 *
 * N4-1245 llega sin VID/PID en Bitfocus (el propio archivo lo marca como no
 * usado): se porta para que la tabla esté completa, pero no puede emparejar
 * con ningún aparato. La tira táctil con pantalla (176×124) queda fuera del
 * pintado: el contrato solo pone `lcd` en las teclas (ver informe).
 */

import type { LcdControl } from '../../../../src/types';
import { boton, modelo, perilla, rejilla, tira, type ControlModelo, type ModeloMirabox } from './tipos';

const CODIGOS = [
  [0x01, 0x02, 0x03, 0x04, 0x05],
  [0x06, 0x07, 0x08, 0x09, 0x0a],
];
const LCD_IDS = [
  [0x0b, 0x0c, 0x0d, 0x0e, 0x0f],
  [0x06, 0x07, 0x08, 0x09, 0x0a],
];
const LCD: LcdControl = { ancho: 112, alto: 112, rotacion: 180 };
const SOFTBUTTONS = [0x40, 0x41, 0x42, 0x43];
const PERILLAS: Array<[number, number, number]> = [
  [0x37, 0xa0, 0xa1],
  [0x35, 0x50, 0x51],
  [0x33, 0x90, 0x91],
  [0x36, 0x70, 0x71],
];

/** Columnas físicas de softbuttons, perillas y tira en cada revisión. */
function controlesN4(columnas: [number, number, number, number], columnaTira: number): ControlModelo[] {
  const controles: ControlModelo[] = rejilla(CODIGOS, LCD_IDS, LCD);
  SOFTBUTTONS.forEach((codigo, i) => controles.push(boton(i, 2, columnas[i], codigo, true)));
  PERILLAS.forEach(([pulsar, izq, der], i) => controles.push(perilla(i, 3, columnas[i], pulsar, izq, der, true)));
  controles.push(tira(0, 2, columnaTira, 0x38, 0x39));
  return controles;
}

export const N4_1234: ModeloMirabox = modelo({
  id: 'n4-1234',
  nombre: 'Stream Dock N4',
  verificado: false,
  usbIds: [
    { vendorId: 0x6602, productIds: [0x1001] },
    { vendorId: 0x6603, productIds: [0x1007] },
  ],
  controles: controlesN4([0, 1, 2, 3], 4),
});

export const N4_1245: ModeloMirabox = modelo({
  id: 'n4-1245',
  nombre: 'Stream Dock N4 (1245)',
  verificado: false,
  usbIds: [],
  controles: controlesN4([0, 1, 3, 4], 2),
});
