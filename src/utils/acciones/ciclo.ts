import { fail, type ActionResult, type Manejador } from './base';
import type { ButtonAction, CycleStep, ElectronAPI, RGBProfile } from '../../types';
import type { TFunc } from '../i18n';
import { claveCiclo } from '../../comun/cicloIcono';

/**
 * Ciclo genérico de presets (T-CYC-01, roadmap 120 fase 3).
 *
 * Cada pulsación ejecuta el paso actual de `cycleSteps` y avanza el índice,
 * guardándolo en `config.state['__cycle_' + button.id]`. El aspecto del botón
 * refleja el paso actual (label, sublabel, icono y colores) en las cinco
 * superficies.
 */

type EjecutorSubAccion = (
  action: ButtonAction,
  ctx: { api: ElectronAPI; state?: Record<string, string>; rgbProfiles?: RGBProfile[]; t: TFunc; buttonId?: string },
) => Promise<ActionResult>;

let ejecutor: EjecutorSubAccion | null = null;

/** El ejecutor se inyecta desde `src/utils/actions.ts` para evitar un ciclo de imports. */
export function setEjecutorCiclo(fn: EjecutorSubAccion): void {
  ejecutor = fn;
}


function indiceActual(pasos: CycleStep[], state: Record<string, string> | undefined, buttonId: string): number {
  const raw = state?.[claveCiclo(buttonId)] ?? '0';
  let idx = parseInt(raw, 10);
  if (!Number.isFinite(idx) || idx < 0) idx = 0;
  if (idx >= pasos.length) idx = 0;
  return idx;
}

export const CICLO: Record<string, Manejador> = {
  'cycle': async ({ action, api, state, rgbProfiles, t, buttonId }) => {
    const pasos = action.cycleSteps ?? [];
    if (pasos.length === 0) return fail(t('act.err.cycleVacio'));
    if (!buttonId) return fail(t('act.err.cycleSinBoton'));

    const idx = indiceActual(pasos, state, buttonId);
    const paso = pasos[idx];
    if (paso.action.type === 'cycle') return fail(t('act.err.cycleRecursivo'));
    if (!ejecutor) return fail(t('act.err.cycleSinEjecutor'));

    const res = await ejecutor(paso.action, { api, state, rgbProfiles, t, buttonId });
    if (!res.ok) return res;

    const siguiente = (idx + 1) % pasos.length;
    return {
      ok: true,
      // Lo que la sub-acción cambió (p. ej. `set-var`) se conserva.
      stateUpdate: { ...res.stateUpdate, [claveCiclo(buttonId)]: String(siguiente) },
      detalle: res.detalle,
    };
  },
};
