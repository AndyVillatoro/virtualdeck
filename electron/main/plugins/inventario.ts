import { existsSync, readdirSync, type Dirent } from 'fs';
import { join } from 'path';
import type { PluginInfo } from '../../../src/types';
import { leerManifiesto, type AccionManifiesto, type Manifiesto } from './manifiesto';
import { emitirCambios } from './eventos';
import { dirDe, dirPlugins, estado } from './estado';

/**
 * Inventario de plugins instalados (roadmap 83, MVP).
 *
 * Lee los manifiestos que hay en disco y los convierte a `PluginInfo` con su
 * estado vivo (en marcha, fallido, detenido). No arranca ni detiene nada: eso
 * es de `cicloVida.ts`; instalar y quitar es de `instalar.ts`.
 */

export function emitir(): void {
  emitirCambios(listarPlugins());
}

function aAccion(manifiesto: Manifiesto, accion: AccionManifiesto, indice: number): PluginInfo['acciones'][number] {
  const reserva = `${manifiesto.uuid}#${indice}`;
  return {
    uuid: accion.uuid || reserva,
    nombre: accion.nombre || accion.uuid || reserva,
    esTecla: accion.controladores.includes('Keypad'),
    tienePI: !!(accion.piPath ?? manifiesto.piPath),
    userTitleEnabled: accion.userTitleEnabled,
    tieneImagenPropia: Boolean(accion.icono ?? accion.imagenEstado),
  };
}

function aInfo(manifiesto: Manifiesto): PluginInfo {
  const marcha = estado.enMarcha.get(manifiesto.uuid);
  const fallo = estado.fallos.get(manifiesto.uuid);
  return {
    uuid: manifiesto.uuid,
    nombre: manifiesto.nombre,
    version: manifiesto.version,
    tipo: manifiesto.tipo === 'exe' ? 'node' : manifiesto.tipo,
    acciones: manifiesto.acciones.map((accion, i) => aAccion(manifiesto, accion, i)),
    habilitado: !estado.deshabilitados.has(manifiesto.uuid),
    estado: marcha?.estado ?? (fallo ? 'error' : 'stopped'),
    ...(fallo ? { error: fallo } : {}),
  };
}

/** Los manifiestos instalados que el gestor entiende (los `.exe` no). */
export function leerInstalados(): Manifiesto[] {
  const salida: Manifiesto[] = [];
  let base: string;
  try {
    base = dirPlugins();
  } catch {
    return [];
  }
  if (!existsSync(base)) return [];
  let entradas: Dirent<string>[];
  try {
    entradas = readdirSync(base, { withFileTypes: true });
  } catch {
    return [];
  }
  for (const entrada of entradas) {
    if (!entrada.isDirectory() || !entrada.name.endsWith('.sdPlugin')) continue;
    const lectura = leerManifiesto(join(base, entrada.name));
    if (lectura.estado !== 'ok' || lectura.manifiesto.tipo === 'exe') continue;
    salida.push(lectura.manifiesto);
  }
  return salida.sort((a, b) => (a.uuid < b.uuid ? -1 : 1));
}

export function listarPlugins(): PluginInfo[] {
  return leerInstalados().map(aInfo);
}

export function infoDe(uuid: string): PluginInfo | null {
  const manifiesto = leerInstalados().find((m) => m.uuid === uuid);
  return manifiesto ? aInfo(manifiesto) : null;
}

export function existeInstalado(uuid: string): boolean {
  try {
    return existsSync(dirDe(uuid));
  } catch {
    return false;
  }
}
