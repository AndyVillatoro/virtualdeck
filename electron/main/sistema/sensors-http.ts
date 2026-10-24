/**
 * La parte HTTP de los sensores: pide `data.json` a LibreHardwareMonitor, lo
 * parsea y guarda la caché. Extraído de `sensors.ts` para que ese archivo
 * conserve la configuración, el arranque de LHM y la fachada pública.
 *
 * El estado de la conexión vive aquí: quién preguntó (host/puerto) lo dice
 * `sensors.ts` en cada llamada; qué se leyó y cuándo se recuerda en este módulo.
 */

import { net } from 'electron';
import { parseLhmTree, type Sensor } from './sensors-parser';

let cache: Sensor[] = [];
let connected = false;
let lastError: string | undefined;
let lastFetchAt = 0;
let lastFailAt = 0;

// 1.5 s cache absorbs bursts (multiple buttons reading the same sensor) without
// hammering LHM. The poller in renderer ticks at 5 s, so most reads hit cache.
export const CACHE_MS = 1500;

/** Tras un fallo se deja de intentar la red durante este rato (lo lee `list`). */
export const REINTENTO_MS = 12000;

export interface EstadoLhm {
  /** Último árbol parseado; se conserva entre fallos para no parpadear. */
  cache: Sensor[];
  connected: boolean;
  lastError?: string;
  lastFetchAt: number;
  lastFailAt: number;
}

/** Foto del estado de la conexión; la caché es el array vivo, no una copia. */
export function estadoLhm(): EstadoLhm {
  return { cache, connected, lastError, lastFetchAt, lastFailAt };
}

/** Anota un error de la capa de proceso (arrancar LHM) en el estado común. */
export function anotarError(mensaje: string): void {
  lastError = mensaje;
}

async function fetchTree(host: string, port: number): Promise<any> {
  const targetHost = (host === '0.0.0.0' || !host.trim()) ? '127.0.0.1' : host;
  const url = `http://${targetHost}:${port}/data.json`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    const res = await net.fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Pide el árbol, lo parsea y deja al día la caché y el estado (conectado,
 * error y horas de la última lectura y del último fallo). Nunca lanza: el
 * fallo viaja en `ok: false`, con la caché anterior intacta.
 */
export async function actualizar(host: string, port: number): Promise<{ ok: boolean; error?: string }> {
  try {
    const tree = await fetchTree(host, port);
    cache = parseLhmTree(tree);
    connected = true;
    lastError = undefined;
    lastFetchAt = Date.now();
    return { ok: true };
  } catch (e) {
    connected = false;
    const msg = (e as Error).message;
    lastError = msg;
    lastFailAt = Date.now();
    return { ok: false, error: msg };
  }
}
