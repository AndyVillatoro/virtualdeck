/**
 * Pulsar un botón de **otro** VirtualDeck.
 *
 * Es la otra mitad de `servidorLocal.ts`: aquel escucha, este llama. Con los
 * dos, el portátil manda sobre el equipo de sobremesa sin nada instalado en
 * medio — la misma API que ya usan el mando móvil y Home Assistant.
 *
 * Va en el proceso principal por lo mismo que la galería y las divisas: la CSP
 * del renderer solo deja conectar con `self` y los dos servicios del clima, así
 * que un `fetch` a `192.168.1.50:8787` desde la pantalla no sale.
 *
 * **El token viaja en la cabecera**, igual que lo exige el servidor. Y sobre eso
 * conviene ser claro con el usuario: esto es HTTP plano en la red de casa. Quien
 * esté en esa red y vea el tráfico ve el token. Se dice en la interfaz.
 */

import { request } from 'node:http';

/** Más de esto y se da por perdido: el otro equipo está apagado o no contesta. */
const MS_LIMITE = 4000;

export interface OrdenRemota {
  host: string;
  port?: number;
  token: string;
  /** Qué pedirle: un botón por id o etiqueta, o una página. */
  boton?: string;
  pagina?: number;
}

function url(o: OrdenRemota): string {
  const host = o.host.trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const base = `http://${host}${/:\d+$/.test(host) ? '' : `:${o.port ?? 8787}`}`;
  if (o.pagina !== undefined) return `${base}/api/page/${o.pagina}`;
  // Por etiqueta va en la consulta y por id en la ruta, que es como lo parte el
  // otro lado. Se manda como etiqueta si tiene espacios o acentos: un id no los
  // lleva, así que no hay ambigüedad que resolver.
  const b = (o.boton ?? '').trim();
  return /^[A-Za-z0-9_-]+$/.test(b)
    ? `${base}/api/press/${encodeURIComponent(b)}`
    : `${base}/api/press?label=${encodeURIComponent(b)}`;
}

/**
 * **`node:http`, no `fetch`.** En el proceso principal de Electron, `fetch` va
 * por la pila de red de Chromium, y ahí esta misma llamada devolvía
 * `ECONNREFUSED` contra un servidor que `curl` y un `fetch` de node suelto
 * alcanzaban sin problema en ese mismo instante. `node:http` es además lo que
 * usa `servidorLocal.ts` para escuchar: las dos mitades por el mismo camino.
 */
export function mandar(o: OrdenRemota): Promise<{ ok: boolean; error?: string }> {
  if (!o?.host?.trim()) return Promise.resolve({ ok: false, error: 'sinHost' });
  if (!o?.token?.trim()) return Promise.resolve({ ok: false, error: 'sinToken' });
  if (o.pagina === undefined && !o.boton?.trim()) return Promise.resolve({ ok: false, error: 'sinDestino' });

  const destino = new URL(url(o));
  return new Promise((resolver) => {
    let acabado = false;
    const terminar = (r: { ok: boolean; error?: string }) => { if (!acabado) { acabado = true; resolver(r); } };
    const q = request({
      hostname: destino.hostname,
      port: destino.port || 80,
      path: destino.pathname + destino.search,
      method: 'GET',
      // La cabecera `Host` la pone node con hostname:port, que es justo lo que
      // el otro lado comprueba para no caer en un rebinding de DNS.
      headers: { 'X-VD-Token': o.token.trim() },
      timeout: MS_LIMITE,
    }, (res) => {
      let datos = '';
      res.setEncoding('utf-8');
      res.on('data', (t) => { datos += t; if (datos.length > 8192) res.destroy(); });
      res.on('end', () => {
        let cuerpo: { ok?: boolean; error?: string } | null = null;
        try { cuerpo = JSON.parse(datos); } catch { /* respuesta no JSON */ }
        // El otro lado ya distingue «no existe ese botón» de «token inválido»:
        // su mensaje se pasa tal cual en vez de inventar aquí uno paralelo.
        if (res.statusCode === 200 && cuerpo?.ok) return terminar({ ok: true });
        terminar({ ok: false, error: cuerpo?.error ?? `HTTP ${res.statusCode}` });
      });
    });
    q.on('timeout', () => { q.destroy(); terminar({ ok: false, error: 'sinRespuesta' }); });
    q.on('error', (e) => terminar({ ok: false, error: (e as NodeJS.ErrnoException).code ?? e.message }));
    q.end();
  });
}
