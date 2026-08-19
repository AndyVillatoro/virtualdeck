import { OK, fail, interpolate, actionLabel, type Manejador } from './base';

/** Abrir cosas del sistema: programas, enlaces, accesos directos, ventanas. */
export const LANZAR: Record<string, Manejador> = {
  'app': async ({ action, api, state, t }) => {
    const path = interpolate(action.appPath, state);
    if (!path) return fail(t('act.err.noAppPath'));
    const args = interpolate(action.appArgs, state).split(' ').filter(Boolean);
    const ok = await api.launch.app(path, args);
    return ok ? OK : fail(t('act.err.launch', { que: actionLabel(action, t) }));
  },

  'web': async ({ action, api, state, t }) => {
    const url = interpolate(action.url, state);
    if (!url) return fail(t('act.err.noUrl'));
    const ok = await api.launch.url(url);
    return ok ? OK : fail(t('act.err.openUrl', { url }));
  },

  'shortcut': async ({ action, api, state, t }) => {
    const path = interpolate(action.shortcutPath, state);
    if (!path) return fail(t('act.err.noShortcut'));
    const ok = await api.launch.shortcut(path);
    return ok ? OK : fail(t('act.err.shortcut'));
  },

  'kill-process': async ({ action, api, t }) => {
    if (!action.processName) return fail(t('act.err.noProcess'));
    const ok = await api.launch.killProcess(action.processName);
    return ok ? OK : fail(t('act.err.kill', { name: action.processName ?? '' }));
  },

  'window-snap': async ({ action, api, t }) => {
    if (!action.snapPosition) return fail(t('act.err.noSnap'));
    const ok = await api.launch.snapWindow(action.snapPosition, action.snapProcessName);
    return ok ? OK : fail(t('act.err.snap'));
  },

  // Lanza la herramienta nativa de recorte de Windows.
  'region-capture': async ({ api, t }) => {
    const ok = await api.launch.url('ms-screenclip:');
    return ok ? OK : fail(t('act.err.capture'));
  },
};
