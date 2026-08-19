import { ipcMain } from 'electron';
import * as barra from '../floatingBar';

export function registerFloatingBarIpc() {
  ipcMain.handle('bar:open', (_e: any, g: barra.GeometriaBarra) => { barra.abrirBarra(g); return true; });
  ipcMain.handle('bar:close', () => { barra.cerrarBarra(); return true; });
  ipcMain.handle('bar:isOpen', () => barra.barraAbierta());
  ipcMain.handle('bar:apply', (_e: any, g: barra.GeometriaBarra) => { barra.aplicarGeometria(g); return true; });
  ipcMain.handle('bar:position', () => barra.posicionActual());
  ipcMain.handle('bar:fit', (_e: any, ancho: number, alto: number, centrar: boolean) => {
    barra.ajustarAlContenido(ancho, alto, !!centrar);
    return true;
  });
  ipcMain.handle('bar:maxSlots', (_e: any, tile: number) => barra.huecosQueCaben(tile));
}
