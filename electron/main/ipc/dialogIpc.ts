import { ipcMain, dialog, Notification, BrowserWindow, app } from 'electron';
import { join } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'fs';

export function registerDialogIpc(win: BrowserWindow) {
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
      const src = r.filePaths[0];
      const ext = src.split('.').pop()?.toLowerCase() ?? 'png';
      const imagesDir = join(app.getPath('userData'), 'images');
      if (!existsSync(imagesDir)) mkdirSync(imagesDir, { recursive: true });
      const filename = `img_${Date.now()}.${ext}`;
      copyFileSync(src, join(imagesDir, filename));
      return `vd://images/${filename}`;
    } catch {
      const buf = readFileSync(r.filePaths[0]);
      const ext = r.filePaths[0].split('.').pop()?.toLowerCase() ?? 'png';
      const mime = ext === 'gif' ? 'image/gif' : ext === 'svg' ? 'image/svg+xml' : `image/${ext}`;
      return `data:${mime};base64,${buf.toString('base64')}`;
    }
  });

  ipcMain.handle('notify:show', (_e: any, title: string, body: string) => {
    try { new Notification({ title, body }).show(); return true; } catch { return false; }
  });
}
