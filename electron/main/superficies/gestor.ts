/**
 * Gestor de superficies físicas: sondea el bus HID, conecta y retira
 * dispositivos por número de serie y reparte entradas y cambios.
 *
 * El sondeo usa la enumeración asíncrona de `node-hid` (la API que el módulo
 * MIT de Bitfocus usa como `HIDAsync`) y solo abre la interfaz de control de
 * cada modelo (interface 0 en el N3). Un error de HID nunca tumba el proceso:
 * el dispositivo se retira y se sigue sondeando.
 */

import { devicesAsync, type Device } from 'node-hid';
import type { EntradaSuperficie, InfoSuperficie } from '../../../src/types';
import { logEntry } from '../logger';
import { DispositivoMirabox } from './dispositivoMirabox';
import { modeloPorVidPid, type ModeloMirabox } from './modelos';
import { interpretarEntrada } from './protocoloMirabox';

const CADA_MS = 3000;
const BRILLO_INICIAL = 70;

export interface CallbacksGestor {
  alEntrada: (entrada: EntradaSuperficie) => void;
  alCambio: (lista: InfoSuperficie[]) => void;
}

let temporizador: NodeJS.Timeout | null = null;
let callbacks: CallbacksGestor | null = null;
let dispositivos = new Map<string, DispositivoMirabox>();
let infos = new Map<string, InfoSuperficie>();
const abriendo = new Set<string>();

function registrar(nivel: 'info' | 'warn' | 'error', mensaje: string, meta?: unknown) {
  logEntry({ level: nivel, scope: 'superficies', message: mensaje, meta });
}

function lista(): InfoSuperficie[] {
  return [...infos.values()];
}

function avisarCambio(): void {
  callbacks?.alCambio(lista());
}

/** Un reporte crudo: si es una entrada del modelo, se reparte con su serial. */
function alEntradaCruda(serial: string, modelo: ModeloMirabox, buf: Buffer): void {
  const entrada = interpretarEntrada(buf, modelo);
  if (!entrada) return;
  callbacks?.alEntrada({ serial, ...entrada });
}

function retirar(serial: string, motivo: string): void {
  const dispositivo = dispositivos.get(serial);
  dispositivos.delete(serial);
  infos.delete(serial);
  if (!dispositivo) return;
  registrar('info', `disconnected ${serial}: ${motivo}`);
  if (dispositivo.estaVivo) void dispositivo.cerrar();
  avisarCambio();
}

async function abrir(serial: string, modelo: ModeloMirabox, path: string): Promise<void> {
  try {
    const dispositivo = await DispositivoMirabox.abrir(serial, modelo, path, BRILLO_INICIAL, {
      alEntrada: (buf) => alEntradaCruda(serial, modelo, buf),
      alDesconectar: (error) => retirar(serial, error.message),
    });
    abriendo.delete(serial);
    if (!dispositivo.estaVivo) return;
    dispositivos.set(serial, dispositivo);
    infos.set(serial, { serial, modelo: modelo.modelo, nombre: modelo.nombre, conectado: true });
    registrar('info', `connected ${modelo.nombre} (${serial})`);
    avisarCambio();
  } catch (error) {
    abriendo.delete(serial);
    registrar('warn', `failed to open ${serial}`, String(error));
  }
}

/** Enumera el bus, abre los que aparecen y retira los que ya no están. */
async function tic(): Promise<void> {
  let encontrados: Device[];
  try {
    encontrados = await devicesAsync();
  } catch (error) {
    registrar('warn', 'HID enumeration failed', String(error));
    return;
  }

  const presentes = new Set<string>();
  for (const dispositivo of encontrados) {
    const modelo = modeloPorVidPid(dispositivo.vendorId, dispositivo.productId);
    if (!modelo || dispositivo.interface !== modelo.interfazControl) continue;
    const serial = dispositivo.serialNumber?.trim();
    if (!serial || !dispositivo.path) continue;
    presentes.add(serial);
    if (dispositivos.has(serial) || abriendo.has(serial)) continue;
    abriendo.add(serial);
    void abrir(serial, modelo, dispositivo.path);
  }

  for (const serial of [...dispositivos.keys()]) {
    if (!presentes.has(serial)) retirar(serial, 'not present');
  }
}

export function iniciarGestor(cbs: CallbacksGestor): void {
  callbacks = cbs;
  if (temporizador) return;
  void tic();
  temporizador = setInterval(() => { void tic(); }, CADA_MS);
}

export function listar(): InfoSuperficie[] {
  return lista();
}

export async function imagen(serial: string, tecla: number, jpegBase64: string): Promise<boolean> {
  const dispositivo = dispositivos.get(serial);
  if (!dispositivo) return false;
  await dispositivo.imagen(tecla, Buffer.from(jpegBase64, 'base64'));
  return true;
}

export async function brillo(serial: string, valor: number): Promise<boolean> {
  const dispositivo = dispositivos.get(serial);
  if (!dispositivo) return false;
  await dispositivo.brillo(valor);
  return true;
}

export async function limpiar(serial: string): Promise<boolean> {
  const dispositivo = dispositivos.get(serial);
  if (!dispositivo) return false;
  await dispositivo.limpiar();
  return true;
}

/** Apaga los dispositivos y para el sondeo. Lo llama el cierre de la app. */
export function detener(): void {
  if (temporizador) {
    clearInterval(temporizador);
    temporizador = null;
  }
  for (const dispositivo of dispositivos.values()) {
    if (dispositivo.estaVivo) void dispositivo.cerrar();
  }
  dispositivos = new Map();
  infos = new Map();
  abriendo.clear();
  callbacks = null;
}
