import { app, BrowserWindow, globalShortcut, net, protocol, session } from 'electron';
import { join } from 'path';
import { loadConfig } from './configManager';
import { createMainWindow } from './windowManager';
import { createTray, applyTriggerableConfig } from './trayManager';
import { registerAllIpc } from './ipc';
import { fijarArranqueAutomatico, migrarArranqueAutomatico } from './ipc/appIpc';
import { autoCheckOnStartup } from './ipc/updateIpc';
import * as rgb from './rgb';
import * as sensors from './sensors';
import { abrirBarra, cerrarBarra, SESION_BARRA } from './floatingBar';
import { fijarIdioma } from './idioma';
import { arrancarSondeo, pararSondeo } from './estadoSistema';
import { startActiveWindowTracker, stopActiveWindowTracker } from './activeWindow';
import { setupDisplayListeners } from './displays';
import { registrarEsquema, urlEnArgumentos, atender } from './enlacesExternos';
import { asegurarWebContents } from './seguridadVentana';
import { rutaImagenDesdeUrl } from './protocoloVd';
import * as remoto from './servidorLocal';

// DeskIn virtual display adapter and similar virtual/remote display drivers don't support
// Chromium's GPU compositor — disabling hardware acceleration forces software rendering
// which fixes black tiles, artifacts, and partial redraws on secondary and virtual monitors.
app.disableHardwareAcceleration();

/*
 * DEUDA CONOCIDA — el sandbox de Chromium está apagado a propósito. No lo toques
 * sin leer antes esto.
 *
 * `no-sandbox` apaga el sandbox de **todos** los renderers, también en la build
 * empaquetada. Es un hole real: un fallo en cualquier página que la aplicación
 * cargara —un recurso remoto, un README, un error de red— se convertiría en
 * ejecución de código con los permisos de VirtualDeck, que guarda la
 * configuración, escribe ficheros y lanza procesos. Por eso las ventanas van
 * cerradas a abrirse (`seguridadVentana`): sin sandbox, una ventana hija sería
 * directamente código nuestro.
 *
 * **Por qué sigue aquí: porque no se ha podido medir que se pueda quitar.** En
 * este equipo el proceso gráfico de Chromium no arranca:
 * `GPU process exited unexpectedly: exit_code=-1073741515` (`0xC0000135`, DLL que
 * no encuentra), y cuando algo lo necesita, el renderer se va con él
 * (`GPU process isn't usable. Goodbye.`).
 *
 * Ojo con lo que **no** está medido, porque se dio por bueno y no lo está:
 *
 * - El aviso sale **también en un Electron pelado**, sin nada de este proyecto
 *   (probado el 2026-09-26 con una app mínima de una sola pantalla). O sea que es
 *   del entorno, no de este código.
 * - La misma build y la misma configuración **pasaron a las 18:50 y reventaron a
 *   las 21:50** del mismo día, sin que cambiara nada en el repositorio. Con la
 *   máquina en ese estado, cualquier tabla de "sandbox sí / sandbox no" que se
 *   mida aquí mide el estado de la máquina, no el sandbox.
 * - Durante un rato se creyó que el culpable era el `<canvas>` del fondo
 *   dot-matrix. **No lo es**: `DotMatrixImageOverlay` no usa canvas, es una
 *   máscara de `radial-gradient` de CSS sobre un `<img>`. La regla de oro es
 *   que aquí no se afirma ninguna causalidad que no se pueda repetir mañana.
 *
 * Encenderlo (T-SEC-06) necesita un entorno donde el proceso gráfico arranque, o
 * una forma de que la interfaz no dependa de él. Con lo que hay, apagarlo es lo
 * que se sabe que funciona; quitarlo sería apostar sin red.
 */
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('no-sandbox');

// Red de seguridad para las ventanas que se creen en el futuro: las tres
// actuales se cierran a mano al crearse (`asegurarVentana` en cada módulo), y
// esto es para que una cuarta no nazca abierta por descuido. Las herramientas
// de desarrollo quedan fuera — son del navegador, no nuestras.
app.on('web-contents-created', (_evento, contents) => {
  if (contents.getType() !== 'window') return;
  if (contents.getURL().startsWith('devtools://')) return;
  asegurarWebContents(contents);
});

