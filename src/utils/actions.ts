import type { ButtonAction, DeckConfig, ElectronAPI, RGBProfile } from '../types';
import { makeT, type TFunc } from './i18n';

/**
 * Traductor por defecto: español.
 *
 * Solo se usa si alguien llama sin pasar el suyo. Las pantallas pasan el de
 * `useT()`, que sigue el idioma elegido.
 */
const T_POR_DEFECTO = makeT('es');

import { MANEJADORES, RESUELTAS_POR_EL_LLAMADOR } from './acciones';
import { OK, fail, interpolate, actionLabel, type ActionResult } from './acciones/base';

// Se reexportan porque media aplicacion los importa desde aqui.
export { interpolate };
export type { ActionResult };

export async function executeAction(
  action: ButtonAction,
  api: ElectronAPI,
  state?: Record<string, string>,
  rgbProfiles?: RGBProfile[],
  t: TFunc = T_POR_DEFECTO,
): Promise<ActionResult> {
  const manejador = MANEJADORES[action.type];
  // Sin manejador y sin estar en la lista de las que resuelve el llamador, la
  // accion es una que alguien añadio al tipo y olvido implementar. Antes esto
  // devolvia 'todo bien' en silencio; ahora lo dice.
  if (!manejador) {
    return RESUELTAS_POR_EL_LLAMADOR.has(action.type)
      ? OK
      : fail(t('act.err.sinManejador', { tipo: action.type }));
  }
  try {
    return await manejador({ action, api, state, rgbProfiles, t });
  } catch (e) {
    return fail(t('act.err.unexpected', { que: actionLabel(action, t), msg: String((e as Error).message ?? e) }));
  }
}

function evaluateBranch(value: string, op: string, compareVal: string): boolean {
  switch (op) {
    case '==':        return value === compareVal;
    case '!=':        return value !== compareVal;
    case '>':         return parseFloat(value) > parseFloat(compareVal);
    case '<':         return parseFloat(value) < parseFloat(compareVal);
    case '>=':        return parseFloat(value) >= parseFloat(compareVal);
    case '<=':        return parseFloat(value) <= parseFloat(compareVal);
    case 'contains':  return value.toLowerCase().includes(compareVal.toLowerCase());
    case 'empty':     return !value.trim();
    case 'not-empty': return !!value.trim();
    default:          return false;
  }
}

// 1.3 — Runner avanzado para una secuencia con delay/condicional/repeat por paso.
// Devuelve la última actualización agregada de state (si la hubo) y si hubo error.
export interface RunSequenceResult {
  ok: boolean;
  error?: string;
  stateUpdate: Record<string, string>;
}

/** Lo que necesitan los tipos que solo existen dentro de una secuencia. */
interface EntornoSecuencia {
  api: ElectronAPI;
  merged: Record<string, string>;
  scriptHooks?: GanchosDeScript;
  rgbProfiles?: RGBProfile[];
  t: TFunc;
}

interface GanchosDeScript {
  runScript: (script: string, shell?: 'powershell' | 'cmd') => Promise<{ ok: boolean; output?: string; error?: string }>;
}

/** `script`: o por el gancho del llamador (que captura la salida) o directo. */
async function ejecutarScript(a: ButtonAction, e: EntornoSecuencia): Promise<ActionResult> {
  if (!a.script) return OK;
  if (!e.scriptHooks) {
    // Sin gancho no hay captura de salida; al menos se ejecuta.
    const ok = await e.api.launch.script(a.script, a.scriptShell);
    return ok ? OK : fail(e.t('act.err.script'));
  }
  const r = await e.scriptHooks.runScript(a.script, a.scriptShell);
  if (!r.ok) return fail(r.error ?? e.t('act.err.script'));
  if (a.captureToVar && r.output !== undefined) {
    return { ok: true, stateUpdate: { [a.captureToVar]: r.output.trim() } };
  }
  return OK;
}

/** Espera y luego corre una sub-secuencia. */
async function ejecutarTemporizador(a: ButtonAction, e: EntornoSecuencia): Promise<ActionResult> {
  await new Promise<void>((resolve) => setTimeout(resolve, a.timerDelay ?? 1000));
  if (!a.timerActions || a.timerActions.length === 0) return OK;
  const sub = await runActionSequence(a.timerActions, e.api, { ...e.merged }, e.scriptHooks, e.rgbProfiles, e.t);
  Object.assign(e.merged, sub.stateUpdate);
  return sub.ok ? OK : fail(sub.error ?? e.t('act.err.countdown'));
}

/** Elige una de las dos ramas segun el valor de una variable. */
async function ejecutarRama(a: ButtonAction, e: EntornoSecuencia): Promise<ActionResult> {
  const varVal = e.merged[a.branchVar ?? ''] ?? '';
  const compareVal = interpolate(a.branchValue, e.merged);
  const rama = evaluateBranch(varVal, a.branchOp ?? '==', compareVal)
    ? (a.branchThen ?? [])
    : (a.branchElse ?? []);
  if (rama.length === 0) return OK;
  const sub = await runActionSequence(rama, e.api, { ...e.merged }, e.scriptHooks, e.rgbProfiles, e.t);
  Object.assign(e.merged, sub.stateUpdate);
  return sub.ok ? OK : fail(sub.error ?? '');
}

/**
 * Los cuatro tipos que `executeAction` no despacha (ver
 * `RESUELTAS_POR_EL_LLAMADOR`): necesitan el estado acumulado de la secuencia,
 * el gancho de scripts, o poder llamarse a si mismos.
 */
const EN_SECUENCIA: Record<string, (a: ButtonAction, e: EntornoSecuencia) => Promise<ActionResult>> = {
  'script': ejecutarScript,
  'countdown': ejecutarTemporizador,
  'branch': ejecutarRama,
  // La carpeta abre un overlay en pantalla; aqui no hay nada que ejecutar.
  'folder': async () => OK,
};

export async function runActionSequence(
  actions: ButtonAction[],
  api: ElectronAPI,
  state: Record<string, string>,
  scriptHooks?: GanchosDeScript,
  rgbProfiles?: RGBProfile[],
  t: TFunc = T_POR_DEFECTO,
): Promise<RunSequenceResult> {
  const merged: Record<string, string> = { ...state };
  const entorno: EntornoSecuencia = { api, merged, scriptHooks, rgbProfiles, t };
  let lastOk = true;
  let firstError: string | undefined;

  for (const [i, a] of actions.entries()) {
    if (a.onlyIfPrevOk && !lastOk) continue;
    const reps = Math.max(1, a.repeat ?? 1);
    for (let r = 0; r < reps; r++) {
      const delay = a.delayMs ?? (i > 0 ? 150 : 0);
      if (delay > 0) await new Promise((res) => setTimeout(res, delay));

      const especial = EN_SECUENCIA[a.type];
      const res = especial
        ? await especial(a, entorno)
        : await executeAction(a, api, merged, rgbProfiles, t);

      lastOk = res.ok;
      if (res.stateUpdate) Object.assign(merged, res.stateUpdate);
      if (!res.ok) {
        if (!firstError) firstError = res.error;
        break;
      }
    }
  }
  return { ok: !firstError, error: firstError, stateUpdate: merged };
}
