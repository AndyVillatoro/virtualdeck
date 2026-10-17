import { BrowserWindow, WebContents } from 'electron';
import { fileURLToPath } from 'url';
import { resolve, sep } from 'path';

/**
 * Cierra las ventanas de VirtualDeck a lo que no deben poder abrir.
 *
 * Las tres ventanas —el deck, la barra flotante y la tienda— cargan el mismo
 * `index.html` y las tres llevan el **preload entero** delante: casi setenta
 * métodos de `window.electronAPI`, incluido `launch.script`, que ejecuta el
 * PowerShell que le pasen. Ese preload no es un adorno: es el puente de la
 * aplicación. El problema es que Electron, por defecto, deja que **cualquier
 * ventana hija que se abra desde el renderer herede el preload de la ventana
 * que la abre**. Con eso, un solo `<a target="_blank">` a una página ajena —
 * o un `window.open()` desde contenido remoto— es una ventana con los mismos
 * poderes que el deck, pero corriendo código que no es nuestro.
 *
 * Aquí se cierran las dos vías por las que una ventana se convierte en otra:
 *
 * 1. **`setWindowOpenHandler`** — `window.open()` y `target="_blank"`. Se
 *    **deniegan todos**, sin reenviar nada al navegador del sistema. Los
 *    enlaces externos que la aplicación sí quiere abrir van por su propio
 *    camino (`launch:url`), que es donde se puede validar el esquema.
 * 2. **`will-navigate`** — que el documento principal se vaya a otro sitio por
 *    un `location.href` o un enlace. Solo se permite quedarse dentro del
 *    `index.html` propio; cualquier otro destino se cancela y se anota en el
 *    log, que es lo que se puede leer en un reporte de fallo.
 *
 * Se llama en las tres ventanas, justo después de crearlas. Y también sobre
 * `app.on('web-contents-created')` desde `index.ts`, para que una ventana
 * futura nazca ya cerrada y no dependa de acordarse de llamar a esto.
 */

/** Carpeta donde `electron-vite` deja el renderer compilado. */
const DIR_RENDERER = resolve(__dirname, '../renderer');

/** El servidor de `vite` en desarrollo, si lo hay. */
function origenDeDesarrollo(): string | null {
  const url = process.env['ELECTRON_RENDERER_URL'];
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

/**
 * Si una URL es el `index.html` de la aplicación (o un `#hash` suyo).
 *
 * Comparar por **origen** y no por cadena: el hash cambia entre ventanas
 * (`#barra`, `#tienda`) y las tres comparten documento, así que cualquier
 * navegación dentro de él es legítima —de hecho, es como el renderer elige qué
 * pantalla dibujar (ver `src/main.tsx`).
 */
function esDestinoPropio(url: string): boolean {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }

  const dev = origenDeDesarrollo();
  if (dev && u.origin === dev) return true;

  if (u.protocol !== 'file:') return false;
  let ruta: string;
  try {
    ruta = resolve(fileURLToPath(u));
  } catch {
    return false;
  }
  return ruta === DIR_RENDERER || ruta.startsWith(DIR_RENDERER + sep);
}

/**
 * Deja el contenido de una ventana cerrado a lo que no sea la propia aplicación.
 *
 * Se separa de `asegurarVentana` para poder aplicarla también a cualquier
 * `webContents` que Electron cree sin que nadie se lo pida (ver
 * `app.on('web-contents-created')` en `index.ts`).
 *
 * Ojo: `setWindowOpenHandler` se sustituye al llamarlo otra vez, pero
 * `wc.on('will-navigate' | 'will-redirect' | 'will-attach-webview')` son
 * listeners de un EventEmitter y **se acumulan**. Las ventanas de plugin/PI
 * nacen con esta política general (vía `web-contents-created`) y luego reciben
 * la suya propia en `aplicarPoliticaVentanaPlugin`: sin retirar la general,
 * la general bloquea la navegación interna del plugin aunque la propia la
 * permita (hallazgo #1). Por eso los manejadores quedan guardados y
 * `retirarPoliticaGeneral` los quita con `removeListener`.
 */
