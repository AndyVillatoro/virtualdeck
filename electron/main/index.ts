import { app, BrowserWindow, ipcMain, dialog, shell, Tray, Menu, nativeImage, protocol, net, Notification, globalShortcut } from 'electron';
import { join } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, readdirSync, unlinkSync, statSync } from 'fs';
import { deflateSync } from 'zlib';
import { listAudioDevices, setDefaultAudioDevice } from './audio';
import {
  launchApp, runScript, runScriptCapture, openShortcut, setBrightness,
  sendHotkey, copyToClipboard, typeTextKeys, killProcess, setVolume, getRunningProcesses, snapWindow,
} from './launcher';
import { getNowPlaying, controlMedia, diagnose as diagnoseMedia, type MediaCommand } from './media';
import { getWeather } from './weather';
import * as rgb from './rgb';

// DeskIn virtual display adapter and similar virtual/remote display drivers don't support
// Chromium's GPU compositor — disabling hardware acceleration forces software rendering
// which fixes black tiles and partial redraws on virtual monitors.
app.disableHardwareAcceleration()

// vd:// custom protocol for serving images from userData — must be registered before app ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'vd', privileges: { secure: true, standard: true, supportFetchAPI: true } },
]);

const isDev = process.env.NODE_ENV === 'development';

function getConfigPath() {
  return join(app.getPath('userData'), 'deck-config.json');
}

function getBackupsDir() {
  return join(app.getPath('userData'), 'backups');
}

function loadConfig(): object {
  try {
    const p = getConfigPath();
    if (existsSync(p)) return JSON.parse(readFileSync(p, 'utf-8'));
  } catch {}
  return {};
}

// Backups automáticos: máximo 1 backup cada 5 min, retenidos los últimos 5.
// El bucket es "estado anterior al guardado" — útil para recuperar de un mal import.
const BACKUP_COOLDOWN_MS = 5 * 60 * 1000;
const BACKUP_RETAIN = 5;
let lastBackupAt = 0;

function rotateBackup(configPath: string) {
  const now = Date.now();
  if (now - lastBackupAt < BACKUP_COOLDOWN_MS) return;
  if (!existsSync(configPath)) return;
  try {
    const dir = getBackupsDir();
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, '-').replace(/T/, '_').slice(0, 19);
    copyFileSync(configPath, join(dir, `deck-config-${ts}.json`));
    lastBackupAt = now;
    // Trim to last N
    const files = readdirSync(dir)
      .filter((f) => f.startsWith('deck-config-') && f.endsWith('.json'))
      .sort();
    while (files.length > BACKUP_RETAIN) {
      try { unlinkSync(join(dir, files.shift()!)); } catch {}
    }
  } catch {}
}

function saveConfig(data: object) {
  try {
    const dir = app.getPath('userData');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const configPath = getConfigPath();
    rotateBackup(configPath);
    writeFileSync(configPath, JSON.stringify(data, null, 2), 'utf-8');
  } catch {}
}

function listBackups(): { filename: string; timestamp: number; sizeBytes: number }[] {
  try {
    const dir = getBackupsDir();
    if (!existsSync(dir)) return [];
    return readdirSync(dir)
      .filter((f) => f.startsWith('deck-config-') && f.endsWith('.json'))
      .map((filename) => {
        const full = join(dir, filename);
        const s = statSync(full);
        return { filename, timestamp: s.mtimeMs, sizeBytes: s.size };
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  } catch { return []; }
}

function restoreBackup(filename: string): object | null {
  try {
    // Sanitize: only allow our backup pattern, no path traversal
    if (!/^deck-config-[\w\-:.]+\.json$/.test(filename)) return null;
    const full = join(getBackupsDir(), filename);
    if (!existsSync(full)) return null;
    const data = JSON.parse(readFileSync(full, 'utf-8'));
    saveConfig(data);
    return data;
  } catch { return null; }
}

// Programmatic 16×16 RGBA PNG for tray icon
function makeTrayIcon(): Electron.NativeImage {
  const W = 16, H = 16;
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  const crc = (b: Buffer): number => {
    let c = 0xffffffff;
    for (const x of b) c = t[(c ^ x) & 0xff] ^ (c >>> 8);
    return ((c ^ 0xffffffff) >>> 0);
  };
  const ch = (type: string, data: Buffer): Buffer => {
    const l = Buffer.allocUnsafe(4); l.writeUInt32BE(data.length, 0);
    const td = Buffer.concat([Buffer.from(type), data]);
    const cr = Buffer.allocUnsafe(4); cr.writeUInt32BE(crc(td), 0);
    return Buffer.concat([l, td, cr]);
  };
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.allocUnsafe(H * (1 + W * 4));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 4)] = 0;
    for (let x = 0; x < W; x++) {
      const off = y * (1 + W * 4) + 1 + x * 4;
      const border = x <= 1 || x >= W - 2 || y <= 1 || y >= H - 2;
      const mid = y === 7 && x >= 4 && x <= 11;
      const accent = border || mid;
      raw[off] = accent ? 74 : 20;
      raw[off + 1] = accent ? 142 : 20;
      raw[off + 2] = accent ? 240 : 20;
      raw[off + 3] = 255;
    }
  }
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    ch('IHDR', ihdr),
    ch('IDAT', deflateSync(raw)),
    ch('IEND', Buffer.alloc(0)),
  ]);
  return nativeImage.createFromBuffer(png);
}

