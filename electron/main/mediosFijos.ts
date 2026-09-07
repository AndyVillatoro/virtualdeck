import { existsSync, readFileSync } from 'node:fs';

/**
 * La misma forma que `NowPlaying` de `media.ts`, escrita aquí y no importada.
 *
 * `media.ts` importa este módulo, así que importar su tipo de vuelta cierra un
 * ciclo y `npm run lint:arch` lo rechaza. No queda sin vigilar: `getNowPlaying`
 * devuelve esto donde se espera un `NowPlaying`, y si a aquel le sale un campo
 * obligatorio nuevo, el compilador se queja en ese `return`.
 */
export interface PistaFija {
  title: string;
  artist: string;
  status: 'Playing' | 'Paused' | 'Stopped' | 'Unknown';
  source: string;
  thumbnail?: string;
  controls?: { next: boolean; prev: boolean; shuffle: boolean; repeat: boolean };
}

/**
 * Una reproducción fija, leída de un archivo, para las capturas de prensa.
 *
 * ## Por qué existe
 *
 * Todo lo demás que sale en una captura se puede alimentar **desde fuera** de
 * la aplicación, porque tiene un cable: los sensores son un `GET` a
 * `/data.json`, el RGB es un servidor TCP, el clima y la galería son dos
 * servicios `https`. Basta con poner algo al otro extremo y VirtualDeck corre
 * su código de siempre (ver `scripts/prensa/servicios.mjs`).
 *
 * La sesión de medios de Windows no tiene ese cable: es SMTC, una API del
 * sistema a la que se llega por el núcleo nativo o por PowerShell. Sin una
 * sesión de verdad no hay forma de que la franja de reproducción salga con
 * algo escrito, y esa franja es la mitad de la captura del modo kiosko.
 *
 * ## Y por qué la pista tiene que ser inventada de todos modos
 *
 * Una captura de la ficha de la Microsoft Store con una canción y su carátula
 * reales publica material con derechos de otra persona. Aunque hubiera una
 * sesión de verdad delante, habría que taparla. Así que la pista de las
 * capturas es de mentira **a propósito**, y el archivo que la describe está en
 * `docs/prensa/fuentes/` para que se vea qué dice exactamente.
 *
 * ## Cuándo se activa
 *
 * Solo si `VD_MEDIOS_FIJOS` apunta a un JSON legible. Sin la variable esta
 * función devuelve `null` en la primera línea y `getNowPlaying` sigue como
 * siempre: no hay ninguna ruta de la aplicación instalada que pase por aquí.
 */
export function medioFijo(): PistaFija | null {
  const ruta = process.env.VD_MEDIOS_FIJOS;
  if (!ruta || !existsSync(ruta)) return null;
  try {
    const j = JSON.parse(readFileSync(ruta, 'utf-8')) as Partial<PistaFija>;
    if (!j?.title) return null;
    return {
      title: String(j.title),
      artist: String(j.artist ?? ''),
      status: (j.status ?? 'Playing') as PistaFija['status'],
      source: String(j.source ?? ''),
      thumbnail: j.thumbnail ? String(j.thumbnail) : undefined,
      controls: j.controls,
    };
  } catch (e) {
    console.error('[prensa] VD_MEDIOS_FIJOS ilegible:', (e as Error).message);
    return null;
  }
}
