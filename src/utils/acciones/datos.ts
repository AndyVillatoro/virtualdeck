import { OK, fail, interpolate, type Manejador } from './base';

/** Variables del deck y llamadas HTTP. */
export const DATOS: Record<string, Manejador> = {
  /**
   * Pulsar un boton de **otro** VirtualDeck.
   *
   * Sale por el proceso principal (`mandoRemoto.ts`) porque la CSP de la
   * pantalla no deja conectar con la red local. El error que devuelve el otro
   * equipo se pasa tal cual: alli ya se distingue «no existe ese boton» de
   * «token invalido», y traducirlo dos veces seria que los dos se separen.
   */
  'remote': async ({ action, api, state, t }) => {
    if (!action.remoteHost) return fail(t('act.err.noRemoteHost'));
    if (!action.remoteToken) return fail(t('act.err.noRemoteToken'));
    const r = await api.remote.send({
      host: interpolate(action.remoteHost, state),
      token: action.remoteToken,
      boton: action.remoteButton ? interpolate(action.remoteButton, state) : undefined,
      pagina: action.remotePage,
    });
    return r.ok ? OK : fail(t('act.err.remote', { error: r.error ?? '?' }));
  },

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

  'mobile-remote': async ({ action, api, t }) => {
    const modo = action.mobileRemoteAction ?? 'pair-code';
    if (modo === 'pair-code') {
      const code = await api.remote.pairCode();
      if (!code) return fail(t('act.err.mobileCode'));
      try { await navigator.clipboard.writeText(code); } catch { /* ignore */ }
      await api.notify.show('VirtualDeck', t('act.mobile.pairCodeToast', { code }));
      return OK;
    }
    if (modo === 'open-web') {
      const st = await api.remote.status();
      const port = st.port || 8787;
      await api.launch.url(`http://127.0.0.1:${port}`);
      return OK;
    }
    if (modo === 'toggle-server') {
      const cfg = (await api.config.load()) as { remote?: { enabled?: boolean; port?: number; token?: string; allowLan?: boolean } };
      const r = cfg.remote ?? { enabled: false, port: 8787, allowLan: true };
      const nextEnabled = !r.enabled;
      let token = r.token;
      if (nextEnabled && !token) {
        token = (await api.remote.newToken()) ?? '';
      }
      const updatedRemote = { ...r, enabled: nextEnabled, token, allowLan: nextEnabled ? (r.allowLan ?? true) : r.allowLan };
      const nextCfg = { ...cfg, remote: updatedRemote };
      await api.config.save(nextCfg);
      await api.notify.show(
        'VirtualDeck',
        t(nextEnabled ? 'act.mobile.serverStarted' : 'act.mobile.serverStopped', { port: updatedRemote.port }),
      );
      return OK;
    }
    return OK;
  },
};

