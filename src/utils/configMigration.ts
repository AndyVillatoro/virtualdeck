// Config schema versioning + validation.
//
// Cada cambio de shape de DeckConfig debe incrementar CURRENT_CONFIG_VERSION
// y añadir un paso a `MIGRATIONS`. Configs antiguos cargan correctamente
// porque la cadena de migrate(v1 → v2 → ...) se aplica en orden.
import type { DeckConfig, ButtonAction, ButtonConfig, PageConfig } from '../types';

export const CURRENT_CONFIG_VERSION = 2;

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

export function validateConfig(raw: unknown): ValidationResult {
  if (!isObject(raw)) return { ok: false, error: 'El archivo no contiene un objeto JSON válido.' };

  if (!Array.isArray(raw.pages)) return { ok: false, error: 'Falta el campo "pages" (array).' };
  if (raw.pages.length === 0) return { ok: false, error: '"pages" no puede estar vacío.' };
  for (let i = 0; i < raw.pages.length; i++) {
    if (!isPage(raw.pages[i])) return { ok: false, error: `Página #${i + 1} con shape inválido (falta id/name).` };
  }

  if (!Array.isArray(raw.buttons)) return { ok: false, error: 'Falta el campo "buttons" (array).' };
  for (let i = 0; i < raw.buttons.length; i++) {
    if (!isButton(raw.buttons[i])) {
      return { ok: false, error: `Botón #${i + 1} con shape inválido (falta id/page/label/action).` };
    }
  }

  if (typeof raw.accent !== 'string') return { ok: false, error: 'Falta el campo "accent" (color hex).' };
  if (typeof raw.wallpaper !== 'string') return { ok: false, error: 'Falta el campo "wallpaper".' };

  // profiles y soundOnPress son opcionales — si vienen, deben tener tipos correctos.
  if (raw.profiles !== undefined && !Array.isArray(raw.profiles)) {
    return { ok: false, error: '"profiles" debe ser un array.' };
  }
  if (raw.soundOnPress !== undefined && typeof raw.soundOnPress !== 'boolean') {
    return { ok: false, error: '"soundOnPress" debe ser booleano.' };
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
