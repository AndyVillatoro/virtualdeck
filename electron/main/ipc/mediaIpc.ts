import { ipcMain } from 'electron';
import { getNowPlaying, controlMedia, shuffleMedia, repeatMedia, diagnose as diagnoseMedia, type MediaCommand } from '../media';
import { runScript } from '../launcher';

export function registerMediaIpc() {
  ipcMain.handle('media:nowPlaying', () => getNowPlaying());
  ipcMain.handle('media:control', async (_e: any, cmd: MediaCommand) => {
    const ok = await controlMedia(cmd);
    if (ok) return true;
    const codes: Record<string, number> = { 'play-pause': 179, 'next': 176, 'prev': 177 };
    const code = codes[cmd];
    if (!code) return false;
    return runScript(`(New-Object -ComObject WScript.Shell).SendKeys([char]${code})`, 'powershell');
  });
  ipcMain.handle('media:shuffle', () => shuffleMedia());
  ipcMain.handle('media:repeat', () => repeatMedia());
  ipcMain.handle('media:diagnose', () => diagnoseMedia());
}
