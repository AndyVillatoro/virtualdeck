import { BrowserWindow, ipcMain } from 'electron';
import * as gestor from '../superficies/gestor';

/**
 * Puente IPC de las superficies físicas: los cuatro comandos y los dos
 * avisos. El gestor se arranca aquí (una sola vez por sesión) y sus avisos se
 * reenvían a la ventana principal.
 */
export function registerSuperficiesIpc(win: BrowserWindow) {
  gestor.iniciarGestor({
    alEntrada: (entrada) => {
      if (!win.isDestroyed()) win.webContents.send('surfaces:input', entrada);
    },
    alCambio: (lista) => {
      if (!win.isDestroyed()) win.webContents.send('surfaces:changed', lista);
    },
  });

  ipcMain.handle('surfaces:list', () => gestor.listar());
  ipcMain.handle('surfaces:image', (_e: any, serial: string, tecla: number, jpegBase64: string) =>
    gestor.imagen(serial, tecla, jpegBase64));
  ipcMain.handle('surfaces:brightness', (_e: any, serial: string, valor: number) =>
    gestor.brillo(serial, valor));
  ipcMain.handle('surfaces:clear', (_e: any, serial: string) =>
    gestor.limpiar(serial));
}
