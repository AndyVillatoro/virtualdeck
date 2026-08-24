import { ipcMain, BrowserWindow } from 'electron';
import { playMacro, startRecording, stopRecording, isRecording } from '../macro';
import type { MacroStep } from '../../../src/types';

export function registerMacroIpc(win: BrowserWindow) {
  ipcMain.handle('macro:play', (_e: any, steps: MacroStep[], repeat = 1) => playMacro(steps, repeat));
  ipcMain.handle('macro:startRecord', () => {
    // El grabador se maneja con el ratón sobre la propia ventana: esos clics no
    // son parte de la macro. Se consulta en el momento del clic y no una vez al
    // empezar, porque la ventana se puede mover mientras se graba.
    startRecording((x, y) => {
      if (win.isDestroyed() || !win.isVisible()) return false;
      const b = win.getBounds();
      return x >= b.x && x < b.x + b.width && y >= b.y && y < b.y + b.height;
    });
  });
  ipcMain.handle('macro:stopRecord', () => stopRecording());
  ipcMain.handle('macro:isRecording', () => isRecording());
}
