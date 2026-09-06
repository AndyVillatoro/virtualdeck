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
  // Faltaba, y no era inocuo: un deck con botones ± de brillo o volumen
  // —cuatro de los presets sembrados lo son— se **rechazaba entero** al
  // importarlo, con un «botón N inválido» que no decía por qué.
  // `scripts/check-acciones.mjs` cruza ahora esta lista con `ActionType`.
  'adjust',
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

/**
 * Las dimensiones de rejilla que la interfaz sabe manejar.
 *
 * No es un detalle cosmetico: `conHuecosCompletos` crea `gridSize * gridRows`
 * botones por pagina. Medido con un `gridSize: 99` sin acotar, que es lo que
 * un archivo importado o editado a mano puede traer: **9801 botones** en una
 * sola pagina, contra 16 del control, y una rejilla de 99 columnas que no se
 * puede usar ni deshacer desde la interfaz.
 *
 * El acotado estaba escrito **solo dentro de la importacion de una pagina
 * suelta**. La importacion de la configuracion entera y la carga desde disco
 * no pasaban por ahi, asi que el mismo archivo hacia el mismo destrozo por
 * los otros dos caminos. Por eso vive aqui y lo usan los tres.
 */
const COLUMNAS = [3, 4, 5, 6];
const FILAS_MAX = 8;

export function sanearPagina(p: PageConfig): { pagina: PageConfig; tocada: boolean } {
  const cols = COLUMNAS.includes(Number(p.gridSize)) ? (Number(p.gridSize) as 3 | 4 | 5 | 6) : undefined;
  const filasCrudas = Number(p.gridRows);
  const filas = Number.isFinite(filasCrudas) && filasCrudas >= 1 && filasCrudas <= FILAS_MAX
    ? Math.round(filasCrudas) : undefined;
  // `undefined` es un valor legitimo en los dos: significa «la de por defecto».
  // Solo cuenta como tocada la pagina que traia algo y no valia.
  const tocada = (p.gridSize !== undefined && cols === undefined)
    || (p.gridRows !== undefined && filas === undefined);
  return { pagina: { ...p, gridSize: cols, gridRows: filas }, tocada };
}

/**
 * Repara la configuración que se lee del disco para que no tumbe la pantalla.
 *
 * `validateConfig` sirve para lo que **entra de fuera**: ahí rechazar es lo
 * correcto, porque hay un archivo bueno detrás. Para lo que ya está en disco
 * no vale, porque rechazar significaría tirar el trabajo del usuario.
 *
 * Y no hacer nada tampoco valía: un `pages` que no fuera un array reventaba el
 * primer `config.pages.map(...)`, React se desmontaba entero y quedaba **una
 * ventana en blanco**, sin un mensaje ni forma de llegar a los ajustes. Medido
 * con un `pages: "esto no es un array"`: `TypeError: config.pages.map is not a
 * function` y el `<div id="root">` vacío.
 *
 * Así que se arregla lo mínimo para poder arrancar y se dice qué se tocó. Lo
 * que estuviera bien se respeta: aquí no se descarta nada que se pueda usar.
 */
export function sanearConfig(raw: unknown): { config: Partial<DeckConfig>; reparado: string[] } {
  const reparado: string[] = [];
  const c = (isObject(raw) ? { ...raw } : {}) as Partial<DeckConfig> & Record<string, unknown>;
  if (!isObject(raw)) reparado.push('config');

  const utiles = Array.isArray(c.pages) ? c.pages.filter(isPage) : [];
  if (!Array.isArray(c.pages) || utiles.length !== c.pages.length) reparado.push('pages');
  // Una rejilla fuera de rango no invalida la pagina —los botones que tenga son
  // buenos— pero si se deja pasar crea miles de huecos. Se acota y se avisa.
  const saneadas = utiles.map(sanearPagina);
  const paginas = saneadas.map((x) => x.pagina);
  if (saneadas.some((x) => x.tocada) && !reparado.includes('pages')) reparado.push('pages');
  if (paginas.length === 0) {
    // Sin ninguna página utilizable no hay donde poner los botones. Se pone una
    // y los botones se reparten por posición, como en cualquier otra carga.
    c.pages = [{ id: 'main', name: 'Main' }];
    if (!reparado.includes('pages')) reparado.push('pages');
  } else {
    c.pages = paginas;
  }

  const botones = Array.isArray(c.buttons) ? c.buttons.filter(isButton) : [];
  if (!Array.isArray(c.buttons) || botones.length !== c.buttons.length) reparado.push('buttons');
  c.buttons = botones;

  return { config: c, reparado };
}
