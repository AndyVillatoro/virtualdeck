import { hayNucleo, intentarNativo } from './native';
import { medioFijo } from './mediosFijos';
import { runPS, QUICK_SCRIPT, CAPS_SCRIPT, THUMB_SCRIPT, WINDOW_FALLBACK } from './mediaScripts';
import {
  parseWindowTitle, parsearControles, parsearAleatorio, parsearRepeticion, ESTADOS, type Parsed,
} from './mediaAnalisis';
import type { NowPlaying } from './mediaTipos';

/** La pista de la que se conocen las capacidades, y cuales son. */
let _capsTrack = '';
let _capsData: NowPlaying['controls'];
const _pendingCaps = new Set<string>();

function pedirControles(trackKey: string) {
  _capsTrack = trackKey;
  _capsData = undefined;
  if (_pendingCaps.has(trackKey)) return;
  _pendingCaps.add(trackKey);
  runPS(CAPS_SCRIPT).then((r) => {
    // Si ya cambio de pista, estas capacidades son de la anterior.
    if (trackKey !== _capsTrack) return;
    if (!r.ok || !r.stdout || r.stdout.startsWith('ERR') || r.stdout.startsWith('NONE')) return;
    _capsData = parsearControles(r.stdout.trim());
    if (_cache.data && `${_cache.data.title}|${_cache.data.artist}` === trackKey) {
      _cache.data = { ..._cache.data, controls: _capsData };
    }
  }).catch(() => {}).finally(() => { _pendingCaps.delete(trackKey); });
}

/**
 * La pista del nucleo, con las capacidades que el nucleo no trae.
 *
 * En el primer tick de una cancion nueva todavia no se saben, y entonces se
 * devuelve sin ellas — que significa «no se sabe» y la interfaz enseña todos
 * los botones. Llegan un cuarto de segundo despues.
 */
function conControles(np: NowPlaying): NowPlaying {
  if (np.controls) return np;
  const key = `${np.title}|${np.artist}`;
  if (key !== _capsTrack) pedirControles(key);
  return _capsData ? { ...np, controls: _capsData } : np;
}

const _cache: { data: NowPlaying | null; ts: number; lastValid: NowPlaying | null } = {
  data: null, ts: 0, lastValid: null,
};
let _thumbTrack = '';
let _thumbData = '';
// Pending thumbnail fetches keyed by trackKey. Prevents duplicate PS spawns
// for the same track when getNowPlaying is called repeatedly during a race.
const _pendingThumbs = new Map<string, Promise<void>>();
let _lastErrorLogged = '';

export function logErrorOnce(stage: string, error: string) {
  const key = `${stage}:${error.slice(0, 200)}`;
  if (key === _lastErrorLogged) return;
  _lastErrorLogged = key;
  console.warn(`[media:${stage}] ${error}`);
}

async function fallbackFromWindows(): Promise<NowPlaying | null> {
  const r = await runPS(WINDOW_FALLBACK);
  if (!r.ok && !r.stdout) {
    if (r.stderr) logErrorOnce('window-fallback', r.stderr);
    return null;
  }
  const lines = r.stdout.split(/\r?\n/);
  const priority = ['Spotify', 'YouTube Music', 'YouTube', 'SoundCloud', 'VLC'];
  let best: { p: Parsed; pr: number } | null = null;
  for (const line of lines) {
    const sep = line.indexOf('|||');
    if (sep < 0) continue;
    const proc = line.slice(0, sep);
    const t = line.slice(sep + 3);
    const parsed = parseWindowTitle(proc, t);
    if (!parsed) continue;
    const pr = priority.indexOf(parsed.source);
    const score = pr >= 0 ? priority.length - pr : 0;
    if (!best || score > best.pr) best = { p: parsed, pr: score };
  }
  if (!best) return null;
  return {
    title: best.p.title,
    artist: best.p.artist,
    status: best.p.status,
    source: best.p.source,
  };
}

