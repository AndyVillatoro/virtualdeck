import { useEffect, useState, type RefObject } from 'react';

/**
 * Captura de una ventana (`desktopCapturer` en el proceso principal) y su
 * pintado en un `<video>`. La forma `chromeMediaSource: 'desktop'` es la de
 * Electron; el tipo de DOM no la conoce, así que se declara aparte.
 */
interface RestriccionEscritorio {
  mandatory: { chromeMediaSource: 'desktop'; chromeMediaSourceId: string; maxFrameRate: number };
}

export type EstadoStream = 'inactivo' | 'cargando' | 'ok' | 'error';

export function capturarVentana(id: string): Promise<MediaStream> {
  const video: MediaTrackConstraints & RestriccionEscritorio = {
    mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: id, maxFrameRate: 30 },
  };
  return navigator.mediaDevices.getUserMedia({ audio: false, video });
}

function detener(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop());
}

/**
 * Mantiene la captura de `sourceId` mientras el componente vive. Al cambiar de
 * ventana, al desmontar o si la ventana se cierra, para todas las pistas: nada
 * sigue capturando a escondidas.
 */
export function useStreamVentana(sourceId: string | null, videoRef: RefObject<HTMLVideoElement>): EstadoStream {
  const [estado, setEstado] = useState<EstadoStream>('inactivo');

  useEffect(() => {
    if (!sourceId) {
      setEstado('inactivo');
      return undefined;
    }
    let vivo = true;
    let stream: MediaStream | null = null;
    const el = videoRef.current;
    setEstado('cargando');

    capturarVentana(sourceId).then((nuevo) => {
      if (!vivo || !el) { detener(nuevo); return; }
      stream = nuevo;
      el.srcObject = nuevo;
      void el.play().catch(() => {});
      nuevo.getVideoTracks()[0]?.addEventListener('ended', () => { if (vivo) setEstado('error'); });
      setEstado('ok');
    }).catch(() => { if (vivo) setEstado('error'); });

    return () => {
      vivo = false;
      detener(stream);
      if (el) el.srcObject = null;
    };
  }, [sourceId, videoRef]);

  return estado;
}
