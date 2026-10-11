import { useState } from 'react';
import type { estiloInicial } from './valoresIniciales';
import type { EfectoPuntos, EfectoPulsar } from '../../types';

/** Cómo se ve el botón: rótulos, colores, animación, y el aspecto encendido. */
export function useEstadoApariencia(est: ReturnType<typeof estiloInicial>) {
  const [label, setLabel] = useState(est.label);
  const [sublabel, setSublabel] = useState(est.sublabel);
  const [bgColor, setBgColor] = useState(est.bgColor);
  const [fgColor, setFgColor] = useState(est.fgColor);
  const [fijo, setFijo] = useState(est.fijo);
  const [animacionEfecto, setAnimacionEfecto] = useState<EfectoPuntos | undefined>(
    est.animacion?.efecto
  );
  const [animacionCuando, setAnimacionCuando] = useState<'siempre' | 'al-pulsar' | 'encendido'>(
    est.animacion?.cuando ?? 'siempre'
  );
  const [efectoPulsar, setEfectoPulsar] = useState<EfectoPulsar>(
    est.efectoPulsar ?? 'destello'
  );
  const [encendidoIcon, setEncendidoIcon] = useState<string>(est.aspectoEncendido?.icon ?? '');
  const [encendidoIconoPuntos, setEncendidoIconoPuntos] = useState<{ bits: string; origen: string } | undefined>(
    est.aspectoEncendido?.iconoPuntos
  );
  const [encendidoBgColor, setEncendidoBgColor] = useState<string>(est.aspectoEncendido?.bgColor ?? '');
  const [encendidoFgColor, setEncendidoFgColor] = useState<string>(est.aspectoEncendido?.fgColor ?? '');
  const [previewToggled, setPreviewToggled] = useState(false);

  return {
    label,
    setLabel,
    sublabel,
    setSublabel,
    bgColor,
    setBgColor,
    fgColor,
    setFgColor,
    fijo,
    setFijo,
    animacionEfecto,
    setAnimacionEfecto,
    animacionCuando,
    setAnimacionCuando,
    efectoPulsar,
    setEfectoPulsar,
    encendidoIcon,
    setEncendidoIcon,
    encendidoIconoPuntos,
    setEncendidoIconoPuntos,
    encendidoBgColor,
    setEncendidoBgColor,
    encendidoFgColor,
    setEncendidoFgColor,
    previewToggled,
    setPreviewToggled,
  };
}