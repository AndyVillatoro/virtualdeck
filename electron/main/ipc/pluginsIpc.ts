import { ipcMain } from 'electron';
import type { EntradaInstalacionUrl, PluginRef } from '../../../src/types';
import {
  listarPlugins,
  instalarPlugin,
  instalarDesdeUrl,
  desinstalarPlugin,
  habilitarPlugin,
  aparecerPlugin,
  pulsarPlugin,
  girarPlugin,
  abrirPIPlugin,
} from '../plugins/gestor';

export function registerPluginsIpc(): void {
  ipcMain.handle('plugins:list', () => listarPlugins());
  ipcMain.handle('plugins:install', (_e, ruta?: string) => instalarPlugin(ruta));
  ipcMain.handle('plugins:installFromUrl', (_e, entrada: EntradaInstalacionUrl) => instalarDesdeUrl(entrada));
  ipcMain.handle('plugins:uninstall', (_e, uuid: string) => desinstalarPlugin(uuid));
  ipcMain.handle('plugins:setEnabled', (_e, uuid: string, habilitado: boolean) => habilitarPlugin(uuid, !!habilitado));
  ipcMain.handle('plugins:appear', (_e, ref: PluginRef, visible: boolean) => aparecerPlugin(ref, !!visible));
  ipcMain.handle('plugins:press', (_e, ref: PluginRef, abajo: boolean) => pulsarPlugin(ref, !!abajo));
  ipcMain.handle('plugins:rotate', (_e, ref: PluginRef, ticks: number) => girarPlugin(ref, Number(ticks)));
  ipcMain.handle('plugins:openPI', (_e, ref: PluginRef) => abrirPIPlugin(ref));
}
