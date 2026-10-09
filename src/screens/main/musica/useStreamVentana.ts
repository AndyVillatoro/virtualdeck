import { useEffect, useState, type RefObject } from 'react';
import type { PedidoCaptura } from './tamanoCaptura';

/**
 * Captura de una ventana (`desktopCapturer` en el proceso principal) y su
 * pintado en un `<video>`. La forma `chromeMediaSource: 'desktop'` es la de
 * Electron; el tipo de DOM no la conoce, así que se declara aparte.
 *
 * `pedido` es el tamaño del cuadro que se pide (ver `tamanoCaptura.ts`): llega
 * medido desde la caja, así que al principio se captura sin tamaño y en cuanto
 * se sabe se vuelve a pedir como toca.
 *
 * `congelado` es el estado que se ve cuando otra ventana tapa la del navegador:
 * Chromium deja de pintar la ventana tapada (`CalculateNativeWinOcclusion`) y la
 * pista se queda sin fotogramas. No hay forma de evitarlo desde aquí; lo que sí
 * es puede es decirlo en el panel en vez de dejar un cuadro parado sin
 * explicación.
 */

/** Cuánto se aguanta sin fotogramas antes de dar el vídeo por congelado. */
const ESPERA_CUADRO_MS = 1500;
const CADA_CUADRO_MS = 500;

interface RestriccionEscritorio {
  mandatory: {
    chromeMediaSource: 'desktop';
    chromeMediaSourceId: string;
    maxFrameRate: number;
    minWidth?: number;
    minHeight?: number;
    maxWidth?: number;
    maxHeight?: number;
  };
}

export type EstadoStream = 'inactivo' | 'cargando' | 'ok' | 'error' | 'congelado';

function capturarVentana(id: string, pedido: PedidoCaptura | null): Promise<MediaStream> {
  const mandatory: RestriccionEscritorio['mandatory'] = {
    chromeMediaSource: 'desktop',
    chromeMediaSourceId: id,
    maxFrameRate: 30,
  };
  // El mínimo a 1 porque solo se pide un máximo: sin él, una ventana pequeña se
  // ampliaría para llenar el pedido y saldría más borrosa, no menos.
  if (pedido) {
    mandatory.minWidth = 1;
    mandatory.minHeight = 1;
    mandatory.maxWidth = pedido.maxWidth;
    mandatory.maxHeight = pedido.maxHeight;
  }
  const video: MediaTrackConstraints & RestriccionEscritorio = { mandatory };
  return navigator.mediaDevices.getUserMedia({ audio: false, video });
}

function detener(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop());
}

/**
 * Reloj de fotogramas: cada cuadro presentado anota la hora, y si pasan más de
 * `ESPERA_CUADRO_MS` sin ninguno se avisa. Solo mira si la ventana propia está
 * visible: si el panel está tapado no se presenta nada y no sería un congelado
 * del navegador.
 */
function relojDeCuadros(video: HTMLVideoElement, marcar: (estado: EstadoStream) => void): () => void {
  let ultimo = Date.now();
  let pedido = 0;
  const paso = () => {
    ultimo = Date.now();
    pedido = video.requestVideoFrameCallback(paso);
  };
  if (typeof video.requestVideoFrameCallback === 'function') pedido = video.requestVideoFrameCallback(paso);
  const reloj = setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    marcar(Date.now() - ultimo > ESPERA_CUADRO_MS ? 'congelado' : 'ok');
  }, CADA_CUADRO_MS);
  return () => {
    clearInterval(reloj);
    if (pedido) video.cancelVideoFrameCallback(pedido);
  };
}

/**
 * La pista avisa por su cuenta cuando deja de recibir datos (`mute`) y cuando
 * los vuelve a recibir (`unmute`): es la señal más directa de congelado, y en
 * las medidas llega antes que el reloj.
 */
function vigilarPista(pista: MediaStreamTrack, marcar: (estado: EstadoStream) => void): () => void {
  const alSilenciar = () => marcar('congelado');
  const alVolver = () => marcar('ok');
  pista.addEventListener('mute', alSilenciar);
  pista.addEventListener('unmute', alVolver);
  return () => {
    pista.removeEventListener('mute', alSilenciar);
    pista.removeEventListener('unmute', alVolver);
  };
}

/** Estados que el reloj de fotogramas no puede pisar. */
function enVivo(anterior: EstadoStream): boolean {
  return anterior === 'ok' || anterior === 'congelado';
}

/**
 * Mantiene la captura de `sourceId` mientras el componente vive. Al cambiar de
 * ventana, de tamaño pedido, al desmontar o si la ventana se cierra, para todas
 * las pistas: nada sigue capturando a escondidas.
 */
export function useStreamVentana(
  sourceId: string | null,
  videoRef: RefObject<HTMLVideoElement>,
  pedido: PedidoCaptura | null,
): EstadoStream {
  const [estado, setEstado] = useState<EstadoStream>('inactivo');

  useEffect(() => {
    if (!sourceId) {
      setEstado('inactivo');
      return undefined;
    }
    let vivo = true;
    let stream: MediaStream | null = null;
    let parar: (() => void) | null = null;
    const el = videoRef.current;
    const marcar = (nuevo: EstadoStream) => {
      if (!vivo) return;
      setEstado((antes) => (enVivo(antes) ? nuevo : antes));
    };
    setEstado('cargando');

    capturarVentana(sourceId, pedido).then((nuevo) => {
      if (!vivo || !el) { detener(nuevo); return; }
      stream = nuevo;
      el.srcObject = nuevo;
      void el.play().catch(() => {});
      const pista = nuevo.getVideoTracks()[0];
      if (pista) {
        pista.addEventListener('ended', () => marcar('error'));
        parar = vigilarPista(pista, marcar);
      }
      parar = combine(parar, relojDeCuadros(el, marcar));
      setEstado('ok');
    }).catch(() => { if (vivo) setEstado('error'); });

    return () => {
      vivo = false;
      parar?.();
      detener(stream);
      if (el) el.srcObject = null;
    };
  }, [sourceId, videoRef, pedido]);

  return estado;
}

function combine(a: (() => void) | null, b: () => void): () => void {
  return () => { a?.(); b(); };
}
