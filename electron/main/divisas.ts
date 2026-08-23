import { app, net } from 'electron';
import { join } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { tm } from './idioma';

/**
 * Tasas de cambio para el widget de divisas.
 *
 * Va en el proceso principal, no en la pantalla, por lo mismo que la descarga
 * de perfiles: la CSP del renderer solo permite conectar con `self` y los dos
 * servicios del clima. Un `fetch` desde la interfaz se rechazaría siempre —y
 * de paso tumbaba la ventana, que fue exactamente lo que pasó con la
 * importación por URL—. Aquí no hay CSP y la ventana sigue cerrada.
 *
 * La fuente es `open.er-api.com`: gratuita, sin clave, 166 monedas (incluido
 * el lempira, que las que se apoyan en el BCE no traen) y **una actualización
 * al día**. La respuesta dice cuándo toca la siguiente, así que no hace falta
 * inventarse un intervalo: se respeta el que da el servicio.
 */

const FUENTE = 'https://open.er-api.com/v6/latest/';
/** Si el servicio no dice cuándo vuelve a actualizar, se reintenta en 6 h. */
const MS_RESPALDO = 6 * 60 * 60 * 1000;
const MS_ESPERA_RED = 10000;

export interface TasasDivisa {
  base: string;
  /** Código de moneda → cuántas unidades por una de la base. */
  rates: Record<string, number>;
  /** Cuándo las publicó el servicio, tal cual, para poder enseñarlo. */
  actualizado: string;
  /** Momento a partir del cual conviene volver a preguntar. */
  caducaEn: number;
}

const enMemoria = new Map<string, TasasDivisa>();

function rutaCache(base: string): string {
  return join(app.getPath('userData'), `tasas-${base.toLowerCase()}.json`);
}

/**
 * Lo último que se descargó, aunque esté caducado.
 *
 * Sirve dos veces: al arrancar sin conexión, y cuando la petición falla. Un
 * deck que enseña la tasa de ayer es infinitamente mejor que uno que enseña un
 * guion, y para una tasa diaria la diferencia casi nunca importa.
 */
function leerCache(base: string): TasasDivisa | null {
  const enRam = enMemoria.get(base);
  if (enRam) return enRam;
  try {
    const p = rutaCache(base);
    if (!existsSync(p)) return null;
    const d = JSON.parse(readFileSync(p, 'utf-8')) as TasasDivisa;
    if (!d || typeof d.rates !== 'object') return null;
    enMemoria.set(base, d);
    return d;
  } catch { return null; }
}

function guardarCache(d: TasasDivisa): void {
  enMemoria.set(d.base, d);
  try { writeFileSync(rutaCache(d.base), JSON.stringify(d), 'utf-8'); } catch { /* sin disco, con RAM basta */ }
}

export async function obtenerTasas(
  baseCruda: string,
  forzar = false,
): Promise<{ ok: boolean; datos?: TasasDivisa; error?: string }> {
  const base = (baseCruda || 'USD').toUpperCase().slice(0, 3);
  if (!/^[A-Z]{3}$/.test(base)) return { ok: false, error: `${tm('currency.badCode')} ${baseCruda}` };

  const cache = leerCache(base);
  if (!forzar && cache && Date.now() < cache.caducaEn) return { ok: true, datos: cache };

  try {
    const res = await net.fetch(FUENTE + base, { signal: AbortSignal.timeout(MS_ESPERA_RED) });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const j = await res.json() as {
      result?: string; base_code?: string; rates?: Record<string, number>;
      time_last_update_utc?: string; time_next_update_unix?: number;
    };
    if (j.result !== 'success' || !j.rates) throw new Error('respuesta inesperada');
    const datos: TasasDivisa = {
      base: j.base_code ?? base,
      rates: j.rates,
      actualizado: j.time_last_update_utc ?? '',
      caducaEn: j.time_next_update_unix ? j.time_next_update_unix * 1000 : Date.now() + MS_RESPALDO,
    };
    guardarCache(datos);
    return { ok: true, datos };
  } catch (e) {
    // Con lo de ayer se sigue trabajando; sin nada, se dice qué pasó.
    if (cache) return { ok: true, datos: cache };
    return { ok: false, error: (e as Error).message };
  }
}