/**
 * Pide la caratula de una pista, una sola vez, en segundo plano.
 *
 * La descarga tarda mucho mas que la consulta de la pista, asi que no se espera:
 * cuando llega se mete en la cache y el siguiente tick del widget ya la enseña.
 */
function pedirCaratula(trackKey: string) {
  _thumbTrack = trackKey;
  _thumbData = '';
  if (_pendingThumbs.has(trackKey)) return;
  const fetchP = runPS(THUMB_SCRIPT).then((tr) => {
    // Si el usuario ya cambio de pista, esta caratula es de la anterior.
    if (trackKey !== _thumbTrack) return;
    if (tr.ok && tr.stdout && tr.stdout.startsWith('data:')) {
      _thumbData = tr.stdout;
      if (_cache.data && `${_cache.data.title}|${_cache.data.artist}` === trackKey) {
        _cache.data = { ..._cache.data, thumbnail: tr.stdout };
      }
    }
  }).finally(() => { _pendingThumbs.delete(trackKey); });
  _pendingThumbs.set(trackKey, fetchP);
}

/**
 * La linea que devuelve QUICK_SCRIPT, convertida en una pista.
 *
 * `null` si no trae ni titulo ni artista, que es como SMTC dice «hay sesion
 * pero no sabe que suena».
 */
function parsearPista(stdout: string): NowPlaying | null {
  const [title, artist, status, source, caps, shuf, rep] = stdout.split('|');
  const titleStr = title?.trim() ?? '';
  const artistStr = artist?.trim() ?? '';
  if (!titleStr && !artistStr) return null;

  const trackKey = `${titleStr}|${artistStr}`;
  if (trackKey !== _thumbTrack) pedirCaratula(trackKey);

  const est = status?.trim() ?? '';
  const aleatorio = parsearAleatorio(shuf);
  const repeticion = parsearRepeticion(rep);
  return {
    title: titleStr,
    artist: artistStr,
    status: (ESTADOS as string[]).includes(est) ? (est as NowPlaying['status']) : 'Unknown',
    source: source?.trim() ?? '',
    thumbnail: _thumbData || undefined,
    controls: parsearControles(caps),
    ...(aleatorio !== undefined ? { isShuffleActive: aleatorio } : {}),
    ...(repeticion !== undefined ? { autoRepeatMode: repeticion } : {}),
  };
}

/**
 * Le pregunta a SMTC por PowerShell que suena.
 *
 * Devuelve dos cosas distintas a proposito. `pista` es lo que suena, y
 * `contesto` es si SMTC **funciono**: un 'NONE' es una respuesta valida —«no
 * hay nada sonando»— y no lo mismo que un error del script. De esa diferencia
 * depende que se caiga o no al plan B de leer titulos de ventana.
 */
async function consultarSmtc(): Promise<{ pista: NowPlaying | null; contesto: boolean }> {
  try {
    const r = await runPS(QUICK_SCRIPT);
    if (!r.ok) {
      if (r.stderr) logErrorOnce('smtc-quick', r.stderr);
      return { pista: null, contesto: false };
    }
    if (r.stdout.startsWith('NONE')) return { pista: null, contesto: true };
    if (r.stdout.startsWith('ERR')) {
      logErrorOnce('smtc-quick', `script error: ${r.stdout}${r.stderr ? ' / stderr: ' + r.stderr : ''}`);
      return { pista: null, contesto: false };
    }
    if (!r.stdout) return { pista: null, contesto: false };
    const pista = parsearPista(r.stdout);
    return { pista, contesto: pista !== null };
  } catch (e) {
    logErrorOnce('smtc-exception', String(e));
    return { pista: null, contesto: false };
  }
}

