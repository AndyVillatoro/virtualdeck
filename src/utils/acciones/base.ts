import type { ButtonAction, ElectronAPI, RGBProfile } from '../../types';
import type { TFunc } from '../i18n';

/**
 * Piezas compartidas por las familias de acciones.
 *
 * Están aquí y no en `utils/actions.ts` para romper el ciclo: `actions.ts`
 * importa el mapa de manejadores, y los manejadores necesitan `OK`, `fail` e
 * `interpolate`.
 */

export interface ActionResult {
  ok: boolean;
  error?: string;
  /** 1.2 — Mutación al estado global propuesta por la acción (set-var / incr-var). */
  stateUpdate?: Partial<Record<string, string>>;
}

export const OK: ActionResult = { ok: true };
export const fail = (error: string): ActionResult => ({ ok: false, error });

// 1.2 — Sustituye {nombre} por el valor en state. Útil en appArgs, url, script,
// clipboardText, typeText, webhookUrl, ttsText, etc. Si la variable no existe,
// se reemplaza por '' (no se rompe la cadena).
export function interpolate(template: string | undefined, state: Record<string, string> | undefined): string {
  if (!template) return '';
  if (!state) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => state[key] ?? '');
}

/** Todo lo que un manejador necesita para ejecutar una acción. */
export interface Contexto {
  action: ButtonAction;
  api: ElectronAPI;
  state?: Record<string, string>;
  rgbProfiles?: RGBProfile[];
  t: TFunc;
}

export type Manejador = (c: Contexto) => Promise<ActionResult> | ActionResult;

/** Nombre corto de la acción, para los mensajes de error y el registro. */
export function actionLabel(a: ButtonAction, t: TFunc): string {
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