let tray: Electron.Tray | null = null;
let isQuitting = false;

// 1.4 — Disparadores externos. Los hotkeys globales y los items del tray
// despachan via IPC al renderer, que tiene la lógica de toggle/state/folder.
interface TriggerableButton {
  id: string;
  label: string;
  icon?: string;
  globalHotkey?: string;
  inTrayMenu?: boolean;
}

function pickTriggerables(rawConfig: any): TriggerableButton[] {
  if (!rawConfig || typeof rawConfig !== 'object' || !Array.isArray(rawConfig.buttons)) return [];
  return rawConfig.buttons
    .filter((b: any) => b && (b.globalHotkey || b.inTrayMenu))
    .map((b: any) => ({
      id: b.id, label: b.label || `Botón ${b.id}`,
      icon: b.icon, globalHotkey: b.globalHotkey, inTrayMenu: !!b.inTrayMenu,
    }));
}

function refreshGlobalShortcuts(win: Electron.BrowserWindow, triggerables: TriggerableButton[]) {
  try { globalShortcut.unregisterAll(); } catch {}
  for (const t of triggerables) {
    if (!t.globalHotkey) continue;
    try {
      // Mapear formato VD ("Ctrl+Alt+1") a Accelerator de Electron (mismo formato salvo "Win" → "Super").
      const accel = t.globalHotkey.replace(/\bWin\b/gi, 'Super');
      const ok = globalShortcut.register(accel, () => {
        if (!win.isDestroyed()) win.webContents.send('button:trigger', t.id);
      });
      if (!ok) console.warn(`globalShortcut.register falló para ${accel}`);
    } catch (e) { console.warn('hotkey register error', e); }
  }
}

function rebuildTrayMenu(win: Electron.BrowserWindow, triggerables: TriggerableButton[]) {
  if (!tray) return;
  const trayItems = triggerables.filter((t) => t.inTrayMenu);
  const template: Electron.MenuItemConstructorOptions[] = [
    { label: 'Mostrar VirtualDeck', click: () => { win.show(); win.focus(); } },
    { type: 'separator' },
  ];
  if (trayItems.length > 0) {
    template.push({ label: 'Acciones rápidas', enabled: false });
    for (const t of trayItems) {
      template.push({
        label: `${t.icon ? t.icon + '  ' : ''}${t.label}`,
        click: () => { if (!win.isDestroyed()) win.webContents.send('button:trigger', t.id); },
      });
    }
    template.push({ type: 'separator' });
  }
  template.push({ label: 'Salir', click: () => { isQuitting = true; app.quit(); } });
  tray.setContextMenu(Menu.buildFromTemplate(template));
}

function applyTriggerableConfig(win: Electron.BrowserWindow, rawConfig: any) {
  const triggerables = pickTriggerables(rawConfig);
  refreshGlobalShortcuts(win, triggerables);
  rebuildTrayMenu(win, triggerables);
}

function createTray(win: Electron.BrowserWindow) {
  try {
    tray = new Tray(makeTrayIcon());
    tray.setToolTip('VirtualDeck');
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: 'Mostrar VirtualDeck', click: () => { win.show(); win.focus(); } },
      { type: 'separator' },
      { label: 'Salir', click: () => { isQuitting = true; app.quit(); } },
    ]));
    tray.on('click', () => win.isVisible() ? win.focus() : win.show());
  } catch (e) {
    console.warn('Tray failed:', e);
  }
}

