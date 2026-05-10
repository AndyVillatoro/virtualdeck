import { app } from 'electron';
import { join } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, readdirSync, unlinkSync, statSync } from 'fs';

export function getConfigPath() {
  return join(app.getPath('userData'), 'deck-config.json');
}

export function getBackupsDir() {
  return join(app.getPath('userData'), 'backups');
}

export function loadConfig(): object {
  try {
    const p = getConfigPath();
    if (existsSync(p)) return JSON.parse(readFileSync(p, 'utf-8'));
  } catch {}
  return {};
}

const BACKUP_COOLDOWN_MS = 5 * 60 * 1000;
const BACKUP_RETAIN = 5;
let lastBackupAt = 0;

function rotateBackup(configPath: string) {
  const now = Date.now();
  if (now - lastBackupAt < BACKUP_COOLDOWN_MS) return;
  if (!existsSync(configPath)) return;
  try {
    const dir = getBackupsDir();
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, '-').replace(/T/, '_').slice(0, 19);
    copyFileSync(configPath, join(dir, `deck-config-${ts}.json`));
    lastBackupAt = now;
    const files = readdirSync(dir)
      .filter((f) => f.startsWith('deck-config-') && f.endsWith('.json'))
      .sort();
    while (files.length > BACKUP_RETAIN) {
      try { unlinkSync(join(dir, files.shift()!)); } catch {}
    }
  } catch {}
}

export function saveConfig(data: object) {
  try {
    const dir = app.getPath('userData');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const configPath = getConfigPath();
    rotateBackup(configPath);
    writeFileSync(configPath, JSON.stringify(data, null, 2), 'utf-8');
  } catch {}
}

export function listBackups(): { filename: string; timestamp: number; sizeBytes: number }[] {
  try {
    const dir = getBackupsDir();
    if (!existsSync(dir)) return [];
    return readdirSync(dir)
      .filter((f) => f.startsWith('deck-config-') && f.endsWith('.json'))
      .map((filename) => {
        const full = join(dir, filename);
        const s = statSync(full);
        return { filename, timestamp: s.mtimeMs, sizeBytes: s.size };
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  } catch { return []; }
}

export function restoreBackup(filename: string): object | null {
  try {
    if (!/^deck-config-[\w\-:.]+\.json$/.test(filename)) return null;
    const full = join(getBackupsDir(), filename);
    if (!existsSync(full)) return null;
    const data = JSON.parse(readFileSync(full, 'utf-8'));
    saveConfig(data);
    return data;
  } catch { return null; }
}
