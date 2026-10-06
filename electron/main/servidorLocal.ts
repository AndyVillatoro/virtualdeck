import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomBytes } from 'node:crypto';
import { networkInterfaces, hostname } from 'node:os';
import { createReadStream, existsSync } from 'node:fs';
import { join, normalize } from 'node:path';
import { app, type BrowserWindow } from 'electron';
import { loadConfig } from './configManager';
import { atender } from './enlacesExternos';
import { getVolume, setVolume, getBrightness, setBrightness } from './launcher';
import { paginaMando } from './paginaMando';
import { botonesVivosParaMando, widgetsVivosParaMando } from './mandoVivo';
import motorPuntos from '../../src/components/dot480/efectosPuntos.js?raw';
import { REMOTO_POR_DEFECTO, type RemoteSettings } from '../../src/types';


/**
 * El servidor local: mandar sobre el deck por HTTP.
 *
 * Es la otra mitad de 1.4. Los enlaces `virtualdeck://` valen para un acceso
 * directo o un `.bat`, pero no para algo que ya habla HTTP —Home Assistant, un
 * Stream Deck de otra marca, un script en otro equipo— ni para el mando movil
 * (1.1), que es este mismo servidor con una pagina encima.
 *
 * **Viene apagado.** Abrir un puerto es una decision del usuario, no un valor
 * por defecto: aqui se decide que se puede pulsar todo lo que el deck sabe
 * hacer, incluido ejecutar scripts.
 *
 * Las tres defensas, y por que cada una:
 *
 *  1. **Token obligatorio en una cabecera** (`X-VD-Token`). En la cabecera y no
 *     solo en la URL a proposito: un `<img src="http://127.0.0.1:8787/...">` en
 *     cualquier pagina web que visites llega a este servidor —el navegador deja
 *     salir la peticion aunque luego no deje leer la respuesta— y con el token
 *     en la URL bastaria con acertarlo una vez. Una cabecera propia obliga al
 *     navegador a pedir permiso antes (preflight), y aqui no se da.
 *  2. **Se rechaza cualquier `Origin`.** Nada legitimo que use esta API es una
 *     pagina web de otro sitio.
 *  3. **Se comprueba la cabecera `Host`.** Sin esto, un dominio que resuelva a
 *     127.0.0.1 (rebinding de DNS) se saltaria la defensa de origen.
 *
 * Lo que **no** hay: cifrado. Es HTTP plano en la red de casa. Con `allowLan`
 * activado, quien este en esa red y tenga el token puede pulsar botones. Se
 * dice en la interfaz en vez de fingir que es seguro.
 */

export type AjustesRemoto = RemoteSettings;

export function nuevoToken(): string {
  return randomBytes(24).toString('base64url');
}

let servidor: Server | null = null;
let ventana: BrowserWindow | null = null;
let ajustes: AjustesRemoto = { ...REMOTO_POR_DEFECTO };

/**
 * El emparejamiento del teléfono (1.1), con un código de seis cifras.
 *
 * La alternativa era un enlace con el token dentro, o un QR que lo llevara.
 * Las dos dejan el token en el historial del navegador del teléfono y en
 * cualquier captura que alguien mande para pedir ayuda. Así el teléfono
 * escribe solo `http://<ip>:<puerto>` —que es corto— y el token cruza una vez,
 * a cambio de un código que caduca.
 *
 * Seis cifras son un millón de posibilidades, pero eso solo basta si no se
 * puede probar en bucle: el código dura cinco minutos, admite cinco intentos y
 * desaparece al acertar.
 */
const PAREJA_MS = 5 * 60 * 1000;
const PAREJA_INTENTOS = 5;
let pareja: { codigo: string; caduca: number; intentos: number } | null = null;

export function nuevoCodigo(): string {
  const n = randomBytes(4).readUInt32BE(0) % 1000000;
  pareja = { codigo: String(n).padStart(6, '0'), caduca: Date.now() + PAREJA_MS, intentos: 0 };
  return pareja.codigo;
}

