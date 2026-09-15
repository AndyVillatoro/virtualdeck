import { ipcMain, BrowserWindow } from 'electron';
import * as tienda from '../tienda';

/**
 * Puentes de la tienda. Dos direcciones:
 *
 * - La tienda pide (`tienda:importar`) y la principal aplica: el pedido viaja
 *   como evento `tienda:aplicar` a la ventana principal, que valida con sus
 *   propias funciones y responde con `tienda:resultado`.
 * - La respuesta (`tienda:hecho`) vuelve como evento a la ventana de la
 *   tienda, que enseña el error o marca lo instalado.
 */
export function registerTiendaIpc(principal: BrowserWindow) {
  ipcMain.handle('tienda:open', () => { tienda.abrirTienda(); return true; });
  ipcMain.handle('tienda:close', () => { tienda.cerrarTienda(); return true; });
  ipcMain.handle('tienda:isOpen', () => tienda.tiendaAbierta());
  ipcMain.handle('tienda:import', (_e: any, pedido: unknown) => {
    if (!principal.isDestroyed()) principal.webContents.send('tienda:apply', pedido);
    return true;
  });
  ipcMain.handle('tienda:resultado', (_e: any, r: unknown) => {
    const v = tienda.ventanaTienda();
    if (v && !v.isDestroyed()) v.webContents.send('tienda:hecho', r);
    return true;
  });
}
