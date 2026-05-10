import { ipcMain, dialog, BrowserWindow } from 'electron';
import { readFileSync, writeFileSync } from 'fs';

export function registerPageIpc(win: BrowserWindow) {
  ipcMain.handle('page:export', async (_e: any, pageData: object) => {
    const result = await dialog.showSaveDialog(win, {
      title: 'Exportar página',
      defaultPath: 'pagina-virtualdeck.json',
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (result.canceled || !result.filePath) return false;
    writeFileSync(result.filePath, JSON.stringify(pageData, null, 2), 'utf-8');
    return true;
  });

  ipcMain.handle('page:import', async () => {
    const result = await dialog.showOpenDialog(win, {
      title: 'Importar página',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile'],
    });
    if (result.canceled || !result.filePaths[0]) return null;
    try {
      const raw = readFileSync(result.filePaths[0], 'utf-8');
      return JSON.parse(raw);
    } catch { return null; }
  });
}
