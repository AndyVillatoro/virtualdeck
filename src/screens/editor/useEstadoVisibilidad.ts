import { useState } from 'react';
import type { visibilidadInicial } from './valoresIniciales';

/** Cuándo se ve el botón: solo con tal aplicación delante, o según un sensor. */
export function useEstadoVisibilidad(vis: ReturnType<typeof visibilidadInicial>) {
  const [visibleIfApp, setVisibleIfApp] = useState(vis.visibleIfApp);
  const [visibleIfSensorId, setVisibleIfSensorId] = useState(vis.visibleIfSensorId);
  const [visibleIfSensorOp, setVisibleIfSensorOp] = useState(vis.visibleIfSensorOp);
  const [visibleIfSensorVal, setVisibleIfSensorVal] = useState(vis.visibleIfSensorVal);

  return {
    visibleIfApp,
    setVisibleIfApp,
    visibleIfSensorId,
    setVisibleIfSensorId,
    visibleIfSensorOp,
    setVisibleIfSensorOp,
    visibleIfSensorVal,
    setVisibleIfSensorVal,
  };
}