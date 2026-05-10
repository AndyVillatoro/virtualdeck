import { ipcMain, dialog, BrowserWindow } from 'electron';
import { readFileSync, writeFileSync } from 'fs';
import { loadConfig, saveConfig, listBackups, restoreBackup } from '../configManager';
import { applyTriggerableConfig } from '../trayManager';
import * as sensors from '../sensors';
import { getWeather } from '../weather';

export function registerConfigIpc(win: BrowserWindow, onQuit: () => void) {
  ipcMain.handle('config:load', () => loadConfig());

  ipcMain.handle('config:save', (_e: any, data: object) => {
    saveConfig(data);
    applyTriggerableConfig(win, data, onQuit);
    const sCfg = (data as any)?.sensors;
    if (sCfg) sensors.configure({
      host: sCfg.host, port: sCfg.port, enabled: sCfg.enabled, categories: sCfg.categories,
    });
    return true;
  });

  ipcMain.handle('config:listBackups', () => listBackups());
  ipcMain.handle('config:restoreBackup', (_e: any, filename: string) => restoreBackup(filename));

  ipcMain.handle('config:export', async () => {
    const r = await dialog.showSaveDialog(win, {
      title: 'Exportar configuración de VirtualDeck',
      defaultPath: 'virtualdeck-config.json',
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (r.canceled || !r.filePath) return false;
    try { writeFileSync(r.filePath, JSON.stringify(loadConfig(), null, 2), 'utf-8'); return true; }
    catch { return false; }
  });

  ipcMain.handle('config:import', async () => {
    const r = await dialog.showOpenDialog(win, {
      title: 'Importar configuración de VirtualDeck',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile'],
    });
    if (r.canceled || !r.filePaths[0]) return null;
    try {
      const data = JSON.parse(readFileSync(r.filePaths[0], 'utf-8'));
      saveConfig(data);
      return data;
    } catch { return null; }
  });

  ipcMain.handle('weather:get', (_e: any, force?: boolean) => getWeather(!!force));
}
