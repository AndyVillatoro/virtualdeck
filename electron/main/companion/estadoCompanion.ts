import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import type { WebSocket } from 'ws';
import type {
  CompanionFallo,
  CompanionMetadata,
  CompanionStatus,
  CompanionSettings,
} from '../../../src/types';
import { COMPANION_POR_DEFECTO, puertoCompanionValido } from '../../../src/types';
import { validarMetadatos } from './limites';

/**
 * Estado en memoria del servidor de la extensión compañera.
 * Maneja el cliente WebSocket activo, metadatos, fotogramas y emparejamiento.
 *
 * El token y el puerto **viven en la configuración del usuario**, no aquí: se
 * leen al arrancar (`inicializarEstadoCompanion`) y se vuelven a escribir
 * cuando cambian. Antes se regeneraban en cada arranque —la extensión se
 * emparejaba otra vez cada vez que se abría VirtualDeck— porque nada los
 * guardaba en ninguna parte.
 */

const CADUCIDAD_CODIGO_MS = 5 * 60 * 1000;
const MAX_INTENTOS_CODIGO = 5;

let clienteWs: WebSocket | null = null;
let puertoActual = COMPANION_POR_DEFECTO.port;
let tokenActual = '';
let activoActual = COMPANION_POR_DEFECTO.enabled;
let falloActual: CompanionFallo | null = null;

let metadatosActuales: CompanionMetadata | null = null;

// Medición de fotogramas por segundo (FPS) en una ventana rodante de 1 segundo
let contadorFrames = 0;
let ultimoCalculoFps = Date.now();
let fpsActual = 0;

let emparejamiento: {
  codigo: string;
  caduca: number;
  intentos: number;
} | null = null;

export function inicializarEstadoCompanion(ajustes?: Partial<CompanionSettings>): void {
  activoActual = ajustes?.enabled ?? COMPANION_POR_DEFECTO.enabled;
  const puerto = ajustes?.port;
  puertoActual = typeof puerto === 'number' && puertoCompanionValido(puerto) ? puerto : COMPANION_POR_DEFECTO.port;
  tokenActual = ajustes?.token || generarToken();
  falloActual = null;
}

function generarToken(): string {
  return randomBytes(24).toString('base64url');
}

export function regenerarToken(): string {
  tokenActual = generarToken();
  return tokenActual;
}

export function obtenerToken(): string {
  if (!tokenActual) {
    tokenActual = generarToken();
  }
  return tokenActual;
}

/**
 * Comparación en **tiempo constante**.
 *
 * `===` sobre cadenas sale en el primer carácter que difiere: con el token
 * equivocado, el tiempo de respuesta dice cuántos caracteres acertó. Importa
 * poco contra un atacante local que ya puede leer el disco, pero el token es
 * la única barrera que separa «pulsar botones» de «no pulsar nada» y no
 * cuesta nada hacerla bien.
 *
 * `timingSafeEqual` exige la misma longitud: se comparan los **hash**, que son
 * siempre de 32 bytes, y así ni siquiera la longitud sale.
 */
export function esTokenValido(token: string): boolean {
  if (!token || !tokenActual) return false;
  return timingSafeEqual(hash(token), hash(tokenActual));
}

function hash(valor: string): Buffer {
  return createHash('sha256').update(valor, 'utf8').digest();
}

/**
 * Código de emparejamiento de 6 cifras **sin sesgo de módulo**.
 *
 * `randomBytes(4) % 1000000` no es uniforme: 2^32 no es múltiplo de 10^6, así
 * que los 774 618 primeros códigos salían algo más a menudo que los últimos. Con
 * cinco intentos por código y el código en pantalla no es una اللعبة seria,
 * pero `randomInt` ya está en `node:crypto` y hace falta un argumento.
 */
export function nuevoCodigoEmparejamiento(): string {
  const codigo = String(randomInt(0, 1_000_000)).padStart(6, '0');
  emparejamiento = {
    codigo,
    caduca: Date.now() + CADUCIDAD_CODIGO_MS,
    intentos: 0,
  };
  return codigo;
}

