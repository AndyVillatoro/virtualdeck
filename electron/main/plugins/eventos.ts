import { BrowserWindow } from 'electron';
import type { PluginInfo, PluginVisual } from '../../../src/types';

/**
 * Lo que el proceso principal le cuenta a todas las ventanas sobre los plugins
 * (principal, barra flotante, kiosko): un solo sitio con los nombres de canal.
 */

function ventanas(): BrowserWindow[] {
  return BrowserWindow.getAllWindows().filter((w) => !w.isDestroyed());
}

/** La lista de plugins o su estado cambió. */
export function emitirCambios(lista: PluginInfo[]): void {
  for (const win of ventanas()) win.webContents.send('plugins:changed', lista);
}

/** Un plugin pintó algo en un botón. */
export function emitirVisual(visual: PluginVisual): void {
  for (const win of ventanas()) win.webContents.send('plugins:visual', visual);
}

/** Un plugin guardó ajustes de un botón: la pantalla los persiste en la config. */
export function emitirSettings(contexto: string, settings: Record<string, unknown>): void {
  for (const win of ventanas()) win.webContents.send('plugins:settings', contexto, settings);
}