function canjear(codigo: string): string | null {
  if (!pareja) return null;
  if (Date.now() > pareja.caduca) { pareja = null; return null; }
  if (++pareja.intentos > PAREJA_INTENTOS) { pareja = null; return null; }
  if (codigo !== pareja.codigo) return null;
  pareja = null;
  return ajustes.token;
}

/** Las direcciones IPv4 de este equipo en la red local. */
/**
 * Puntuación de prioridad para ordenar interfaces de red.
 * Prioriza adaptadores físicos de red local (Ethernet, Wi-Fi con 192.168.x / 10.x)
 * y desplaza al final VPNs (Tailscale 100.64+, ZeroTier) y virtuales (WSL, Hyper-V, VirtualBox).
 */
function puntuarInterfaz(nombre: string, ip: string): number {
  const n = nombre.toLowerCase();
  if (/tailscale|zerotier|wireguard|openvpn|tun|tap/i.test(n) || ip.startsWith('100.')) return 10;
  if (/vethernet|hyper-v|wsl|docker|virtualbox|vbox|vmware/i.test(n)) return 20;
  if (ip.startsWith('169.254.')) return 5;

  if (/wi-fi|wifi|wlan|inal[aá]mbric/i.test(n)) {
    return ip.startsWith('192.168.') ? 100 : 90;
  }
  if (/ethernet|red local|conparam|conexi[oó]n de red|eth\d|en\d/i.test(n)) {
    return ip.startsWith('192.168.') ? 95 : 85;
  }

  if (ip.startsWith('192.168.')) return 80;
  if (ip.startsWith('10.')) return 70;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return 65;

  return 50;
}

/** Las direcciones IPv4 de este equipo en la red local, ordenadas por relevancia. */
function direccionesLan(): string[] {
  const candidatos: Array<{ nombre: string; ip: string; puntos: number }> = [];
  const interfaces = networkInterfaces();
  for (const [nombre, lista] of Object.entries(interfaces)) {
    for (const i of lista ?? []) {
      if (i.family === 'IPv4' && !i.internal && i.address) {
        candidatos.push({
          nombre,
          ip: i.address,
          puntos: puntuarInterfaz(nombre, i.address),
        });
      }
    }
  }

  candidatos.sort((a, b) => b.puntos - a.puntos);
  return candidatos.map((c) => c.ip);
}

/** ¿La cabecera `Host` apunta a este equipo y a nuestro puerto? */
function hostAceptable(host: string | undefined): boolean {
  if (!host) return false;
  const nombre = host.replace(/:\d+$/, '').replace(/^\[|\]$/g, '').toLowerCase().trim();
  if (nombre === 'localhost' || nombre === '127.0.0.1' || nombre === '::1') return true;
  if (!ajustes.allowLan) return false;

  // Comprobar si coincide con alguna de las IPs locales del equipo
  if (direccionesLan().some((ip) => ip.toLowerCase() === nombre)) return true;

  // Comprobar hostname y variantes mDNS (.local)
  const h = hostname().toLowerCase().trim();
  if (nombre === h || nombre === `${h}.local` || nombre === 'virtualdeck.local') return true;
  if (nombre.startsWith(`${h}.`)) return true;

  return false;
}

/**
 * Comparación de tokens en tiempo constante.
 *
 * Con `===` el tiempo de respuesta delata cuántos caracteres del principio son
 * correctos, y un token se puede adivinar letra a letra. Cuesta cuatro líneas.
 */
function tokenValido(dado: string | undefined): boolean {
  const bueno = ajustes.token;
  if (!dado || !bueno || dado.length !== bueno.length) return false;
  let dif = 0;
  for (let i = 0; i < bueno.length; i++) dif |= dado.charCodeAt(i) ^ bueno.charCodeAt(i);
  return dif === 0;
}