function registerIPC(win: Electron.BrowserWindow) {
  // Window
  ipcMain.on('window:minimize', () => win.minimize());
  ipcMain.on('window:maximize', () => win.isMaximized() ? win.unmaximize() : win.maximize());
  ipcMain.on('window:close', () => win.hide());
  ipcMain.on('window:fullscreen', () => win.setFullScreen(!win.isFullScreen()));

  // Config
  ipcMain.handle('config:load', () => loadConfig());
  ipcMain.handle('config:save', (_e: any, data: object) => {
    saveConfig(data);
    applyTriggerableConfig(win, data);
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

  // Audio
  ipcMain.handle('audio:list', () => listAudioDevices());
  ipcMain.handle('audio:setDefault', (_e: any, deviceId: string) => setDefaultAudioDevice(deviceId));

  // Media
  ipcMain.handle('media:nowPlaying', () => getNowPlaying());
  ipcMain.handle('media:control', async (_e: any, cmd: MediaCommand) => {
    // Intenta SMTC nativo primero; si falla, cae a SendKeys (mediaKey).
    const ok = await controlMedia(cmd);
    if (ok) return true;
    const fallbackKey = cmd === 'play-pause' ? 'play-pause'
                       : cmd === 'next'       ? 'next'
                       : cmd === 'prev'       ? 'prev'
                       : null;
    if (!fallbackKey) return false;
    const codes: Record<string, number> = {
      'play-pause': 179, 'next': 176, 'prev': 177,
    };
    return runScript(`(New-Object -ComObject WScript.Shell).SendKeys([char]${codes[fallbackKey]})`, 'powershell');
  });
  ipcMain.handle('media:diagnose', () => diagnoseMedia());

  // Weather (geo + clima en main para evitar CORS del renderer)
  ipcMain.handle('weather:get', (_e: any, force?: boolean) => getWeather(!!force));

  // Launcher — core
  ipcMain.handle('launch:app', (_e: any, path: string, args: string[]) => launchApp(path, args));
  ipcMain.handle('launch:url', (_e: any, url: string) => shell.openExternal(url));
  ipcMain.handle('launch:script', (_e: any, script: string, sh: string) => runScript(script, sh));
  ipcMain.handle('launch:script:capture', (_e: any, script: string, sh: string) => runScriptCapture(script, sh));
  ipcMain.handle('launch:shortcut', (_e: any, path: string) => openShortcut(path));
  ipcMain.handle('launch:brightness', (_e: any, level: number) => setBrightness(level));
  ipcMain.handle('launch:hotkey', async (_e: any, combo: string) => {
    win.blur();
    await new Promise(r => setTimeout(r, 80));
    return sendHotkey(combo);
  });
  ipcMain.handle('launch:mediaKey', (_e: any, key: string) => {
    const codes: Record<string, number> = {
      'play-pause': 179, 'next': 176, 'prev': 177,
      'volume-up': 175, 'volume-down': 174, 'mute': 173,
    };
    return runScript(`(New-Object -ComObject WScript.Shell).SendKeys([char]${codes[key] ?? 179})`, 'powershell');
  });

  // Launcher — new actions
  ipcMain.handle('launch:clipboard', (_e: any, text: string) => copyToClipboard(text));
  ipcMain.handle('launch:typeText', async (_e: any, text: string) => {
    win.blur();
    await new Promise(r => setTimeout(r, 80));
    return typeTextKeys(text);
  });
  ipcMain.handle('launch:killProcess', (_e: any, name: string) => killProcess(name));
  ipcMain.handle('launch:setVolume', (_e: any, percent: number) => setVolume(percent));
  ipcMain.handle('launch:snapWindow', (_e: any, position: string, processName?: string) => snapWindow(position, processName));
  ipcMain.handle('state:activeApps', () => getRunningProcesses());

  // Dialogs
  ipcMain.handle('dialog:openFile', (_e: any, opts: any) =>
    dialog.showOpenDialog(win, opts || {}).then(r => r.canceled ? null : r.filePaths[0])
  );
  ipcMain.handle('dialog:saveClipboardImage', async (_e: any, dataUrl: string) => {
    try {
      const m = /^data:image\/([a-z+]+);base64,(.+)$/i.exec(dataUrl);
      if (!m) return null;
      const ext = m[1].toLowerCase().replace('jpeg', 'jpg').replace('svg+xml', 'svg');
      const buf = Buffer.from(m[2], 'base64');
      const imagesDir = join(app.getPath('userData'), 'images');
      if (!existsSync(imagesDir)) mkdirSync(imagesDir, { recursive: true });
      const filename = `paste_${Date.now()}.${ext}`;
      writeFileSync(join(imagesDir, filename), buf);
      return `vd://images/${filename}`;
    } catch {
      return null;
    }
  });

  ipcMain.handle('dialog:openImage', async () => {
    const r = await dialog.showOpenDialog(win, {
      title: 'Seleccionar imagen o GIF',
      filters: [{ name: 'Imágenes', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico'] }],
      properties: ['openFile'],
    });
    if (r.canceled || !r.filePaths[0]) return null;
    try {
      // Copy to userData/images/ and return vd:// URL — avoids bloating config JSON with base64
      const src = r.filePaths[0];
      const ext = src.split('.').pop()?.toLowerCase() ?? 'png';
      const imagesDir = join(app.getPath('userData'), 'images');
      if (!existsSync(imagesDir)) mkdirSync(imagesDir, { recursive: true });
      const filename = `img_${Date.now()}.${ext}`;
      copyFileSync(src, join(imagesDir, filename));
      return `vd://images/${filename}`;
    } catch {
      // Fallback to base64 if file copy fails
      const buf = readFileSync(r.filePaths[0]);
      const ext = r.filePaths[0].split('.').pop()?.toLowerCase() ?? 'png';
      const mime = ext === 'gif' ? 'image/gif' : ext === 'svg' ? 'image/svg+xml' : `image/${ext}`;
      return `data:${mime};base64,${buf.toString('base64')}`;
    }
  });

  // Native Windows notification
  ipcMain.handle('notify:show', (_e: any, title: string, body: string) => {
    try { new Notification({ title, body }).show(); return true; } catch { return false; }
  });

  // Autostart
  ipcMain.handle('app:autostart:get', () => app.getLoginItemSettings().openAtLogin);
  ipcMain.handle('app:autostart:set', (_e: any, enabled: boolean) => {
    app.setLoginItemSettings({ openAtLogin: enabled });
  });

  // RGB (OpenRGB SDK)
  // Notificar al renderer cuando cambia la lista de devices (resize, plug-in/unplug).
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
  ipcMain.handle('rgb:setMode', (_e: any, id: number, m: string, c?: string, b?: number) => rgb.setMode(id, m, c, b));
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

function createWindow() {
  const win = new BrowserWindow({
    width: 1100, height: 720, minWidth: 900, minHeight: 600,
    frame: false, titleBarStyle: 'hidden', backgroundColor: '#0f0f0f',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false, contextIsolation: true, nodeIntegration: false,
    },
  });

  win.on('close', (e) => {
    if (!isQuitting) { e.preventDefault(); win.hide(); }
  });

  // When moving between monitors with different DPI, Chromium may keep rendering at the
  // old scale factor causing blurry text. A 1px size nudge forces a DPI re-evaluation.
  let moveTimer: ReturnType<typeof setTimeout> | null = null;
  win.on('moved', () => {
    if (moveTimer) clearTimeout(moveTimer);
    moveTimer = setTimeout(() => {
      if (win.isDestroyed()) return;
      const [w, h] = win.getSize();
      win.setSize(w + 1, h, false);
      win.setSize(w, h, false);
      moveTimer = null;
    }, 200);
  });

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL']);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'));
  }

  registerIPC(win);
  createTray(win);
  // Aplicar hotkeys + tray a partir del config persistido al arrancar.
  const initialCfg = loadConfig();
  applyTriggerableConfig(win, initialCfg);

  // RGB autostart: spawn OpenRGB.exe + auto-connect según config persistido.
  // No bloqueante — el resto de la app sigue funcional aunque OpenRGB falle.
  const rgbCfg = (initialCfg as any)?.rgb;
  if (rgbCfg && rgbCfg.enabled !== false) {
    (async () => {
      try {
        if (rgbCfg.spawnOnStart && rgbCfg.openrgbPath) {
          await rgb.spawnServer(rgbCfg.openrgbPath);
        }
        if (rgbCfg.autoConnect) {
          await rgb.connect(rgbCfg.host, rgbCfg.port);
        }
      } catch {}
    })();
  }

  return win;
}

app.on('before-quit', () => {
  isQuitting = true;
  try { rgb.killServer(); } catch {}
});
app.on('will-quit', () => { try { globalShortcut.unregisterAll(); } catch {} });

// 6.2 — Auto-update opt-in. Se activa cuando `electron-updater` está instalado
// y `package.json:build.publish` apunta a un canal (GitHub releases recomendado).
// Nada de bloqueo si el módulo no existe — failure path silencioso.
async function checkForUpdates() {
  if (isDev) return;
  try {
    // Dynamic import por nombre indirecto para evitar errores de TS cuando
    // el módulo no está instalado. Activar con `npm install electron-updater`.
    const moduleName = 'electron-updater';
    const mod: any = await (Function('m', 'return import(m)') as (m: string) => Promise<any>)(moduleName).catch(() => null);
    if (!mod || !mod.autoUpdater) return;
    mod.autoUpdater.autoDownload = true;
    mod.autoUpdater.checkForUpdatesAndNotify().catch(() => {});
  } catch {}
}
app.whenReady().then(() => { setTimeout(checkForUpdates, 8000); });

app.whenReady().then(() => {
  // Serve userData files via vd:// — keeps imageData references small in config JSON
  // Serve userData files via vd:// — keeps imageData references small in config JSON
  protocol.handle('vd', (request) => {
    const path = request.url.slice('vd://'.length);
    const filePath = join(app.getPath('userData'), decodeURIComponent(path));
    return net.fetch(`file:///${filePath.replace(/\\/g, '/')}`);
  });

  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && isQuitting) app.quit();
});
