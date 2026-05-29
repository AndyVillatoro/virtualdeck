import { app, dialog, shell } from 'electron';
import { join } from 'path';
import { appendFileSync, existsSync, mkdirSync, renameSync, statSync, readFileSync, writeFileSync, copyFileSync } from 'fs';

// Logger rotativo a archivo en userData/logs/virtualdeck.log.
// Rota a .1 cuando supera MAX_BYTES; mantiene 1 archivo previo.
// Diseñado para diagnóstico + adjuntar a reportes de bug.

const MAX_BYTES = 512 * 1024; // 512KB

export interface LogEntryInput {
  level: 'error' | 'warn' | 'info';
  scope: string;
  message: string;
  meta?: unknown;
}

function getLogsDir() {
  return join(app.getPath('userData'), 'logs');
}

export function getLogPath() {
  return join(getLogsDir(), 'virtualdeck.log');
}

function getRotatedPath() {
  return join(getLogsDir(), 'virtualdeck.1.log');
}

function ensureDir() {
  const dir = getLogsDir();
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function rotateIfNeeded() {
  try {
    const p = getLogPath();
    if (!existsSync(p)) return;
    const s = statSync(p);
    if (s.size < MAX_BYTES) return;
    const rotated = getRotatedPath();
    // Sobrescribe el .1 anterior con el actual (renameSync falla si destino existe en algunas FS → usar copy+truncate).
    try { copyFileSync(p, rotated); } catch {}
    writeFileSync(p, '', 'utf-8');
  } catch {}
}

/** Escribe una entrada de log. Tolerante a fallos — nunca lanza. */
export function logEntry(entry: LogEntryInput) {
  try {
    ensureDir();
    rotateIfNeeded();
    const ts = new Date().toISOString();
    let metaStr = '';
    if (entry.meta !== undefined) {
      try { metaStr = ' ' + JSON.stringify(entry.meta); } catch { metaStr = ' [meta no serializable]'; }
    }
    const line = `[${ts}] [${entry.level.toUpperCase()}] [${entry.scope}] ${entry.message}${metaStr}\n`;
    appendFileSync(getLogPath(), line, 'utf-8');
  } catch {}
}

/** Helper para errores desde el proceso main. */
export function logError(scope: string, message: string, meta?: unknown) {
  logEntry({ level: 'error', scope, message, meta });
}

/** Lee las últimas maxBytes del log (para adjuntar a reportes). */
export function readRecentLog(maxBytes = 64 * 1024): string {
  try {
    const p = getLogPath();
    if (!existsSync(p)) return '';
    const content = readFileSync(p, 'utf-8');
    if (content.length <= maxBytes) return content;
    return '…(truncado)…\n' + content.slice(content.length - maxBytes);
  } catch { return ''; }
}

/** Abre el archivo de log en el explorador del SO. */
export function openLogInExplorer() {
  try {
    const p = getLogPath();
    if (existsSync(p)) shell.showItemInFolder(p);
    else shell.openPath(getLogsDir());
  } catch {}
}

/** Exporta el log vía save dialog. Devuelve true si se guardó. */
export async function exportLog(): Promise<boolean> {
  try {
    const p = getLogPath();
    if (!existsSync(p)) return false;
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Exportar registro de VirtualDeck',
      defaultPath: `virtualdeck-log-${new Date().toISOString().slice(0, 10)}.txt`,
      filters: [{ name: 'Texto', extensions: ['txt', 'log'] }],
    });
    if (canceled || !filePath) return false;
    copyFileSync(p, filePath);
    return true;
  } catch { return false; }
}
