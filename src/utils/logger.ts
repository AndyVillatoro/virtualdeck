// Logger del renderer — reenvía errores al proceso main (que los persiste en
// userData/logs/virtualdeck.log). Fire-and-forget: nunca debe romper el flujo.

type Level = 'error' | 'warn' | 'info';

function serializeError(err: unknown): { message: string; meta?: unknown } {
  if (err instanceof Error) {
    return { message: err.message, meta: { stack: err.stack?.split('\n').slice(0, 5).join('\n') } };
  }
  if (typeof err === 'string') return { message: err };
  try { return { message: JSON.stringify(err) }; } catch { return { message: String(err) }; }
}

function write(level: Level, scope: string, err: unknown, extraMeta?: unknown) {
  try {
    const { message, meta } = serializeError(err);
    const mergedMeta = extraMeta !== undefined ? { ...(meta as object), extra: extraMeta } : meta;
    window.electronAPI?.log?.write({ level, scope, message, meta: mergedMeta }).catch(() => {});
  } catch { /* noop */ }
}

export function logError(scope: string, err: unknown, meta?: unknown) {
  write('error', scope, err, meta);
}

export function logWarn(scope: string, err: unknown, meta?: unknown) {
  write('warn', scope, err, meta);
}

export function logInfo(scope: string, message: string, meta?: unknown) {
  write('info', scope, message, meta);
}

let installed = false;

/** Engancha window.onerror + unhandledrejection. Llamar 1 vez en App. */
export function installGlobalErrorHandlers() {
  if (installed) return;
  installed = true;
  window.addEventListener('error', (e) => {
    logError('window.onerror', e.error ?? e.message, { filename: e.filename, line: e.lineno });
  });
  window.addEventListener('unhandledrejection', (e) => {
    logError('unhandledrejection', e.reason);
  });
}
