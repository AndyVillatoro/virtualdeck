import { useState } from 'react';
import { clonarMatriz, type FotogramaPuntos, type MatrizPuntos } from './matricesPuntos';

/**
 * EditorPuntos — estado de la sesión de dibujo (un hook por pestaña).
 *
 * Guarda una lista de fotogramas con su índice activo: hoy hay uno solo y no
 * hay interfaz para más, pero la forma ya es la que pedirán los iconos
 * animados (roadmap 78). Todo lo que cambia la matriz pasa por `transformar`,
 * que guarda el paso anterior en el historial para deshacer (Ctrl+Z); el
 * pintado en vivo usa `fijarMatriz` sin historial porque el trazo entero se
 * registra una vez al apoyar el puntero (`iniciarTrazo`).
 */
export interface EstadoEditorPuntos {
  /** Fotograma activo (lo que se ve en el lienzo). */
  matriz: MatrizPuntos;
  /** Todos los fotogramas (hoy: uno). */
  fotogramas: FotogramaPuntos[];
  /** Cuántos fotogramas hay (hoy: 1). */
  totalFotogramas: number;
  puedeDeshacer: boolean;
  iniciarTrazo: () => void;
  fijarMatriz: (m: MatrizPuntos) => void;
  deshacer: () => void;
  transformar: (fn: (m: MatrizPuntos) => MatrizPuntos) => void;
  reemplazarTodo: (m: MatrizPuntos) => void;
}

const MAX_HISTORIAL = 20;

/**
 * Contrato que cada pestaña expone a la carcasa del editor: guardar su
 * formato y deshacer su último paso (para el pie común y Ctrl+Z).
 */
export interface ManejadorPestanaPuntos {
  guardar: () => void;
  deshacer: () => void;
}

export function useEditorPuntos(matrizInicial: MatrizPuntos): EstadoEditorPuntos {
  const [fotogramas, setFotogramas] = useState<FotogramaPuntos[]>(() => [clonarMatriz(matrizInicial)]);
  const [historial, setHistorial] = useState<MatrizPuntos[]>([]);

  const matriz = fotogramas[0] ?? matrizInicial;

  function iniciarTrazo(): void {
    const actual = matriz;
    setHistorial((prev) => [...prev.slice(-MAX_HISTORIAL), clonarMatriz(actual)]);
  }

  function fijarMatriz(m: MatrizPuntos): void {
    setFotogramas([m]);
  }

  function deshacer(): void {
    setHistorial((prev) => {
      if (prev.length === 0) return prev;
      const anterior = prev[prev.length - 1];
      setFotogramas([anterior]);
      return prev.slice(0, -1);
    });
  }

  function transformar(fn: (m: MatrizPuntos) => MatrizPuntos): void {
    iniciarTrazo();
    setFotogramas((prev) => [fn(prev[0])]);
  }

  function reemplazarTodo(m: MatrizPuntos): void {
    iniciarTrazo();
    setFotogramas([clonarMatriz(m)]);
  }

  return {
    matriz,
    fotogramas,
    totalFotogramas: fotogramas.length,
    puedeDeshacer: historial.length > 0,
    iniciarTrazo,
    fijarMatriz,
    deshacer,
    transformar,
    reemplazarTodo,
  };
}
