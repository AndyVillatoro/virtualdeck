/**
 * Familia HSV-293S (Mirabox/Ajazz de 15 teclas + 3 softbuttons con pantalla).
 * Adaptado del módulo MIT de Bitfocus (`src/models/HSV-293S*.ts`); ver
 * THIRD_PARTY_NOTICES.md.
 *
 * Las tres revisiones comparten distribución y cambian el protocolo:
 * la primera y la tercera distinguen `up`; la segunda (packetSize 512) manda
 * un solo evento por pulsación, como los modelos viejos.
 */

import type { LcdControl } from '../../../../src/types';
import { modelo, tecla, type ControlModelo, type ModeloMirabox } from './tipos';

/** Códigos del byte 9 de la rejilla 5×3, en fila-mayor. */
const CODIGOS = [
  [0x0d, 0x0a, 0x07, 0x04, 0x01],
  [0x0e, 0x0b, 0x08, 0x05, 0x02],
  [0x0f, 0x0c, 0x09, 0x06, 0x03],
];
const SOFTBUTTONS = [0x10, 0x11, 0x12];

function controlesHsv(lcdTecla: LcdControl, lcdTira: LcdControl, pulso: boolean): ControlModelo[] {
  const controles: ControlModelo[] = [];
  let indice = 0;
  CODIGOS.forEach((fila, f) => {
    fila.forEach((codigo, columna) => {
      controles.push(tecla(indice, f, columna, codigo, lcdTecla, codigo, pulso));
      indice += 1;
    });
  });
  SOFTBUTTONS.forEach((codigo, fila) => {
    controles.push(tecla(indice, fila, 5, codigo, lcdTira, codigo, pulso));
    indice += 1;
  });
  return controles;
}

const TECLA_100: LcdControl = { ancho: 100, alto: 100, rotacion: 90 };
const TIRA_80: LcdControl = { ancho: 80, alto: 80, rotacion: 90 };
const TECLA_85: LcdControl = { ancho: 85, alto: 85, rotacion: 90 };
const TECLA_96: LcdControl = { ancho: 96, alto: 96, rotacion: 90 };

export const HSV_293S: ModeloMirabox = modelo({
  id: 'hsv-293s',
  nombre: 'Stream Dock HSV 293S',
  verificado: false,
  usbIds: [
    { vendorId: 0x6602, productIds: [0x1014] },
    { vendorId: 0x6603, productIds: [0x1014] },
  ],
  controles: controlesHsv(TECLA_100, TIRA_80, false),
});

export const HSV_293S_2: ModeloMirabox = modelo({
  id: 'hsv-293s-2',
  nombre: 'Stream Dock HSV 293S (v2)',
  verificado: false,
  packetSize: 512,
  usbIds: [{ vendorId: 0x5548, productIds: [0x6670] }],
  controles: controlesHsv(TECLA_85, TIRA_80, true),
});

export const HSV_293S_3: ModeloMirabox = modelo({
  id: 'hsv-293s-3',
  nombre: 'Stream Dock HSV 293S (v3)',
  verificado: false,
  usbIds: [{ vendorId: 0x1500, productIds: [0x3003] }],
  controles: controlesHsv(TECLA_96, TIRA_80, false),
});
