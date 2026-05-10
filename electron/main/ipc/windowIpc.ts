import { ipcMain, BrowserWindow } from 'electron';

export function registerWindowIpc(win: BrowserWindow) {
  ipcMain.on('window:minimize', () => { win.hide(); });
  ipcMain.on('window:maximize', () => win.isMaximized() ? win.unmaximize() : win.maximize());
  ipcMain.on('window:close', () => win.hide());
  ipcMain.on('window:fullscreen', () => win.setFullScreen(!win.isFullScreen()));
}
