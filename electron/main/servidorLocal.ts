import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomBytes } from 'node:crypto';
import { networkInterfaces } from 'node:os';
import type { BrowserWindow } from 'electron';
import { loadConfig } from './configManager';
import { atender } from './enlacesExternos';
import { paginaMando } from './paginaMando';

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

export interface AjustesRemoto {
  enabled: boolean;
  port: number;
  token: string;
  /** false = solo este equipo (127.0.0.1). true = toda la red local. */
  allowLan: boolean;
}

export const REMOTO_POR_DEFECTO: AjustesRemoto = {
  enabled: false,
  port: 8787,
  token: '',
  allowLan: false,
};

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
export function direccionesLan(): string[] {
  const salida: string[] = [];
  for (const lista of Object.values(networkInterfaces())) {
    for (const i of lista ?? []) {
      if (i.family === 'IPv4' && !i.internal) salida.push(i.address);
    }
  }
  return salida;
}

/** ¿La cabecera `Host` apunta a este equipo y a nuestro puerto? */
function hostAceptable(host: string | undefined): boolean {
  if (!host) return false;
  const nombre = host.replace(/:\d+$/, '').replace(/^\[|\]$/g, '');
  if (nombre === 'localhost' || nombre === '127.0.0.1' || nombre === '::1') return true;
  return ajustes.allowLan && direccionesLan().includes(nombre);
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

/** Los botones que se pueden pulsar, para que el cliente sepa qué pedir. */
function listaDeBotones(): Array<{ id: string; label: string; page: number }> {
  const cfg = loadConfig() as { buttons?: Array<{ id: string; label?: string; page?: number; action?: { type: string } }> };
  return (cfg?.buttons ?? [])
    .filter((b) => b.action && b.action.type !== 'none')
    .map((b) => ({ id: b.id, label: b.label ?? '', page: b.page ?? 0 }));
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

function manejar(req: IncomingMessage, res: ServerResponse): void {
  const url = new URL(req.url ?? '/', 'http://localhost');

  if (!hostAceptable(req.headers.host)) return responder(res, 403, { ok: false, error: 'host no permitido' });
  // Una petición con `Origin` viene de una página web. Solo se acepta el de la
  // nuestra —el mando móvil, servido desde aquí mismo—; cualquier otro es una
  // página de otro sitio hablando con tu equipo.
  const origen = req.headers.origin;
  if (origen && origen !== `http://${req.headers.host}`) {
    return responder(res, 403, { ok: false, error: 'origen no permitido' });
  }

  // El mando móvil. Se sirve sin token: es solo la carcasa, y lo primero que
  // hace es pedir el código de emparejamiento.
  if (url.pathname === '/' || url.pathname === '/index.html') {
    const html = paginaMando();
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Length': Buffer.byteLength(html),
      'Cache-Control': 'no-store',
    });
    return void res.end(html);
  }

  // `ping` no pide token: es como se comprueba desde la interfaz que el
  // servidor esta vivo, y no dice nada que no sea publico.
  if (url.pathname === '/api/ping') return responder(res, 200, { ok: true, app: 'VirtualDeck' });

  // Emparejar tampoco: es justo lo que hace el teléfono cuando aún no tiene
  // token. `canjear` gasta un intento aunque el código no exista.
  if (url.pathname === '/api/pair' && req.method === 'POST') {
    return void leerCuerpo(req).then((cuerpo) => {
      let codigo = '';
      try { codigo = String(JSON.parse(cuerpo).code ?? ''); } catch { /* cuerpo ilegible */ }
      const token = canjear(codigo.trim());
      responder(res, token ? 200 : 401, token ? { ok: true, token } : { ok: false, error: 'codigo invalido' });
    });
  }

  const token = req.headers['x-vd-token'];
  if (!tokenValido(Array.isArray(token) ? token[0] : token)) {
    return responder(res, 401, { ok: false, error: 'token invalido' });
  }

  if (url.pathname === '/api/buttons') return responder(res, 200, { ok: true, buttons: listaDeBotones() });

  // El resto se traduce a un enlace y lo resuelve `enlacesExternos`: lo que se
  // puede hacer por HTTP y lo que se puede hacer por `virtualdeck://` tienen
  // que ser lo mismo, y con dos implementaciones acabarian separandose.
  const press = url.pathname.match(/^\/api\/press\/(.+)$/);
  if (press) return conEnlace(res, `virtualdeck://press/${press[1]}`);
  if (url.pathname === '/api/press' && url.searchParams.get('label')) {
    return conEnlace(res, `virtualdeck://press?label=${encodeURIComponent(url.searchParams.get('label')!)}`);
  }
  const page = url.pathname.match(/^\/api\/page\/(\d+)$/);
  if (page) return conEnlace(res, `virtualdeck://page/${page[1]}`);

  responder(res, 404, { ok: false, error: 'no existe' });
}

function conEnlace(res: ServerResponse, enlace: string): void {
  const r = atender(enlace, ventana);
  responder(res, r.ok ? 200 : 404, r);
}

/** Arranca o para el servidor según los ajustes. Idempotente. */
export function aplicar(nuevos: AjustesRemoto, win: BrowserWindow | null): { ok: boolean; error?: string } {
  ajustes = { ...REMOTO_POR_DEFECTO, ...nuevos };
  ventana = win;
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

export function estado(): { corriendo: boolean; port: number; lan: string[] } {
  return { corriendo: !!servidor, port: ajustes.port, lan: ajustes.allowLan ? direccionesLan() : [] };
}
