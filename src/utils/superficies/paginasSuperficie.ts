import type { ButtonConfig, DeckConfig, DisposicionSuperficie, Sensor } from '../../types';
import { botonesResueltos } from '../botonesFijos';
import { interpolate } from '../acciones/base';
import { botonVisible, type EstadoSistema } from '../estadoSistema';
import { idPaginaPredeterminada } from './paginaSegunApp';
import { brilloDeSuperficie, rotacionDeSuperficie } from './ajustesSuperficie';

/**
 * La página activa de un dock y sus botones, en orden de hueco.
 *
 * Vivía dentro de `useSuperficies`; se separó para que el animador de GIF
 * (`useAnimacionLcd`) resuelva exactamente la misma página que el pintor, sin
 * importar el hook entero (que crearía un ciclo).
 *
 * `botones` sale **ya resuelto para pintar y disparar**: los huecos ocultos
 * por `visibleIf` quedan en `undefined` (tecla vacía, como un hueco sin
 * acción) y las etiquetas con `{variable}` van interpoladas con el estado del
 * deck. Así las cuatro vías que usan esta página —el pintor, el animador de
 * GIF, los avisos y el disparo— ven exactamente lo mismo.
 */

/** Estado vivo que necesita la página para resolver `visibleIf`. */
export interface VivoPagina {
  estado: EstadoSistema;
  /** Sensores para `visibleIf` por sensor; `null` = aquí no hay lecturas. */
  sensores: Sensor[] | null;
}

export interface PaginaDispositivo {
  indice: number;
  disposicion: DisposicionSuperficie;
  rotacion?: number;
  brillo?: number;
  /** Un hueco oculto por `visibleIf` (o que no cabe en la página) es `undefined`. */
  botones: (ButtonConfig | undefined)[];
}

/**
 * El botón de un hueco como se pinta y se dispara: `null`-equivalente si la
 * condición `visibleIf` no se cumple, y con `label`/`sublabel` interpolados
 * con las variables del deck. Pura y con casos en el script de pruebas.
 *
 * Sin `vivo` no hay filtro de visibilidad (el llamador no tiene el estado del
 * sistema a mano), pero la interpolación sí se aplica siempre: solo necesita
 * `config.state`.
 */
export function resolverBotonPagina(
  boton: ButtonConfig | undefined,
  state: Record<string, string> | undefined,
  vivo?: VivoPagina,
): ButtonConfig | undefined {
  if (!boton) return undefined;
  if (vivo && !botonVisible(boton, vivo.estado, vivo.sensores)) return undefined;
  const label = interpolate(boton.label, state);
  const sublabel = boton.sublabel === undefined ? undefined : interpolate(boton.sublabel, state);
  if (label === boton.label && sublabel === boton.sublabel) return boton;
  return { ...boton, label, sublabel };
}

/** La página activa de un serial y sus botones, en orden de hueco (por posición). */
export function paginaDe(
  config: DeckConfig, serial: string, disposicion: DisposicionSuperficie, paginaId?: string,
  vivo?: VivoPagina,
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
    botones: botonesResueltos(config, indice)
      .map((b) => resolverBotonPagina(b, config.state, vivo)),
  };
}
