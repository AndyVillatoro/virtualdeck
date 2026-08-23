import { ipcMain, dialog, BrowserWindow, net } from 'electron';
import { readFileSync, writeFileSync } from 'fs';
import { loadConfig, saveConfig, listBackups, restoreBackup } from '../configManager';
import { applyTriggerableConfig } from '../trayManager';
import * as sensors from '../sensors';
import { getWeather } from '../weather';
import { avisarCambioDeConfig } from '../floatingBar';
import { tm, fijarIdioma } from '../idioma';

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
    avisarCambioDeConfig(data);
    return true;
  });

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

  /**
   * Descargar un perfil de una URL.
   *
   * Lo hace el proceso principal y no el renderer porque **la CSP de la
   * aplicacion lo prohibe**: `connect-src` solo deja 'self' y los dos
   * servicios del clima. El `fetch` del renderer se rechazaba siempre —y de
   * paso tumbaba la ventana— asi que la importacion por URL no habia
   * funcionado nunca. Relajar la CSP para arreglarlo seria abrir la puerta
   * entera; aqui no hay CSP y la ventana sigue cerrada.
   *
   * Solo http y https: sin esto una URL `file://` convertiria este canal en un
   * lector de archivos arbitrarios para quien pudiera escribir en el campo.
   */
  ipcMain.handle('config:fetchRemote', async (_e: any, url: string) => {
    let u: URL;
    try { u = new URL(url); } catch { return { ok: false, error: tm('import.badUrl') }; }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      return { ok: false, error: `${tm('import.badProtocol')} ${u.protocol}` };
    }
    try {
      const res = await net.fetch(u.toString(), { signal: AbortSignal.timeout(8000) });
      if (!res.ok) return { ok: false, error: `${res.status} ${res.statusText}` };
      const texto = await res.text();
      // Un perfil son unas decenas de KB. El tope es para no tragarse un
      // archivo enorme por accidente, no una medida de seguridad.
      if (texto.length > 2_000_000) return { ok: false, error: tm('import.tooBig') };
      return { ok: true, data: JSON.parse(texto) };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  });

  ipcMain.handle('weather:get', (_e: any, force?: boolean) => getWeather(!!force));
}
