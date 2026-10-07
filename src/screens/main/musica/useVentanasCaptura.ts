import { useCallback, useEffect, useRef, useState } from 'react';
import type { ElectronAPI, PistaCaptura, ResultadoVentanas } from '../../../types';

/**
 * Lista de ventanas capturables y la que parece la de lo que suena. Se pide al
 * montar y cada vez que se pide `recargar` (al abrir el selector): listar mira
 * miniaturas de todas las ventanas, así que no se repite por cada cambio de pista.
 */
export function useVentanasCaptura(api: ElectronAPI | undefined, pista: PistaCaptura) {
  const [datos, setDatos] = useState<ResultadoVentanas | null>(null);
  // La pista se lee por referencia: que cambie de canción no pide otra lista.
  const pistaRef = useRef(pista);
  pistaRef.current = pista;

  const recargar = useCallback(() => {
    if (!api) return;
    api.captura.ventanas(pistaRef.current)
      .then(setDatos)
      .catch(() => setDatos({ ventanas: [], candidata: null }));
  }, [api]);

  useEffect(() => { recargar(); }, [recargar]);

  return {
    ventanas: datos?.ventanas ?? [],
    candidata: datos?.candidata ?? null,
    cargando: datos === null,
    recargar,
  };
}
