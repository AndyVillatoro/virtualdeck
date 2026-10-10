import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import type { BrowserWindow } from 'electron';
import type {
  CompanionCommand,
  CompanionMetadata,
  CompanionFrame,
} from '../../../src/types';
import { puertoCompanionValido } from '../../../src/types';
import {
  esActivo,
  obtenerPuerto,
  fijarPuerto,
  fijarActivo,
  obtenerToken,
  esTokenValido,
  validarCodigoEmparejamiento,
  fijarClienteWs,
  obtenerClienteWs,
  actualizarMetadatos,
  registrarFrame,
  obtenerUltimoFrame,
  limpiarUltimoFrame,
  obtenerEstadoCompanion,
  fijarFallo,
} from './estadoCompanion';
import {
  cabeFrame,
  crearLimitador,
  MAX_CLIENTES_MJPEG,
  MAX_META_POR_SEGUNDO,
  MAX_PAYLOAD_FRAME,
} from './limites';

/**
 * Servidor HTTP y WebSocket local para la extensión compañera (VirtualDeck Companion).
 * Escucha estrictamente en 127.0.0.1 (bucle local).
 *
 * Endpoints:
 * - ws://127.0.0.1:<puerto>/companion (Canal bidireccional de control, metadatos y frames)
 * - http://127.0.0.1:<puerto>/companion/status (JSON de estado)
 * - http://127.0.0.1:<puerto>/companion/frame.jpg (Último fotograma capturado)
 * - http://127.0.0.1:<puerto>/companion/stream (MJPEG stream continuo para previews rápidos)
 */

const MAGIC_VDCM = 0x5644434d; // 'VDCM' en uint32 BE

/** Cada cuánto se avisa a la interfaz del estado; con fotogramas llega a 20/s. */
const INTERVALO_NOTIFICACION_MS = 1000;

let servidorHttp: Server | null = null;
let wss: WebSocketServer | null = null;
let ventanaPrincipal: BrowserWindow | null = null;

/**
 * **Todos** los sockets vivos, no solo el de control.
 *
 * Antes solo se guardaba el de control: al parar el servidor, el socket de
 * transmisión —que es el que manda los fotogramas— se quedaba abierto y
 * seguía escribiendo hacia un servidor que ya no escuchaba. Al cambiar de
 * puerto pasaba lo mismo, y el que ganaba era el nuevo o el viejo según
 * llegara antes: en la práctica, el fotograma se quedaba congelado.
 */
const sockets = new Set<WebSocket>();

/** Clientes MJPEG con el búfer lleno: se les salta el fotograma hasta que drenen. */
const mjpegSaturados = new WeakSet<ServerResponse>();
const clientesMjpeg = new Set<ServerResponse>();

/** Sockets que han demostrado conocer el token (handshake, auth o pair). */
const autenticados = new WeakSet<WebSocket>();

/** Topes por socket: el límite de `meta` es por cliente, no global. */
const limiteMeta = new WeakMap<WebSocket, () => boolean>();

let ultimaNotificacion = 0;
let notificacionPendiente: ReturnType<typeof setTimeout> | null = null;

function fijarVentanaCompanion(win: BrowserWindow | null): void {
  ventanaPrincipal = win;
}

export function notificarEstado(): void {
  if (ventanaPrincipal && !ventanaPrincipal.isDestroyed()) {
    ventanaPrincipal.webContents.send('companion:status', obtenerEstadoCompanion());
  }
  ultimaNotificacion = Date.now();
}

/**
 * El estado se emite **como mucho una vez por segundo**.
 *
 * Antes solo se emitía al conectar y al desconectar, así que el FPS que ve la
 * interfaz era el del instante de la conexión: con el stream ya en marcha,
 * el contador se quedaba en 0 para siempre. Emitir en cada fotograma sería
 * peor: son 20 avisos por segundo de un estado que no cambia tan rápido.
 */
function notificarEstadoSiToca(): void {
  const desde = Date.now() - ultimaNotificacion;
  if (desde >= INTERVALO_NOTIFICACION_MS) {
    notificarEstado();
    return;
  }
  if (notificacionPendiente) return;
  // Se programa el final de la ventana en vez de tirar el aviso: así el FPS
  // que se ve es el del último segundo, no el de hace tres.
  notificacionPendiente = setTimeout(() => {
    notificacionPendiente = null;
    notificarEstado();
  }, INTERVALO_NOTIFICACION_MS - desde);
}

function notificarMetadatos(meta: CompanionMetadata): void {
  if (ventanaPrincipal && !ventanaPrincipal.isDestroyed()) {
    ventanaPrincipal.webContents.send('companion:metadata', meta);
  }
}

