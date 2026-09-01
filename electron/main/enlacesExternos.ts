import { app, BrowserWindow } from 'electron';
import { loadConfig } from './configManager';

/**
 * Disparar un botón desde fuera de VirtualDeck, con un enlace.
 *
 * `virtualdeck://press/<id>` lo puede abrir cualquier cosa que sepa abrir una
 * URL: un acceso directo del escritorio, una regla del Programador de tareas,
 * un botón de Elgato, otra aplicación, un `start virtualdeck://...` en un
 * `.bat`. Es la vía más barata para que algo externo mande sobre el deck, y no
 * necesita ni servidor ni permisos de red.
 *
 * **El esquema es `virtualdeck://`, no `vd://`, a propósito.** `vd://` ya está
 * cogido: `protocol.handle('vd', …)` lo usa dentro de la aplicación para servir
 * las imágenes de `userData`, y `<img src="vd://images/x.png">` depende de eso.
 * Registrar el mismo esquema en Windows habría mezclado dos cosas que no tienen
 * nada que ver, y un `vd://images/…` suelto en el sistema habría acabado
 * intentando pulsar un botón llamado «images».
 */

const ESQUEMA = 'virtualdeck';

/** Lo que se puede pedir por enlace. */
type Orden =
  | { tipo: 'press'; id?: string; label?: string }
  | { tipo: 'page'; n: number }
  | { tipo: 'show' };

/**
 * `virtualdeck://press/<id>` · `virtualdeck://press?label=Spotify`
 * `virtualdeck://page/<n>` (1 es la primera) · `virtualdeck://show`
 */
export function interpretar(url: string): Orden | null {
  let u: URL;
  try { u = new URL(url); } catch { return null; }
  if (u.protocol !== `${ESQUEMA}:`) return null;
  const resto = decodeURIComponent(u.pathname.replace(/^\//, '')).trim();
  switch (u.host) {
    case 'press': {
      const label = u.searchParams.get('label')?.trim();
      if (resto) return { tipo: 'press', id: resto };
      if (label) return { tipo: 'press', label };
      return null;
    }
    case 'page': {
      const n = parseInt(resto, 10);
      return Number.isFinite(n) && n >= 1 ? { tipo: 'page', n } : null;
    }
    case 'show':
      return { tipo: 'show' };
    default:
      return null;
  }
}

/**
 * De un `press` al id del botón.
 *
 * Por etiqueta se busca sin distinguir mayúsculas ni acentos: el enlace lo
 * escribe una persona en un `.bat` o en un acceso directo, y exigir que
 * «Música» lleve la tilde correcta sería perder el enlace por nada.
 */
function resolverId(orden: Extract<Orden, { tipo: 'press' }>): string | null {
  const cfg = loadConfig() as { buttons?: Array<{ id: string; label?: string }> };
  const botones = cfg?.buttons ?? [];
  if (orden.id) return botones.some((b) => b.id === orden.id) ? orden.id : null;
  const normal = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const buscado = normal(orden.label ?? '');
  return botones.find((b) => b.label && normal(b.label) === buscado)?.id ?? null;
}

/** Saca la primera URL del esquema que haya en los argumentos de la línea de órdenes. */
export function urlEnArgumentos(argv: string[]): string | null {
  return argv.find((a) => a.startsWith(`${ESQUEMA}://`)) ?? null;
}

/**
 * Ejecuta la orden. Devuelve qué pasó, que es lo que necesita el servidor HTTP
 * para contestar algo distinto de «ok» cuando el botón no existe.
 */
export function atender(url: string, win: BrowserWindow | null): { ok: boolean; error?: string } {
  const orden = interpretar(url);
  if (!orden) return { ok: false, error: 'enlace no reconocido' };
  if (!win || win.isDestroyed()) return { ok: false, error: 'sin ventana' };

  if (orden.tipo === 'show') {
    win.show();
    win.focus();
    return { ok: true };
  }
  if (orden.tipo === 'page') {
    // El renderer numera desde 0; el enlace, desde 1, que es lo que se ve en
    // las pestañas.
    win.webContents.send('nav:page', orden.n - 1);
    return { ok: true };
  }
  const id = resolverId(orden);
  if (!id) return { ok: false, error: `no hay ningun boton "${orden.id ?? orden.label}"` };
  win.webContents.send('button:trigger', id);
  return { ok: true };
}

/**
 * Deja registrado el esquema en Windows.
 *
 * En desarrollo hay que decirle cuál es el ejecutable y pasarle la ruta del
 * proyecto: si no, Windows apuntaría a `electron.exe` a secas y al abrir el
 * enlace arrancaría un Electron vacío.
 */
export function registrarEsquema(): void {
  if (app.isPackaged) app.setAsDefaultProtocolClient(ESQUEMA);
  else app.setAsDefaultProtocolClient(ESQUEMA, process.execPath, [process.argv[1]]);
}
