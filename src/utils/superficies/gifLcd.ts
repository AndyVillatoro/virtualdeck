/**
 * Los GIF de la tecla física, decodificados en el renderer con `ImageDecoder`.
 *
 * El pintor del LCD dibuja **un** fotograma y solo repinta si cambia la firma
 * del botón, así que un GIF se quedaba clavado. Aquí Chromium decodifica el
 * GIF (WebCodecs, el mismo motor que anima un `<img>`) y cada fotograma se
 * convierte en un lienzo cuadrado que el animador pinta con `pintarTecla`.
 *
 * De dónde salen los bytes, y esto está **medido** (2026-10-04, renderer del
 * deck):
 *
 * - `typeof ImageDecoder` es `function` y `isTypeSupported('image/gif')` es
 *   `true`; `test.gif` da 195 fotogramas, 500×281, 30 ms.
 * - Un GIF guardado como `data:image/gif;base64,…` se decodifica con `atob`,
 *   sin red, y **funciona**.
 * - Un GIF guardado como `vd://images/x.gif` **no se puede leer**: la CSP de
 *   `index.html` (`connect-src 'self' …`) rechaza `fetch` a `vd:` —consola:
 *   «Refused to connect to 'vd://images/test.gif' because it violates …
 *   connect-src»—, y también rechaza `data:` y `blob:` por la misma directiva.
 *   Para ese caso el `fetch` de aquí abajo está escrito y listo, pero hoy
 *   devuelve `error` y la tecla se queda con su primer fotograma (lo mismo que
 *   hacía antes). La salida pediría añadir `vd:` a `connect-src` en
 *   `index.html`, que no está entre los archivos de esta tarea.
 *
 * Topes: 6 MB de GIF, 120 fotogramas (a 10 fps son 12 s de ciclo), y el lado
 * del lienzo a `LADO_GIF` px (el mayor LCD de la tabla de modelos es 112).
 */

/** Lado del lienzo de cada fotograma; cubre el LCD más grande (112). */
const LADO_GIF = 112;
const MAX_CUADROS = 120;
const MAX_BYTES = 6 * 1024 * 1024;

export interface GifAnimado {
  /** Fotogramas ya recortados a cuadrado («cover»), listos para pintar. */
  cuadros: HTMLCanvasElement[];
  /** Retardo de cada fotograma, en ms. */
  duraciones: number[];
  /** Suma de los retardos: el ciclo completo. */
  total: number;
}

export type EstadoGif =
  | { estado: 'listo'; gif: GifAnimado }
  | { estado: 'error' };

/** ¿La imagen del botón es un GIF? Extensiones y `data:image/gif`. */
export function esGifAnimado(src: string): boolean {
  const limpio = src.split(/[?#]/)[0].toLowerCase();
  return limpio.startsWith('data:image/gif') || limpio.endsWith('.gif');
}

/**
 * Decodifica el GIF a lienzos con `ImageDecoder` de WebCodecs. `error` es el
 * respaldo: sin ImageDecoder, sin bytes o con el GIF por encima de los topes,
 * la tecla se queda con su primer fotograma, que es lo que hacía antes.
 */
export async function decodificarGif(src: string): Promise<EstadoGif> {
  if (typeof ImageDecoder === 'undefined') return { estado: 'error' };
  const bytes = await leerBytes(src);
  if (!bytes) return { estado: 'error' };
  try {
    const dec = new ImageDecoder({ data: bytes, type: 'image/gif' });
    await dec.tracks.ready;
    const pista = dec.tracks.selectedTrack;
    if (!pista || !pista.frameCount) return { estado: 'error' };
    const n = Math.min(pista.frameCount, MAX_CUADROS);
    const cuadros: HTMLCanvasElement[] = [];
    const duraciones: number[] = [];
    for (let i = 0; i < n; i++) {
      const { image } = await dec.decode({ frameIndex: i });
      cuadros.push(recortar(image));
      duraciones.push(limitarRetardo(Math.round(image.duration / 1000)));
      image.close();
    }
    dec.close();
    if (cuadros.length < 2) return { estado: 'error' };
    return { estado: 'listo', gif: { cuadros, duraciones, total: duraciones.reduce((a, b) => a + b, 0) } };
  } catch {
    return { estado: 'error' };
  }
}

/**
 * Los bytes del GIF. `data:image/gif;base64,…` se decodifica con `atob` (sin
 * red, y por eso funciona); para una dirección (hoy `vd://`, que la CSP
 * bloquea) se intenta `fetch`, que es lo que hará falta cuando la CSP lo
 * permita.
 */
async function leerBytes(src: string): Promise<Uint8Array | null> {
  const limpio = src.split(/[?#]/)[0];
  if (/^data:image\/gif;base64,/i.test(limpio)) {
    try {
      const bin = atob(limpio.slice(limpio.indexOf(',') + 1));
      if (bin.length > MAX_BYTES) return null;
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return bytes;
    } catch {
      return null;
    }
  }
  try {
    const respuesta = await fetch(src);
    if (!respuesta.ok) return null;
    const blob = await respuesta.blob();
    if (blob.size > MAX_BYTES) return null;
    return new Uint8Array(await blob.arrayBuffer());
  } catch {
    // CSP `connect-src`: hoy `vd://` no se puede pedir desde el renderer.
    return null;
  }
}

/** Un fotograma recortado a cuadrado por el centro («cover»), como la celda. */
function recortar(frame: VideoFrame): HTMLCanvasElement {
  const ancho = frame.displayWidth || 1;
  const alto = frame.displayHeight || 1;
  const escala = Math.max(LADO_GIF / ancho, LADO_GIF / alto);
  const w = ancho * escala;
  const h = alto * escala;
  const lienzo = document.createElement('canvas');
  lienzo.width = LADO_GIF;
  lienzo.height = LADO_GIF;
  lienzo.getContext('2d')?.drawImage(frame, (LADO_GIF - w) / 2, (LADO_GIF - h) / 2, w, h);
  return lienzo;
}

/** Retardo de un fotograma, saneado como los navegadores: 100 ms si es ínfimo. */
function limitarRetardo(ms: number): number {
  if (ms <= 10) return 100;
  return Math.min(ms, 1000);
}
