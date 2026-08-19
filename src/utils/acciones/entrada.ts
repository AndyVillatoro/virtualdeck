import { OK, fail, interpolate, type Manejador } from './base';

/** Lo que la aplicación le manda al sistema: teclas, texto, avisos, pantalla. */
export const ENTRADA: Record<string, Manejador> = {
  'hotkey': async ({ action, api, t }) => {
    if (!action.hotkey) return fail(t('act.err.noHotkey'));
    const ok = await api.launch.hotkey(action.hotkey);
    return ok ? OK : fail(t('act.err.hotkey', { hotkey: action.hotkey ?? '' }));
  },

  'clipboard': async ({ action, api, state, t }) => {
    const text = interpolate(action.clipboardText, state);
    if (!text) return fail(t('act.err.noClipText'));
    const ok = await api.launch.clipboard(text);
    return ok ? OK : fail(t('act.err.clipboard'));
  },

  'type-text': async ({ action, api, state, t }) => {
    const text = interpolate(action.typeText, state);
    if (!text) return fail(t('act.err.noTypeText'));
    const ok = await api.launch.typeText(text);
    return ok ? OK : fail(t('act.err.type'));
  },

  'macro': async ({ action, api, t }) => {
    if (!action.macroSteps || action.macroSteps.length === 0) return fail(t('act.err.macroEmpty'));
    const r = await api.macro.play(action.macroSteps, action.macroRepeat ?? 1);
    return r.ok ? OK : fail(r.error ?? t('act.err.macro'));
  },

  'brightness': async ({ action, api, t }) => {
    if (action.brightnessLevel === undefined) return fail(t('act.err.noBrightness'));
    const ok = await api.launch.brightness(action.brightnessLevel);
    return ok ? OK : fail(t('act.err.brightness'));
  },

  'notify': async ({ action, api, state, t }) => {
    const title = interpolate(action.notifyTitle, state) || 'VirtualDeck';
    const body = interpolate(action.notifyBody, state);
    const ok = await api.notify.show(title, body);
    return ok ? OK : fail(t('act.err.notify'));
  },

  'tts': async ({ action, api, state, t }) => {
    const text = interpolate(action.ttsText, state);
    if (!text) return fail(t('act.err.noTtsText'));
    // Comilla simple duplicada: es como PowerShell escapa dentro de '...'.
    const escaped = text.replace(/'/g, "''");
    const ps = `Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak('${escaped}')`;
    const ok = await api.launch.script(ps, 'powershell');
    return ok ? OK : fail(t('act.err.tts'));
  },
};
