import { createServer } from 'http';
import type { Server } from 'http';
import type { AddressInfo } from 'net';
import { existsSync } from 'fs';
import { join } from 'path';
import { release } from 'os';
import { shell } from 'electron';
import { WebSocketServer, WebSocket } from 'ws';
import { urlAbrible } from '../abrirExterno';

/**
 * El anfitrión del protocolo de Stream Deck: un WebSocket local por el que el
 * plugin (o su Property Inspector) habla JSON con la aplicación.
 *
 * Es la pieza donde vive todo lo que el protocolo exige y no está escrito en
 * ninguna tabla: cada `get*` tiene que recibir respuesta o el SDK oficial se
 * queda colgado; el mismo plugin puede conectar sin `Origin` (Node) pero un
 * navegador cualquiera conecta con el suyo y podría suplantarlo; cada
 * `context` pertenece a un plugin; y lo que llegue para un PI que aún no se
 * registró no se puede tirar.
 *
 * El servidor escucha solo en `127.0.0.1` con puerto aleatorio. Se rechaza en
 * el upgrade cualquier conexión con cabecera `Origin` que no sea exactamente
 * el servidor de archivos del plugin: de ahí vienen sus páginas HTML y su PI;
 * un plugin Node conecta sin `Origin`.
 */

export const VERSION_APP = '7.1.0';
const DISPOSITIVO = 'vd-proto';
const TAMANO = { columns: 5, rows: 3 };

export type Mensaje = Record<string, any>;

export interface OpcionesAnfitrion {
  puertoArchivos: number;
  uuid: string;
  version: string;
  idioma: string;
  carpeta: string;
}

export interface Anfitrion {
  puerto: number;
  infoJSON: string;
  enviar(mensaje: Mensaje): void;
  pulsar(contexto: string): void;
  cerrar(): void;
}

interface Contexto {
  accion: string;
  device: string;
  coordinates: { column: number; row: number };
}

interface OrdenGuardada {
  imagen?: string;
  titulo?: unknown;
  estado?: unknown;
}

/**
 * @param opciones Datos del plugin que ya se lanzó (o se va a lanzar).
 * @param alRegistrar Se llama **una vez**, cuando el plugin se registra.
 */
