import { app, type BrowserWindow } from 'electron';
import { join } from 'path';
import type { EstadoPlugin } from '../../../src/types';
import type { ServidorArchivos } from './archivos';
import type { Anfitrion } from './anfitrion';
import type { Manifiesto } from './manifiesto';
import type { PluginLanzado } from './procesos';
import { TablaContextos } from './contextos';

/**
 * Estado del gestor de plugins instalados (roadmap 83, MVP).
 *
 * Antes vivía en `gestor.ts` entero; al partirlo por responsabilidad, este es
 * el **único** sitio donde se guarda (como `rgb/estado.ts`): la marcha de cada
 * plugin, el último fallo, los reintentos pendientes, la tabla de contextos,
 * los deshabilitados y si el gestor arrancó. Todo lo demás (inventario,
 * instalación, ciclo de vida e interacción) lee y escribe aquí, de modo que no
 * puede haber dos copias de la misma marcha.
 */

export const DISPOSITIVO_GESTOR = { id: 'virtualdeck', nombre: 'VirtualDeck', columnas: 5, filas: 3 };
/** Cuánto se espera a que un plugin se registre antes de decir que no. */
export const ESPERA_REGISTRO_MS = 3000;
export const MAX_REINTENTOS = 3;

export interface Marcha {
  manifiesto: Manifiesto;
  archivos: ServidorArchivos | null;
  puertoArchivos: number;
  anfitrion: Anfitrion | null;
  proceso: PluginLanzado | null;
  estado: EstadoPlugin;
  reintentos: number;
  registrado: boolean;
  enEspera: Array<(ok: boolean) => void>;
  temporizadores: Array<ReturnType<typeof setTimeout>>;
  pis: Map<string, BrowserWindow>;
  deteniendo: boolean;
}

/** Una marcha con el anfitrión ya levantado, lista para hablar. */
export interface MarchaLista {
  marcha: Marcha;
  anfitrion: Anfitrion;
}

export const estado = {
  enMarcha: new Map<string, Marcha>(),
  /** UUID → código del último fallo (lo que `PluginInfo.error` enseña). */
  fallos: new Map<string, string>(),
  reintentosPendientes: new Map<string, ReturnType<typeof setTimeout>>(),
  contextos: new TablaContextos(),
  deshabilitados: new Set<string>(),
  iniciado: false,
};

export function dirPlugins(): string {
  return join(app.getPath('userData'), 'plugins');
}

export function dirDe(uuid: string): string {
  return join(dirPlugins(), `${uuid}.sdPlugin`);
}
