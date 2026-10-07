import { useEffect, useState } from 'react';

/**
 * Ancho y alto de la ventana, al día con cada cambio de tamaño. Lo comparten
 * las piezas que se reorganizan en ventanas pequeñas (la principal, la barra
 * de título): antes solo se miraba el alto, y en una ventana estrecha los
 * paneles laterales y los botones de la barra se salían por la derecha.
 */
export function useTamanoVentana(): { ancho: number; alto: number } {
  const leer = () => ({
    ancho: typeof window !== 'undefined' ? window.innerWidth : 1280,
    alto: typeof window !== 'undefined' ? window.innerHeight : 720,
  });
  const [tam, setTam] = useState(leer);
  useEffect(() => {
    const alCambiar = () => setTam(leer());
    alCambiar();
    window.addEventListener('resize', alCambiar);
    return () => window.removeEventListener('resize', alCambiar);
  }, []);
  return tam;
}
