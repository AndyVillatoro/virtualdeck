/**
 * Fachada fina: la lógica vive en los módulos por responsabilidad.
 *
 * `launcherApps.ts` (lanzar programas, accesos directos, ajustes táctiles,
 * procesos), `launcherScripts.ts` (scripts, voz, portapapeles, tecleado),
 * `launcherBrilloVolumen.ts` (brillo y volumen), `launcherVentanas.ts`
 * (ventanas) y `launcherTeclas.ts` (atajos). Sin cambios de comportamiento.
 */
export { launchApp, openShortcut, abrirAjustesTactiles, getRunningProcesses, killProcess, isProcessRunning } from './launcherApps';
export { runScript, runScriptCapture, speakText, copyToClipboard, typeTextKeys } from './launcherScripts';
export { setBrightness, getBrightness, getVolume, setVolume } from './launcherBrilloVolumen';
export { snapWindow, cycleWindow, openApps, iconoApp, focusWindow, closeWindow } from './launcherVentanas';
export { sendHotkey } from './launcherTeclas';