export async function getNowPlaying(): Promise<NowPlaying | null> {
  // Capturas de prensa: con `VD_MEDIOS_FIJOS` puesta, la pista sale de ese
  // archivo y no de SMTC. Sin la variable esto es `null` y no cambia nada.
  // El por qué está entero en `mediosFijos.ts`.
  const fijo = medioFijo();
  if (fijo) return fijo;

  // Camino nativo: SMTC por WinRT, en proceso y con tipos verificados. Aqui
  // desaparece el bloque marcado «NO tocar» de mas arriba — la reflexion para
  // convertir el IAsyncOperation en un Task de .NET existia porque PowerShell
  // 5.1 no proyecta la propiedad Status, no porque WinRT lo exija.
  //
  // La cache de 4 s se respeta igual: la llamada nativa es rapida pero la
  // caratula pesa decenas de KB y el widget la pide en cada tick.
  // La caché baja de 4 s a 1 s cuando hay núcleo nativo: los 4 s escondían el
  // coste de lanzar PowerShell, y a cambio la canción tardaba hasta cuatro
  // segundos en actualizarse al cambiar de pista. Se conserva **algo** de caché
  // porque la carátula pesa decenas de KB y el widget pregunta en cada tick.
  const ttl = hayNucleo() ? 1000 : 4000;
  if (Date.now() - _cache.ts < ttl) return _cache.data;
  {
    const crudo = intentarNativo('getNowPlaying', (n) => n.getNowPlaying());
    if (crudo !== undefined) {
      // El nucleo actual ya trae `controls` (y shuffle/repeat activos): en ese
      // caso no se lanza el CAPS_SCRIPT de PowerShell. Si viene sin ellos (un
      // `.node` anterior), se piden aparte, una vez por cancion.
      const nativo = crudo ? conControles(crudo) : crudo;
      _cache.ts = Date.now();
      _cache.data = nativo;
      // `lastValid` conserva lo último que sí tenía contenido: al pasar de una
      // pista a otra hay un hueco de milisegundos en que SMTC no devuelve nada,
      // y sin esto el widget parpadea a vacío en cada cambio de canción.
      if (nativo) _cache.lastValid = nativo;
      return nativo ?? _cache.lastValid;
    }
  }

  if (Date.now() - _cache.ts < 4000) return _cache.data;
  _cache.ts = Date.now();

  const { pista: smtc, contesto: smtcWorked } = await consultarSmtc();

  if (smtc) {
    _cache.data = smtc;
    _cache.lastValid = smtc;
    return smtc;
  }

  if (smtcWorked) {
    const fb = await fallbackFromWindows();
    if (fb) {
      _cache.data = fb;
      _cache.lastValid = fb;
      return fb;
    }
    _cache.data = null;
    return null;
  }

  // SMTC errored (e.g. Edge doesn't register): always re-query window titles
  // so a switched tab/video shows up. The previous code only fell through here
  // on first run, then returned the stale lastValid forever.
  //
  // Y se pregunta **una sola vez**. Habia una segunda llamada identica al final
  // de la funcion, alcanzable solo cuando esta ya habia devuelto vacio: un
  // `powershell.exe` de mas —medido: 405 ms solo el arranque con `Add-Type`—
  // cada cuatro segundos, en el caso que ya habia fallado. Quedo de cuando se
  // añadio este bloque delante y no se quito el de detras.
  const fb = await fallbackFromWindows();
  if (fb) {
    _cache.data = fb;
    _cache.lastValid = fb;
    return fb;
  }

  if (_cache.lastValid) {
    _cache.data = _cache.lastValid;
    return _cache.lastValid;
  }

  _cache.data = null;
  return null;
}

/**
 * Olvida lo ultimo que se supo, para que la siguiente pregunta sea de verdad.
 *
 * Se llama despues de cada orden (pausar, siguiente, aleatorio, repetir). Sin
 * esto, la pantalla vuelve a preguntar y la cache le contesta con el estado de
 * **antes** de la orden: al pausar, el icono se quedaba en «reproduciendo».
 * La cache dura 1 s con nucleo nativo y 4 s sin el, y el sondeo del widget es
 * cada 5 s, asi que el retraso podia llegar a los nueve segundos.
 */
export function olvidarCache() {
  _cache.ts = 0;
}
