import { useEffect, useState } from 'react';
import type { estiloInicial, widgetInicial } from '../datos/valoresIniciales';

interface UseEstadoWidgetOpciones {
  est: ReturnType<typeof estiloInicial>;
  wid: ReturnType<typeof widgetInicial>;
  /** El tipo de acción en curso: reproduce audio o no. */
  tipoAccion: string;
}

/** El widget que se pinta encima del botón: sensor, variable, divisa o deslizador. */
export function useEstadoWidget({ est, wid, tipoAccion }: UseEstadoWidgetOpciones) {
  const [widget, setWidget] = useState(est.widget);
  const [sensorWidgetId, setSensorWidgetId] = useState(wid.sensorWidgetId);
  const [sensorWidgetSuffix, setSensorWidgetSuffix] = useState(wid.sensorWidgetSuffix);
  const [sensorWidgetWarn, setSensorWidgetWarn] = useState(wid.sensorWidgetWarn);
  const [sensorWidgetCrit, setSensorWidgetCrit] = useState(wid.sensorWidgetCrit);
  const [varWidgetName, setVarWidgetName] = useState(wid.varWidgetName);
  const [varWidgetPrefix, setVarWidgetPrefix] = useState(wid.varWidgetPrefix);
  const [varWidgetSuffix, setVarWidgetSuffix] = useState(wid.varWidgetSuffix);
  const [currencyWidget, setCurrencyWidget] = useState(wid.currencyWidget);
  const [sliderWidget, setSliderWidget] = useState(wid.sliderWidget);

  useEffect(() => {
    if (tipoAccion === 'audio-device' && widget === 'now-playing') setWidget(undefined);
  }, [tipoAccion, widget]);

  return {
    widget,
    setWidget,
    sensorWidgetId,
    setSensorWidgetId,
    sensorWidgetSuffix,
    setSensorWidgetSuffix,
    sensorWidgetWarn,
    setSensorWidgetWarn,
    sensorWidgetCrit,
    setSensorWidgetCrit,
    varWidgetName,
    setVarWidgetName,
    varWidgetPrefix,
    setVarWidgetPrefix,
    varWidgetSuffix,
    setVarWidgetSuffix,
    currencyWidget,
    setCurrencyWidget,
    sliderWidget,
    setSliderWidget,
  };
}