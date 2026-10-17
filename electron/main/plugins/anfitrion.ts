import { createServer } from 'http';
import type { Server } from 'http';
import type { AddressInfo } from 'net';
import { randomBytes } from 'crypto';
import { release } from 'os';
import { shell } from 'electron';
import { WebSocketServer, WebSocket } from 'ws';
import { urlAbrible } from '../abrirExterno';
import { cabeEnLimite, esObjetoPlano } from './validacion';
import { crearOrdenesVisuales, type AvisoVisual } from './ordenesVisuales';

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
 * El servidor escucha solo en `127.0.0.1` con puerto aleatorio. Cada anfitrión
 * genera un token de sesión aleatorio y lo pasa como `-pluginUUID` al lanzar:
 * el SDK oficial lo reenvía opaco en `registerPlugin`, así que solo el proceso
 * lanzado puede registrarse (hallazgo #3). El PI, en cambio, se autentica por
 * `Origin`: tiene que venir del servidor de archivos del plugin, sin
 * excepciones —una conexión sin `Origin` nunca es un navegador.
 *
 * Cada `setImage`/`setTitle`/`setState` tiene que traer un contexto registrado
 * y la imagen solo puede ser `data:` válido o archivo del plugin (hallazgo #9).
 * Los `settings` y globales tienen que ser objetos planos de hasta 64 KB
 * (hallazgo #10), y las colas sin PI/plugin están acotadas (hallazgo #8).
 */

const VERSION_APP = '7.1.0';

/** Mensajes por contexto sin PI conectado: más es fuga de memoria (#8). */
const MAX_COLA_PI = 20;
/** Mensajes sin plugin registrado: más es fuga de memoria (#8). */
const MAX_COLA_PLUGIN = 100;

/** El dispositivo virtual que se anuncia si el gestor no dice otro. */
const DISPOSITIVO_POR_DEFECTO = { id: 'vd-proto', nombre: 'VirtualDeck prototipo', columnas: 5, filas: 3 };

interface DispositivoVirtual {
  id: string;
  nombre: string;
  columnas: number;
  filas: number;
}

type Mensaje = Record<string, any>;

export interface OpcionesAnfitrion {
  puertoArchivos: number;
  uuid: string;
  version: string;
  idioma: string;
  carpeta: string;
  /** Si no se dice, el del prototipo (`vd-proto`, 5×3). */
  dispositivo?: DispositivoVirtual;
  /** Con qué responder `getGlobalSettings` antes del primer `setGlobalSettings`. */
  globalesIniciales?: unknown;
  /** Lo que el plugin pinta: el gestor lo reemite a las ventanas. */
  alVisual?: (visual: AvisoVisual) => void;
  /** Lo que el plugin o el PI guarda en un botón: el gestor lo persiste. */
  alSettings?: (contexto: string, settings: Record<string, unknown>) => void;
  /** Lo que el plugin guarda como global: el gestor lo guarda en disco. */
  alGlobales?: (globales: unknown) => void;
}

export interface Anfitrion {
  puerto: number;
  infoJSON: string;
  /** El `-pluginUUID` que se pasó al lanzar: `<uuid>:<token de sesión>`. */
  uuidRegistro: string;
  enviar(mensaje: Mensaje): void;
  pulsar(contexto: string): void;
  /** Registra el contexto y le manda `willAppear` con sus ajustes. */
  aparecer(contexto: string, datos: { accion: string; settings: unknown; columna?: number; fila?: number }): void;
  /** Le manda `willDisappear` y suelta el contexto. */
  desaparecer(contexto: string): void;
  /** Le manda `keyDown` o `keyUp` con los ajustes y coordenadas guardados. */
  tecla(contexto: string, abajo: boolean): void;
  cerrar(): void;
}

interface Contexto {
  accion: string;
  device: string;
  coordinates: { column: number; row: number };
}

/**
 * @param opciones Datos del plugin que ya se lanzó (o se va a lanzar).
 * @param alRegistrar Se llama **una vez**, cuando el plugin se registra.
 */
export function crearAnfitrion(
  opciones: OpcionesAnfitrion,
  alRegistrar: () => void,
): Promise<Anfitrion> {
  const dispositivo = opciones.dispositivo ?? DISPOSITIVO_POR_DEFECTO;
  // Token de sesión (hallazgo #3): 256 bits aleatorios por anfitrión. Se pasa
  // al plugin como `-pluginUUID` (`<uuid>:<token>`) y el SDK lo reenvía opaco
  // en `registerPlugin.uuid`; adivinarlo es inviable y otro proceso local no
  // puede suplantar al plugin aunque conozca el UUID público del manifiesto.
  const uuidRegistro = `${opciones.uuid}:${randomBytes(32).toString('hex')}`;
  let plugin: WebSocket | null = null;
  const pis = new Map<string, WebSocket>();
  const contextos = new Map<string, Contexto>();
  const ajustes = new Map<string, unknown>();
  const colaPlugin: Mensaje[] = [];
  const colaPI = new Map<string, Mensaje[]>();
  let globales: unknown = opciones.globalesIniciales ?? {};
  // Las órdenes visuales llevan su propio registro (`ordenesVisuales.ts`): aquí
  // solo se decide qué contexto vale y a dónde va el aviso.
  const ordenes = crearOrdenesVisuales({
    carpeta: opciones.carpeta,
    alVisual: opciones.alVisual,
    contextoDe: (msg) => contextoRegistrado(msg)?.contexto ?? null,
  });

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
        device: String(msg.device ?? dispositivo.id),
        coordinates: payload.coordinates ?? { column: 0, row: 0 },
      });
    }
    if (evento === 'willDisappear' && contexto) {
      // Suelta todo lo del botón: si no, lo guardado y las colas crecen con
      // cada tecla que aparece y desaparece (hallazgo #8).
      contextos.delete(contexto);
      ajustes.delete(contexto);
      ordenes.olvidar(contexto);
      colaPI.delete(contexto);
    }
    if (plugin && plugin.readyState === WebSocket.OPEN) {
      enviarA(plugin, msg);
      return;
    }
    colaPlugin.push(msg);
    if (colaPlugin.length > MAX_COLA_PLUGIN) colaPlugin.splice(0, colaPlugin.length - MAX_COLA_PLUGIN);
  }

  function enviarAlPI(contexto: string, msg: Mensaje): void {
    const pi = pis.get(contexto);
    if (pi && pi.readyState === WebSocket.OPEN) {
      enviarA(pi, msg);
      return;
    }
    const cola = colaPI.get(contexto) ?? [];
    cola.push(msg);
    while (cola.length > MAX_COLA_PI) cola.shift();
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
    const settings: unknown = msg.payload ?? {};
    // Solo objetos planos de hasta 64 KB: los arrays se descartarían al leer y
    // cada guardado reescribe el disco y mete un paso en Undo (hallazgo #10).
    if (!esObjetoPlano(settings) || !cabeEnLimite(settings)) {
      console.log(`[plugins] setSettings rechazado de ${origen}: no es un objeto plano de hasta 64 KB`);
      return;
    }
    ajustes.set(registro.contexto, settings);
    const notificacion = {
      event: 'didReceiveSettings',
      action: registro.ctx.accion,
      context: registro.contexto,
      device: registro.ctx.device,
      payload: { settings },
    };
    if (origen === 'plugin') enviarAlPI(registro.contexto, notificacion);
    else enviarAlPlugin(notificacion);
    opciones.alSettings?.(registro.contexto, settings);
  }

  function guardarGlobales(nuevas: unknown, origen: 'plugin' | 'pi'): void {
    if (!esObjetoPlano(nuevas) || !cabeEnLimite(nuevas)) {
      console.log(`[plugins] setGlobalSettings rechazado de ${origen}: no es un objeto plano de hasta 64 KB`);
      return;
    }
    globales = nuevas;
    reenviarGlobales(origen);
    opciones.alGlobales?.(globales);
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
        guardarGlobales(msg.payload, 'plugin');
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
        ordenes.registrar(msg);
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
        guardarGlobales(msg.payload, 'pi');
        break;
      case 'sendToPlugin': reenviarAlPluginDesdePI(msg); break;
      case 'openUrl': abrirUrl(msg); break;
      case 'logMessage': anotarMensaje(msg); break;
      default:
        console.log(`[plugins] evento del PI no manejado: ${evento || '(sin nombre)'}`);
    }
  }

  /** Una conexión nueva: aún no se sabe si es el plugin o un PI. */
  function conectar(ws: WebSocket, conOrigenValido: boolean): void {
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
        // Solo el proceso lanzado conoce el token: el UUID público del
        // manifiesto ya no basta (hallazgo #3). El valor no se registra para
        // no dejar el token en el log.
        if (msg.uuid !== uuidRegistro || plugin !== null) {
          console.log('[plugins] registerPlugin rechazado: token invalido o registro duplicado');
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
        // El PI es una página del servidor de archivos del plugin: sin su
        // `Origin` es otro proceso local suplantándolo (hallazgo #3). No se
        // pide token además porque el SDK del PI no reenvía el `-pluginUUID`
        // (solo el contexto) y pedirlo rompería todos los PI existentes.
        if (!conOrigenValido) {
          console.log('[plugins] PI rechazado: sin Origin del servidor de archivos');
          socket.close();
          return 'pendiente';
        }
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
      devices: [{ id: dispositivo.id, name: dispositivo.nombre, size: { columns: dispositivo.columnas, rows: dispositivo.filas }, type: 0 }],
    });
  }

  return new Promise((listo, fallo) => {
    const servidor: Server = createServer();
    const wss = new WebSocketServer({ noServer: true, maxPayload: 1024 * 1024 });

    servidor.on('upgrade', (req, socket, head) => {
      const origen = req.headers.origin;
      const esperado = `http://127.0.0.1:${opciones.puertoArchivos}`;
      if (origen && origen !== esperado) {
        console.log(`[plugins] conexion WebSocket rechazada por Origin: ${origen}`);
        socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
        socket.destroy();
        return;
      }
      // Sin `Origin` es un plugin Node (o un impostor local): el token de
      // `registerPlugin` decide; con `Origin` del servidor de archivos puede
      // ser el plugin HTML o un PI. Se propaga el dato a `conectar` porque el
      // primer mensaje aún no dice qué rol trae.
      const conOrigenValido = origen === esperado;
      wss.handleUpgrade(req, socket, head, (ws) => conectar(ws, conOrigenValido));
    });

    servidor.once('error', fallo);
    servidor.listen(0, '127.0.0.1', () => {
      const direccion = servidor.address() as AddressInfo;
      listo({
        puerto: direccion.port,
        infoJSON: crearInfo(),
        uuidRegistro,
        enviar: enviarAlPlugin,
        pulsar,
        aparecer,
        desaparecer,
        tecla,
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
    tecla(contexto, true);
    setTimeout(() => tecla(contexto, false), 100);
  }

  /**
   * Un botón apareció en pantalla: se registra su contexto y se le manda
   * `willAppear` al plugin con sus ajustes. Las coordenadas son ficticias (el
   * deck no es una rejilla de Stream Deck): donde cae el botón.
   */
  function aparecer(contexto: string, datos: { accion: string; settings: unknown; columna?: number; fila?: number }): void {
    const coordinates = { column: datos.columna ?? 0, row: datos.fila ?? 0 };
    contextos.set(contexto, { accion: datos.accion, device: dispositivo.id, coordinates });
    ajustes.set(contexto, datos.settings ?? {});
    enviarAlPlugin({
      event: 'willAppear',
      action: datos.accion,
      context: contexto,
      device: dispositivo.id,
      payload: { settings: datos.settings ?? {}, coordinates, controller: 'Keypad', isInMultiAction: false },
    });
  }

  function desaparecer(contexto: string): void {
    const ctx = contextos.get(contexto);
    if (!ctx) return;
    enviarAlPlugin({ event: 'willDisappear', action: ctx.accion, context: contexto, device: ctx.device });
  }

  function tecla(contexto: string, abajo: boolean): void {
    const ctx = contextos.get(contexto);
    if (!ctx) {
      console.log(`[plugins] no puedo pulsar ${contexto}: contexto desconocido`);
      return;
    }
    const payload = { settings: ajustes.get(contexto) ?? {}, coordinates: ctx.coordinates, isInMultiAction: false };
    enviarAlPlugin({ event: abajo ? 'keyDown' : 'keyUp', action: ctx.accion, context: contexto, device: ctx.device, payload });
  }
}

/** Texto acotado para el registro: una imagen entera no cabe ni dice nada. */
function recortar(valor: string, max: number): string {
  return valor.length > max ? valor.slice(0, max) + '…' : valor;
}
