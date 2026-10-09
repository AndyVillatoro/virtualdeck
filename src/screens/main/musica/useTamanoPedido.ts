import { useEffect, useState } from 'react';
import { tamanoPedido, type PedidoCaptura } from './tamanoCaptura';
import type { Recorte } from './recorteVideo';

/** Rebote: el contenedor se redimensiona a trompicones y pedir la captura en cada tick se nota. */
const ESPERA_MS = 300;

/**
 * Tamaño que se pide a `getUserMedia`, a partir del tamaño real de la caja y del
 * recorte guardado. `null` hasta que la caja está medida: entonces se captura
 * sin tamaño y, en cuanto se sabe, se vuelve a pedir como toca.
 */
export function useTamanoPedido(ancho: number, alto: number, recorte: Recorte | undefined): PedidoCaptura | null {
  const [pedido, setPedido] = useState<PedidoCaptura | null>(null);
  const anchoRecorte = recorte?.w ?? 1;
  const altoRecorte = recorte?.h ?? 1;

  useEffect(() => {
    const id = setTimeout(() => {
      setPedido(tamanoPedido(ancho, alto, window.devicePixelRatio || 1, recorte));
    }, ESPERA_MS);
    return () => clearTimeout(id);
  }, [ancho, alto, anchoRecorte, altoRecorte, recorte]);

  return pedido;
}
