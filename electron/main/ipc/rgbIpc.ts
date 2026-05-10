import { ipcMain, dialog, BrowserWindow } from 'electron';
import * as rgb from '../rgb';

export function registerRgbIpc(win: BrowserWindow) {
  rgb.setOnDeviceListUpdated(() => {
    if (!win.isDestroyed()) win.webContents.send('rgb:devicesChanged');
  });

  ipcMain.handle('rgb:status', () => rgb.status());
  ipcMain.handle('rgb:connect', (_e: any, h?: string, p?: number) => rgb.connect(h, p));
  ipcMain.handle('rgb:disconnect', () => rgb.disconnect());
  ipcMain.handle('rgb:spawnServer', (_e: any, exePath?: string) => rgb.spawnServer(exePath));
  ipcMain.handle('rgb:killServer', () => rgb.killServer());
  ipcMain.handle('rgb:listDevices', () => rgb.listDevices());
  ipcMain.handle('rgb:setDeviceColor', (_e: any, id: number, c: string) => rgb.setDeviceColor(id, c));
  ipcMain.handle('rgb:setZoneColors', (_e: any, id: number, z: number, cs: string[]) => rgb.setZoneColors(id, z, cs));
  ipcMain.handle('rgb:setSingleLed', (_e: any, id: number, ledId: number, c: string) => rgb.setSingleLed(id, ledId, c));
  ipcMain.handle('rgb:setMode', (_e: any, id: number, m: string, c?: string, b?: number, s?: number) => rgb.setMode(id, m, c, b, s));
  ipcMain.handle('rgb:resizeZone', (_e: any, id: number, z: number, size: number) => rgb.resizeZone(id, z, size));
  ipcMain.handle('rgb:applyProfile', (_e: any, profile: any) => rgb.applyProfile(profile));
  ipcMain.handle('rgb:smartPreset', (_e: any, presetId: string) => rgb.applySmartPreset(presetId));

  ipcMain.handle('rgb:pickFile', async () => {
    const r = await dialog.showOpenDialog(win, {
      title: 'Selecciona OpenRGB.exe',
      filters: [{ name: 'OpenRGB', extensions: ['exe'] }],
      properties: ['openFile'],
    });
    return r.canceled || !r.filePaths[0] ? null : r.filePaths[0];
  });
}