function notificarFrame(frame: CompanionFrame): void {
  if (ventanaPrincipal && !ventanaPrincipal.isDestroyed()) {
    ventanaPrincipal.webContents.send('companion:frame', frame);
  }
}

function hostPermitido(host: string | undefined): boolean {
  return /^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host || '');
}

/** Solo orígenes de extensión; un Origin ausente o web normal se rechaza. */
function origenExtensionValido(origin: string | undefined): boolean {
  if (!origin) return false;
  return ['chrome-extension://', 'moz-extension://', 'extension://'].some((p) => origin.startsWith(p));
}

function tokenHttpValido(req: IncomingMessage, url: URL): boolean {
  const cabecera = req.headers['x-vd-token'];
  const token = (Array.isArray(cabecera) ? cabecera[0] : cabecera) || url.searchParams.get('token') || '';
  return esTokenValido(token);
}

/**
 * Un fotograma entero, o ninguno.
 *
 * Con `res.write()` se apila: un consumidor lento (una pestaña en segundo
 * plano, un proxy) acumulaba el stream entero en memoria, y con 20 fotogramas
 * por segundo eso son decenas de megabytes por cliente. Mientras el búfer esté
 * lleno se le salta el fotograma y se vuelve a entrar cuando drena.
 *
 * Los tres trozos van **siempre juntos**: si la cabecera se escribiera y el
 * cuerpo no, el cliente se quedaría con una frontera a medias y el siguiente
 * fotograma le llegaría descuadrado.
 */
function escribirMjpeg(res: ServerResponse, cabecera: Buffer, cuerpo: Buffer, fin: Buffer): void {
  if (res.destroyed || res.writableEnded) {
    clientesMjpeg.delete(res);
    return;
  }
  if (mjpegSaturados.has(res)) return;
  let acepta: boolean;
  try {
    acepta = res.write(cabecera);
    acepta = res.write(cuerpo) && acepta;
    acepta = res.write(fin) && acepta;
  } catch {
    clientesMjpeg.delete(res);
    return;
  }
  if (!acepta) {
    mjpegSaturados.add(res);
    res.once('drain', () => mjpegSaturados.delete(res));
  }
}

function repartirFrame(payloadBytes: Buffer): void {
  if (clientesMjpeg.size === 0) return;
  const cabecera = Buffer.from(
    `--frame\r\nContent-Type: image/jpeg\r\nContent-Length: ${payloadBytes.length}\r\n\r\n`,
  );
  const fin = Buffer.from('\r\n');
  for (const res of clientesMjpeg) {
    escribirMjpeg(res, cabecera, payloadBytes, fin);
  }
}

function procesarFrameBinario(ws: WebSocket, buffer: Buffer): void {
  if (!autenticados.has(ws)) return;
  if (buffer.length < 16) return;
  const magic = buffer.readUInt32BE(0);
  if (magic !== MAGIC_VDCM) return;

  const ancho = buffer.readUInt16LE(4);
  const alto = buffer.readUInt16LE(6);
  const timestamp = buffer.readUInt32LE(8);
  const payloadLen = buffer.readUInt32LE(12);

  // La cabecera dice cuánto viene; si el fotograma no cabe en los topes se
  // descarta **antes** de copiarlo a ningún sitio.
  if (!cabeFrame(ancho, alto, payloadLen)) return;
  if (buffer.length < 16 + payloadLen) return;
  const payloadBytes = buffer.subarray(16, 16 + payloadLen);

  registrarFrame(ancho, alto, timestamp, payloadBytes);

  repartirFrame(payloadBytes);

  // Notificar al renderer vía IPC como data URL
  const base64 = payloadBytes.toString('base64');
  notificarFrame({
    ancho,
    alto,
    timestamp,
    payload: `data:image/jpeg;base64,${base64}`,
  });

  notificarEstadoSiToca();
}

function procesarMensajeTexto(ws: WebSocket, texto: string): void {
  let json: Record<string, unknown>;
  try {
    const bruto = JSON.parse(texto);
    if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) return;
    json = bruto as Record<string, unknown>;
  } catch {
    // JSON malformado ignorado
    return;
  }

  if (json.tipo === 'auth') {
    const ok = esTokenValido(String(json.token || ''));
    ws.send(JSON.stringify({ tipo: 'auth', ok }));
    if (ok) {
      autenticados.add(ws);
      fijarClienteWs(ws);
      notificarEstado();
    }
    return;
  }

  if (json.tipo === 'pair') {
    const ok = validarCodigoEmparejamiento(String(json.code || ''));
    if (ok) {
      const token = obtenerToken();
      autenticados.add(ws);
      fijarClienteWs(ws);
      ws.send(JSON.stringify({ tipo: 'pair', ok: true, token }));
      notificarEstado();
    } else {
      ws.send(JSON.stringify({ tipo: 'pair', ok: false }));
    }
    return;
  }

  // El resto de mensajes exigen un socket autenticado
  if (!autenticados.has(ws)) return;

  if (json.tipo === 'meta') {
    if (!limiteMeta.get(ws)?.()) return;
    // `actualizarMetadatos` devuelve lo que ha limpado, o `null` si el mensaje
    // no servía: lo que se notifica es lo validado, nunca lo crudo que llegó.
    const limpio = actualizarMetadatos(json);
    if (limpio) notificarMetadatos(limpio);
    return;
  }

  if (json.tipo === 'ping') {
    ws.send(JSON.stringify({ tipo: 'pong' }));
  }
}

