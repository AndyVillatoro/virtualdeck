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
    case 'rgb-preset':   return a.rgbPresetId ? `RGB preset "${a.rgbPresetId}"` : 'RGB preset';
    case 'window-snap':  return a.snapPosition ? `Snap ${a.snapPosition}` : 'Window snap';
    case 'branch':       return `If {${a.branchVar ?? '?'}} ${a.branchOp ?? '=='} "${a.branchValue ?? ''}"`;
    default:             return a.type;
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
        if (!action.deviceId && !action.deviceName) return fail('Falta el dispositivo de audio.');
        let deviceId = action.deviceId;
        if (!deviceId && action.deviceName) {
          const devices = await api.audio.list();
          const match = devices.find((d) => d.name.toLowerCase() === action.deviceName!.toLowerCase())
            ?? devices.find((d) => d.name.toLowerCase().includes(action.deviceName!.toLowerCase()));
          if (!match) return fail(`Dispositivo "${action.deviceName}" no encontrado. Verifica el nombre en Configuración → Sonido.`);
          deviceId = match.id;
        }
        const ok = await api.audio.setDefault(deviceId!);
        return ok ? OK : fail(`No se pudo cambiar el audio a "${action.deviceName ?? deviceId}".`);
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
      case 'rgb-preset': {
        if (!action.rgbPresetId) return fail('Falta el ID del preset RGB.');
        const ok = await api.rgb.smartPreset(action.rgbPresetId);
        return ok ? OK : fail(`No se pudo aplicar el preset "${action.rgbPresetId}" (¿OpenRGB conectado?).`);
      }

      // 3.x — Window snap
      case 'window-snap': {
        if (!action.snapPosition) return fail('Falta la posición de snap.');
        const ok = await api.launch.snapWindow(action.snapPosition, action.snapProcessName);
        return ok ? OK : fail(`No se pudo snapear la ventana (¿proceso no encontrado?).`);
      }

      // 'script', 'folder' y 'branch' los maneja el caller
      default: return OK;
    }
  } catch (e) {
    return fail(`Error inesperado en ${actionLabel(action)}: ${(e as Error).message ?? e}`);
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
          if (!r2.ok) {
            res = fail(r2.error ?? 'El script terminó con error.');
          } else if (a.captureToVar && r2.output !== undefined) {
            res = { ok: true, stateUpdate: { [a.captureToVar]: r2.output.trim() } };
          } else {
            res = OK;
          }
        }
      } else if (a.type === 'folder') {
        res = OK;
      } else if (a.type === 'branch') {
        const varVal = merged[a.branchVar ?? ''] ?? '';
        const compareVal = interpolate(a.branchValue, merged);
        const condTrue = evaluateBranch(varVal, a.branchOp ?? '==', compareVal);
        const subActions = condTrue ? (a.branchThen ?? []) : (a.branchElse ?? []);
        if (subActions.length > 0) {
          const sub = await runActionSequence(subActions, api, { ...merged }, scriptHooks, rgbProfiles);
          Object.assign(merged, sub.stateUpdate);
          res = sub.ok ? OK : fail(sub.error ?? '');
        } else {
          res = OK;
        }
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
