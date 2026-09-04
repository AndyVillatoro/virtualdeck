import { useEffect, useRef, useState, type DragEvent, type RefObject } from 'react';
import { EVENTO_SOBRE, EVENTO_FUERA, EVENTO_SOLTAR } from './usePulsacionTactil';

/**
 * Mover un botón arrastrándolo, con el ratón y con el dedo.
 *
 * Los dos extremos del gesto viven aquí: esta celda como origen (los cinco
 * manejadores de HTML5) y como destino (los tres eventos propios que emite
 * `usePulsacionTactil`, porque el arrastre nativo no existe con el dedo).
 *
 * Estaba suelto dentro de `ButtonCell`, y eran cinco funciones inline con su
 * lógica dentro: un tercio de la complejidad del componente.
 *
 * **El id viaja dentro del propio arrastre, nunca en el estado de React.** La
 * celda está memoizada con un comparador que ignora los manejadores a
 * propósito, así que `onDrop` sigue siendo el que se creó antes de empezar a
 * arrastrar; si leyera el id del estado del padre vería el valor viejo y el
 * drop no haría nada. Eso es exactamente lo que pasaba.
 */
export function useArrastreCelda({
  ref, idBoton, onDragStart, onDragEnd, onDrop, alEmpezarArrastre, setPressed,
}: {
  ref: RefObject<HTMLDivElement>;
  idBoton: string;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onDrop?: (sourceId: string) => void;
  /** Lo que el gesto de ratón necesita saber para no disparar la acción. */
  alEmpezarArrastre: () => void;
  setPressed: (v: boolean) => void;
}) {
  const [dragOver, setDragOver] = useState(false);

  // Por referencia y no por dependencias: el comparador del `memo` ignora la
  // identidad de los manejadores, así que un efecto que dependiera de ellos se
  // quedaría con el primero para siempre.
  const onDropRef = useRef(onDrop);
  onDropRef.current = onDrop;

  // El otro extremo del arrastre táctil: esta celda como destino.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const sobre = () => setDragOver(true);
    const fuera = () => setDragOver(false);
    const soltar = (e: Event) => {
      setDragOver(false);
      onDropRef.current?.((e as CustomEvent<string>).detail);
    };
    el.addEventListener(EVENTO_SOBRE, sobre);
    el.addEventListener(EVENTO_FUERA, fuera);
    el.addEventListener(EVENTO_SOLTAR, soltar);
    return () => {
      el.removeEventListener(EVENTO_SOBRE, sobre);
      el.removeEventListener(EVENTO_FUERA, fuera);
      el.removeEventListener(EVENTO_SOLTAR, soltar);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const props = {
    onDragStart: (e: DragEvent<HTMLDivElement>) => {
      alEmpezarArrastre();
      e.dataTransfer.effectAllowed = 'move';
      // El estándar exige adjuntar datos para que el arrastre arranque. Sin
      // esto, Chromium inicia el gesto pero no lo trata como un arrastre con
      // carga: el drop no llega y el botón nunca se mueve.
      e.dataTransfer.setData('text/plain', idBoton);
      onDragStart?.();
    },
    onDragEnd: () => {
      onDragEnd?.();
      setDragOver(false);
      setPressed(false);
    },
    onDragOver: (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDragOver(true);
    },
    onDragLeave: () => setDragOver(false),
    onDrop: (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      onDrop?.(e.dataTransfer.getData('text/plain'));
    },
  };

  return { dragOver, props };
}