function manejarHttp(req: IncomingMessage, res: ServerResponse): void {
  const url = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`);

  // Sin cabeceras CORS: ninguna página web puede leer estas respuestas desde el navegador.
  // Además se valida Host para mitigar DNS rebinding.
  if (!hostPermitido(req.headers.host) || req.method === 'OPTIONS') {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  if (!tokenHttpValido(req, url)) {
    res.writeHead(401, { 'Content-Type': 'text/plain' });
    res.end('Unauthorized');
    return;
  }

  if (url.pathname === '/companion/status') {
    // El token nunca se expone por HTTP, aunque el llamante lo conozca.
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ...obtenerEstadoCompanion(), token: '' }));
    return;
  }

  if (url.pathname === '/companion/frame.jpg') {
    const frame = obtenerUltimoFrame();
    if (!frame) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('No frame available');
      return;
    }
    res.writeHead(200, {
      'Content-Type': 'image/jpeg',
      'Content-Length': frame.buffer.length,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    });
    res.end(frame.buffer);
    return;
  }

  if (url.pathname === '/companion/stream') {
    if (clientesMjpeg.size >= MAX_CLIENTES_MJPEG) {
      res.writeHead(503, { 'Content-Type': 'text/plain' });
      res.end('Too many stream clients');
      return;
    }
    res.writeHead(200, {
      'Content-Type': 'multipart/x-mixed-replace; boundary=frame',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Connection': 'close',
      'Pragma': 'no-cache',
    });
    clientesMjpeg.add(res);
    req.on('close', () => {
      clientesMjpeg.delete(res);
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('VirtualDeck Companion Server - Endpoint not found');
}

/**
 * Cierra **todos** los sockets, no solo el de control.
 *
 * Sin esto, al apagar el servidor o cambiar de puerto el socket de vídeo
 * seguía vivo: seguía enviando fotogramas a un servidor que ya no escuchaba
 * y, al volver a encenderlo, competía con el cliente nuevo por quién es «el»
 * cliente de control.
 */
function cerrarTodosLosSockets(): void {
  for (const ws of sockets) {
    try {
      ws.close();
      ws.terminate();
    } catch {
      // Un socket ya cerrado no se deja cerrar dos veces; no importa.
    }
  }
  sockets.clear();
  fijarClienteWs(null);
}

function alCerrarStream(): void {
  limpiarUltimoFrame();
  notificarFrame({ ancho: 0, alto: 0, timestamp: 0, payload: '' });
  notificarEstado();
}

function alCerrarControl(ws: WebSocket): void {
  if (obtenerClienteWs() === ws) {
    fijarClienteWs(null);
    notificarEstado();
  }
}

export function iniciarServidorCompanion(win?: BrowserWindow): Promise<boolean> {
  if (win) fijarVentanaCompanion(win);
  if (!esActivo()) return Promise.resolve(false);
  if (servidorHttp) return Promise.resolve(true);

  const puerto = obtenerPuerto();

  return new Promise((resolve) => {
    servidorHttp = createServer(manejarHttp);
    // `maxPayload` corta antes de que `ws` construya el `Buffer`: sin él, un
    // cliente que anunciara un gigabyte lo tenía en memoria entero.
    wss = new WebSocketServer({ noServer: true, maxPayload: MAX_PAYLOAD_FRAME + 64 });

    servidorHttp.on('upgrade', (req, socket, head) => {
      const url = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`);
      if (url.pathname !== '/companion' || !hostPermitido(req.headers.host) || !origenExtensionValido(req.headers.origin)) {
        socket.destroy();
        return;
      }

      // Autenticación opcional en handshake vía query param o header
      const tokenQuery = url.searchParams.get('token');
      const tokenHeader = (req.headers['x-vd-token'] as string) || '';
      const tokenValido = esTokenValido(tokenQuery || tokenHeader);
      const esStream = url.searchParams.get('rol') === 'stream';

      wss?.handleUpgrade(req, socket, head, (ws) => {
        if (tokenValido) {
          autenticados.add(ws);
          if (!esStream) {
            fijarClienteWs(ws);
          }
          notificarEstado();
        }
        wss?.emit('connection', ws, req, tokenValido);
      });
    });

    wss.on('connection', (ws: WebSocket, req: IncomingMessage, autenticado?: boolean) => {
      const url = new URL(req?.url || '/', `http://${req?.headers?.host || '127.0.0.1'}`);
      const esStream = url.searchParams.get('rol') === 'stream';
      sockets.add(ws);
      limiteMeta.set(ws, crearLimitador(MAX_META_POR_SEGUNDO));

      if (autenticado && !esStream) {
        ws.send(JSON.stringify({ tipo: 'auth', ok: true }));
      }

      ws.on('message', (datos, esBinario) => {
        if (esBinario) {
          if (Buffer.isBuffer(datos)) {
            procesarFrameBinario(ws, datos);
          } else if (Array.isArray(datos)) {
            procesarFrameBinario(ws, Buffer.concat(datos));
          } else {
            procesarFrameBinario(ws, Buffer.from(datos as ArrayBuffer));
          }
        } else {
          procesarMensajeTexto(ws, datos.toString());
        }
      });

      ws.on('close', () => {
        sockets.delete(ws);
        if (esStream) alCerrarStream();
        alCerrarControl(ws);
      });

      ws.on('error', () => {
        sockets.delete(ws);
        if (esStream) alCerrarStream();
        alCerrarControl(ws);
      });
    });

    servidorHttp.on('error', (err) => {
      console.error('[companion] Error al iniciar servidor:', (err as Error).message);
      // Sin esto el fallo se quedaba en el registro: la interfaz seguía
      // diciendo «esperando conexión» con un puerto que nadie escuchaba, y no
      // había forma de saber que el motivo era otro programa con el puerto.
      fijarFallo((err as NodeJS.ErrnoException).code === 'EADDRINUSE' ? 'puerto-ocupado' : 'puerto-invalido');
      servidorHttp = null;
      wss = null;
      cerrarTodosLosSockets();
      notificarEstado();
      resolve(false);
    });

    servidorHttp.listen(puerto, '127.0.0.1', () => {
      fijarFallo(null);
      notificarEstado();
      resolve(true);
    });
  });
}

