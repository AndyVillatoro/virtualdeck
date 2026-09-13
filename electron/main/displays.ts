import { BrowserWindow, screen, Display } from 'electron';
import { clampBoundsToDisplay } from './windowManager';
import type { DisplayInfo } from '../../src/types';

/**
 * Obtiene la lista completa de pantallas disponibles con sus metadatos y estado actual.
 */
export function getDisplaysInfo(win?: BrowserWindow): DisplayInfo[] {
  const allDisplays = screen.getAllDisplays();
  const primaryDisplay = screen.getPrimaryDisplay();
  const currentBounds = win && !win.isDestroyed() ? win.getNormalBounds() : null;
  const currentDisplay = currentBounds ? screen.getDisplayMatching(currentBounds) : primaryDisplay;

  return allDisplays.map((d: Display, index: number) => {
    const isPrimary = d.id === primaryDisplay.id;
    const isCurrent = d.id === currentDisplay.id;
    const label = d.label && d.label.trim() ? d.label.trim() : `DISPLAY ${index + 1}`;

    return {
      id: d.id,
      name: label,
      bounds: {
        x: d.bounds.x,
        y: d.bounds.y,
        width: d.bounds.width,
        height: d.bounds.height,
      },
      workArea: {
        x: d.workArea.x,
        y: d.workArea.y,
        width: d.workArea.width,
        height: d.workArea.height,
      },
      scaleFactor: d.scaleFactor,
      isPrimary,
      isCurrent,
      frequency: (d as any).displayFrequency,
      rotation: d.rotation,
      touchSupport: (d as any).touchSupport,
      internal: (d as any).internal,
    };
  });
}

/**
 * Traslada la ventana de forma limpia y centrada a una pantalla determinada.
 */
export function moveWindowToDisplay(win: BrowserWindow, displayId: number): boolean {
  if (!win || win.isDestroyed()) return false;

  const allDisplays = screen.getAllDisplays();
  const target = allDisplays.find((d) => d.id === displayId);
  if (!target) return false;

  const wasFullScreen = win.isFullScreen();
  const wasMaximized = win.isMaximized();

  if (wasFullScreen) {
    win.setFullScreen(false);
  } else if (wasMaximized) {
    win.unmaximize();
  }

  const normalBounds = win.getNormalBounds();
  const workArea = target.workArea;

  const targetWidth = Math.min(normalBounds.width, workArea.width);
  const targetHeight = Math.min(normalBounds.height, workArea.height);

  const targetX = Math.round(workArea.x + (workArea.width - targetWidth) / 2);
  const targetY = Math.round(workArea.y + (workArea.height - targetHeight) / 2);

  win.setBounds({
    x: targetX,
    y: targetY,
    width: targetWidth,
    height: targetHeight,
  });

  if (wasFullScreen) {
    win.setFullScreen(true);
  } else if (wasMaximized) {
    win.maximize();
  }

  return true;
}

/**
 * Escucha cambios en caliente en monitores:
 * - Conexión de pantallas ('display-added')
 * - Desconexión de pantallas ('display-removed')
 * - Cambios de resolución / escala ('display-metrics-changed')
 */
export function setupDisplayListeners(win: BrowserWindow) {
  const broadcast = () => {
    if (!win || win.isDestroyed()) return;
    try {
      const displays = getDisplaysInfo(win);
      win.webContents.send('window:displaysChanged', displays);
    } catch {}
  };

  screen.on('display-added', () => {
    broadcast();
  });

  screen.on('display-removed', () => {
    // Si la ventana quedó en un monitor que ya no existe, reubicarla inmediatamente
    if (!win.isDestroyed()) {
      const b = win.getNormalBounds();
      const clamped = clampBoundsToDisplay({
        x: b.x,
        y: b.y,
        width: b.width,
        height: b.height,
        maximized: win.isMaximized(),
      });
      if (clamped.x !== b.x || clamped.y !== b.y) {
        win.setBounds({ x: clamped.x, y: clamped.y, width: clamped.width, height: clamped.height });
      }
    }
    broadcast();
  });

  screen.on('display-metrics-changed', () => {
    broadcast();
  });
}
