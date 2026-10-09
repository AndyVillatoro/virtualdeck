import { BrowserWindow, session, shell, utilityProcess } from 'electron';
import type { Session } from 'electron';
import { spawn } from 'child_process';
import { join } from 'path';
import { urlAbrible } from '../abrirExterno';

/**
 * Cómo se lanza y cómo se encierra cada tipo de plugin.
 *
 * Node corre con el propio Node de Electron: por `utilityProcess.fork` o por
 * `spawn` del binario con `ELECTRON_RUN_AS_NODE=1` (los dos modos se eligen con
 * `VD_PLUGIN_PROTO_MODO` porque la fase 0 existe para medirlos). En los dos,
 * `cwd` es la carpeta del plugin —el SDK oficial lee `manifest.json` de ahí—,
 * `--no-addons` (como hace Elgato) y un entorno sin las variables `VD_*` de la
 * aplicación.
 *
 * HTML corre en una `BrowserWindow` oculta con sandbox, sin preload y con
 * sesión propia (`persist:plugin-<uuid>`): sin acceso a disco ni a procesos,
 * con `localStorage` separado y permisos denegados.
 *
 * **Ojo con `asegurarWebContents`**: `index.ts` la aplica a toda ventana nueva
 * y solo deja navegar al `index.html` de la aplicación, además de denegar todo
 * `window.open`. A estas ventanas les rompería las dos cosas (un PI que abre un
 * enlace y un plugin que navega dentro de su origen), así que cada una recibe
 * su propia política en `aplicarPoliticaVentanaPlugin`, que **no** toca la de
 * las ventanas de la aplicación.
 */

export interface DatosLanzamiento {
  carpeta: string;
  uuid: string;
  codePath: string;
  puerto: number;
  puertoArchivos: number;
  infoJSON: string;
}

export interface PluginLanzado {
  cerrar(): void;
}

/** Particular de sesión por plugin: `localStorage`, caché y permisos aparte. */
export function particionDePlugin(uuid: string): string {
  return `persist:plugin-${uuid}`;
}

/** La sesión del plugin, con todos los permisos denegados. */
export function prepararSesionPlugin(uuid: string): Session {
  const ses = session.fromPartition(particionDePlugin(uuid));
  ses.setPermissionRequestHandler((_contenido, _permiso, responder) => responder(false));
  return ses;
}

/**
 * La política propia de una ventana de plugin o PI, que sustituye a la general
 * de `asegurarWebContents` (se aplica después de crearla, así que la segunda
 * gana): ventana nueva, solo a navegador externo y solo `http(s)`; navegación
 * del marco principal, solo dentro del servidor de archivos del plugin.
 */
export function aplicarPoliticaVentanaPlugin(win: BrowserWindow, origenPermitido: string): void {
  const contenido = win.webContents;
  contenido.setWindowOpenHandler(({ url }) => {
    const abrible = urlAbrible(url);
    if (abrible && (abrible.startsWith('http://') || abrible.startsWith('https://'))) {
      shell.openExternal(abrible).catch(() => {});
    } else {
      console.log(`[plugins] window.open bloqueado: ${String(url).slice(0, 120)}`);
    }
    return { action: 'deny' };
  });
  const esPropia = (url: string) => {
    try {
      return new URL(url).origin === origenPermitido;
    } catch {
      return false;
    }
  };
  contenido.on('will-navigate', (evento, url) => {
    if (esPropia(url)) return;
    evento.preventDefault();
    console.log(`[plugins] navegacion bloqueada: ${url.slice(0, 120)}`);
  });
  contenido.on('will-redirect', (evento, url) => {
    if (esPropia(url)) return;
    evento.preventDefault();
    console.log(`[plugins] redireccion bloqueada: ${url.slice(0, 120)}`);
  });
  contenido.on('will-attach-webview', (evento) => evento.preventDefault());
}

/** Ruta relativa lista para una URL: un segmento por tramo, bien codificado. */
export function rutaUrl(relativa: string): string {
  return relativa.split(/[\\/]+/).filter(Boolean).map(encodeURIComponent).join('/');
}

function entornoLimpio(): NodeJS.ProcessEnv {
  const entorno = { ...process.env };
  for (const clave of Object.keys(entorno)) {
    if (clave.startsWith('VD_')) delete entorno[clave];
  }
  return entorno;
}