export function detenerServidorCompanion(): Promise<void> {
  return new Promise((resolve) => {
    for (const res of clientesMjpeg) {
      try { res.end(); } catch { /* noop */ }
    }
    clientesMjpeg.clear();

    if (notificacionPendiente) {
      clearTimeout(notificacionPendiente);
      notificacionPendiente = null;
    }

    limpiarUltimoFrame();
    notificarFrame({ ancho: 0, alto: 0, timestamp: 0, payload: '' });

    // Primero los sockets y luego el servidor: al revés, `wss.close()` deja
    // vivos los sockets y el que quede sigue escribiendo.
    cerrarTodosLosSockets();

    if (wss) {
      wss.close();
      wss = null;
    }

    if (servidorHttp) {
      servidorHttp.close(() => {
        servidorHttp = null;
        notificarEstado();
        resolve();
      });
    } else {
      resolve();
    }
  });
}

export function enviarComandoCompanion(cmd: CompanionCommand): boolean {
  const ws = obtenerClienteWs();
  if (!ws || ws.readyState !== 1) return false;
  try {
    ws.send(JSON.stringify(cmd));
    return true;
  } catch {
    return false;
  }
}

/** Enciende o apaga el servidor sin perder los ajustes ya guardados. */
export function alternarServidorCompanion(activo: boolean): Promise<boolean> {
  if (activo === esActivo()) return Promise.resolve(servidorHttp !== null);
  fijarActivo(activo);
  if (!activo) {
    fijarFallo(null);
    return detenerServidorCompanion().then(() => true);
  }
  return iniciarServidorCompanion();
}

export async function cambiarPuertoCompanion(nuevoPuerto: number): Promise<boolean> {
  if (!puertoCompanionValido(nuevoPuerto)) {
    fijarFallo('puerto-invalido');
    notificarEstado();
    return false;
  }
  if (nuevoPuerto === obtenerPuerto()) return true;
  fijarPuerto(nuevoPuerto);
  fijarFallo(null);
  // El puerto elegido se guarda aunque el servidor no logre escucharlo: si el
  // usuario lo cambió a propósito, al reiniciar se vuelve a intentar, y el
  // motivo del fallo se lo dice Ajustes en vez de dejarlo en el registro.
  if (esActivo() && servidorHttp) {
    await detenerServidorCompanion();
    return iniciarServidorCompanion();
  }
  return true;
}