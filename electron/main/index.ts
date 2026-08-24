import { app, BrowserWindow, globalShortcut, net, protocol } from 'electron';
import { join } from 'path';
import { loadConfig } from './configManager';
import { createMainWindow } from './windowManager';
import { createTray, applyTriggerableConfig } from './trayManager';
import { registerAllIpc } from './ipc';
import { fijarArranqueAutomatico } from './ipc/appIpc';
import { autoCheckOnStartup } from './ipc/updateIpc';
import * as rgb from './rgb';
import * as sensors from './sensors';
import { abrirBarra } from './floatingBar';
import { fijarIdioma } from './idioma';

// DeskIn virtual display adapter and similar virtual/remote display drivers don't support
// Chromium's GPU compositor — disabling hardware acceleration forces software rendering
// which fixes black tiles and partial redraws on virtual monitors.
app.disableHardwareAcceleration();

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

let isQuitting = false;

function onQuit() {
  isQuitting = true;
  app.quit();
}

function setupWindow() {
  const win = createMainWindow();

  win.on('close', (e) => {
    if (!isQuitting) { e.preventDefault(); win.hide(); }
  });

  const initialCfg = loadConfig();
  // El idioma de lo poco que enseña el proceso principal: la bandeja y los
  // titulos de los dialogos de archivo.
  fijarIdioma((initialCfg as any)?.language);
  registerAllIpc(win, onQuit);
  // Reescribir la entrada del registro de quien ya tenia el inicio automatico:
  // la suya no lleva la marca de arrancar escondido y no se corrige sola.
  if (app.getLoginItemSettings().openAtLogin) fijarArranqueAutomatico(true);
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
  // Serve userData files via vd:// — keeps imageData references small in config JSON
  protocol.handle('vd', (request) => {
    const path = request.url.slice('vd://'.length);
    const filePath = join(app.getPath('userData'), decodeURIComponent(path));
    return net.fetch(`file:///${filePath.replace(/\\/g, '/')}`);
  });

  const win = setupWindow();
  setTimeout(() => autoCheckOnStartup(win), 8000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) setupWindow();
  });
});

app.on('before-quit', () => {
  isQuitting = true;
  try { rgb.killServer(); } catch {}
  try { sensors.killLHM(); } catch {}
});

app.on('will-quit', () => { try { globalShortcut.unregisterAll(); } catch {} });

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && isQuitting) app.quit();
});
