import { app, net } from 'electron';
import { createHash } from 'crypto';
import { rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import type { EntradaInstalacionUrl, ResultadoInstalacion } from '../../../src/types';
import { desinstalarPlugin, instalarDesdeZip } from './instalar';
import { validarUuid, validarSha256 } from './validacion';

/**
 * Instalar un plugin desde una URL de la tienda (T-TND-10, manifiesto v3).
 *
 * La tienda muestra plugins con botón INSTALAR; Ajustes solo sabía traerlos
 * de un ZIP local (`instalar.ts`, ya endurecido: zip-slip, topes, DRM). Aquí
 * se baja el ZIP por HTTPS, se verifica el SHA-256 declarado en el manifiesto
 * y se entrega a la misma instalación existente. El temporal se borra siempre.
 *
 * Red: solo `https` y solo estos hosts. `github.com` redirige a
 * `objects.githubusercontent.com` en las releases, así que los tres valen —
 * también como destino de redirección — y cualquier otro destino (incluida la
 * propia máquina o la red interna) corta con `descarga` sin seguirlo.
 */

const HOSTS_PERMITIDOS = new Set([
  'raw.githubusercontent.com',
  'github.com',
  'objects.githubusercontent.com',
]);

/** El ZIP no pasa de esto ni de lejos (mismo tope que `instalacion.ts`). */
const LIMITE_ZIP_BYTES = 100 * 1024 * 1024;
/** Esperar la red, no eternamente: la tienda no puede colgar el arranque. */
const MS_ESPERA = 120000;
/** Saltos de redirección antes de rendirse. */
const MAX_SALTOS = 5;

/** `https` y host permitido: lo demás ni se pide. */
function esUrlDescargable(valor: unknown): valor is string {
  if (typeof valor !== 'string') return false;
  let u: URL;
  try {
    u = new URL(valor);
  } catch {
    return false;
  }
  return u.protocol === 'https:' && HOSTS_PERMITIDOS.has(u.hostname.toLowerCase());
}

type FalloDescarga = { ok: false; codigo: 'descarga' | 'tamano'; detalle?: string };

/**
 * El cuerpo de la respuesta, o por qué no se pudo bajar.
 *
 * Las redirecciones se siguen a mano (tope `MAX_SALTOS`) para no acabar en un
 * host fuera de la lista: `net.fetch` solo las sigue en automático.
 */
async function descargarZip(url: string): Promise<{ ok: true; bytes: Buffer } | FalloDescarga> {
  let actual = url;
  for (let salto = 0; salto <= MAX_SALTOS; salto++) {
    let res: Response;
    try {
      res = await net.fetch(actual, { signal: AbortSignal.timeout(MS_ESPERA), redirect: 'manual' });
    } catch {
      return { ok: false, codigo: 'descarga', detalle: 'red' };
    }
    if (res.status >= 300 && res.status < 400) {
      const destino = res.headers.get('location');
      if (!destino || !esUrlDescargable(new URL(destino, actual).href)) {
        return { ok: false, codigo: 'descarga', detalle: 'redireccion' };
      }
      actual = new URL(destino, actual).href;
      continue;
    }
    if (!res.ok) return { ok: false, codigo: 'descarga', detalle: `http-${res.status}` };
    const declarado = res.headers.get('content-length');
    if (declarado && Number(declarado) > LIMITE_ZIP_BYTES) {
      return { ok: false, codigo: 'tamano', detalle: 'zip' };
    }
    let bytes: Buffer;
    try {
      bytes = Buffer.from(await res.arrayBuffer());
    } catch {
      return { ok: false, codigo: 'descarga', detalle: 'cuerpo' };
    }
    if (bytes.length > LIMITE_ZIP_BYTES) return { ok: false, codigo: 'tamano', detalle: 'zip' };
    return { ok: true, bytes };
  }
  return { ok: false, codigo: 'descarga', detalle: 'redirecciones' };
}

/**
 * Baja el ZIP, comprueba su SHA-256 y lo instala.
 *
 * Sin `sha256` o sin `uuid` no hay instalación: el manifiesto de la tienda
 * ya filtra esas entradas y aquí se vuelven a exigir. Si el hash no coincide
 * se devuelve `hash` sin tocar disco instalado; si el plugin instalado trae
 * otro uuid que el pedido, se retira y es `invalido`.
 */
export async function instalarDesdeUrl(entrada: EntradaInstalacionUrl): Promise<ResultadoInstalacion> {
  if (!entrada || !esUrlDescargable(entrada.url)) {
    return { ok: false, codigo: 'descarga', detalle: 'url' };
  }
  if (!validarSha256(entrada.sha256)) {
    return { ok: false, codigo: 'hash', detalle: 'sha-ausente' };
  }
  if (!validarUuid(entrada.uuid)) return { ok: false, codigo: 'invalido', detalle: 'uuid' };
  const bajado = await descargarZip(entrada.url);
  if (bajado.ok === false) return bajado;
  const hash = createHash('sha256').update(bajado.bytes).digest('hex');
  if (hash !== entrada.sha256.toLowerCase()) {
    return { ok: false, codigo: 'hash', detalle: 'sha-distinto' };
  }
  let base: string;
  try {
    base = app.getPath('temp');
  } catch {
    base = tmpdir();
  }
  const temporal = join(base, `.vd-plugin-${process.pid}-${Date.now()}.streamDeckPlugin`);
  try {
    await writeFile(temporal, bajado.bytes);
  } catch {
    return { ok: false, codigo: 'zip', detalle: 'temporal' };
  }
  try {
    const instalado = await instalarDesdeZip(temporal);
    if (instalado.ok === false) return instalado;
    if (instalado.plugin.uuid !== entrada.uuid) {
      await desinstalarPlugin(instalado.plugin.uuid);
      return { ok: false, codigo: 'invalido', detalle: 'uuid-distinto' };
    }
    return instalado;
  } finally {
    await rm(temporal, { force: true }).catch(() => {});
  }
}