/**
 * La identidad con la que Windows atribuye las notificaciones.
 *
 * Tiene que ser el mismo `appId` que `package.json` le da a electron-builder,
 * porque es el que el instalador NSIS graba en el acceso directo del menu de
 * inicio, y Windows solo ensena el nombre y el icono de la aplicacion si los
 * dos coinciden. Electron lo pone solo cuando se instala con Squirrel; con
 * NSIS hay que llamarlo a mano, y no se estaba llamando: las notificaciones
 * quedaban registradas como `electron.app.Electron` (comprobado en
 * HKCU\...\Notifications\Settings), un identificador sin acceso directo.
 *
 * `scripts/check-ipc.mjs` comprueba que esta cadena y la de `package.json`
 * no se separen.
 */
const APP_USER_MODEL_ID = 'com.virtualdeck.app';
app.setAppUserModelId(APP_USER_MODEL_ID);

// vd:// custom protocol for serving images from userData — must be registered before app ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'vd', privileges: { secure: true, standard: true, supportFetchAPI: true } },
]);

/**
 * Una sola copia de VirtualDeck.
 *
 * Hacía falta para los enlaces `virtualdeck://` —Windows arranca el ejecutable
 * otra vez con la URL como argumento, y sin candado eso abriría un segundo
 * deck en lugar de pulsar el botón— pero el fallo ya existía sin ellos: dos
 * instancias son **dos escritores del mismo `deck-config.json`**, y la última
 * en guardar se lleva por delante lo que hizo la otra. También salían dos
 * iconos en la bandeja.
 *
 * Se pide antes de nada: si otra copia manda, esta se va sin montar nada.
 */
const soyElPrimero = app.requestSingleInstanceLock();
if (!soyElPrimero) app.quit();

let isQuitting = false;

function onQuit() {
  isQuitting = true;
  app.quit();
}

function setupWindow() {
  const win = createMainWindow();

  win.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      win.setSkipTaskbar(true);
      win.hide();
    }
  });

  const initialCfg = loadConfig();
  // El idioma de lo poco que enseña el proceso principal: la bandeja y los
  // titulos de los dialogos de archivo.
  fijarIdioma((initialCfg as any)?.language);
  registerAllIpc(win, onQuit);
  // Reescribir la entrada del registro de quien ya tenia el inicio automatico:
  // la suya no lleva la marca de arrancar escondido y no se corrige sola.
  //
  // La migracion va **antes**: mientras la entrada este con el nombre viejo,
  // esta condicion es `false` y la reescritura no llega a ejecutarse nunca.
  migrarArranqueAutomatico();
  if (app.getLoginItemSettings().openAtLogin) fijarArranqueAutomatico(true);
  // El sondeo del estado del sistema vive aqui y se reparte a las dos
  // ventanas: la barra flotante es otra y antes no lo tenia.
  arrancarSondeo();
  startActiveWindowTracker();
  setupDisplayListeners(win);
  createTray(win, onQuit);
  applyTriggerableConfig(win, initialCfg, onQuit);

  // Primer plano desde el arranque: si se dejara para cuando el renderer avisa,
  // la ventana aparecería detrás y saltaría al frente un instante después.
  if ((initialCfg as any)?.alwaysOnTop) win.setAlwaysOnTop(true, 'screen-saver');

  // Barra flotante: si quedó activada, sale sola al arrancar. Es una ventana
  // aparte, así que no depende de que la principal esté visible.
  const barraCfg = (initialCfg as any)?.floatingBar;
  if (barraCfg?.enabled && Array.isArray(barraCfg.slots) && barraCfg.slots.length > 0) {
    abrirBarra({
      huecos: barraCfg.slots.length,
      lado: barraCfg.side === 'left' ? 'left' : 'right',
      tile: typeof barraCfg.tileSize === 'number' ? barraCfg.tileSize : 64,
      y: typeof barraCfg.y === 'number' ? barraCfg.y : null,
    });
  }

  // Servidor local, si el usuario lo dejo activado. Viene apagado de fabrica.
  const remotoCfg = (initialCfg as any)?.remote;
  if (remotoCfg?.enabled) {
    const r = remoto.aplicar(remotoCfg, win);
    if (!r.ok) console.error('[remoto] no arranco:', r.error);
  }

  // Apply sensors config from disk so first poll uses the user's host/port.
  const sensorsCfg = (initialCfg as any)?.sensors;
  if (sensorsCfg) {
    sensors.configure({
      host: sensorsCfg.host, port: sensorsCfg.port,
      enabled: sensorsCfg.enabled, categories: sensorsCfg.categories,
    });
    if (sensorsCfg.spawnOnStart) {
      sensors.spawnLHM(sensorsCfg.lhmPath, !!sensorsCfg.spawnElevated).catch(() => {});
    }
  }
  // Asegurar siempre la configuración del servidor web si se detecta LHM en el equipo
  const rutaLhm = sensorsCfg?.lhmPath || sensors.rutaLHMConocida();
  if (rutaLhm) {
    sensors.asegurarConfigLHM(rutaLhm, sensorsCfg?.port || 8085);
  }

  // RGB autostart — non-blocking so the rest of the app stays functional if OpenRGB fails.
  const rgbCfg = (initialCfg as any)?.rgb;
  if (rgbCfg && rgbCfg.enabled !== false) {
    (async () => {
      try {
        if (rgbCfg.spawnOnStart && rgbCfg.openrgbPath) await rgb.spawnServer(rgbCfg.openrgbPath);
        if (rgbCfg.autoConnect) await rgb.connect(rgbCfg.host, rgbCfg.port);

        // Devolver las luces a como las dejó el usuario. Tras reiniciar el
        // equipo nadie las ha vuelto a poner: el color de un modo Direct no se
        // guarda en ninguna parte, y hasta un Static puede perderse al cortar
        // la corriente. Sin esto hay que abrir el gestor RGB a mano cada vez.
        if (rgbCfg.startupProfileId) {
          const perfil = (rgbCfg.profiles ?? []).find(
            (p: { id: string }) => p.id === rgbCfg.startupProfileId,
          );
          if (perfil) {
            const ok = await rgb.applyProfile(perfil);
            if (!ok) console.error(`[rgb] el perfil de arranque "${perfil.name}" no se aplicó del todo`);
          } else {
            console.error(`[rgb] perfil de arranque ${rgbCfg.startupProfileId} ya no existe`);
          }
        }
      } catch (e) {
        console.error('[rgb] fallo en el arranque:', (e as Error).message);
      }
    })();
  }

  return win;
}

