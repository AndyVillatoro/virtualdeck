import type { ButtonAction, DeckConfig, ElectronAPI, RGBProfile } from '../types';

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

function actionLabel(a: ButtonAction): string {
  switch (a.type) {
    case 'app':         return a.appPath ? `App "${a.appPath.split(/[\\/]/).pop()}"` : 'App';
    case 'web':         return a.url ? `Abrir ${a.url}` : 'Abrir URL';
    case 'shortcut':    return a.shortcutPath ? `Acceso "${a.shortcutPath.split(/[\\/]/).pop()}"` : 'Acceso directo';
    case 'audio-device':return a.deviceName ? `Audio "${a.deviceName}"` : 'Cambiar audio';
    case 'hotkey':      return a.hotkey ? `Atajo ${a.hotkey}` : 'Atajo';
    case 'brightness':  return `Brillo ${a.brightnessLevel ?? 0}%`;
    case 'clipboard':   return 'Copiar al portapapeles';
    case 'type-text':   return 'Escribir texto';
    case 'kill-process':return a.processName ? `Cerrar "${a.processName}"` : 'Cerrar proceso';
    case 'volume-set':  return `Volumen ${a.volumePercent ?? 0}%`;
    case 'notify':      return 'Notificación';
    case 'set-var':     return `Set ${a.varName}=${a.varValue}`;
    case 'incr-var':    return `Incr ${a.varName} ${a.varDelta && a.varDelta >= 0 ? '+' : ''}${a.varDelta}`;
    case 'webhook':     return a.webhookUrl ? `Webhook ${a.webhookMethod ?? 'GET'} ${a.webhookUrl}` : 'Webhook';
    case 'tts':         return 'Texto-a-voz';
    case 'region-capture': return 'Captura de región';
    case 'rgb-color':   return `RGB color ${a.rgbColor ?? ''}`.trim();
    case 'rgb-mode':    return a.rgbMode ? `RGB modo "${a.rgbMode}"` : 'RGB modo';
    case 'rgb-profile': return a.rgbProfileName ? `RGB perfil "${a.rgbProfileName}"` : 'RGB perfil';
    default:            return a.type;
  }
}

