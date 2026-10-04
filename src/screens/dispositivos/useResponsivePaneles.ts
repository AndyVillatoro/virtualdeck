import { useEffect, useState } from 'react';
import {
  PUNTO_CORTE_INSPECTOR,
  PUNTO_CORTE_LISTA,
  calcularAnchoInspector,
  calcularAnchoLista,
} from './constantes';

export function useResponsivePaneles() {
  const [anchoVentana, setAnchoVentana] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1024,
  );

  useEffect(() => {
    const onResize = () => setAnchoVentana(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const esPequenoLista = anchoVentana < PUNTO_CORTE_LISTA;
  const esPequenoInspector = anchoVentana < PUNTO_CORTE_INSPECTOR;

  const [listaManual, setListaManual] = useState<boolean | null>(null);
  const [inspectorManual, setInspectorManual] = useState<boolean | null>(null);

  const listaAbierta = listaManual !== null ? listaManual : !esPequenoLista;
  const inspectorAbierto = inspectorManual !== null ? inspectorManual : !esPequenoInspector;

  const toggleLista = () => {
    setListaManual((prev) => (prev !== null ? !prev : !listaAbierta));
  };

  const toggleInspector = () => {
    setInspectorManual((prev) => (prev !== null ? !prev : !inspectorAbierto));
  };

  const cerrarLista = () => setListaManual(false);
  const cerrarInspector = () => setInspectorManual(false);

  const abrirInspectorSiPequeno = () => {
    if (esPequenoInspector) {
      setInspectorManual(true);
    }
  };

  return {
    anchoVentana,
    esPequenoLista,
    esPequenoInspector,
    listaAbierta,
    inspectorAbierto,
    anchoLista: calcularAnchoLista(anchoVentana),
    anchoInspector: calcularAnchoInspector(anchoVentana),
    toggleLista,
    toggleInspector,
    cerrarLista,
    cerrarInspector,
    abrirInspectorSiPequeno,
  };
}
