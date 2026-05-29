import { ipcMain, app, BrowserWindow } from 'electron';
import * as os from 'os';

export function registerAppIpc(win: BrowserWindow) {
  ipcMain.handle('app:autostart:get', () => app.getLoginItemSettings().openAtLogin);
  ipcMain.handle('app:autostart:set', (_e: any, enabled: boolean) => {
    app.setLoginItemSettings({ openAtLogin: enabled });
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