export async function executeAction(
  action: ButtonAction,
  api: ElectronAPI,
  state?: Record<string, string>,
  rgbProfiles?: RGBProfile[],
): Promise<ActionResult> {
  try {
    switch (action.type) {
      case 'app': {
        const path = interpolate(action.appPath, state);
        if (!path) return fail('Falta la ruta del programa.');
        const args = interpolate(action.appArgs, state).split(' ').filter(Boolean);
        const ok = await api.launch.app(path, args);
        return ok ? OK : fail(`No se pudo iniciar: ${actionLabel(action)}. Verifica la ruta.`);
      }
      case 'web': {
        const url = interpolate(action.url, state);
        if (!url) return fail('Falta la URL.');
        const ok = await api.launch.url(url);
        return ok ? OK : fail(`No se pudo abrir: ${url}`);
      }
      case 'shortcut': {
        const path = interpolate(action.shortcutPath, state);
        if (!path) return fail('Falta el acceso directo.');
        const ok = await api.launch.shortcut(path);
        return ok ? OK : fail(`No se pudo abrir el acceso directo.`);
      }
      case 'audio-device': {
        if (!action.deviceId) return fail('Falta el dispositivo de audio.');
        const ok = await api.audio.setDefault(action.deviceId);
        return ok ? OK : fail(`No se pudo cambiar el audio a "${action.deviceName ?? action.deviceId}".`);
      }
      case 'hotkey': {
        if (!action.hotkey) return fail('Falta la combinación de teclas.');
        const ok = await api.launch.hotkey(action.hotkey);
        return ok ? OK : fail(`No se pudo enviar el atajo ${action.hotkey}.`);
      }
      case 'brightness': {
        if (action.brightnessLevel === undefined) return fail('Falta el nivel de brillo.');
        const ok = await api.launch.brightness(action.brightnessLevel);
        return ok ? OK : fail('No se pudo ajustar el brillo (¿monitor sin soporte WMI?).');
      }
      case 'clipboard': {
        const text = interpolate(action.clipboardText, state);
        if (!text) return fail('Falta el texto a copiar.');
        const ok = await api.launch.clipboard(text);
        return ok ? OK : fail('No se pudo copiar al portapapeles.');
      }
      case 'type-text': {
        const text = interpolate(action.typeText, state);
        if (!text) return fail('Falta el texto a escribir.');
        const ok = await api.launch.typeText(text);
        return ok ? OK : fail('No se pudo escribir el texto.');
      }
      case 'kill-process': {
        if (!action.processName) return fail('Falta el nombre del proceso.');
        const ok = await api.launch.killProcess(action.processName);
        return ok ? OK : fail(`No se pudo cerrar "${action.processName}". ¿Está activo?`);
      }
      case 'volume-set': {
        if (action.volumePercent === undefined) return fail('Falta el nivel de volumen.');
        const ok = await api.launch.setVolume(action.volumePercent);
        return ok ? OK : fail('No se pudo ajustar el volumen.');
      }
      case 'notify': {
        const title = interpolate(action.notifyTitle, state) || 'VirtualDeck';
        const body = interpolate(action.notifyBody, state);
        const ok = await api.notify.show(title, body);
        return ok ? OK : fail('No se pudo mostrar la notificación.');
      }
      case 'media-play-pause':
      case 'media-next':
      case 'media-prev': {
        // SMTC nativo (TrySkipNext/Previous/TogglePlayPause) → fallback SendKeys.
        const cmd = action.type === 'media-play-pause' ? 'play-pause'
                  : action.type === 'media-next'       ? 'next'
                  : 'prev';
        const ok = await api.media.control(cmd);
        return ok ? OK : fail(`No se pudo enviar el control de media (${cmd}).`);
      }
      case 'volume-up':
      case 'volume-down':
      case 'mute': {
        // Volumen y mute siguen por SendKeys — no hay equivalente SMTC.
        const ok = await api.launch.mediaKey(action.type);
        return ok ? OK : fail(`No se pudo enviar la tecla multimedia (${action.type}).`);
      }

      // 1.2 — Variables
      case 'set-var': {
        if (!action.varName) return fail('Falta nombre de variable.');
        const value = interpolate(action.varValue ?? '', state);
        return { ok: true, stateUpdate: { [action.varName]: value } };
      }
      case 'incr-var': {
        if (!action.varName) return fail('Falta nombre de variable.');
        const delta = action.varDelta ?? 1;
        const current = parseFloat(state?.[action.varName] ?? '0') || 0;
        const next = (current + delta).toString();
        return { ok: true, stateUpdate: { [action.varName]: next } };
      }

      // 1.5 — Webhook (HTTP)
      case 'webhook': {
        const url = interpolate(action.webhookUrl, state);
        if (!url) return fail('Falta la URL del webhook.');
        const method = action.webhookMethod ?? 'POST';
        let headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (action.webhookHeaders) {
          try {
            const parsed = JSON.parse(interpolate(action.webhookHeaders, state));
            if (parsed && typeof parsed === 'object') headers = { ...headers, ...parsed };
          } catch { return fail('Headers inválidos (JSON malformado).'); }
        }
        const body = method === 'GET' ? undefined : interpolate(action.webhookBody, state);
        try {
          const res = await fetch(url, { method, headers, body });
          if (!res.ok) return fail(`Webhook ${method} ${url} → ${res.status} ${res.statusText}`);
          return OK;
        } catch (e) {
          return fail(`Webhook falló: ${(e as Error).message}`);
        }
      }

      // 1.5 — TTS (PowerShell SpeechSynthesizer)
      case 'tts': {
        const text = interpolate(action.ttsText, state);
        if (!text) return fail('Falta el texto a leer.');
        const escaped = text.replace(/'/g, "''");
        const ps = `Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak('${escaped}')`;
        const ok = await api.launch.script(ps, 'powershell');
        return ok ? OK : fail('No se pudo reproducir el texto-a-voz.');
      }

      // 1.5 — Captura de región (lanza la herramienta nativa de Windows)
      case 'region-capture': {
        const ok = await api.launch.url('ms-screenclip:');
        return ok ? OK : fail('No se pudo abrir la herramienta de captura.');
      }

      // 2.x — RGB (OpenRGB)
      case 'rgb-color': {
        if (!action.rgbColor) return fail('Falta el color RGB.');
        const id = action.rgbDeviceId ?? -1;
        const ok = await api.rgb.setDeviceColor(id, action.rgbColor);
        return ok ? OK : fail('No se pudo aplicar el color RGB (¿OpenRGB conectado?).');
      }
      case 'rgb-mode': {
        if (!action.rgbMode) return fail('Falta el modo RGB.');
        const id = action.rgbDeviceId ?? -1;
        const ok = await api.rgb.setMode(id, action.rgbMode, action.rgbColor, action.rgbBrightness);
        return ok ? OK : fail(`No se pudo aplicar el modo "${action.rgbMode}".`);
      }
      case 'rgb-profile': {
        if (!action.rgbProfileName) return fail('Falta el nombre del perfil RGB.');
        const prof = rgbProfiles?.find((p) => p.name === action.rgbProfileName);
        if (!prof) return fail(`Perfil RGB "${action.rgbProfileName}" no existe.`);
        const ok = await api.rgb.applyProfile(prof);
        return ok ? OK : fail('No se pudo aplicar el perfil RGB.');
      }

      // 'script' y 'folder' los maneja el caller
      default: return OK;
    }
  } catch (e) {
    return fail(`Error inesperado en ${actionLabel(action)}: ${(e as Error).message ?? e}`);
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
          res = ok ? OK : fail('El script terminó con error.');
        } else {
          const r2 = await scriptHooks.runScript(a.script, a.scriptShell);
          res = r2.ok ? OK : fail(r2.error ?? 'El script terminó con error.');
        }
      } else if (a.type === 'folder') {
        res = OK;
      } else {
        res = await executeAction(a, api, merged, rgbProfiles);
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