type AlNavegar = (evento: Electron.Event, url: string) => void;
type AlWebview = (evento: Electron.Event) => void;

const politicaGeneral = new WeakMap<WebContents, { navegar: AlNavegar; redirigir: AlNavegar; vista: AlWebview }>();

/** Quita de un `webContents` los listeners que puso `asegurarWebContents`. */
export function retirarPoliticaGeneral(wc: WebContents): void {
  const guardada = politicaGeneral.get(wc);
  if (!guardada) return;
  try {
    wc.removeListener('will-navigate', guardada.navegar as (...args: unknown[]) => void);
  } catch {
    /* ya estaba fuera */
  }
  try {
    wc.removeListener('will-redirect', guardada.redirigir as (...args: unknown[]) => void);
  } catch {
    /* ya estaba fuera */
  }
  try {
    wc.removeListener('will-attach-webview', guardada.vista as (...args: unknown[]) => void);
  } catch {
    /* ya estaba fuera */
  }
  politicaGeneral.delete(wc);
}

export function asegurarWebContents(wc: WebContents): void {
  // Idempotente: si ya tenía la política general, se retira antes de ponerla
  // otra vez (si no, los listeners se duplicarían aquí mismo).
  retirarPoliticaGeneral(wc);
  // 1. Ventanas hijas. `deny` es la respuesta más fuerte: ni se crea, ni
  //    queda registrada, ni hereda el preload. Que se ignoren en silencio es
  //    intencionado — un `console.error` por cada intento sería ruido de un
  //    renderer que alguien controla.
  wc.setWindowOpenHandler(() => ({ action: 'deny' }));

  // 2. Navegación del documento principal. `will-navigate` no salta con
  //    `loadURL`/`loadFile` del proceso principal (eso lo decide la
  //    aplicación), sino con lo que pida la propia página: `location.href`,
  //    un `target`, un `<base href>` colado en el DOM. Los cambios de hash
  //    tampoco generan evento, y son los que usa el renderer para pintar la
  //    barra o la tienda, así que no se rompen.
  const alNavegar: AlNavegar = (evento, url) => {
    if (esDestinoPropio(url)) return;
    evento.preventDefault();
    console.error(`[ventana] navegacion bloqueada a ${url}`);
  };
  wc.on('will-navigate', alNavegar as (...args: unknown[]) => void);

  // 3. `will-redirect`: la misma regla para las redirecciones de servidor.
  //    Aquí la aplicación no navega, pero un `vd://` o un recurso remoto
  //    pueden acabar redirigiendo el marco principal.
  const alRedirigir: AlNavegar = (evento, url) => {
    if (esDestinoPropio(url)) return;
    evento.preventDefault();
    console.error(`[ventana] redireccion bloqueada a ${url}`);
  };
  wc.on('will-redirect', alRedirigir as (...args: unknown[]) => void);

  // 4. `<webview>`: no hay `webviewTag` en ninguna ventana, así que esto no
  //    debería existir. El tag va sin sandbox y con sus propios `webPreferences`
  //    escritos por quien lo crea; se bloquea por si alguien lo deja puesto.
  const alWebview: AlWebview = (evento) => {
    evento.preventDefault();
    console.error('[ventana] se intento montar un <webview>');
  };
  wc.on('will-attach-webview', alWebview as (...args: unknown[]) => void);
  politicaGeneral.set(wc, { navegar: alNavegar, redirigir: alRedirigir, vista: alWebview });
}

/**
 * Deja la ventana cerrada a lo que no sea la propia aplicación.
 *
 * @param win La ventana recién creada, antes de cargarle nada.
 */
export function asegurarVentana(win: BrowserWindow): void {
  asegurarWebContents(win.webContents);
}
