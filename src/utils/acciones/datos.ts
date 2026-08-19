import { OK, fail, interpolate, type Manejador } from './base';

/** Variables del deck y llamadas HTTP. */
export const DATOS: Record<string, Manejador> = {
  'set-var': ({ action, state, t }) => {
    if (!action.varName) return fail(t('act.err.noVar'));
    const value = interpolate(action.varValue ?? '', state);
    return { ok: true, stateUpdate: { [action.varName]: value } };
  },

  'incr-var': ({ action, state, t }) => {
    if (!action.varName) return fail(t('act.err.noVar'));
    const delta = action.varDelta ?? 1;
    // `|| 0` además del `?? '0'`: una variable con texto da NaN, y sumarle
    // dejaría "NaN" guardado para siempre.
    const current = parseFloat(state?.[action.varName] ?? '0') || 0;
    const next = (current + delta).toString();
    return { ok: true, stateUpdate: { [action.varName]: next } };
  },

  'webhook': async ({ action, state, t }) => {
    const url = interpolate(action.webhookUrl, state);
    if (!url) return fail(t('act.err.noWebhookUrl'));
    const method = action.webhookMethod ?? 'POST';
    let headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (action.webhookHeaders) {
      try {
        const parsed = JSON.parse(interpolate(action.webhookHeaders, state));
        if (parsed && typeof parsed === 'object') headers = { ...headers, ...parsed };
      } catch { return fail(t('act.err.headers')); }
    }
    const body = method === 'GET' ? undefined : interpolate(action.webhookBody, state);
    try {
      const res = await fetch(url, { method, headers, body });
      if (!res.ok) {
        return fail(t('act.err.webhookStatus', { method, url, status: res.status, statusText: res.statusText }));
      }
      return OK;
    } catch (e) {
      return fail(t('act.err.webhook', { msg: (e as Error).message }));
    }
  },
};