function volcarSalida(uuid: string, dato: Buffer): void {
  for (const linea of String(dato).split(/\r?\n/)) {
    if (linea.trim()) console.log(`[plugin:${uuid}] ${linea.trimEnd()}`);
  }
}

/** `true` si el plugin se lanzó por `spawn` en vez de por `utilityProcess`. */
function modoNodeEsSpawn(): boolean {
  return process.env.VD_PLUGIN_PROTO_MODO === 'node';
}

/** Un plugin Node, por `utilityProcess.fork` o por `ELECTRON_RUN_AS_NODE`. */
export function lanzarPluginNode(datos: DatosLanzamiento): PluginLanzado {
  const args = [
    '-port', String(datos.puerto),
    '-pluginUUID', datos.uuid,
    '-registerEvent', 'registerPlugin',
    '-info', datos.infoJSON,
  ];
  const modo = modoNodeEsSpawn() ? 'node' : 'utility';
  console.log(`[plugins] plugin Node en modo ${modo}: ${datos.codePath}`);

  if (modo === 'utility') {
    const hijo = utilityProcess.fork(join(datos.carpeta, datos.codePath), args, {
      cwd: datos.carpeta,
      env: entornoLimpio(),
      stdio: 'pipe',
      execArgv: ['--no-addons', '--enable-source-maps'],
    });
    hijo.stdout?.on('data', (dato: Buffer) => volcarSalida(datos.uuid, dato));
    hijo.stderr?.on('data', (dato: Buffer) => volcarSalida(datos.uuid, dato));
    hijo.on('exit', (codigo) => {
      console.log(`[plugin:${datos.uuid}] termino con codigo ${codigo}`);
      // utilityProcess no carga ESM en todos los casos: si el manifiesto apunta
      // a un `.mjs` y el proceso se va sin registrarse, que quede dicho.
      if (codigo !== 0 && /\.mjs$/i.test(datos.codePath)) {
        console.log('[plugins] si es un plugin ESM, probá VD_PLUGIN_PROTO_MODO=node');
      }
    });
    return {
      cerrar: () => {
        try {
          hijo.kill();
        } catch {
          /* ya estaba muerto */
        }
      },
    };
  }

  const hijo = spawn(
    process.execPath,
    ['--no-addons', '--enable-source-maps', join(datos.carpeta, datos.codePath), ...args],
    {
      cwd: datos.carpeta,
      env: { ...entornoLimpio(), ELECTRON_RUN_AS_NODE: '1' },
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  hijo.stdout?.on('data', (dato: Buffer) => volcarSalida(datos.uuid, dato));
  hijo.stderr?.on('data', (dato: Buffer) => volcarSalida(datos.uuid, dato));
  hijo.on('exit', (codigo) => console.log(`[plugin:${datos.uuid}] termino con codigo ${codigo}`));
  hijo.on('error', (e) => console.log(`[plugin:${datos.uuid}] no arranco: ${e.message}`));
  return {
    cerrar: () => {
      try {
        hijo.kill();
      } catch {
        /* ya estaba muerto */
      }
    },
  };
}

/** Un plugin HTML: navegador oculto y encerrado, con el registro inyectado. */
export function lanzarPluginHTML(datos: DatosLanzamiento): PluginLanzado {
  prepararSesionPlugin(datos.uuid);
  const win = new BrowserWindow({
    width: 320,
    height: 240,
    show: false,
    skipTaskbar: true,
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
    if (mensaje) console.log(`[plugin:${datos.uuid}] consola: ${String(mensaje).slice(0, 200)}`);
  });
  win.webContents.on('did-finish-load', () => {
    const llamada = `connectElgatoStreamDeckSocket(${JSON.stringify(datos.puerto)}, ${JSON.stringify(datos.uuid)}, ${JSON.stringify('registerPlugin')}, ${JSON.stringify(datos.infoJSON)})`;
    win.webContents.executeJavaScript(llamada).catch((e: Error) => {
      console.log(`[plugin:${datos.uuid}] no pude llamar al registro: ${e.message}`);
    });
  });
  win.loadURL(`http://127.0.0.1:${datos.puertoArchivos}/${rutaUrl(datos.codePath)}`);
  return {
    cerrar: () => {
      if (!win.isDestroyed()) win.destroy();
    },
  };
}
