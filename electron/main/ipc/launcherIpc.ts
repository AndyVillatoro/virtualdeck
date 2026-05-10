import { ipcMain, shell, BrowserWindow } from 'electron';
import {
  launchApp, runScript, runScriptCapture, openShortcut, setBrightness,
  sendHotkey, copyToClipboard, typeTextKeys, killProcess, setVolume,
  getRunningProcesses, snapWindow,
} from '../launcher';

export function registerLauncherIpc(win: BrowserWindow) {
  ipcMain.handle('launch:app', (_e: any, path: string, args: string[]) => launchApp(path, args));
  ipcMain.handle('launch:url', (_e: any, url: string) => shell.openExternal(url));
  ipcMain.handle('launch:script', (_e: any, script: string, sh: string) => runScript(script, sh));
  ipcMain.handle('launch:script:capture', (_e: any, script: string, sh: string) => runScriptCapture(script, sh));
  ipcMain.handle('launch:shortcut', (_e: any, path: string) => openShortcut(path));
  ipcMain.handle('launch:brightness', (_e: any, level: number) => setBrightness(level));
  ipcMain.handle('launch:hotkey', async (_e: any, combo: string) => {
    win.blur();
    await new Promise(r => setTimeout(r, 80));
    return sendHotkey(combo);
  });
  ipcMain.handle('launch:mediaKey', (_e: any, key: string) => {
    const codes: Record<string, number> = {
      'play-pause': 179, 'next': 176, 'prev': 177,
      'volume-up': 175, 'volume-down': 174, 'mute': 173,
    };
    return runScript(`(New-Object -ComObject WScript.Shell).SendKeys([char]${codes[key] ?? 179})`, 'powershell');
  });
  ipcMain.handle('launch:clipboard', (_e: any, text: string) => copyToClipboard(text));
  ipcMain.handle('launch:typeText', async (_e: any, text: string) => {
    win.blur();
    await new Promise(r => setTimeout(r, 80));
    return typeTextKeys(text);
  });
  ipcMain.handle('launch:killProcess', (_e: any, name: string) => killProcess(name));
  ipcMain.handle('launch:setVolume', (_e: any, percent: number) => setVolume(percent));
  ipcMain.handle('launch:snapWindow', (_e: any, position: string, processName?: string) => snapWindow(position, processName));
  ipcMain.handle('state:activeApps', () => getRunningProcesses());
}
