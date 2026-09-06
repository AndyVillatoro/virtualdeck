import { ipcMain, app, BrowserWindow } from 'electron';
import { execFileSync } from 'child_process';
import { abrirAjustesTactiles } from '../launcher';
import * as os from 'os';

/**
 * Registrar el arranque con Windows, con la marca de arrancar escondido.
 *
 * Sin `args`, iniciar sesión abría la ventana en primer plano y con su entrada
 * en la barra de tareas, delante de lo que estuviera haciendo el usuario. Una
 * aplicación de bandeja que arranca sola tiene que arrancar en la bandeja.
 *
 * Se exporta porque hay que volver a escribirlo en cada arranque: quien ya
 * tenía el inicio automático puesto lo tiene registrado **sin** la marca, y esa
 * entrada del registro no se corrige sola.
 */
export function fijarArranqueAutomatico(activado: boolean) {
  app.setLoginItemSettings({ openAtLogin: activado, args: ['--oculto'] });
}

/**
 * El AppUserModelId que tenia la aplicacion **antes** de fijar el suyo.
 *
 * Electron nombra el valor del registro con el AppUserModelId (documentado:
 * «value name to write into registry. Defaults to the app's AppUserModelId()»).
 * Al empezar a llamar a `setAppUserModelId('com.virtualdeck.app')`, el nombre
 * que la aplicacion busca cambio, y la entrada que ya existia —escrita con el
 * por defecto— se quedo huerfana.
 */
const AUMID_LEGADO = 'electron.app.VirtualDeck';
// Las barras van escapadas: en una cadena de TypeScript `\S` es `S`, y la
// clave salia como `HKCUSoftwareMicrosoft...`, que no existe. `reg query`
// fallaba, `existeEnRun` devolvia false y la migracion no se ejecutaba nunca.
const CLAVE_RUN = String.raw`HKCU\Software\Microsoft\Windows\CurrentVersion\Run`;

/** ¿Existe ese valor en la clave Run? Hay que mirarlo a mano: ver abajo. */
function existeEnRun(nombre: string): boolean {
  try {
    execFileSync('reg', ['query', CLAVE_RUN, '/v', nombre], { stdio: 'pipe' });
    return true;
  } catch { return false; }
}

/**
 * Recupera el arranque automatico de quien lo tenia puesto de antes.
 *
 * Sintomas, los tres reales y medidos en una maquina de verdad:
 *
 *  · La ventana se abria **en primer plano** al iniciar sesion, delante de lo
 *    que estuvieras haciendo. La entrada vieja no lleva `--oculto`, y la
 *    reescritura del arranque (`index.ts`) no la tocaba porque
 *    `getLoginItemSettings().openAtLogin` devolvia `false`: busca bajo el
 *    AppUserModelId nuevo y la entrada tiene el viejo.
 *  · El interruptor de los ajustes decia **apagado** mientras la aplicacion si
 *    arrancaba con Windows. O sea, mentia.
 *  · Y encenderlo ahi habria dejado **dos** entradas: dos arranques a la vez, y
 *    el segundo chocando contra el bloqueo de instancia unica.
 *
 * `getLoginItemSettings` **no** acepta `name` —solo lo acepta el de escribir—,
 * asi que la existencia de la entrada vieja hay que mirarla en el registro.
 */
export function migrarArranqueAutomatico() {
  if (process.platform !== 'win32') return;
  // En dev, `process.execPath` es electron.exe: registrarlo dejaria una entrada
  // que apunta al Electron de node_modules.
  if (!app.isPackaged) return;
  // En la Store esto no aplica: el arranque lo declara el manifiesto MSIX y la
  // escritura al registro estaria virtualizada dentro del paquete.
  if (process.windowsStore === true) return;
  if (!existeEnRun(AUMID_LEGADO)) return;
  try {
    app.setLoginItemSettings({ openAtLogin: false, name: AUMID_LEGADO });
    fijarArranqueAutomatico(true);
    console.log('[arranque] entrada de inicio migrada del nombre antiguo, ahora con --oculto');
  } catch {}
}

export function registerAppIpc(win: BrowserWindow) {
  ipcMain.handle('app:autostart:get', () => app.getLoginItemSettings().openAtLogin);
  ipcMain.handle('app:autostart:set', (_e: any, enabled: boolean) => {
    fijarArranqueAutomatico(enabled);
  });
  ipcMain.handle('app:setZoom', (_e: any, factor: number) => {
    win.webContents.setZoomFactor(Math.max(0.75, Math.min(1.75, factor)));
  });
  ipcMain.handle('app:getZoom', () => win.webContents.getZoomFactor());
  ipcMain.handle('app:tabletSettings', () => abrirAjustesTactiles());
  ipcMain.handle('app:version', () => app.getVersion());
  ipcMain.handle('app:platformInfo', () => ({
    appVersion: app.getVersion(),
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    os: `${os.type()} ${os.release()} (${os.arch()})`,
    locale: app.getLocale(),
  }));
}
