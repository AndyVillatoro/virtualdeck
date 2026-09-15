import { BrowserWindow } from 'electron';
import { join } from 'path';

/**
 * La tienda (`index.html#tienda`): la galería en ventana propia.
 *
 * Es una ventana aparte y no un panel de ajustes porque con doce secciones el
 * acordeón no da para buscador, filtros y ficha con README — y porque así se
 * puede mirar la tienda con el deck delante para comparar. Mismo bundle que
 * todo lo demás: el renderer mira el hash y dibuja la tienda en vez de la
 * aplicación (ver `src/main.tsx`), igual que la barra con `#barra`.
 *
 * La tienda **no escribe configuración**: solo la lee (como la barra) y pide
 * instalar por `tienda:importar`. Quien valida y aplica es la ventana
 * principal, que es la única con el estado al día — escribir desde aquí
 * pisaría cambios sin guardar.
 */

const isDev = process.env.NODE_ENV === 'development';

let ventana: BrowserWindow | null = null;

export function tiendaAbierta(): boolean {
  return !!ventana && !ventana.isDestroyed();
}

export function abrirTienda(): void {
  if (tiendaAbierta()) {
    ventana!.show();
    ventana!.focus();
    return;
  }
  ventana = new BrowserWindow({
    width: 980,
    height: 680,
    minWidth: 760,
    minHeight: 520,
    title: 'VirtualDeck — Tienda',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false, contextIsolation: true, nodeIntegration: false,
    },
  });
  ventana.once('ready-to-show', () => ventana?.show());
  ventana.on('closed', () => { ventana = null; });
  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    ventana.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#tienda`);
  } else {
    ventana.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'tienda' });
  }
}

export function cerrarTienda(): void {
  if (!tiendaAbierta()) return;
  ventana!.close();
  ventana = null;
}

/**
 * La tienda lee la configuración como la barra: la principal guarda y aquí
 * llega el aviso para releer instalados. Sin esto, instalar algo no cambiaba
 * la insignia hasta reabrir la ventana.
 */
export function avisarTienda(data: unknown): void {
  if (!tiendaAbierta()) return;
  ventana!.webContents.send('config:changed', data);
}

/** La ventana principal, para reenviarle los pedidos de instalar. */
export function ventanaTienda(): BrowserWindow | null {
  return tiendaAbierta() ? ventana : null;
}