export function crearAnfitrion(
  opciones: OpcionesAnfitrion,
  alRegistrar: () => void,
): Promise<Anfitrion> {
  let plugin: WebSocket | null = null;
  const pis = new Map<string, WebSocket>();
  const contextos = new Map<string, Contexto>();
  const ajustes = new Map<string, unknown>();
  const ultimo = new Map<string, OrdenGuardada>();
  const colaPlugin: Mensaje[] = [];
  const colaPI = new Map<string, Mensaje[]>();
  let globales: unknown = {};

  function enviarA(destino: WebSocket, msg: Mensaje): void {
    try {
      destino.send(JSON.stringify(msg));
    } catch (e) {
      console.log(`[plugins] no pude enviar por WebSocket: ${(e as Error).message}`);
    }
  }

  function contextoRegistrado(msg: Mensaje): { contexto: string; ctx: Contexto } | null {
    const contexto = String(msg.context ?? '');
    const ctx = contextos.get(contexto);
    if (!ctx) {
      console.log(`[plugins] ${String(msg.event ?? '?')} sobre un contexto desconocido: ${contexto || '(sin contexto)'}`);
      return null;
    }
    return { contexto, ctx };
  }

  function enviarAlPlugin(msg: Mensaje): void {
    const evento = String(msg.event ?? '');
    const contexto = String(msg.context ?? '');
    if (evento === 'willAppear' && contexto) {
      const payload = msg.payload ?? {};
      contextos.set(contexto, {
        accion: String(msg.action ?? ''),
        device: String(msg.device ?? DISPOSITIVO),
        coordinates: payload.coordinates ?? { column: 0, row: 0 },
      });
    }
    if (evento === 'willDisappear' && contexto) contextos.delete(contexto);
    if (plugin && plugin.readyState === WebSocket.OPEN) {
      enviarA(plugin, msg);
      return;
    }
    colaPlugin.push(msg);
  }

  function enviarAlPI(contexto: string, msg: Mensaje): void {
    const pi = pis.get(contexto);
    if (pi && pi.readyState === WebSocket.OPEN) {
      enviarA(pi, msg);
      return;
    }
    const cola = colaPI.get(contexto) ?? [];
    cola.push(msg);
    colaPI.set(contexto, cola);
  }

  function devolverSettings(destino: WebSocket, msg: Mensaje): void {
    const registro = contextoRegistrado(msg);
    if (!registro) return;
    enviarA(destino, {
      event: 'didReceiveSettings',
      action: registro.ctx.accion,
      context: registro.contexto,
      device: registro.ctx.device,
      payload: { settings: ajustes.get(registro.contexto) ?? {} },
    });
  }

  function devolverGlobales(destino: WebSocket): void {
    enviarA(destino, { event: 'didReceiveGlobalSettings', payload: { settings: globales } });
  }

  function devolverRecursos(destino: WebSocket): void {
    enviarA(destino, { event: 'didReceiveResources', payload: { resources: [] } });
  }

  function guardarSettings(msg: Mensaje, origen: 'plugin' | 'pi'): void {
    const registro = contextoRegistrado(msg);
    if (!registro) return;
    ajustes.set(registro.contexto, msg.payload ?? {});
    const notificacion = {
      event: 'didReceiveSettings',
      action: registro.ctx.accion,
      context: registro.contexto,
      device: registro.ctx.device,
      payload: { settings: msg.payload ?? {} },
    };
    if (origen === 'plugin') enviarAlPI(registro.contexto, notificacion);
    else enviarAlPlugin(notificacion);
  }

  function reenviarGlobales(origen: 'plugin' | 'pi'): void {
    const notificacion = { event: 'didReceiveGlobalSettings', payload: { settings: globales } };
    if (origen === 'plugin') {
      for (const pi of pis.values()) enviarA(pi, notificacion);
      return;
    }
    enviarAlPlugin(notificacion);
  }

  function abrirUrl(msg: Mensaje): void {
    const url = urlAbrible(msg.payload?.url);
    if (!url || !(url.startsWith('http://') || url.startsWith('https://'))) {
      console.log(`[plugins] openUrl rechazada: ${recortar(String(msg.payload?.url ?? ''), 120)}`);
      return;
    }
    shell.openExternal(url).catch((e: Error) => console.log(`[plugins] openUrl fallo: ${e.message}`));
  }

  function anotarMensaje(msg: Mensaje): void {
    console.log(`[plugins] logMessage: ${recortar(String(msg.payload?.message ?? ''), 200)}`);
  }

  function registrarOrden(msg: Mensaje): void {
    const contexto = String(msg.context ?? '');
    const previo = ultimo.get(contexto) ?? {};
    const evento = String(msg.event ?? '');
    if (evento === 'setImage') {
      const imagen = String(msg.payload?.image ?? '');
      previo.imagen = imagen;
      console.log(`[plugins] setImage ${contexto}: ${recortar(imagen, 80)}${notaImagen(imagen)}`);
    } else if (evento === 'setTitle') {
      previo.titulo = msg.payload?.title;
      console.log(`[plugins] setTitle ${contexto}: ${recortar(String(msg.payload?.title ?? ''), 80)}`);
    } else if (evento === 'setState') {
      previo.estado = msg.payload?.state;
      console.log(`[plugins] setState ${contexto}: ${String(msg.payload?.state)}`);
    } else if (evento === 'showAlert') {
      console.log(`[plugins] showAlert ${contexto}`);
    } else if (evento === 'showOk') {
      console.log(`[plugins] showOk ${contexto}`);
    } else {
      console.log(`[plugins] setFeedback ${contexto}: ${recortar(JSON.stringify(msg.payload ?? {}), 80)}`);
    }
    ultimo.set(contexto, previo);
  }

  /**
   * Resuelve como Elgato una imagen relativa sin extensión: prueba `.svg`,
   * `@2x.png` y `.png` contra la carpeta del plugin y deja dicho cuál saldría.
   */
  function notaImagen(imagen: string): string {
    if (!imagen || imagen.startsWith('data:') || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(imagen)) return '';
    const nombre = imagen.split(/[\\/]/).pop() ?? '';
    if (!nombre || nombre.includes('.')) return '';
    const candidatos = ['.svg', '@2x.png', '.png'].map((ext) => join(opciones.carpeta, imagen + ext));
    const existe = candidatos.find((ruta) => existsSync(ruta));
    return existe ? ` (resuelve a ${existe})` : ` (no existe ${candidatos.join(' | ')})`;
  }

  function reenviarAlPI(msg: Mensaje): void {
    const registro = contextoRegistrado(msg);
    if (!registro) return;
    enviarAlPI(registro.contexto, { ...msg, action: registro.ctx.accion, device: registro.ctx.device });
  }

  function reenviarAlPluginDesdePI(msg: Mensaje): void {
    const registro = contextoRegistrado(msg);
    if (!registro) return;
    enviarAlPlugin({
      event: 'sendToPlugin',
      action: registro.ctx.accion,
      context: registro.contexto,
      device: registro.ctx.device,
      payload: msg.payload,
    });
  }

  function atenderPlugin(ws: WebSocket, msg: Mensaje): void {
    const evento = String(msg.event ?? '');
    switch (evento) {
      case 'getSettings': devolverSettings(ws, msg); break;
      case 'getGlobalSettings': devolverGlobales(ws); break;
      case 'getResources': devolverRecursos(ws); break;
      case 'setSettings': guardarSettings(msg, 'plugin'); break;
      case 'setGlobalSettings':
        globales = msg.payload ?? {};
        reenviarGlobales('plugin');
        break;
      case 'sendToPropertyInspector': reenviarAlPI(msg); break;
      case 'openUrl': abrirUrl(msg); break;
      case 'logMessage': anotarMensaje(msg); break;
      case 'setImage':
      case 'setTitle':
      case 'setState':
      case 'showAlert':
      case 'showOk':
      case 'setFeedback':
        registrarOrden(msg);
        break;
      default:
        console.log(`[plugins] evento del plugin no manejado: ${evento || '(sin nombre)'}`);
    }
  }

  function atenderPI(ws: WebSocket, msg: Mensaje): void {
    const evento = String(msg.event ?? '');
    switch (evento) {
      case 'getSettings': devolverSettings(ws, msg); break;
      case 'getGlobalSettings': devolverGlobales(ws); break;
      case 'getResources': devolverRecursos(ws); break;
      case 'setSettings': guardarSettings(msg, 'pi'); break;
      case 'setGlobalSettings':
        globales = msg.payload ?? {};
        reenviarGlobales('pi');
        break;
      case 'sendToPlugin': reenviarAlPluginDesdePI(msg); break;
      case 'openUrl': abrirUrl(msg); break;
      case 'logMessage': anotarMensaje(msg); break;
      default:
        console.log(`[plugins] evento del PI no manejado: ${evento || '(sin nombre)'}`);
    }
  }

  /** Una conexión nueva: aún no se sabe si es el plugin o un PI. */
  function conectar(ws: WebSocket): void {
    let rol: 'pendiente' | 'plugin' | 'pi' = 'pendiente';
    let contextoPI = '';
    ws.on('message', (datos) => {
      let msg: Mensaje;
      try {
        msg = JSON.parse(String(datos));
      } catch {
        console.log('[plugins] mensaje que no es JSON: se cierra la conexion');
        ws.close();
        return;
      }
      if (rol === 'pendiente') {
        rol = registrarPendiente(ws, msg);
        return;
      }
      if (rol === 'plugin') atenderPlugin(ws, msg);
      else atenderPI(ws, msg);
    });
    ws.on('close', () => {
      if (rol === 'plugin' && plugin === ws) {
        plugin = null;
        console.log('[plugins] el plugin se desconecto');
      }
      if (rol === 'pi' && contextoPI && pis.get(contextoPI) === ws) pis.delete(contextoPI);
    });
    ws.on('error', (e) => console.log(`[plugins] error de WebSocket: ${e.message}`));

    /** Procesa el primer mensaje. Devuelve el rol que le queda a la conexión. */
    function registrarPendiente(socket: WebSocket, msg: Mensaje): 'pendiente' | 'plugin' | 'pi' {
      const evento = String(msg.event ?? '');
      if (evento === 'registerPlugin') {
        if (String(msg.uuid ?? '') !== opciones.uuid || plugin !== null) {
          console.log(`[plugins] registerPlugin rechazado: ${String(msg.uuid ?? 'sin uuid')}`);
          socket.close();
          return 'pendiente';
        }
        plugin = socket;
        console.log(`[plugins] plugin registrado: ${opciones.uuid}`);
        alRegistrar();
        for (const pendiente of colaPlugin.splice(0)) enviarA(socket, pendiente);
        return 'plugin';
      }
      if (evento === 'registerPropertyInspector') {
        const contexto = String(msg.uuid ?? '');
        if (!contextos.has(contexto)) {
          console.log(`[plugins] PI rechazado por contexto desconocido: ${contexto || '(vacio)'}`);
          socket.close();
          return 'pendiente';
        }
        const anterior = pis.get(contexto);
        if (anterior && anterior !== socket) {
          try {
            anterior.close();
          } catch {
            /* ya estaba cerrado */
          }
        }
        pis.set(contexto, socket);
        contextoPI = contexto;
        console.log(`[plugins] PI registrado para ${contexto}`);
        for (const pendiente of colaPI.get(contexto) ?? []) enviarA(socket, pendiente);
        colaPI.delete(contexto);
        return 'pi';
      }
      console.log(`[plugins] primer mensaje inesperado (${evento || 'sin evento'}): se cierra`);
      socket.close();
      return 'pendiente';
    }
  }

  function crearInfo(): string {
    return JSON.stringify({
      application: { version: VERSION_APP, platform: 'windows', platformVersion: release(), language: opciones.idioma },
      plugin: { uuid: opciones.uuid, version: opciones.version },
      devicePixelRatio: 1,
      colors: {
        buttonPressedBackgroundColor: '#FF3B30',
        buttonPressedBorderColor: '#FFFFFF',
        buttonPressedTextColor: '#FFFFFF',
        disabledColor: '#303030',
        highlightColor: '#FF3B30',
        mouseOverColor: '#1A1A1A',
      },
      devices: [{ id: DISPOSITIVO, name: 'VirtualDeck prototipo', size: TAMANO, type: 0 }],
    });
  }

  return new Promise((listo, fallo) => {
    const servidor: Server = createServer();
    const wss = new WebSocketServer({ noServer: true, maxPayload: 1024 * 1024 });

    servidor.on('upgrade', (req, socket, head) => {
      const origen = req.headers.origin;
      if (origen && origen !== `http://127.0.0.1:${opciones.puertoArchivos}`) {
        console.log(`[plugins] conexion WebSocket rechazada por Origin: ${origen}`);
        socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
        socket.destroy();
        return;
      }
      wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
    });

    wss.on('connection', (ws) => conectar(ws));
    servidor.once('error', fallo);
    servidor.listen(0, '127.0.0.1', () => {
      const direccion = servidor.address() as AddressInfo;
      listo({
        puerto: direccion.port,
        infoJSON: crearInfo(),
        enviar: enviarAlPlugin,
        pulsar,
        cerrar: () => {
          for (const cliente of wss.clients) {
            try {
              cliente.terminate();
            } catch {
              /* ya estaba cerrado */
            }
          }
          try {
            wss.close();
          } catch {
            /* ya estaba cerrado */
          }
          try {
            servidor.close();
          } catch {
            /* ya estaba cerrado */
          }
        },
      });
    });
  });

  function pulsar(contexto: string): void {
    const ctx = contextos.get(contexto);
    if (!ctx) {
      console.log(`[plugins] no puedo pulsar ${contexto}: contexto desconocido`);
      return;
    }
    const payload = { settings: ajustes.get(contexto) ?? {}, coordinates: ctx.coordinates, isInMultiAction: false };
    const base = { action: ctx.accion, context: contexto, device: ctx.device };
    enviarAlPlugin({ event: 'keyDown', ...base, payload });
    setTimeout(() => enviarAlPlugin({ event: 'keyUp', ...base, payload }), 100);
  }
}

/** Texto acotado para el registro: una imagen entera no cabe ni dice nada. */
function recortar(valor: string, max: number): string {
  return valor.length > max ? valor.slice(0, max) + '…' : valor;
}
