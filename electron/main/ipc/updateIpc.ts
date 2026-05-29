import { ipcMain, BrowserWindow } from 'electron';
import { logError } from '../logger';

// Auto-update vía electron-updater (GitHub Releases provider, configurado en
// package.json build.publish). El módulo se carga de forma lazy para que la
// app no falle si no está instalado (dev) o el provider no responde.
// Emite eventos 'update:status' al renderer para feedback de UI.

let autoUpdater: any = null;
let wired = false;

async function loadUpdater(): Promise<any> {
  if (autoUpdater) return autoUpdater;
  try {
    const mod: any = await (Function('m', 'return import(m)') as (m: string) => Promise<any>)('electron-updater').catch(() => null);
    autoUpdater = mod?.autoUpdater ?? null;
  } catch { autoUpdater = null; }
  return autoUpdater;
}

function wireEvents(win: BrowserWindow, up: any) {
  if (wired || !up) return;
  wired = true;
  const send = (payload: any) => { try { win.webContents.send('update:status', payload); } catch {} };
  up.on('update-available', (info: any) => send({ status: 'available', version: info?.version }));
  up.on('update-downloaded', (info: any) => send({ status: 'downloaded', version: info?.version }));
  up.on('error', (err: any) => { logError('update', String(err?.message ?? err)); send({ status: 'error', error: String(err?.message ?? err) }); });
}

/** Chequeo automático al arranque (llamado desde index.ts). Silencioso. */
export async function autoCheckOnStartup(win: BrowserWindow) {
  if (process.env.NODE_ENV === 'development') return;
  const up = await loadUpdater();
  if (!up) return;
  wireEvents(win, up);
  up.autoDownload = true;
  up.checkForUpdates().catch((e: any) => logError('update:autocheck', String(e?.message ?? e)));
}

export function registerUpdateIpc(win: BrowserWindow) {
  ipcMain.handle('update:check', async () => {
    if (process.env.NODE_ENV === 'development') return { status: 'disabled' };
    const up = await loadUpdater();
    if (!up) return { status: 'disabled' };
    wireEvents(win, up);
    try {
      const r = await up.checkForUpdates();
      const v = r?.updateInfo?.version;
      // updateInfo siempre devuelve la última versión publicada; comparar contra la actual lo hace electron-updater internamente vía 'update-available'.
      return { status: 'checking', version: v };
    } catch (e: any) {
      return { status: 'error', error: String(e?.message ?? e) };
    }
  });

  ipcMain.handle('update:quitAndInstall', async () => {
    const up = await loadUpdater();
    if (!up) return;
    try { up.quitAndInstall(); } catch (e: any) { logError('update:install', String(e?.message ?? e)); }
  });
}
