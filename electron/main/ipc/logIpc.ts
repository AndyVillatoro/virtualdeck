import { ipcMain } from 'electron';
import { logEntry, readRecentLog, openLogInExplorer, exportLog, type LogEntryInput } from '../logger';

export function registerLogIpc() {
  ipcMain.handle('log:write', (_e: any, entry: LogEntryInput) => { logEntry(entry); });
  ipcMain.handle('log:readRecent', (_e: any, maxBytes?: number) => readRecentLog(maxBytes));
  ipcMain.handle('log:open', () => { openLogInExplorer(); });
  ipcMain.handle('log:export', () => exportLog());
}
