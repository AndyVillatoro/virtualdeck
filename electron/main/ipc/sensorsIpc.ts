import { ipcMain } from 'electron';
import * as sensors from '../sensors';

export function registerSensorsIpc() {
  ipcMain.handle('sensors:list', (_e: any, force?: boolean) => sensors.list(!!force));
  ipcMain.handle('sensors:get', (_e: any, id: string) => sensors.get(id));
  ipcMain.handle('sensors:status', () => sensors.status());
  ipcMain.handle('sensors:configure', (_e: any, opts: { host?: string; port?: number; enabled?: boolean; categories?: any[] }) => {
    sensors.configure(opts || {});
    return sensors.status();
  });
  ipcMain.handle('sensors:probe', () => sensors.probe());
  ipcMain.handle('sensors:spawnLHM', (_e: any, customPath?: string, elevated?: boolean) => sensors.spawnLHM(customPath, !!elevated));
  ipcMain.handle('sensors:killLHM', () => sensors.killLHM());
  ipcMain.handle('sensors:bundledPath', () => sensors.bundledExePath());
  ipcMain.handle('sensors:registerUrlAcl', (_e: any, targetPort?: number) => sensors.registerUrlAcl(targetPort));
}
