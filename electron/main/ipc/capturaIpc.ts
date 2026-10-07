import { ipcMain, BrowserWindow } from 'electron';
import { listarVentanasCaptura } from '../capturaVentana';
import type { PistaCaptura } from '../../../src/types';

/**
 * Solo ventanas (`window`), nunca pantalla completa: ver `capturaVentana.ts`.
 * Lo que se capture lo decide luego el renderer con `getUserMedia`; aquí solo
 * se lista y se sugiere una.
 */
export function registerCapturaIpc(win: BrowserWindow) {
  ipcMain.handle('captura:ventanas', (_e, pista: PistaCaptura) =>
    listarVentanasCaptura(win.getTitle(), {
      titulo: String(pista?.titulo ?? ''),
      fuente: String(pista?.fuente ?? ''),
    }),
  );
}
