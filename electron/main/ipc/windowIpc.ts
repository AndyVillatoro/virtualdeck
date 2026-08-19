import { ipcMain, BrowserWindow } from 'electron';

export function registerWindowIpc(win: BrowserWindow) {
  ipcMain.on('window:minimize', () => { win.hide(); });
  ipcMain.on('window:maximize', () => win.isMaximized() ? win.unmaximize() : win.maximize());
  ipcMain.on('window:close', () => win.hide());
  ipcMain.on('window:fullscreen', () => win.setFullScreen(!win.isFullScreen()));
  // 'screen-saver' y no true a secas: el nivel por defecto de Electron en
  // Windows deja que un fullscreen exclusivo (un juego, un vídeo) se ponga
  // por delante igualmente, que es justo cuando el usuario quiere ver el deck.
  ipcMain.on('window:setAlwaysOnTop', (_e, encima: boolean) => {
    win.setAlwaysOnTop(!!encima, 'screen-saver');
  });
}
