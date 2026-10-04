/**
 * Protocolo HID del Stream Dock N3: paquetes de salida y lectura de entradas.
 *
 * Adaptado del módulo MIT `companion-surface-mirabox-stream-dock` de Bitfocus
 * (`src/streamdock.ts`: prefijo CRT, comandos BAT/STP/LIG/CONNECT/CLE/DIS,
 * y lectura de los bytes 9 y 10 de cada reporte). Ver THIRD_PARTY_NOTICES.md.
 * No se usa código de OpenDeck ni de opendeck-akp03 (GPL).
 *
 * Todo lo de este archivo es puro: arma Buffers o interpreta Buffers, sin
 * tocar el hardware. Lo probó el prototipo `spike-n3/spike.mjs` contra el N3
 * real (serial 81D0DA78211F, interface 0).
 */

import type { EntradaSuperficie } from '../../../src/types';
import type { ModeloMirabox } from './modelos';
import { MODELOS } from './modelos';

/** Una entrada ya interpretada, sin el serial (lo añade el gestor). */
export type EntradaHardware = Omit<EntradaSuperficie, 'serial'>;

/** Bytes útiles por paquete de salida (el report id va aparte). */
export const TAMANO_PAQUETE = 1024;

/** Prefijo ASCII "CRT\0\0" que abre todos los comandos de control. */
const PREFIJO = [0x43, 0x52, 0x54, 0x00, 0x00];

export const DESPERTAR = [0x44, 0x49, 0x53]; // "DIS"
export const REFRESCO = [0x53, 0x54, 0x50]; // "STP"
export const LATIDO = [0x43, 0x4f, 0x4e, 0x4e, 0x45, 0x43, 0x54]; // "CONNECT"
export const LIMPIAR_TODO = [0x43, 0x4c, 0x45, 0x00, 0x00, 0x00, 0xff]; // "CLE" + 0xff
export const APAGAR = [0x43, 0x4c, 0x45, 0x00, 0x00, 0x44, 0x43]; // "CLE" + "DC"

/** "CLE" de una sola tecla (keyId 1–6). */
export function limpiarTecla(keyId: number): number[] {
  return [0x43, 0x4c, 0x45, 0x00, 0x00, 0x00, keyId];
}

/**
 * "LIG" + brillo. Bitfocus aplica una curva gamma 0.75 antes de mandar el
 * byte; se conserva porque es la que el hardware del N3 espera.
 */
export function comandoBrillo(porcentaje: number): number[] {
  const limitado = Math.max(0, Math.min(100, porcentaje));
  const valor = Math.round(Math.pow(limitado / 100, 0.75) * 100);
  return [0x4c, 0x49, 0x47, 0x00, 0x00, valor];
}

/** Cabecera "BAT" + longitud del JPEG en 4 bytes big-endian + keyId. */
export function cabeceraImagen(longitud: number, keyId: number): number[] {
  return [
    0x42, 0x41, 0x54, // "BAT"
    (longitud >>> 24) & 0xff,
    (longitud >>> 16) & 0xff,
    (longitud >>> 8) & 0xff,
    longitud & 0xff,
    keyId,
  ];
}

/** Report id 0 + prefijo CRT + datos, rellenado con ceros hasta 1025 bytes. */
export function paqueteComando(datos: readonly number[]): Buffer {
  const buffer = Buffer.alloc(TAMANO_PAQUETE + 1);
  Buffer.from(PREFIJO).copy(buffer, 1);
  Buffer.from(datos).copy(buffer, 1 + PREFIJO.length);
  return buffer;
}

/** Report id 0 + trozo crudo de imagen, rellenado con ceros hasta 1025 bytes. */
export function paqueteTrozo(trozo: Buffer): Buffer {
  const buffer = Buffer.alloc(TAMANO_PAQUETE + 1);
  trozo.copy(buffer, 1);
  return buffer;
}

/** Parte el JPEG en trozos de 1024 bytes, como los manda Bitfocus. */
export function trozosDeImagen(jpeg: Buffer): Buffer[] {
  const trozos: Buffer[] = [];
  for (let offset = 0; offset < jpeg.byteLength; offset += TAMANO_PAQUETE) {
    trozos.push(jpeg.subarray(offset, offset + TAMANO_PAQUETE));
  }
  return trozos;
}

/**
 * Interpreta un reporte de entrada del N3.
 *
 * Los reportes válidos miden al menos 11 bytes y empiezan por "ACK"; el byte 9
 * es el código de la entrada y el byte 10 el estado (1 pulsado, 0 soltado).
 * Devuelve `null` para cualquier cosa que no sea una entrada del modelo.
 */
export function interpretarEntrada(buf: Buffer, modelo: ModeloMirabox = MODELOS[0]): EntradaHardware | null {
  if (!buf || buf.byteLength < 11) return null;
  if (buf[0] !== 0x41 || buf[1] !== 0x43 || buf[2] !== 0x4b) return null; // "ACK"

  const entrada = modelo.entradas[buf[9]];
  if (!entrada) return null;

  const gesto = entrada.gesto ?? (buf[10] === 0x00 ? 'up' : 'down');
  return { control: entrada.control, indice: entrada.indice, gesto };
}
