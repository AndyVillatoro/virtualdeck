import { ipcMain, app, BrowserWindow } from 'electron';
import * as os from 'os';

/**
 * Registrar el arranque con Windows, con la marca de arrancar escondido.
 *
 * Sin `args`, iniciar sesión abría la ventana en primer plano y con su entrada
 * en la barra de tareas, delante de lo que estuviera haciendo el usuario. Una
 * aplicación de bandeja que arranca sola tiene que arrancar en la bandeja.
 *
 * Se exporta porque hay que volver a escribirlo en cada arranque: quien ya
 * tenía el inicio automático puesto lo tiene registrado **sin** la marca, y esa
 * entrada del registro no se corrige sola.
 */
export function fijarArranqueAutomatico(activado: boolean) {
  app.setLoginItemSettings({ openAtLogin: activado, args: ['--oculto'] });
}

export function registerAppIpc(win: BrowserWindow) {
  ipcMain.handle('app:autostart:get', () => app.getLoginItemSettings().openAtLogin);
  ipcMain.handle('app:autostart:set', (_e: any, enabled: boolean) => {
    fijarArranqueAutomatico(enabled);
  });
  ipcMain.handle('app:setZoom', (_e: any, factor: number) => {
    win.webContents.setZoomFactor(Math.max(0.75, Math.min(1.75, factor)));
  });
  ipcMain.handle('app:getZoom', () => win.webContents.getZoomFactor());
  ipcMain.handle('app:version', () => app.getVersion());
  ipcMain.handle('app:platformInfo', () => ({
    appVersion: app.getVersion(),
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    os: `${os.type()} ${os.release()} (${os.arch()})`,
    locale: app.getLocale(),
  }));
}
