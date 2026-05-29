import { app, BrowserWindow, globalShortcut, net, protocol } from 'electron';
import { join } from 'path';
import { loadConfig } from './configManager';
import { createMainWindow } from './windowManager';
import { createTray, applyTriggerableConfig } from './trayManager';
import { registerAllIpc } from './ipc';
import { autoCheckOnStartup } from './ipc/updateIpc';
import * as rgb from './rgb';
import * as sensors from './sensors';

// DeskIn virtual display adapter and similar virtual/remote display drivers don't support
// Chromium's GPU compositor — disabling hardware acceleration forces software rendering
// which fixes black tiles and partial redraws on virtual monitors.
app.disableHardwareAcceleration();

// vd:// custom protocol for serving images from userData — must be registered before app ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'vd', privileges: { secure: true, standard: true, supportFetchAPI: true } },
]);

let isQuitting = false;

function onQuit() {
  isQuitting = true;
  app.quit();
}

function setupWindow() {
  const win = createMainWindow();

  win.on('close', (e) => {
    if (!isQuitting) { e.preventDefault(); win.hide(); }
  });

  const initialCfg = loadConfig();
  registerAllIpc(win, onQuit);
  createTray(win, onQuit);
  applyTriggerableConfig(win, initialCfg, onQuit);

  // Apply sensors config from disk so first poll uses the user's host/port.
  const sensorsCfg = (initialCfg as any)?.sensors;
  if (sensorsCfg) {
    sensors.configure({
      host: sensorsCfg.host, port: sensorsCfg.port,
      enabled: sensorsCfg.enabled, categories: sensorsCfg.categories,
    });
    if (sensorsCfg.spawnOnStart) {
      sensors.spawnLHM(sensorsCfg.lhmPath, !!sensorsCfg.spawnElevated).catch(() => {});
    }
  }

  // RGB autostart — non-blocking so the rest of the app stays functional if OpenRGB fails.
  const rgbCfg = (initialCfg as any)?.rgb;
  if (rgbCfg && rgbCfg.enabled !== false) {
    (async () => {
      try {
        if (rgbCfg.spawnOnStart && rgbCfg.openrgbPath) await rgb.spawnServer(rgbCfg.openrgbPath);
        if (rgbCfg.autoConnect) await rgb.connect(rgbCfg.host, rgbCfg.port);
      } catch {}
    })();
  }

  return win;
}

app.whenReady().then(() => {
  // Serve userData files via vd:// — keeps imageData references small in config JSON
  protocol.handle('vd', (request) => {
    const path = request.url.slice('vd://'.length);
    const filePath = join(app.getPath('userData'), decodeURIComponent(path));
    return net.fetch(`file:///${filePath.replace(/\\/g, '/')}`);
  });

  const win = setupWindow();
  setTimeout(() => autoCheckOnStartup(win), 8000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) setupWindow();
  });
});

app.on('before-quit', () => {
  isQuitting = true;
  try { rgb.killServer(); } catch {}
  try { sensors.killLHM(); } catch {}
});

app.on('will-quit', () => { try { globalShortcut.unregisterAll(); } catch {} });

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && isQuitting) app.quit();
});