function responder(res: ServerResponse, codigo: number, cuerpo: unknown): void {
  const texto = JSON.stringify(cuerpo);
  res.writeHead(codigo, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(texto),
    // Que nadie guarde una respuesta con el estado del deck.
    'Cache-Control': 'no-store',
  });
  res.end(texto);
}

/**
 * El cuerpo de un POST, con tope.
 *
 * El tope no es paranoia de manual: sin él, cualquiera que llegue al puerto
 * puede tener al proceso principal acumulando memoria con una petición que no
 * termina nunca. Un código de emparejamiento son treinta bytes.
 */
function leerCuerpo(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let datos = '';
    req.on('data', (trozo) => {
      datos += trozo;
      if (datos.length > 1024) { datos = ''; req.destroy(); resolve(''); }
    });
    req.on('end', () => resolve(datos));
    req.on('error', () => resolve(''));
  });
}

function origenAceptable(origen: string | undefined): boolean {
  if (!origen) return true;
  try {
    return hostAceptable(new URL(origen).host);
  } catch {
    return false;
  }
}

function atenderMedia(url: URL, res: ServerResponse): void {
  const filename = decodeURIComponent(url.pathname.slice('/media/images/'.length)).replace(/\\/g, '/');
  if (filename.includes('..') || filename.includes('/')) {
    return responder(res, 403, { ok: false, error: 'denegado' });
  }
  const imagesDir = join(app.getPath('userData'), 'images');
  const filePath = normalize(join(imagesDir, filename));
  if (!filePath.startsWith(imagesDir) || !existsSync(filePath)) {
    return responder(res, 404, { ok: false, error: 'no existe' });
  }
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const mimes: Record<string, string> = {
    gif: 'image/gif', png: 'image/png', jpg: 'image/jpeg',
    jpeg: 'image/jpeg', webp: 'image/webp', svg: 'image/svg+xml', ico: 'image/x-icon',
  };
  const contentType = mimes[ext] ?? 'application/octet-stream';
  res.writeHead(200, {
    'Content-Type': contentType,
    // `private`: va detrás del token, así que ninguna caché intermedia la guarda.
    'Cache-Control': 'private, max-age=86400',
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    'X-Content-Type-Options': 'nosniff',
  });
  createReadStream(filePath).pipe(res);
}

function atenderPair(req: IncomingMessage, res: ServerResponse): void {
  void leerCuerpo(req).then((cuerpo) => {
    let codigo = '';
    try { codigo = String(JSON.parse(cuerpo).code ?? ''); } catch { /* cuerpo ilegible */ }
    const token = canjear(codigo.trim());
    responder(res, token ? 200 : 401, token ? { ok: true, token } : { ok: false, error: 'codigo invalido' });
  });
}

function atenderEnlace(url: URL, res: ServerResponse): boolean {
  const largo = url.searchParams.get('largo') === '1' ? '?largo=1' : '';
  const press = url.pathname.match(/^\/api\/press\/(.+)$/);
  if (press) { conEnlace(res, `virtualdeck://press/${press[1]}${largo}`); return true; }
  if (url.pathname === '/api/press' && url.searchParams.get('label')) {
    const sufijo = largo ? '&largo=1' : '';
    conEnlace(res, `virtualdeck://press?label=${encodeURIComponent(url.searchParams.get('label')!)}${sufijo}`);
    return true;
  }
  const page = url.pathname.match(/^\/api\/page\/(\d+)$/);
  if (page) { conEnlace(res, `virtualdeck://page/${page[1]}`); return true; }
  return false;
}

