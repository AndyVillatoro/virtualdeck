import type { Recorte } from './recorteVideo';

/**
 * Tamaño del cuadro que se pide al navegador para la captura de la ventana.
 * Todo puro, sin DOM, para poder razonarlo con números.
 *
 * Medido (T-VID-01, `_referencias/informes/video-panel-113.md`): pedir el cuadro
 * a la medida de la caja da la misma imagen que pedir la ventana entera y cuesta
 * 2,8 veces menos CPU (1,78 % frente a 0,64 % de la máquina con los mismos
 * fotogramas por segundo).
 */

/** Tope: por encima de esto el panel no gana nada y la captura se paga sola. */
const TOPE_CAPTURA = { ancho: 1920, alto: 1080 } as const;

/** Por debajo de esto no hay nada que enseñar. */
const MINIMO = 64;

export interface PedidoCaptura {
  maxWidth: number;
  maxHeight: number;
}

const acotar = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * Con la ventana entera se pide el tamaño de la caja en píxeles de pantalla: el
 * reductor del navegador hace el ajuste y el compositor no tiene que encoger un
 * cuadro cinco veces mayor (que era lo borroso que se veía).
 *
 * Con recorte se pide `caja / recorte`: la zona recortada llega a la caja a
 * aproximadamente 1:1 en vez de ampliarse, que es lo segundo que se veía borroso.
 *
 * El mínimo va a 1 en los dos casos porque solo se pide un **máximo**: si no,
 * una ventana pequeña se ampliaría para llenar el pedido y saldría borrosa.
 */
export function tamanoPedido(
  ancho: number,
  alto: number,
  escala: number,
  recorte?: Recorte,
): PedidoCaptura | null {
  if (ancho <= 0 || alto <= 0 || escala <= 0) return null;
  const divisorX = recorte && recorte.w > 0 ? recorte.w : 1;
  const divisorY = recorte && recorte.h > 0 ? recorte.h : 1;
  return {
    maxWidth: acotar(Math.ceil((ancho * escala) / divisorX), MINIMO, TOPE_CAPTURA.ancho),
    maxHeight: acotar(Math.ceil((alto * escala) / divisorY), MINIMO, TOPE_CAPTURA.alto),
  };
}
