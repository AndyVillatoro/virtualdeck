import type { ButtonAction, DeckConfig, ElectronAPI, RGBProfile } from '../types';
import { makeT, type TFunc } from './i18n';

/**
 * Traductor por defecto: español.
 *
 * Solo se usa si alguien llama sin pasar el suyo. Las pantallas pasan el de
 * `useT()`, que sigue el idioma elegido.
 */
const T_POR_DEFECTO = makeT('es');

export interface ActionResult {
  ok: boolean;
  error?: string;
  /** 1.2 — Mutación al estado global propuesta por la acción (set-var / incr-var). */
  stateUpdate?: Partial<Record<string, string>>;
}

const OK: ActionResult = { ok: true };
const fail = (error: string): ActionResult => ({ ok: false, error });

// 1.2 — Sustituye {nombre} por el valor en state. Útil en appArgs, url, script,
// clipboardText, typeText, webhookUrl, ttsText, etc. Si la variable no existe,
// se reemplaza por '' (no se rompe la cadena).
export function interpolate(template: string | undefined, state: Record<string, string> | undefined): string {
  if (!template) return '';
  if (!state) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => state[key] ?? '');
}

function actionLabel(a: ButtonAction, t: TFunc): string {
  switch (a.type) {
    case 'app':         return a.appPath ? `${t('act.lbl.app')} "${a.appPath.split(/[\\/]/).pop()}"` : t('act.lbl.app');
    case 'web':         return a.url ? `${t('act.lbl.open')} ${a.url}` : t('act.lbl.web');
    case 'shortcut':    return a.shortcutPath ? `${t('act.lbl.shortcut')} "${a.shortcutPath.split(/[\\/]/).pop()}"` : t('act.lbl.shortcut');
    case 'audio-device':return a.deviceName ? `${t('act.lbl.audio')} "${a.deviceName}"` : t('act.lbl.audio');
    case 'hotkey':      return a.hotkey ? `${t('act.lbl.hotkey')} ${a.hotkey}` : t('act.lbl.hotkey');
    case 'brightness':  return `${t('act.lbl.brightness')} ${a.brightnessLevel ?? 0}%`;
    case 'clipboard':   return t('act.lbl.clipboard');
    case 'type-text':   return t('act.lbl.type');
    case 'kill-process':return a.processName ? `${t('act.lbl.kill')} "${a.processName}"` : t('act.lbl.kill');
    case 'volume-set':  return `${t('act.lbl.volume')} ${a.volumePercent ?? 0}%`;
    case 'notify':      return t('act.lbl.notify');
    case 'set-var':     return `Set ${a.varName}=${a.varValue}`;
    case 'incr-var':    return `Incr ${a.varName} ${a.varDelta && a.varDelta >= 0 ? '+' : ''}${a.varDelta}`;
    case 'webhook':     return a.webhookUrl ? `Webhook ${a.webhookMethod ?? 'GET'} ${a.webhookUrl}` : t('act.lbl.webhook');
    case 'tts':         return t('act.lbl.tts');
    case 'region-capture': return t('act.lbl.capture');
    case 'rgb-color':   return `RGB color ${a.rgbColor ?? ''}`.trim();
    case 'rgb-mode':    return a.rgbMode ? `${t('act.lbl.rgbMode')} "${a.rgbMode}"` : t('act.lbl.rgbMode');
    case 'rgb-profile': return a.rgbProfileName ? `${t('act.lbl.rgbProfile')} "${a.rgbProfileName}"` : t('act.lbl.rgbProfile');
    case 'rgb-preset':   return a.rgbPresetId ? `${t('act.lbl.rgbPreset')} "${a.rgbPresetId}"` : t('act.lbl.rgbPreset');
    case 'window-snap':    return a.snapPosition ? `Snap ${a.snapPosition}` : t('act.lbl.snap');
    case 'branch':         return `If {${a.branchVar ?? '?'}} ${a.branchOp ?? '=='} "${a.branchValue ?? ''}"`;
    case 'media-shuffle':  return t('act.lbl.shuffle');
    case 'media-repeat':   return t('act.lbl.repeat');
    case 'macro':          return `${t('act.lbl.macro', { n: a.macroSteps?.length ?? 0 })}`;
    default:               return a.type;
  }
}

