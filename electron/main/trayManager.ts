import { BrowserWindow, Tray, Menu, nativeImage, globalShortcut } from 'electron';
import { join } from 'path';
import { deflateSync } from 'zlib';

export interface TriggerableButton {
  id: string;
  label: string;
  icon?: string;
  globalHotkey?: string;
  inTrayMenu?: boolean;
}

let tray: Electron.Tray | null = null;

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

export function createTray(win: BrowserWindow, onQuit: () => void) {
  try {
    const trayIcon = nativeImage.createFromPath(join(__dirname, '../../build/icon.ico'));
    tray = new Tray(trayIcon);
    tray.setToolTip('VirtualDeck');
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: 'Mostrar VirtualDeck', click: () => { win.show(); win.focus(); } },
      { type: 'separator' },
      { label: 'Salir', click: onQuit },
    ]));
    tray.on('click', () => win.isVisible() ? win.focus() : win.show());
  } catch (e) {
    console.warn('Tray failed:', e);
  }
}

export function pickTriggerables(rawConfig: any): TriggerableButton[] {
  if (!rawConfig || typeof rawConfig !== 'object' || !Array.isArray(rawConfig.buttons)) return [];
  return rawConfig.buttons
    .filter((b: any) => b && (b.globalHotkey || b.inTrayMenu))
    .map((b: any) => ({
      id: b.id, label: b.label || `Botón ${b.id}`,
      icon: b.icon, globalHotkey: b.globalHotkey, inTrayMenu: !!b.inTrayMenu,
    }));
}

export function refreshGlobalShortcuts(win: BrowserWindow, triggerables: TriggerableButton[]) {
  try { globalShortcut.unregisterAll(); } catch {}
  for (const t of triggerables) {
    if (!t.globalHotkey) continue;
    try {
      const accel = t.globalHotkey.replace(/\bWin\b/gi, 'Super');
      const ok = globalShortcut.register(accel, () => {
        if (!win.isDestroyed()) win.webContents.send('button:trigger', t.id);
      });
      if (!ok) console.warn(`globalShortcut.register falló para ${accel}`);
    } catch (e) { console.warn('hotkey register error', e); }
  }
}

export function rebuildTrayMenu(win: BrowserWindow, triggerables: TriggerableButton[], onQuit: () => void) {
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
  template.push({ label: 'Salir', click: onQuit });
  tray.setContextMenu(Menu.buildFromTemplate(template));
}

export function applyTriggerableConfig(win: BrowserWindow, rawConfig: any, onQuit: () => void) {
  const triggerables = pickTriggerables(rawConfig);
  refreshGlobalShortcuts(win, triggerables);
  rebuildTrayMenu(win, triggerables, onQuit);
}
