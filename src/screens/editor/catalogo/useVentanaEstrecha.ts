import { useEffect, useState } from 'react';

/** Ventana por debajo del corte: la barra lateral del catálogo se pliega. */
export function useVentanaEstrecha(corte = 720): boolean {
  const [estrecha, setEstrecha] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < corte,
  );
  useEffect(() => {
    const alRedimensionar = () => setEstrecha(window.innerWidth < corte);
    window.addEventListener('resize', alRedimensionar);
    return () => window.removeEventListener('resize', alRedimensionar);
  }, [corte]);
  return estrecha;
}
