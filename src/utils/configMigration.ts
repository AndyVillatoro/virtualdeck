// Config schema versioning + validation.
//
// Cada cambio de shape de DeckConfig debe incrementar CURRENT_CONFIG_VERSION
// y añadir un paso a `MIGRATIONS`. Configs antiguos cargan correctamente
// porque la cadena de migrate(v1 → v2 → ...) se aplica en orden.
import type { DeckConfig, ButtonAction, ButtonConfig, PageConfig } from '../types';

export const CURRENT_CONFIG_VERSION = 8;

export interface ValidationResult {
  ok: boolean;
  error?: string;
  config?: DeckConfig;
}

const ACTION_TYPES = new Set([
  'none', 'app', 'web', 'shortcut', 'script', 'audio-device', 'hotkey',
  'media-play-pause', 'media-next', 'media-prev', 'volume-up', 'volume-down',
  'mute', 'brightness', 'clipboard', 'type-text', 'kill-process',
  'volume-set', 'folder', 'page-nav', 'notify',
  // 1.2 / 1.5 / 2.1
  'set-var', 'incr-var', 'webhook', 'remote', 'tts', 'region-capture',
  // 2.x / 3.x / 4.x
  'rgb-color', 'rgb-mode', 'rgb-profile', 'rgb-preset',
  'window-snap', 'window-cycle', 'branch', 'countdown',
  // 5.x — media extendido + macros
  'media-shuffle', 'media-repeat', 'macro',
  // Faltaba, y no era inocuo: un deck con botones ± de brillo o volumen
  // —cuatro de los presets sembrados lo son— se **rechazaba entero** al
  // importarlo, con un «botón N inválido» que no decía por qué.
  // `scripts/check-acciones.mjs` cruza ahora esta lista con `ActionType`.
  'adjust',
  'mobile-remote',
  // 5.0 — Terceros
  'discord',
  'spotify',
  // Volumen de una app (roadmap 63).
  'app-volume',
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
type MapaSuperficies = Record<string, { brillo?: number; rotacion?: number }>;

/**
 * v4 → v5, fuera de la tabla para no sumar complejidad al `apply`.
 *
 * El brillo y el giro se copiaban en cada página del mismo serial; ahora
 * viven en un mapa por serial en la raíz. Se toma el de la primera página de
 * cada serial que lo diga y se quita de todas las páginas.
 *
 * Idempotente a propósito: quien probó la rama de docks ya tiene docks, y
 * migrar dos veces no puede cambiar nada la segunda. Si el mapa ya trae un
 * valor para un serial, manda el del mapa y las páginas solo se limpian.
 */
function migrarSuperficiesPorSerial(
  paginas: any[], previo: unknown,
): { mapa: MapaSuperficies; limpias: any[] } {
  const mapa: MapaSuperficies = { ...((previo ?? {}) as MapaSuperficies) };
  const vistos = new Set<string>();
  for (const p of paginas) {
    const serial = p?.superficie?.serial;
    if (typeof serial !== 'string' || serial === '' || vistos.has(serial)) continue;
    vistos.add(serial);
    const primera = paginas.find((q) => q?.superficie?.serial === serial);
    const ya = mapa[serial] ?? {};
    mapa[serial] = {
      ...ya,
      ...(ya.brillo === undefined && typeof primera?.superficie?.brillo === 'number'
        ? { brillo: primera.superficie.brillo } : {}),
      ...(ya.rotacion === undefined && typeof primera?.superficie?.rotacion === 'number'
        ? { rotacion: primera.superficie.rotacion } : {}),
    };
    if (Object.keys(mapa[serial]).length === 0) delete mapa[serial];
  }
  const limpias = paginas.map((p) => {
    if (!p?.superficie || !('brillo' in p.superficie) && !('rotacion' in p.superficie)) return p;
    const { brillo: _b, rotacion: _r, ...resto } = p.superficie;
    return { ...p, superficie: resto };
  });
  return { mapa, limpias };
}
/**
 * v5 → v6: emojis y símbolos sueltos a su glifo DOT 8×8.
 *
 * `null` = sin equivalente razonable: se quita el `icon` para que el botón
 * caiga al icono de su tipo, que desde esta versión también es DOT
 * (`GLIFO_POR_TIPO_ACCION`). Lo que no está en la tabla no se toca: quitar un
 * icono que no se entiende destruye trabajo del usuario sin darle nada.
 *
 * Vive aquí y no reutiliza `resolveDotGlyph` porque `src/utils` no puede
 * importar de `src/components` (regla `utils-no-ui` de depcruise).
 */
const ICONOS_A_DOT: Record<string, string | null> = {
  // Inventario T-UI-01 sobre la config real del dueño.
  '🎬': 'PLAY',
  '💼': null,
  '🌈': 'SPARKLE',
  '🌙': null,
  '🚨': 'WARN',
  '🔴': null,
  // Símbolos sueltos que caían a la fuente de puntos.
  '○': 'DOTS',
  '◯': 'DOTS',
  '◈': 'DOTS',
  '●': 'SPARKLE',
  '◉': 'SPARKLE',
  '◐': 'SPARKLE',
  '◎': 'DOTS',
  '⊞': 'ADD',
  '⊟': 'SUBTRACT',
  '⊕': 'ADD',
  '∿': 'AUDIO_WAVE',
  '−': 'SUBTRACT',
  '↺': 'UNDO',
  '↻': 'ROTATE_CW',
  '↗': 'EXPORT',
  '▶': 'PLAY',
  '▲': 'ARROW_UP',
  '◻': 'FULLSCREEN',
  // Otros emojis habituales con equivalente obvio.
  '⚙': 'GEAR',
  '🔊': 'SPEAKER',
  '🎵': 'AUDIO_WAVE',
  '🎶': 'AUDIO_WAVE',
  '🎙': 'MIC',
  '📁': 'FOLDER',
  '🔔': 'BELL',
  '⏰': 'CLOCK',
  '⭐': 'SPARKLE',
  '✨': 'SPARKLE',
  '🔒': 'LOCK',
  '♥': 'HEART',
  '⚡': 'BOLT',
  '❄': 'WEATHER_SNOW',
  '☀': 'WEATHER_SUN',
  '🌧': 'WEATHER_RAIN',
  '🌐': 'WEB',
  '💻': 'TERMINAL',
  '💾': 'STORAGE',
  '✂': 'SCISSORS',
  '⚠': 'WARN',
  '✓': 'CHECK',
  '✅': 'CHECK',
  '✕': 'CLOSE',
  '❌': 'CLOSE',
  '🗑': 'TRASH',
  '❓': 'HELP',
  '❔': 'HELP',
};

/** Pasa `obj.icon` por la tabla. Devuelve true si lo cambió o lo quitó. */
function pasaIconoADot(obj: any): boolean {
  if (!isObject(obj) || typeof obj.icon !== 'string') return false;
  const clave = obj.icon.trim();
  let equiv: string | null | undefined;
  if (clave in ICONOS_A_DOT) {
    equiv = ICONOS_A_DOT[clave];
  } else {
    // El mismo emoji con o sin selector de variante (U+FE0E/U+FE0F): '⚙' + VS16.
    const sinVariante = clave.replace(/[\uFE0E\uFE0F]/g, '');
    if (sinVariante !== clave && sinVariante in ICONOS_A_DOT) equiv = ICONOS_A_DOT[sinVariante];
    else return false;
  }
  if (equiv === null) delete obj.icon;
  else obj.icon = equiv;
  return true;
}

/** Los `folderButtons` y sub-acciones anidadas también llevan `icon`. */
function pasaAccionADot(a: any): void {
  if (!isObject(a)) return;
  for (const clave of ['branchThen', 'branchElse', 'timerActions', 'actions']) {
    if (Array.isArray(a[clave])) for (const sub of a[clave]) pasaAccionADot(sub);
  }
  if (Array.isArray(a.folderButtons)) for (const fb of a.folderButtons) pasaIconoADot(fb);
  pasaAccionADot(a.actionToggleOff);
  pasaAccionADot(a.longPressAction);
}

/**
 * El `iconoPuntos` de un cuadrante 2×2 (roadmap 93): 32 bytes en base64 y un
 * origen de los dos catálogos. Lo que no cuadre se quita: un perfil importado
 * no puede dejar bits arbitrarios dentro de la configuración.
 */
const BITS_CATALOGO = /^[A-Za-z0-9+/]{43}=$/;
const ORIGENES_CATALOGO = /^(marcas|acciones):/;

function sanearIconoPuntosCuadrante(s: any): void {
  if (!isObject(s) || s.iconoPuntos === undefined) return;
  const ip = s.iconoPuntos;
  const ok = isObject(ip)
    && typeof ip.bits === 'string' && BITS_CATALOGO.test(ip.bits)
    && typeof ip.origen === 'string' && ORIGENES_CATALOGO.test(ip.origen);
  if (!ok) delete s.iconoPuntos;
}

function pasaBotonADot(b: any): void {
  if (!isObject(b)) return;
  pasaIconoADot(b);
  if (Array.isArray(b.subButtons)) {
    for (const s of b.subButtons) {
      if (!isObject(s)) continue;
      sanearIconoPuntosCuadrante(s);
      pasaIconoADot(s);
      pasaAccionADot(s.action);
      if (Array.isArray(s.actions)) for (const sub of s.actions) pasaAccionADot(sub);
      pasaAccionADot(s.actionToggleOff);
      pasaAccionADot(s.longPressAction);
    }
  }
  pasaAccionADot(b.action);
  if (Array.isArray(b.actions)) for (const sub of b.actions) pasaAccionADot(sub);
  pasaAccionADot(b.actionToggleOff);
  pasaAccionADot(b.longPressAction);
}
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
  {
    from: 4, to: 5,
    apply: (c) => {
      // v4 → v5: brillo y giro del dock por dispositivo, no por página (ver
      // `migrarSuperficiesPorSerial`: idempotente, el mapa previo manda).
      // Sin `pages` no se inventa un `[]`: `App` rellena con `s.pages || PAGES_DEFAULT`
      // y un array vacío pasaría como válido, dejando el deck sin páginas.
      if (!Array.isArray(c.pages)) return { ...c, configVersion: 5 };
      const { mapa, limpias } = migrarSuperficiesPorSerial(c.pages, c.superficies);
      return { ...c, configVersion: 5, pages: limpias, superficies: mapa };
    },
  },
  {
    from: 5, to: 6,
    apply: (c) => {
      // v5 → v6: emojis y símbolos sueltos a glifos DOT (ver `ICONOS_A_DOT`).
      // Idempotente: lo ya DOT no está en la tabla y no se toca; lo quitado
      // sigue ausente. Sin `buttons` no hay nada que migrar.
      if (!Array.isArray(c.buttons)) return { ...c, configVersion: 6 };
      for (const b of c.buttons) pasaBotonADot(b);
      return { ...c, configVersion: 6 };
    },
  },
  {
    from: 6, to: 7,
    apply: (c) => {
      // v6 → v7: `pinned` (7.4, proyección global en todas las páginas) se
      // unifica en `fijo` (T-HW-12, por grupo: el deck y cada dock por su
      // lado, y llega a la tecla física). `pinned: true` → `fijo: true` y se
      // quita `pinned`.
      // Idempotente: lo ya migrado no trae `pinned` y no se toca; pasar dos
      // veces no cambia nada la segunda.
      // Si en un mismo grupo dos botones quedan fijos en el mismo hueco, gana
      // el primero en el orden de `config.pages` (es la regla de
      // `botonesFijos.ts`): la migración no reordena ni desmarca nada, la
      // resolución ya lo decide al pintar y al disparar.
      if (!Array.isArray(c.buttons)) return { ...c, configVersion: 7 };
      for (const b of c.buttons) {
        if (!isObject(b)) continue;
        if ((b as { pinned?: unknown }).pinned) (b as { fijo?: boolean }).fijo = true;
        delete (b as { pinned?: unknown }).pinned;
      }
      return { ...c, configVersion: 7 };
    },
  },
  {
    from: 7, to: 8,
    apply: (c) => {
      // v7 → v8: el tema «DOT/480» (OLED, acento rojo) se fundió en «oscuro»,
      // que ahora es esa misma paleta OLED. Quien lo tenía conserva el aspecto:
      // pasa a `dark` y, si no había elegido acento propio (vacío o el azul de
      // fábrica), se le fija el rojo que ese tema traía de serie.
      // Idempotente: sin `theme: 'dot480'` no se toca nada.
      if (c.theme !== 'dot480') return { ...c, configVersion: 8 };
      const sinAcentoPropio = !c.accent || String(c.accent).toLowerCase() === '#4a8ef0';
      return { ...c, configVersion: 8, theme: 'dark', ...(sinAcentoPropio ? { accent: '#ff3b30' } : {}) };
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
  // `{}` es «no hay archivo», que es normal. Lo que no lo es: un archivo que
  // existe y no contiene un objeto.
  if (!isObject(raw) && raw !== undefined && raw !== null) reparado.push('config');

  // **Ausente no es roto.** Una instalacion nueva no tiene archivo y `loadConfig`
  // devuelve `{}`: sin esta distincion, el primer arranque de todo el mundo
  // saludaba con «la configuracion venia con la forma dañada». Solo se avisa de
  // lo que estaba **presente y mal**, que es lo unico que el usuario puede haber
  // perdido.
  const traiaPaginas = c.pages !== undefined;
  const traiaBotones = c.buttons !== undefined;

  const utiles = Array.isArray(c.pages) ? c.pages.filter(isPage) : [];
  if (traiaPaginas && (!Array.isArray(c.pages) || utiles.length !== c.pages.length)) reparado.push('pages');
  // Una rejilla fuera de rango no invalida la pagina —los botones que tenga son
  // buenos— pero si se deja pasar crea miles de huecos. Se acota y se avisa.
  const saneadas = utiles.map(sanearPagina);
  const paginas = saneadas.map((x) => x.pagina);
  if (saneadas.some((x) => x.tocada) && !reparado.includes('pages')) reparado.push('pages');
  if (paginas.length === 0) {
    // Sin ninguna página utilizable no hay donde poner los botones. Se pone una
    // y los botones se reparten por posición, como en cualquier otra carga.
    c.pages = [{ id: 'main', name: 'Main' }];
    if (traiaPaginas && !reparado.includes('pages')) reparado.push('pages');
  } else {
    c.pages = paginas;
  }

  const botones = Array.isArray(c.buttons) ? c.buttons.filter(isButton) : [];
  if (traiaBotones && (!Array.isArray(c.buttons) || botones.length !== c.buttons.length)) reparado.push('buttons');
  c.buttons = botones;

  return { config: c, reparado };
}

/**
 * Los tipos de accion de un perfil que la aplicacion **no sabe ejecutar**.
 *
 * La galeria no pasaba por `validateConfig` —solo miraba que `pages` y
 * `buttons` fueran listas— aunque la documentacion dijera que si. Un perfil
 * con un tipo inventado se importaba entero y sus botones fallaban al
 * pulsarlos, uno por uno, sin que nada lo hubiera avisado antes. El propio
 * ejemplo que venia en el repositorio traia dos (`media-play` y `volume-mute`,
 * que no existen).
 *
 * Devuelve la lista sin repetidos, para poder decir **cuales** son.
 *
 * De paso sanea el `iconoPuntos` de los cuadrantes 2×2: esta función es el
 * único punto por el que pasa un perfil importado antes de aplicarse —la
 * galería y la tienda la llaman—, así que aquí se quita el icono de catálogo
 * que no tenga la forma que el pintor sabe dibujar (roadmap 93).
 */
export function tiposDesconocidos(botones: unknown): string[] {
  if (!Array.isArray(botones)) return [];
  const malos = new Set<string>();
  const mirar = (a: unknown) => {
    if (!isObject(a)) return;
    if (typeof a.type === 'string' && !ACTION_TYPES.has(a.type)) malos.add(a.type);
    // Las anidadas cuentan igual: una rama o un temporizador con un tipo
    // inventado falla del mismo modo, solo que mas tarde.
    for (const clave of ['branchThen', 'branchElse', 'timerActions']) {
      for (const sub of (Array.isArray(a[clave]) ? a[clave] as unknown[] : [])) mirar(sub);
    }
    // Carpetas y cuadrantes 2×2 llevan acciones propias (misma paridad que
    // `resumirRiesgo` en electron/main/galeria.ts).
    for (const fb of (Array.isArray(a.folderButtons) ? a.folderButtons as unknown[] : [])) {
      if (isObject(fb)) mirar(fb.action);
    }
    for (const sb of (Array.isArray(a.subButtons) ? a.subButtons as unknown[] : [])) {
      if (!isObject(sb)) continue;
      sanearIconoPuntosCuadrante(sb);
      mirar(sb.action);
      for (const sub of (Array.isArray(sb.actions) ? sb.actions as unknown[] : [])) mirar(sub);
      mirar(sb.actionToggleOff);
      mirar(sb.longPressAction);
    }
  };
  for (const b of botones) {
    if (!isObject(b)) continue;
    mirar(b.action);
    for (const a of (Array.isArray(b.actions) ? b.actions as unknown[] : [])) mirar(a);
    mirar(b.actionToggleOff);
    mirar(b.longPressAction);
    // Los cuadrantes 2×2 viven en el botón, no en la acción.
    for (const sb of (Array.isArray(b.subButtons) ? b.subButtons as unknown[] : [])) {
      if (!isObject(sb)) continue;
      sanearIconoPuntosCuadrante(sb);
      mirar(sb.action);
      for (const a of (Array.isArray(sb.actions) ? sb.actions as unknown[] : [])) mirar(a);
      mirar(sb.actionToggleOff);
      mirar(sb.longPressAction);
    }
  }
  return [...malos];
}
