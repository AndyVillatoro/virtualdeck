/**
 * La tabla de modelos: registro, búsqueda por VID/PID y disposiciones.
 *
 * Portada del módulo MIT `companion-surface-mirabox-stream-dock` de Bitfocus
 * (`src/models/list.ts` y los doce modelos de `src/models/*.ts`); ver
 * THIRD_PARTY_NOTICES.md. No se usa código de OpenDeck ni de opendeck-akp03.
 *
 * El N3 va primero y es el único `verificado: true` (hay una página guardada
 * con el id `'n3'` y su rotación de 90° está medida con el aparato).
 */

import type { DisposicionSuperficie, ModeloSuperficie } from '../../../../src/types';
import { N3 } from './n3';
import { HSV_293S, HSV_293S_2, HSV_293S_3 } from './hsv';
import { AKP03E, AKP153, AKP153E } from './ajazz';
import { M18V3, MIRABOX_XL, V293 } from './grandes';
import { N4_1234, N4_1245 } from './n4';
import { disposicionDe, type ModeloMirabox } from './tipos';

export type { ModeloMirabox } from './tipos';
export { disposicionDe } from './tipos';

export const MODELOS: ModeloMirabox[] = [
  N3,
  V293,
  MIRABOX_XL,
  N4_1234,
  N4_1245,
  HSV_293S,
  HSV_293S_2,
  HSV_293S_3,
  M18V3,
  AKP153,
  AKP153E,
  AKP03E,
];

/** El modelo al que pertenece un par VID/PID, o `null` si no es de la familia. */
export function modeloPorVidPid(vendorId: number, productId: number): ModeloMirabox | null {
  for (const modelo of MODELOS) {
    if (modelo.usbIds.some((u) => u.vendorId === vendorId && u.productIds.includes(productId))) {
      return modelo;
    }
  }
  return null;
}

/** Todas las disposiciones por id: lo que ve la pantalla, también sin dispositivo. */
export function disposiciones(): Record<ModeloSuperficie, DisposicionSuperficie> {
  const salida: Record<string, DisposicionSuperficie> = {};
  for (const modelo of MODELOS) salida[modelo.id] = disposicionDe(modelo);
  return salida;
}
