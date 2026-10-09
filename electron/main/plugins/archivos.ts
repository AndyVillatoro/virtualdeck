import { createServer } from 'http';
import type { IncomingMessage, Server, ServerResponse } from 'http';
import { readFileSync, statSync } from 'fs';
import { AddressInfo } from 'net';
import { extname, resolve, sep } from 'path';

/**
 * El servidor de archivos de un plugin: `http://127.0.0.1:<puerto>` sirviendo
 * **solo** lo que hay dentro de la carpeta `<uuid>.sdPlugin`.
 *
 * Hace falta porque hay plugins HTML: su página y su Property Inspector se
 * cargan en ventanas de Chromium, y los `fetch` a la red local (Hue, WLED, Home
 * Assistant) desde un esquema propio se bloquearían como contenido mixto. El
 * precio es una superficie nueva, y por eso la contención de rutas se hace con
 * la lección ya pagada en `protocoloVd.ts`: el `%2f` de una URL **no** es un
 * separador para el parser, así que llega entero y solo se convierte en
 * separador al decodificar. Decodificar y luego normalizar, en ese orden, y
 * comprobar la contención al final por si algún día se relaja el patrón.
 */

/** Tipo por extensión; lo que no esté, se sirve como binario. */
const TIPOS: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.cjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.jfif': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.wasm': 'application/wasm',
};

/**
 * La ruta de disco que hay que servir, o `null` si esa petición no vale.
 *
 * Pura a propósito, para poder probarla con `npx tsx` sin levantar servidor.
 */
function rutaServida(pedida: string, carpeta: string): string | null {
  let relativa: string;
  try {
    relativa = decodeURIComponent(pedida.split(/[?#]/)[0]);
  } catch {
    // Un `%` suelto o una secuencia UTF-8 rota: no es una ruta nuestra.
    return null;
  }
  if (relativa.includes('\0')) return null;

  // Los dos separadores, en cualquier cantidad y al principio, se comen: la
  // ruta es siempre relativa a la carpeta del plugin.
  const limpia = relativa.replace(/^[/\\]+/, '');
  if (!limpia) return null;

  const base = resolve(carpeta);
  const destino = resolve(base, limpia);
  if (destino === base || !destino.startsWith(base + sep)) return null;
  return destino;
}

function atender(req: IncomingMessage, res: ServerResponse, base: string): void {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  const destino = rutaServida(req.url ?? '/', base);
  if (!destino) {
    res.writeHead(403).end();
    return;
  }
  let contenido: Buffer;
  try {
    if (!statSync(destino).isFile()) {
      res.writeHead(404).end();
      return;
    }
    contenido = readFileSync(destino);
  } catch {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, {
    'Content-Type': TIPOS[extname(destino).toLowerCase()] ?? 'application/octet-stream',
    'X-Content-Type-Options': 'nosniff',
    'Content-Length': contenido.length,
  });
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  res.end(contenido);
}

export interface ServidorArchivos {
  puerto: number;
  cerrar(): void;
}

/** Levanta el servidor en `127.0.0.1` con puerto aleatorio. */
export function iniciarServidorArchivos(carpeta: string): Promise<ServidorArchivos> {
  const base = resolve(carpeta);
  const servidor: Server = createServer((req, res) => atender(req, res, base));
  return new Promise((listo, fallo) => {
    servidor.once('error', fallo);
    servidor.listen(0, '127.0.0.1', () => {
      const direccion = servidor.address() as AddressInfo;
      listo({
        puerto: direccion.port,
        cerrar: () => {
          try {
            servidor.close();
          } catch {
            /* ya estaba cerrado */
          }
        },
      });
    });
  });
}
