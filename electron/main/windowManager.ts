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
    // **Sí** en la barra de tareas.
    //
    // Antes se ocultaba porque la aplicación vive en la bandeja. Pero la ventana
    // no tiene marco: si queda detrás de otra, no hay nada que la delate y no se
    // puede recuperar más que por el icono de la bandeja — que es pequeño, está
    // en el desplegable de iconos ocultos, y nadie recuerda que está ahí.
    //
    // El resultado práctico es indistinguible de que la aplicación no arranque.
    skipTaskbar: false,
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

  // La ventana no tiene marco y su fondo es un gris muy oscuro. Si el renderer
  // no llega a pintar, lo que se ve es un rectángulo vacío indistinguible de
  // "la aplicación abrió pero no tiene nada configurado" — y el motivo real se
  // queda dentro de las DevTools, que en la versión empaquetada no existen.
  //
  // Estos tres avisos sacan ese motivo al log del proceso principal, que es lo
  // que se puede pedir en un reporte.
  win.webContents.on('did-fail-load', (_e, codigo, descripcion, url) => {
    console.error(`[ventana] no se pudo cargar ${url}: ${descripcion} (${codigo})`);
  });
  win.webContents.on('render-process-gone', (_e, detalles) => {
    console.error('[ventana] el proceso del renderer murió:', detalles.reason);
  });
  win.webContents.on('console-message', (_e, nivel, mensaje, linea, fuente) => {
    // Solo los errores: reenviar todo llenaría el log de ruido.
    if (nivel >= 2) console.error(`[renderer] ${mensaje}  (${fuente}:${linea})`);
  });

  // Diagnóstico bajo demanda: `VD_DIAG=1 npm run dev` cuenta qué hay dibujado.
  //
  // Existe porque distinguir "la ventana está en blanco" de "la ventana está
  // detrás de otra" cuesta mucho más de lo que parece: la aplicación no sale en
  // la barra de tareas, así que no se puede traer al frente para mirarla, y una
  // captura de pantalla devuelve lo que haya encima, no la ventana.
  if (process.env['VD_DIAG'] === '1') {
    setTimeout(() => {
      if (win.isDestroyed()) return;
      console.log('[diag] cargando =', win.webContents.isLoading(), '| url =', win.webContents.getURL());
      // capturePage devuelve lo que la ventana dibuja, sin importar qué haya
      // por delante en la pantalla.
      win.webContents
        .capturePage()
        .then((img) => {
          const destino = join(process.env['TEMP'] ?? '.', 'vd-diag.png');
          require('fs').writeFileSync(destino, img.toPNG());
          console.log('[diag] captura de la ventana en', destino, '|', JSON.stringify(img.getSize()));
        })
        .catch((e) => console.error('[diag] no se pudo capturar:', e.message));
      win.webContents
        .executeJavaScript(
          `(() => {
             const r = document.getElementById('root');
             return JSON.stringify({
               nodos: r ? r.querySelectorAll('*').length : -1,
               texto: (document.body.innerText || '').slice(0, 100),
             });
           })()`,
        )
        .then((s) => console.log('[diag] DOM:', s))
        .catch((e) => console.error('[diag] no se pudo inspeccionar:', e.message));
    }, 6000);
  }

  // La ventana se pone delante en cuanto hay DOM, **no** al terminar de cargar.
  //
  // `did-finish-load` espera a todos los recursos, incluida la hoja de fuentes
  // remota. Si esa petición se queda colgada —y se queda: Electron no siempre
  // alcanza Google Fonts aunque el resto del sistema sí— el evento no llega
  // nunca. Y entonces pasa lo peor: la ventana no se trae al frente, queda
  // tapada por otra, Chromium la da por oculta y **deja de dibujarla**. El
  // resultado es una aplicación que parece no arrancar, sin un solo error.
  //
  // `dom-ready` depende solo del documento, así que llega siempre.
  win.webContents.once('dom-ready', () => {
    if (win.isDestroyed()) return;
    win.show();
    win.focus();
  });

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL']);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'));
  }

  return win;
}