export async function executeAction(
  action: ButtonAction,
  api: ElectronAPI,
  state?: Record<string, string>,
  rgbProfiles?: RGBProfile[],
  t: TFunc = T_POR_DEFECTO,
): Promise<ActionResult> {
  try {
    switch (action.type) {
      case 'app': {
        const path = interpolate(action.appPath, state);
        if (!path) return fail(t('act.err.noAppPath'));
        const args = interpolate(action.appArgs, state).split(' ').filter(Boolean);
        const ok = await api.launch.app(path, args);
        return ok ? OK : fail(t('act.err.launch', { que: actionLabel(action, t) }));
      }
      case 'web': {
        const url = interpolate(action.url, state);
        if (!url) return fail(t('act.err.noUrl'));
        const ok = await api.launch.url(url);
        return ok ? OK : fail(t('act.err.openUrl', { url }));
      }
      case 'shortcut': {
        const path = interpolate(action.shortcutPath, state);
        if (!path) return fail(t('act.err.noShortcut'));
        const ok = await api.launch.shortcut(path);
        return ok ? OK : fail(t('act.err.shortcut'));
      }
      case 'audio-device': {
        if (!action.deviceId && !action.deviceName) return fail(t('act.err.noDevice'));
        let deviceId = action.deviceId;
        if (!deviceId && action.deviceName) {
          const devices = await api.audio.list();
          const match = devices.find((d) => d.name.toLowerCase() === action.deviceName!.toLowerCase())
            ?? devices.find((d) => d.name.toLowerCase().includes(action.deviceName!.toLowerCase()));
          if (!match) return fail(t('act.err.deviceNotFound', { name: action.deviceName ?? '' }));
          deviceId = match.id;
        }
        const ok = await api.audio.setDefault(deviceId!);
        return ok ? OK : fail(t('act.err.switchAudio', { name: action.deviceName ?? deviceId }));
      }
      case 'hotkey': {
        if (!action.hotkey) return fail(t('act.err.noHotkey'));
        const ok = await api.launch.hotkey(action.hotkey);
        return ok ? OK : fail(t('act.err.hotkey', { hotkey: action.hotkey ?? '' }));
      }
      case 'brightness': {
        if (action.brightnessLevel === undefined) return fail(t('act.err.noBrightness'));
        const ok = await api.launch.brightness(action.brightnessLevel);
        return ok ? OK : fail(t('act.err.brightness'));
      }
      case 'clipboard': {
        const text = interpolate(action.clipboardText, state);
        if (!text) return fail(t('act.err.noClipText'));
        const ok = await api.launch.clipboard(text);
        return ok ? OK : fail(t('act.err.clipboard'));
      }
      case 'type-text': {
        const text = interpolate(action.typeText, state);
        if (!text) return fail(t('act.err.noTypeText'));
        const ok = await api.launch.typeText(text);
        return ok ? OK : fail(t('act.err.type'));
      }
      case 'kill-process': {
        if (!action.processName) return fail(t('act.err.noProcess'));
        const ok = await api.launch.killProcess(action.processName);
        return ok ? OK : fail(t('act.err.kill', { name: action.processName ?? '' }));
      }
      case 'volume-set': {
        if (action.volumePercent === undefined) return fail(t('act.err.noVolume'));
        const ok = await api.launch.setVolume(action.volumePercent);
        return ok ? OK : fail(t('act.err.volume'));
      }
      case 'notify': {
        const title = interpolate(action.notifyTitle, state) || 'VirtualDeck';
        const body = interpolate(action.notifyBody, state);
        const ok = await api.notify.show(title, body);
        return ok ? OK : fail(t('act.err.notify'));
      }
      case 'media-play-pause':
      case 'media-next':
      case 'media-prev': {
        // SMTC nativo (TrySkipNext/Previous/TogglePlayPause) → fallback SendKeys.
        const cmd = action.type === 'media-play-pause' ? 'play-pause'
                  : action.type === 'media-next'       ? 'next'
                  : 'prev';
        const ok = await api.media.control(cmd);
        return ok ? OK : fail(t('act.err.media', { cmd }));
      }
      case 'media-shuffle': {
        const ok = await api.media.shuffle();
        return ok ? OK : fail(t('act.err.shuffle'));
      }
      case 'media-repeat': {
        const ok = await api.media.repeat();
        return ok ? OK : fail(t('act.err.repeat'));
      }
      case 'macro': {
        if (!action.macroSteps || action.macroSteps.length === 0) return fail(t('act.err.macroEmpty'));
        const r = await api.macro.play(action.macroSteps, action.macroRepeat ?? 1);
        return r.ok ? OK : fail(r.error ?? t('act.err.macro'));
      }
      case 'volume-up':
      case 'volume-down':
      case 'mute': {
        // Volumen y mute siguen por SendKeys — no hay equivalente SMTC.
        const ok = await api.launch.mediaKey(action.type);
        return ok ? OK : fail(t('act.err.mediaKey', { tipo: action.type }));
      }

      // 1.2 — Variables
      case 'set-var': {
        if (!action.varName) return fail(t('act.err.noVar'));
        const value = interpolate(action.varValue ?? '', state);
        return { ok: true, stateUpdate: { [action.varName]: value } };
      }
      case 'incr-var': {
        if (!action.varName) return fail(t('act.err.noVar'));
        const delta = action.varDelta ?? 1;
        const current = parseFloat(state?.[action.varName] ?? '0') || 0;
        const next = (current + delta).toString();
        return { ok: true, stateUpdate: { [action.varName]: next } };
      }

      // 1.5 — Webhook (HTTP)
      case 'webhook': {
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
          if (!res.ok) return fail(t('act.err.webhookStatus', { method, url, status: res.status, statusText: res.statusText }));
          return OK;
        } catch (e) {
          return fail(t('act.err.webhook', { msg: (e as Error).message }));
        }
      }

      // 1.5 — TTS (PowerShell SpeechSynthesizer)
      case 'tts': {
        const text = interpolate(action.ttsText, state);
        if (!text) return fail(t('act.err.noTtsText'));
        const escaped = text.replace(/'/g, "''");
        const ps = `Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak('${escaped}')`;
        const ok = await api.launch.script(ps, 'powershell');
        return ok ? OK : fail(t('act.err.tts'));
      }

      // 1.5 — Captura de región (lanza la herramienta nativa de Windows)
      case 'region-capture': {
        const ok = await api.launch.url('ms-screenclip:');
        return ok ? OK : fail(t('act.err.capture'));
      }

      // 2.x — RGB (OpenRGB)
      case 'rgb-color': {
        if (!action.rgbColor) return fail(t('act.err.noRgbColor'));
        const id = action.rgbDeviceId ?? -1;
        // `true` = duradero. Un botón de color quiere decir "deja las luces
        // así", no "así mientras VirtualDeck esté abierto": ver setDeviceColor
        // en electron/main/rgb.ts.
        const ok = await api.rgb.setDeviceColor(id, action.rgbColor, true);
        return ok ? OK : fail(t('act.err.rgbColor'));
      }
      case 'rgb-mode': {
        if (!action.rgbMode) return fail(t('act.err.noRgbMode'));
        const id = action.rgbDeviceId ?? -1;
        const ok = await api.rgb.setMode(id, action.rgbMode, action.rgbColor, action.rgbBrightness);
        return ok ? OK : fail(t('act.err.rgbMode', { modo: action.rgbMode ?? '' }));
      }
      case 'rgb-profile': {
        if (!action.rgbProfileName) return fail(t('act.err.noRgbProfile'));
        const prof = rgbProfiles?.find((p) => p.name === action.rgbProfileName);
        if (!prof) return fail(t('act.err.rgbProfileMissing', { name: action.rgbProfileName ?? '' }));
        const ok = await api.rgb.applyProfile(prof);
        return ok ? OK : fail(t('act.err.rgbProfile'));
      }
      case 'rgb-preset': {
        if (!action.rgbPresetId) return fail(t('act.err.noRgbPreset'));
        const ok = await api.rgb.smartPreset(action.rgbPresetId);
        return ok ? OK : fail(t('act.err.rgbPreset', { id: action.rgbPresetId ?? '' }));
      }

      // 3.x — Window snap
      case 'window-snap': {
        if (!action.snapPosition) return fail(t('act.err.noSnap'));
        const ok = await api.launch.snapWindow(action.snapPosition, action.snapProcessName);
        return ok ? OK : fail(t('act.err.snap'));
      }

      // 'script', 'folder' y 'branch' los maneja el caller
      default: return OK;
    }
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

export async function runActionSequence(
  actions: ButtonAction[],
  api: ElectronAPI,
  state: Record<string, string>,
  scriptHooks?: {
    runScript: (script: string, shell?: 'powershell' | 'cmd') => Promise<{ ok: boolean; output?: string; error?: string }>;
  },
  rgbProfiles?: RGBProfile[],
  t: TFunc = T_POR_DEFECTO,
): Promise<RunSequenceResult> {
  const merged: Record<string, string> = { ...state };
  let lastOk = true;
  let firstError: string | undefined;
  for (let i = 0; i < actions.length; i++) {
    const a = actions[i];
    if (a.onlyIfPrevOk && !lastOk) continue;
    const reps = Math.max(1, a.repeat ?? 1);
    for (let r = 0; r < reps; r++) {
      const delay = a.delayMs ?? (i > 0 ? 150 : 0);
      if (delay > 0) await new Promise((res) => setTimeout(res, delay));
      let res: ActionResult;
      if (a.type === 'script' && a.script) {
        if (!scriptHooks) {
          // Fallback básico — sin captura
          const ok = await api.launch.script(a.script, a.scriptShell);
          res = ok ? OK : fail(t('act.err.script'));
        } else {
          const r2 = await scriptHooks.runScript(a.script, a.scriptShell);
          if (!r2.ok) {
            res = fail(r2.error ?? t('act.err.script'));
          } else if (a.captureToVar && r2.output !== undefined) {
            res = { ok: true, stateUpdate: { [a.captureToVar]: r2.output.trim() } };
          } else {
            res = OK;
          }
        }
      } else if (a.type === 'countdown') {
        const delay = a.timerDelay ?? 1000;
        await new Promise<void>((resolve) => setTimeout(resolve, delay));
        if (a.timerActions && a.timerActions.length > 0) {
          const sub = await runActionSequence(a.timerActions, api, { ...merged }, scriptHooks, rgbProfiles, t);
          Object.assign(merged, sub.stateUpdate);
          res = sub.ok ? OK : fail(sub.error ?? t('act.err.countdown'));
        } else {
          res = OK;
        }
      } else if (a.type === 'folder') {
        res = OK;
      } else if (a.type === 'branch') {
        const varVal = merged[a.branchVar ?? ''] ?? '';
        const compareVal = interpolate(a.branchValue, merged);
        const condTrue = evaluateBranch(varVal, a.branchOp ?? '==', compareVal);
        const subActions = condTrue ? (a.branchThen ?? []) : (a.branchElse ?? []);
        if (subActions.length > 0) {
          const sub = await runActionSequence(subActions, api, { ...merged }, scriptHooks, rgbProfiles, t);
          Object.assign(merged, sub.stateUpdate);
          res = sub.ok ? OK : fail(sub.error ?? '');
        } else {
          res = OK;
        }
      } else {
        res = await executeAction(a, api, merged, rgbProfiles, t);
      }
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

export function applyStateUpdate(config: DeckConfig, update: Record<string, string>): DeckConfig {
  return { ...config, state: { ...(config.state ?? {}), ...update } };
}
