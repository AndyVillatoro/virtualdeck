import { BrowserWindow, screen } from 'electron';
import { join } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { app } from 'electron';

interface WindowBounds { x: number; y: number; width: number; height: number; maximized?: boolean }

function getWindowStatePath() {
  return join(app.getPath('userData'), 'window-state.json');
}

export function loadWindowState(): WindowBounds | null {
  try {
    const p = getWindowStatePath();
    if (!existsSync(p)) return null;
    const data = JSON.parse(readFileSync(p, 'utf-8'));
    if (typeof data?.x !== 'number' || typeof data?.y !== 'number') return null;
    if (typeof data?.width !== 'number' || typeof data?.height !== 'number') return null;
    return data as WindowBounds;
  } catch { return null; }
}

export function saveWindowState(b: WindowBounds) {
  try { writeFileSync(getWindowStatePath(), JSON.stringify(b), 'utf-8'); } catch {}
}

export function clampBoundsToDisplay(b: WindowBounds): WindowBounds {
  const displays = screen.getAllDisplays();
  const onScreen = displays.some((d) => {
    const a = d.workArea;
    return b.x + 80 < a.x + a.width && b.x + b.width > a.x + 80
        && b.y + 40 < a.y + a.height && b.y + b.height > a.y + 20;
  });
  if (onScreen) return b;
  const primary = screen.getPrimaryDisplay().workArea;
  return {
    x: Math.round(primary.x + (primary.width - b.width) / 2),
    y: Math.round(primary.y + (primary.height - b.height) / 2),
    width: b.width, height: b.height,
  };
}

const isDev = process.env.NODE_ENV === 'development';

export function createMainWindow(): BrowserWindow {
  const savedRaw = loadWindowState();
  const saved = savedRaw ? clampBoundsToDisplay(savedRaw) : null;

  const win = new BrowserWindow({
    width: saved?.width ?? 1100, height: saved?.height ?? 720,
    x: saved?.x, y: saved?.y,
    minWidth: 900, minHeight: 600,
    frame: false, titleBarStyle: 'hidden', backgroundColor: '#0f0f0f',
    icon: join(__dirname, '../../build/icon.png'),
    skipTaskbar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true, contextIsolation: true, nodeIntegration: false,
    },
  });

  if (savedRaw?.maximized) win.maximize();

  // When moving between monitors with different DPI, a 1px size nudge forces
  // Chromium to re-evaluate the scale factor — fixes blurry text on HiDPI moves.
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

  // Persist position/size debounced so dragging doesn't write on every pixel.
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  const persistBounds = () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      if (win.isDestroyed()) return;
      const b = win.getNormalBounds();
      saveWindowState({ x: b.x, y: b.y, width: b.width, height: b.height, maximized: win.isMaximized() });
      saveTimer = null;
    }, 500);
  };
  win.on('moved', persistBounds);
  win.on('resized', persistBounds);
  win.on('maximize', persistBounds);
  win.on('unmaximize', persistBounds);
  win.on('close', () => {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    if (!win.isDestroyed()) {
      const b = win.getNormalBounds();
      saveWindowState({ x: b.x, y: b.y, width: b.width, height: b.height, maximized: win.isMaximized() });
    }
  });

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL']);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'));
  }

  return win;
}
