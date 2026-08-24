// Config schema versioning + validation.
//
// Cada cambio de shape de DeckConfig debe incrementar CURRENT_CONFIG_VERSION
// y añadir un paso a `MIGRATIONS`. Configs antiguos cargan correctamente
// porque la cadena de migrate(v1 → v2 → ...) se aplica en orden.
import type { DeckConfig, ButtonAction, ButtonConfig, PageConfig } from '../types';

export const CURRENT_CONFIG_VERSION = 4;

export interface ValidationResult {
  ok: boolean;
  error?: string;
  config?: DeckConfig;
}

const ACTION_TYPES = new Set([
  'none', 'app', 'web', 'shortcut', 'script', 'audio-device', 'hotkey',
  'media-play-pause', 'media-next', 'media-prev', 'volume-up', 'volume-down',
  'mute', 'brightness', 'clipboard', 'type-text', 'kill-process',
  'volume-set', 'folder', 'notify',
  // 1.2 / 1.5 / 2.1
  'set-var', 'incr-var', 'webhook', 'tts', 'region-capture',
  // 2.x / 3.x / 4.x
  'rgb-color', 'rgb-mode', 'rgb-profile', 'rgb-preset',
  'window-snap', 'branch', 'countdown',
  // 5.x — media extendido + macros
  'media-shuffle', 'media-repeat', 'macro',
]);

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isAction(v: unknown): v is ButtonAction {
  if (!isObject(v)) return false;
  return typeof v.type === 'string' && ACTION_TYPES.has(v.type);
}

function isPage(v: unknown): v is PageConfig {
  if (!isObject(v)) return false;
  return typeof v.id === 'string' && typeof v.name === 'string';
}

function isButton(v: unknown): v is ButtonConfig {
  if (!isObject(v)) return false;
  if (typeof v.id !== 'string') return false;
  if (typeof v.page !== 'number') return false;
  if (typeof v.label !== 'string') return false;
  if (!isAction(v.action)) return false;
  return true;
}

/**
 * `t` entra como parametro porque este modulo es puro y no puede usar `useT()`.
 * Devolver la clave en vez del texto obligaria a quien llama a saber que unas
 * llevan el numero de pagina interpolado y otras no.
 */
export function validateConfig(raw: unknown, t: (k: string, v?: Record<string, string | number>) => string): ValidationResult {
  if (!isObject(raw)) return { ok: false, error: t('validate.notObject') };

  if (!Array.isArray(raw.pages)) return { ok: false, error: t('validate.missingPages') };
  if (raw.pages.length === 0) return { ok: false, error: t('validate.emptyPages') };
  for (let i = 0; i < raw.pages.length; i++) {
    if (!isPage(raw.pages[i])) return { ok: false, error: t('validate.badPage', { n: i + 1 }) };
  }

  if (!Array.isArray(raw.buttons)) return { ok: false, error: t('validate.missingButtons') };
  for (let i = 0; i < raw.buttons.length; i++) {
    if (!isButton(raw.buttons[i])) {
      return { ok: false, error: t('validate.badButton', { n: i + 1 }) };
    }
  }

  if (typeof raw.accent !== 'string') return { ok: false, error: t('validate.missingAccent') };
  if (typeof raw.wallpaper !== 'string') return { ok: false, error: t('validate.missingWallpaper') };

  // profiles y soundOnPress son opcionales — si vienen, deben tener tipos correctos.
  if (raw.profiles !== undefined && !Array.isArray(raw.profiles)) {
    return { ok: false, error: t('validate.badProfiles') };
  }
  if (raw.soundOnPress !== undefined && typeof raw.soundOnPress !== 'boolean') {
    return { ok: false, error: t('validate.badSound') };
  }

  return { ok: true, config: raw as unknown as DeckConfig };
}

// Cadena de migraciones. Cada entrada toma un config en versión N y lo lleva a N+1.
const MIGRATIONS: Array<{ from: number; to: number; apply: (c: any) => any }> = [
  {
    from: 1, to: 2,
    apply: (c) => {
      // v1 → v2: introducción del campo configVersion. No hay cambio estructural,
      // solo formaliza el shape para futuras migraciones.
      return { ...c, configVersion: 2 };
    },
  },
  {
    from: 2, to: 3,
    apply: (c) => {
      // v2 → v3: nuevos campos opcionales (widget, visibleIf, timerTriggerAt,
      // gridRows, uiScale, theme). No hay cambio estructural — solo sube versión.
      return { ...c, configVersion: 3 };
    },
  },
  {
    from: 3, to: 4,
    apply: (c) => {
      // v3 → v4: i18n + onboarding. Los usuarios EXISTENTES no deben ver el
      // tutorial (ya conocen la app); los nuevos sí.
      //
      // Distinguirlos por «tiene botones guardados» y no por «no trae el
      // campo». Una instalación virgen no tiene archivo, y `loadConfig`
      // devuelve `{}` para ese caso: un objeto sin `configVersion`, o sea
      // exactamente lo que esta cadena toma por un config de v1. Con
      // `?? true` esa migración marcaba el tutorial como visto **antes de
      // enseñarlo**, así que no se ha mostrado nunca desde que existe. Un
      // usuario de verdad siempre trae botones; el `{}` de una instalación
      // nueva no trae ninguno.
      const yaUsaba = Array.isArray(c.buttons) && c.buttons.length > 0;
      return {
        ...c,
        configVersion: 4,
        language: c.language ?? 'system',
        onboardingCompleted: c.onboardingCompleted ?? yaUsaba,
      };
    },
  },
];

export function migrateConfig(raw: any): any {
  if (!isObject(raw)) return raw;
  let current = raw;
  let version = typeof raw.configVersion === 'number' ? raw.configVersion : 1;
  while (version < CURRENT_CONFIG_VERSION) {
    const step = MIGRATIONS.find((m) => m.from === version);
    if (!step) break; // hueco en la cadena: cortar para no romper
    current = step.apply(current);
    version = step.to;
  }
  current.configVersion = version;
  return current;
}
