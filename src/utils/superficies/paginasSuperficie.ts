import type { ButtonConfig, DeckConfig, DisposicionSuperficie } from '../../types';
import { botonesResueltos } from '../botonesFijos';
import { idPaginaPredeterminada } from './paginaSegunApp';
import { brilloDeSuperficie, rotacionDeSuperficie } from './ajustesSuperficie';

/**
 * La página activa de un dock y sus botones, en orden de hueco.
 *
 * Vivía dentro de `useSuperficies`; se separó para que el animador de GIF
 * (`useAnimacionLcd`) resuelva exactamente la misma página que el pintor, sin
 * importar el hook entero (que crearía un ciclo).
 */

export interface PaginaDispositivo {
  indice: number;
  disposicion: DisposicionSuperficie;
  rotacion?: number;
  brillo?: number;
  botones: ButtonConfig[];
}

/** La página activa de un serial y sus botones, en orden de hueco (por posición). */
export function paginaDe(
  config: DeckConfig, serial: string, disposicion: DisposicionSuperficie, paginaId?: string,
): PaginaDispositivo | null {
  const delSerial: number[] = [];
  config.pages.forEach((p, i) => { if (p.superficie?.serial === serial) delSerial.push(i); });
  if (delSerial.length === 0) return null;
  // Por id, nunca por índice: borrar o reordenar páginas renumera los
  // índices. Si el id ya no existe, se vuelve a la predeterminada.
  let indice = paginaId !== undefined
    ? delSerial.find((i) => config.pages[i].id === paginaId)
    : undefined;
  if (indice === undefined) {
    const predeterminada = idPaginaPredeterminada(config.pages, serial);
    indice = delSerial.find((i) => config.pages[i].id === predeterminada) ?? delSerial[0];
  }
  if (!config.pages[indice].superficie) return null;
  return {
    indice,
    disposicion,
    rotacion: rotacionDeSuperficie(config, serial),
    brillo: brilloDeSuperficie(config, serial),
    // Resueltos con los fijos del dock: lo que se pinta es lo que se dispara
    // al pulsar (y viceversa), en el mismo hueco.
    botones: botonesResueltos(config, indice),
  };
}