function manejar(req: IncomingMessage, res: ServerResponse): void {
  const url = new URL(req.url ?? '/', 'http://localhost');

  if (!hostAceptable(req.headers.host)) return responder(res, 403, { ok: false, error: 'host no permitido' });
  if (!origenAceptable(req.headers.origin)) return responder(res, 403, { ok: false, error: 'origen no permitido' });

  if (url.pathname === '/' || url.pathname === '/index.html') return void atenderMando(res);
  if (url.pathname === '/api/ping') return responder(res, 200, { ok: true, app: 'VirtualDeck' });
  if (url.pathname === '/api/pair' && req.method === 'POST') return atenderPair(req, res);

  const token = req.headers['x-vd-token'];
  if (!tokenValido(Array.isArray(token) ? token[0] : token)) {
    return responder(res, 401, { ok: false, error: 'token invalido' });
  }

  // Las imágenes de los botones, detrás del token como todo lo demás: antes se
  // servían a cualquiera que supiera el nombre del archivo. El mando las pide
  // con `fetch` y la cabecera (ver `ponerImagen` en `paginaMando.ts`).
  if (url.pathname.startsWith('/media/images/')) return atenderMedia(url, res);
  // Los botones vivos (etiqueta interpolada, visibilidad del deck) y sus
  // widgets van en dos rutas para no romper a los clientes HTTP externos: son
  // async porque miran sensores, reproducción, clima y divisas. Detrás del
  // token como todo lo demás.
  if (url.pathname === '/api/buttons') {
    return void botonesVivosParaMando()
      .then((buttons) => responder(res, 200, { ok: true, buttons }))
      .catch(() => responder(res, 500, { ok: false, error: 'error interno' }));
  }
  if (url.pathname === '/api/widgets') {
    return void widgetsVivosParaMando()
      .then((widgets) => responder(res, 200, { ok: true, widgets }))
      .catch(() => responder(res, 500, { ok: false, error: 'error interno' }));
  }
  if (url.pathname === '/api/tema') return atenderTema(res);

  if (url.pathname.startsWith('/api/value/')) {
    return void atenderValor(url, req, res).then((atendido) => {
      if (!atendido) responder(res, 404, { ok: false, error: 'no existe' });
    });
  }

  if (atenderEnlace(url, res)) return;

  responder(res, 404, { ok: false, error: 'no existe' });
}

async function atenderValor(url: URL, req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const match = url.pathname.match(/^\/api\/value\/(volume|brightness)$/);
  if (!match) return false;
  const target = match[1] as 'volume' | 'brightness';

  if (req.method === 'GET') {
    const val = target === 'volume' ? await getVolume() : await getBrightness();
    responder(res, 200, { ok: true, target, value: val });
    return true;
  }

  if (req.method === 'POST') {
    const cuerpo = await leerCuerpo(req);
    let val = parseFloat(url.searchParams.get('value') ?? '');
    if (isNaN(val) && cuerpo) {
      try { val = parseFloat(JSON.parse(cuerpo).value); } catch { /* vacio */ }
    }
    if (isNaN(val)) {
      responder(res, 400, { ok: false, error: 'valor invalido' });
      return true;
    }
    const ok = target === 'volume' ? await setVolume(val) : await setBrightness(val);
    responder(res, ok ? 200 : 500, { ok, target, value: val });
    return true;
  }

  return false;
}

function conEnlace(res: ServerResponse, enlace: string): void {
  const r = atender(enlace, ventana);
  responder(res, r.ok ? 200 : 404, r);
}

function atenderMando(res: ServerResponse): void {
  const cfg = loadConfig() as { theme?: 'dark' | 'light' | 'dot480' | 'system'; accent?: string } | null;
  const theme = cfg?.theme ?? 'dark';
  const accent = cfg?.accent || (theme === 'dot480' ? '#ff3b30' : '#4a8ef0');
  const nonceScript = randomBytes(16).toString('base64');
  const nonceEstilo = randomBytes(16).toString('base64');
  const html = paginaMando(nonceScript, nonceEstilo, { theme, accent }, cargarMotorPuntos());
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': Buffer.byteLength(html),
    'Cache-Control': 'no-store',
    'Content-Security-Policy': [
      "default-src 'none'",
      `script-src 'nonce-${nonceScript}'`,
      `style-src 'nonce-${nonceEstilo}'`,
      "img-src 'self' data: blob: vd: http: https:",
      "connect-src 'self'",
      "base-uri 'none'",
      "form-action 'none'",
      "frame-ancestors 'none'",
    ].join('; '),
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  });
  res.end(html);
}