export function validarCodigoEmparejamiento(codigo: string): boolean {
  if (!emparejamiento) return false;
  if (Date.now() > emparejamiento.caduca) {
    emparejamiento = null;
    return false;
  }
  emparejamiento.intentos++;
  if (emparejamiento.intentos > MAX_INTENTOS_CODIGO) {
    emparejamiento = null;
    return false;
  }
  if (!codigoValido(emparejamiento.codigo, codigo)) {
    return false;
  }
  emparejamiento = null;
  return true;
}

/** Cuatro de las seis cifras y sin fugas de tiempo: el código se teclea a ojo. */
function codigoValido(esperado: string, recibido: string): boolean {
  if (esperado.length !== recibido.length) return false;
  let diferencia = 0;
  for (let i = 0; i < esperado.length; i++) {
    diferencia |= esperado.charCodeAt(i) ^ recibido.charCodeAt(i);
  }
  return diferencia === 0;
}

/**
 * Fija el cliente de control y **cierra el anterior**.
 *
 * El service worker de MV3 se reinicia por su cuenta: cuando vuelve a
 * levantar la conexión, el socket viejo puede seguir abierto un instante. Sin
 * esto los dos coexistían con el mismo rol y el que se autenticó primero se
 * quedaba con los comandos, mientras el nuevo se creía conectado.
 */
export function fijarClienteWs(ws: WebSocket | null): void {
  const anterior = clienteWs;
  clienteWs = ws;
  if (anterior && anterior !== ws) {
    try {
      anterior.close();
    } catch {
      // Ya estaba cerrado: da igual.
    }
  }
}

export function obtenerClienteWs(): WebSocket | null {
  return clienteWs;
}

function estaConectado(): boolean {
  return clienteWs !== null && clienteWs.readyState === 1; // WebSocket.OPEN = 1
}

export function actualizarMetadatos(meta: unknown): CompanionMetadata | null {
  const limpio = validarMetadatos(meta);
  if (!limpio) return null;
  metadatosActuales = limpio;
  return limpio;
}

/**
 * Cuenta los fotogramas del socket de vídeo para el FPS del estado.
 *
 * Ya no guarda el último fotograma: solo lo leían `/companion/frame.jpg` y
 * `/companion/stream`, retirados en T-SEC-07 H-08 porque llevaban el token en
 * la URL. La firma se queda como la llama el servidor, que es quien decodifica
 * la cabecera VDCM.
 */
export function registrarFrame(_ancho: number, _alto: number, _timestamp: number, _payload: Buffer): void {
  contadorFrames++;
  const ahora = Date.now();
  if (ahora - ultimoCalculoFps >= 1000) {
    fpsActual = Math.round((contadorFrames * 1000) / (ahora - ultimoCalculoFps));
    contadorFrames = 0;
    ultimoCalculoFps = ahora;
  }
}

export function limpiarUltimoFrame(): void {
  contadorFrames = 0;
  fpsActual = 0;
}

function obtenerFps(): number {
  const ahora = Date.now();
  if (ahora - ultimoCalculoFps > 2000) {
    fpsActual = 0;
  }
  return fpsActual;
}

export function obtenerPuerto(): number {
  return puertoActual;
}

export function fijarPuerto(puerto: number): void {
  puertoActual = puerto;
}

export function esActivo(): boolean {
  return activoActual;
}

export function fijarActivo(activo: boolean): void {
  activoActual = activo;
}

/** Los tres ajustes, ya validados: es lo que se escribe en la configuración. */
export function obtenerAjustesCompanion(): CompanionSettings {
  return { enabled: activoActual, port: puertoActual, token: obtenerToken() };
}

export function fijarFallo(fallo: CompanionFallo | null): void {
  falloActual = fallo;
}

export function obtenerEstadoCompanion(): CompanionStatus {
  return {
    activo: activoActual,
    conectado: estaConectado(),
    puerto: puertoActual,
    token: obtenerToken(),
    metadata: metadatosActuales,
    fps: obtenerFps(),
    fallo: falloActual,
  };
}