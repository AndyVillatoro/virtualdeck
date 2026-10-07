import { useState } from 'react';
import { useFormatoPantalla } from '../../utils/useFormatoPantalla';
import {
  PUNTO_CORTE_INSPECTOR,
  PUNTO_CORTE_LISTA,
  calcularAnchoInspector,
  calcularAnchoLista,
} from './constantes';

export function useResponsivePaneles() {
  const { formato, ancho: anchoVentana, alto: altoVentana } = useFormatoPantalla();
  const esBarra = formato === 'barra';

  const esPequenoLista = esBarra || anchoVentana < PUNTO_CORTE_LISTA;
  const esPequenoInspector = esBarra || anchoVentana < PUNTO_CORTE_INSPECTOR;

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
    formato,
    esBarra,
    anchoVentana,
    altoVentana,
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