function atenderTema(res: ServerResponse): void {
  const cfg = loadConfig() as { theme?: 'dark' | 'light' | 'dot480' | 'system'; accent?: string } | null;
  const theme = cfg?.theme ?? 'dark';
  const accent = cfg?.accent || (theme === 'dot480' ? '#ff3b30' : '#4a8ef0');
  responder(res, 200, { ok: true, theme, accent });
}

/**
 * El motor DOT como texto, para incrustarlo en la página del móvil: el
 * **mismo** archivo que anima la celda y la tecla física
 * (`src/components/dot480/efectosPuntos.js`), sin una copia que se quede
 * atrás. Vite lo deja como cadena (`?raw`) en el build; la regla de capas lo
 * permite porque es JavaScript puro, sin React ni DOM (`.dependency-cruiser.cjs`).
 */
function cargarMotorPuntos(): string {
  return motorPuntos;
}

/**
 * Arranca o para el servidor según los ajustes.
 *
 * **Idempotente de verdad, y eso importa.** Se llama en cada guardado de la
 * configuración —y se guarda al pulsar un interruptor, al cambiar una variable,
 * al reordenar—, así que antes el servidor se reiniciaba constantemente. Y
 * `parar()` borra el código de emparejamiento: enseñabas el código, pulsabas un
 * botón mientras el teléfono lo tecleaba, y el código ya no valía. Medido con
 * control: canjear sin tocar nada devolvía 200, y tras un solo guardado, 401.
 *
 * Solo se reinicia si cambia **dónde escucha**. El token no hace falta que lo
 * haga: se lee de `ajustes` en cada petición.
 */
export function aplicar(nuevos: AjustesRemoto, win: BrowserWindow | null): { ok: boolean; error?: string } {
  const previos = ajustes;
  const estaba = !!servidor;
  ajustes = { ...REMOTO_POR_DEFECTO, ...nuevos };
  ventana = win;
  const mismoSitio = previos.port === ajustes.port && previos.allowLan === ajustes.allowLan;
  if (estaba && ajustes.enabled && mismoSitio) return { ok: true };
  parar();
  if (!ajustes.enabled) return { ok: true };
  if (!ajustes.token) return { ok: false, error: 'sin token' };
  try {
    servidor = createServer(manejar);
    servidor.on('error', (e) => {
      console.error('[remoto] el servidor fallo:', (e as Error).message);
      parar();
    });
    servidor.listen(ajustes.port, ajustes.allowLan ? '0.0.0.0' : '127.0.0.1');
    return { ok: true };
  } catch (e) {
    servidor = null;
    return { ok: false, error: String((e as Error).message ?? e) };
  }
}

export function parar(): void {
  // Un codigo de emparejamiento no debe sobrevivir a apagar el servidor.
  pareja = null;
  if (!servidor) return;
  try { servidor.close(); } catch { /* ya estaba cerrado */ }
  servidor = null;
}

export interface EstadoRemoto {
  corriendo: boolean;
  port: number;
  lan: string[];
  ipPrincipal?: string;
  hostname?: string;
  mdnsUrl?: string;
}

export function estado(): EstadoRemoto {
  const ips = ajustes.allowLan ? direccionesLan() : [];
  const h = hostname().trim();
  return {
    corriendo: !!servidor,
    port: ajustes.port,
    lan: ips,
    ipPrincipal: ips[0] ?? '127.0.0.1',
    hostname: h,
    mdnsUrl: `http://${h.toLowerCase()}.local:${ajustes.port}`,
  };
}
