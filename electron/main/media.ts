import { intentarNativo } from './native';
import { runPS, controlScript, SHUFFLE_SCRIPT, REPEAT_SCRIPT, DIAGNOSE_SCRIPT } from './mediaScripts';
import { olvidarCache, logErrorOnce } from './mediaEstado';
import type { MediaCommand, MediaDiagnostic } from './mediaTipos';

/**
 * Fachada fina: la lógica vive en los módulos por responsabilidad.
 *
 * `mediaTipos.ts` (tipos), `mediaScripts.ts` (transporte SMTC/PowerShell: el
 * PREAMBLE con `Await-Op`/`AsTask` y todos los scripts), `mediaAnalisis.ts`
 * (parsers puros: títulos de ventana, controles, aleatorio, repetición) y
 * `mediaEstado.ts` (cachés, carátula y capacidades en segundo plano, consulta
 * SMTC y `getNowPlaying`). Aquí quedan solo las órdenes y el diagnóstico, sin
 * cambios de comportamiento.
 */
export type { NowPlaying, MediaCommand, MediaDiagnostic } from './mediaTipos';
export { getNowPlaying } from './mediaEstado';

// Control de medios — usa SMTC nativo cuando hay sesión, sino cae a SendKeys.
// El fallback SendKeys lo hace el caller (electron/main/index.ts) si esto devuelve false.
export async function controlMedia(cmd: MediaCommand): Promise<boolean> {
  olvidarCache();
  const nativo = intentarNativo('controlMedia', (n) => n.controlMedia(cmd));
  if (nativo !== undefined) return nativo;

  const r = await runPS(controlScript(cmd));
  if (!r.ok) {
    if (r.stderr) logErrorOnce(`smtc-control-${cmd}`, r.stderr);
    return false;
  }
  return r.stdout === 'OK';
}

export async function shuffleMedia(): Promise<boolean> {
  olvidarCache();
  const nativo = intentarNativo('shuffleMedia', (n) => n.shuffleMedia());
  if (nativo !== undefined) return nativo;

  const r = await runPS(SHUFFLE_SCRIPT);
  if (!r.ok) { if (r.stderr) logErrorOnce('smtc-shuffle', r.stderr); return false; }
  return r.stdout.trim() === 'OK';
}

export async function repeatMedia(): Promise<boolean> {
  olvidarCache();
  const nativo = intentarNativo('repeatMedia', (n) => n.repeatMedia());
  if (nativo !== undefined) return nativo;

  const r = await runPS(REPEAT_SCRIPT);
  if (!r.ok) { if (r.stderr) logErrorOnce('smtc-repeat', r.stderr); return false; }
  return r.stdout.trim() === 'OK';
}

// Diagnóstico — devuelve raw output para que el usuario entienda el estado.
/**
 * Diagnóstico del widget de música (el botón "?" del panel).
 *
 * **Va por PowerShell a propósito, aunque el núcleo nativo tenga su versión.**
 *
 * El diagnóstico recorre *todas* las sesiones SMTC, y basta con que una
 * aplicación haya dejado una sesión a medio cerrar para que su
 * `TryGetMediaPropertiesAsync` no termine nunca. La llamada nativa es síncrona
 * desde el punto de vista de quien la hace, así que eso **congela el proceso
 * principal de Electron entero**: la aplicación deja de responder y Windows
 * ofrece cerrarla. Se comprobó en esta máquina, con Edge reproduciendo — ni
 * siquiera un `Promise.race` con temporizador llega a dispararse, porque el
 * bucle de eventos está bloqueado.
 *
 * PowerShell tarda cientos de milisegundos, pero corre en otro proceso: si se
 * cuelga, se cuelga él solo.
 *
 * En `vd-core` ya está escrito el límite de 5 segundos que lo arregla de raíz
 * (`en_hilo_mta_con_limite`), pero no se ha podido compilar todavía. Cuando el
 * `.node` se reconstruya, esto puede volver a `intentarNativo`.
 */
export async function diagnose(): Promise<MediaDiagnostic> {
  const r = await runPS(DIAGNOSE_SCRIPT);
  return {
    ok: r.ok,
    stage: r.stdout.split(/\r?\n/).find((l) => l.startsWith('STAGE|'))?.slice(6) ?? 'unknown',
    stdout: r.stdout,
    stderr: r.stderr,
  };
}
