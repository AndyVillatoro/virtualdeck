import type { PluginInfo, PluginRef, ResultadoInstalacion } from '../../../src/types';
import { emitirCambios } from './eventos';

/**
 * Gestor de plugins instalados (roadmap 83, MVP). **Esqueleto**: el contrato
 * ya está cableado (IPC, preload, tipos); la implementación la hace T-PLG-01.
 */

export function listarPlugins(): PluginInfo[] {
  return [];
}

export async function instalarPlugin(_ruta?: string): Promise<ResultadoInstalacion> {
  return { ok: false, codigo: 'invalido', detalle: 'sin implementar' };
}

export async function desinstalarPlugin(_uuid: string): Promise<boolean> {
  return false;
}

export async function habilitarPlugin(_uuid: string, _habilitado: boolean): Promise<PluginInfo | null> {
  emitirCambios(listarPlugins());
  return null;
}

export async function aparecerPlugin(_ref: PluginRef, _visible: boolean): Promise<boolean> {
  return false;
}

export async function pulsarPlugin(_ref: PluginRef, _abajo: boolean): Promise<boolean> {
  return false;
}

export async function abrirPIPlugin(_ref: PluginRef): Promise<boolean> {
  return false;
}
