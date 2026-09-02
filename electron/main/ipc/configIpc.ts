import { ipcMain, dialog, BrowserWindow } from 'electron';
import { readFileSync, writeFileSync } from 'fs';
import { loadConfig, saveConfig, listBackups, restoreBackup } from '../configManager';
import { applyTriggerableConfig } from '../trayManager';
import * as sensors from '../sensors';
import { getWeather } from '../weather';
import { obtenerTasas } from '../divisas';
import { avisarCambioDeConfig } from '../floatingBar';
import { tm, fijarIdioma } from '../idioma';
import * as remoto from '../servidorLocal';

export function registerConfigIpc(win: BrowserWindow, onQuit: () => void) {
  ipcMain.handle('config:load', () => loadConfig());

  ipcMain.handle('config:save', (_e: any, data: object) => {
    saveConfig(data);
    // Antes de reconstruir el menu de la bandeja, por si cambio el idioma: si
    // no, la bandeja se queda en el anterior hasta el siguiente arranque.
    fijarIdioma((data as any)?.language);
    applyTriggerableConfig(win, data, onQuit);
    const sCfg = (data as any)?.sensors;
    if (sCfg) sensors.configure({
      host: sCfg.host, port: sCfg.port, enabled: sCfg.enabled, categories: sCfg.categories,
    });
    // La barra flotante es otra ventana y no comparte el estado de React: si no
    // se le avisa, sigue mostrando los botones viejos hasta que se reabra.
    // El servidor local se enciende, se apaga o cambia de puerto aqui: si se
    // dejara para el siguiente arranque, el interruptor de los ajustes no
    // haria nada visible y pareceria roto.
    const rCfg = (data as any)?.remote;
    if (rCfg?.enabled) remoto.aplicar(rCfg, win);
    else remoto.parar();
    avisarCambioDeConfig(data, win);
    return true;
  });

  // Estado del servidor local, para que los ajustes puedan decir si esta
  // escuchando de verdad y en que direccion se le llega desde el telefono.
  ipcMain.handle('remote:status', () => remoto.estado());
  ipcMain.handle('remote:newToken', () => remoto.nuevoToken());
  ipcMain.handle('remote:pairCode', () => remoto.nuevoCodigo());

  ipcMain.handle('config:listBackups', () => listBackups());
  ipcMain.handle('config:restoreBackup', (_e: any, filename: string) => restoreBackup(filename));

  ipcMain.handle('config:export', async () => {
    const r = await dialog.showSaveDialog(win, {
      title: tm('dlg.exportConfig'),
      defaultPath: 'virtualdeck-config.json',
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (r.canceled || !r.filePath) return false;
    try { writeFileSync(r.filePath, JSON.stringify(loadConfig(), null, 2), 'utf-8'); return true; }
    catch { return false; }
  });

  ipcMain.handle('config:import', async () => {
    const r = await dialog.showOpenDialog(win, {
      title: tm('dlg.importConfig'),
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile'],
    });
    if (r.canceled || !r.filePaths[0]) return null;
    try {
      // **No se guarda aqui.** Antes se hacia, y con eso un archivo invalido
      // pisaba la configuracion en disco: la interfaz decia «Importacion
      // rechazada» —o sea, «no ha pasado nada»— y por debajo ya estaba todo
      // reemplazado. Habia copia de seguridad, pero el usuario no tenia por
      // que saber que le hacia falta.
      //
      // Ahora solo se lee y se devuelve. Quien valida es el renderer, y es el
      // quien guarda si vale — ademas ya migrado y fusionado con los valores
      // por defecto, que es lo que la aplicacion usa de verdad.
      return JSON.parse(readFileSync(r.filePaths[0], 'utf-8'));
    } catch { return null; }
  });

  ipcMain.handle('weather:get', (_e: any, force?: boolean) => getWeather(!!force));
  ipcMain.handle('currency:rates', (_e: any, base: string, force?: boolean) => obtenerTasas(base, !!force));
}