app.whenReady().then(() => {
  // Sirve las imágenes de `userData\images` por `vd://` — así el `imageData`
  // de la configuración es una dirección corta y no la imagen entera en el JSON.
  //
  // **Qué se sirve lo decide `rutaImagenDesdeUrl`**, no esta_URL: un perfil
  // importado puede traer cualquier `imageData`, y antes esto acababa en
  // `join(userData, decodeURIComponent(ruta))`, que con `%2f` se salía de
  // `userData` y leía ficheros del disco (ver el módulo para la medida).
  //
  // Se registra tanto en la sesión por defecto como en la partición de la barra
  // flotante.
  const dirImagenes = join(app.getPath('userData'), 'images');
  const noHayImagen = new Response(null, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  const handleVd = (request: Request) => {
    const destino = rutaImagenDesdeUrl(request.url, dirImagenes);
    if (!destino) return noHayImagen;
    return net.fetch(`file:///${destino.replace(/\\/g, '/')}`).catch(() => noHayImagen);
  };
  protocol.handle('vd', handleVd);
  session.fromPartition(SESION_BARRA).protocol.handle('vd', handleVd);

  const win = setupWindow();
  setTimeout(() => autoCheckOnStartup(win), 8000);

  // 1.4 — enlaces `virtualdeck://`. La segunda copia no llega hasta aquí: se
  // cierra arriba, y Windows le entrega la URL a esta por `second-instance`.
  registrarEsquema();
  app.on('second-instance', (_e, argv) => {
    const url = urlEnArgumentos(argv);
    if (url) {
      atender(url, win);
    } else {
      if (win.isMinimized()) win.restore();
      win.show();
      win.focus();
      win.setAlwaysOnTop(true);
      win.setAlwaysOnTop(false);
    }
  });
  // Y el caso en el que la aplicación **no** estaba abierta: Windows la
  // arranca con la URL en los argumentos. Se espera a que el renderer esté
  // listo, porque `button:trigger` se pierde si se manda antes.
  const urlDeArranque = urlEnArgumentos(process.argv);
  if (urlDeArranque) {
    win.webContents.once('did-finish-load', () => {
      setTimeout(() => atender(urlDeArranque, win), 600);
    });
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) setupWindow();
  });
});

app.on('before-quit', () => {
  isQuitting = true;
  stopActiveWindowTracker();
  pararSondeo();
  remoto.parar();
  try { cerrarBarra(); } catch {}
  try { rgb.killServer(); } catch {}
  try { sensors.killLHM(); } catch {}
});

app.on('will-quit', () => { try { globalShortcut.unregisterAll(); } catch {} });

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && isQuitting) app.quit();
});
