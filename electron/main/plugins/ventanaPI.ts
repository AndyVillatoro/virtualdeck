import { BrowserWindow, session } from 'electron';
import { aplicarPoliticaVentanaPlugin, particionDePlugin, prepararSesionPlugin, rutaUrl } from './procesos';

/**
 * La ventana visible del Property Inspector: la configuración de una acción
 * del plugin, que en Elgato abre el propio Stream Deck al seleccionar el botón.
 *
 * Reutiliza la sesión del plugin (misma `partition`: mismo `localStorage`, misma
 * caché) y su misma política de ventana. La gracia está en el quinto argumento
 * de `connectElgatoStreamDeckSocket`: `actionInfo` con la acción, el contexto,
 * el dispositivo y `payload: { settings, coordinates }`.
 *
 * Para los `fetch` del PI a otros sitios (un bridge de Hue, un panel local) se
 * añade `Access-Control-Allow-Origin` a las respuestas de esa sesión, que es lo
 * que hace falta para leerlas desde `http://127.0.0.1:<puerto>`; **no** se
 * apaga `webSecurity`. Las cabeceras de preflight van también para que un POST
 * con JSON no se quede en el `OPTIONS`.
 *
 * Límite (hallazgo #2): eso **no** se inyecta hacia `127.0.0.1`/`localhost`
 * ajenos —solo al propio `puertoArchivos` y a lo no-loopback—. Sin esto, el PI
 * o el plugin HTML (misma sesión `persist:plugin-<uuid>`) podía hacer `fetch`
 * a los puertos de otros plugins o a servicios locales y leer sus respuestas
 * saltándose la Same-Origin Policy. El `no-sandbox` global se queda (T-SEC-06
 * sigue bloqueado, decisión del dueño): aquí solo se cierra el CORS local.
 */

const CORS_PUESTOS = new Map<string, number>();

export interface DatosPI {
  uuid: string;
  carpeta: string;
  piPath: string;
  puerto: number;
  puertoArchivos: number;
  contexto: string;
  accion: string;
  infoJSON: string;
  tamano: [number, number];
  settings: unknown;
  coordinates: { column: number; row: number };
}

/**
 * Si una respuesta puede llevar CORS permisivo (hallazgo #2).
 *
 * Pura a propósito, para probarla con `npx tsx` sin levantar Electron.
 * `false` solo para loopback ajeno (`127.0.0.1`/`localhost`/`::1` con puerto
 * distinto del propio servidor de archivos del plugin): el servidor de otro
 * plugin, LibreHardwareMonitor, etc. Todo lo demás —remotos y el propio
 * puerto— devuelve `true` para no romper los PIs que piden recursos remotos.
 */
export function debeInyectarCors(urlRespuesta: string, puertoPropio: number): boolean {
  let u: URL;
  try {
    u = new URL(urlRespuesta);
  } catch {
    return true;
  }
  const anfitrion = u.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  const esLoopback = anfitrion === '127.0.0.1' || anfitrion === 'localhost' || anfitrion === '::1';
  if (!esLoopback) return true;
  return u.port === String(puertoPropio);
}

function prepararCors(uuid: string, puertoArchivos: number): void {
  const clave = particionDePlugin(uuid);
  if (CORS_PUESTOS.get(clave) === puertoArchivos) return;
  CORS_PUESTOS.set(clave, puertoArchivos);
  session.fromPartition(clave).webRequest.onHeadersReceived((detalles, responder) => {
    // Loopback ajeno: se devuelve la respuesta tal cual, sin CORS permisivo.
    // Así el `fetch` cruzado entre plugins o hacia otros servicios locales lo
    // sigue bloqueando la Same-Origin Policy.
    if (!debeInyectarCors(detalles.url, puertoArchivos)) {
      responder({ responseHeaders: detalles.responseHeaders });
      return;
    }
    // Las cabeceras llegan con el nombre tal cual lo mandó el servidor: si ya
    // traía `access-control-allow-origin` en minúsculas y se añade la otra
    // grafía, Chromium ve dos valores y lo bloquea igual (medido con el PI de
    // Home Assistant contra cdn.jsdelivr.net). Se quitan las CORS que vengan.
    const propias = Object.fromEntries(
      Object.entries(detalles.responseHeaders ?? {}).filter(([k]) => !k.toLowerCase().startsWith('access-control-allow-')),
    );
    responder({
      responseHeaders: {
        ...propias,
        'Access-Control-Allow-Origin': ['*'],
        'Access-Control-Allow-Methods': ['*'],
        'Access-Control-Allow-Headers': ['*'],
      },
    });
  });
}

/** Abre el PI de una acción y devuelve su ventana. */
export function abrirVentanaPI(datos: DatosPI): BrowserWindow {
  prepararSesionPlugin(datos.uuid);
  prepararCors(datos.uuid, datos.puertoArchivos);

  const win = new BrowserWindow({
    width: Math.max(200, datos.tamano[0]),
    height: Math.max(150, datos.tamano[1]),
    show: true,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      partition: particionDePlugin(datos.uuid),
      backgroundThrottling: false,
    },
  });
  aplicarPoliticaVentanaPlugin(win, `http://127.0.0.1:${datos.puertoArchivos}`);
  win.webContents.on('console-message', (_evento, _nivel, mensaje) => {
    if (mensaje) console.log(`[plugins] consola del PI: ${String(mensaje).slice(0, 200)}`);
  });

  win.webContents.on('did-finish-load', () => {
    const actionInfo = JSON.stringify({
      action: datos.accion,
      context: datos.contexto,
      device: 'vd-proto',
      payload: { settings: datos.settings ?? {}, coordinates: datos.coordinates },
    });
    const llamada = `connectElgatoStreamDeckSocket(${JSON.stringify(datos.puerto)}, ${JSON.stringify(datos.contexto)}, ${JSON.stringify('registerPropertyInspector')}, ${JSON.stringify(datos.infoJSON)}, ${JSON.stringify(actionInfo)})`;
    win.webContents.executeJavaScript(llamada).catch((e: Error) => {
      console.log(`[plugins] el PI no pudo registrarse: ${e.message}`);
    });
  });
  win.loadURL(`http://127.0.0.1:${datos.puertoArchivos}/${rutaUrl(datos.piPath)}`);
  return win;
}
