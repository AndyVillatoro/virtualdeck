import { ipcMain } from 'electron';
import { playMacro, startRecording, stopRecording, isRecording } from '../macro';
import type { MacroStep } from '../../../src/types';

export function registerMacroIpc() {
  ipcMain.handle('macro:play', (_e: any, steps: MacroStep[], repeat = 1) => playMacro(steps, repeat));
  ipcMain.handle('macro:startRecord', () => { startRecording(); });
  ipcMain.handle('macro:stopRecord', () => stopRecording());
  ipcMain.handle('macro:isRecording', () => isRecording());
}
