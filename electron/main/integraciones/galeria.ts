import { net } from 'electron';
import { tm, diasDeLaSemana } from '../sistema/idioma';
import { validarUuid, validarSha256 } from '../plugins/validacion';

/**
 * La galería de perfiles (6.1): traerse un perfil de una dirección.
 *
 * Va en el proceso principal por lo mismo que las divisas y el clima: la CSP
 * del renderer solo deja conectar con `self` y los dos servicios del tiempo, y
 * un `fetch` desde la interfaz no es que fallara, es que **tumbaba la ventana**.
 *
 * Un perfil descargado no son datos inertes: dentro hay botones que pueden
 * lanzar programas y ejecutar scripts. Aquí no se aplica nada — solo se trae y
 * se comprueba la forma — y quien decide es la persona, con la lista de lo que
 * ese perfil va a ejecutar delante (`resumirRiesgo`).
 */

/** Un perfil descargado no debería pasar de esto ni de lejos. */
const TOPE_BYTES = 2 * 1024 * 1024;
const MS_ESPERA = 10000;
/** Un README es texto para leer, no un deck: tope aparte y más chico. */
const TOPE_README = 64 * 1024;
/** Capturas por entrada: la ficha no muestra más y así un manifiesto no fuerza cien descargas. */
const MAX_CAPTURAS = 6;
/** SHA-256 en hex (64) y UUID de plugin (minúsculas, 3–101): sin los dos no hay instalación. */
// validación centralizada en `./plugins/validacion` (validarSha256 / validarUuid).

type TipoEntradaGaleria = 'profile' | 'page' | 'plugin';

export interface EntradaGaleria {
  id: string;
  label: string;
  author?: string;
  description?: string;
  url: string;
  tags?: string[];
  /** Tienda (T-P4): qué trae la url. Ausente = 'profile' (formato v1). */
  kind?: TipoEntradaGaleria;
  /** Versión del contenido (semver libre, ej. "1.2.0"). */
  version?: string;
  /** Versión mínima de VirtualDeck para instalarlo (ej. "0.12.0"). */
  minAppVersion?: string;
  /** App destino (ej. "obs64"): activa el auto-perfil si coincide. */
  targetApp?: string;
  /** Requisitos en texto libre (ej. "OBS instalado", "cuenta de Spotify"). */
  requires?: string[];
  /** Texto del autor para la ficha de la tienda (se muestra tal cual). */
  readme?: string;
  /** Dirección de un texto del autor (mismo filtro https que el resto). */
  readmeUrl?: string;
  /** Icono DOT (id del catálogo o nombre de glifo): no se pide nada por red. */
  icono?: string;
  /** Portada y capturas: solo https y nunca la propia máquina ni la red interna. */
  portada?: string;
  capturas?: string[];
  /** SHA-256 del ZIP (hex, 64). Obligatorio si `kind` es 'plugin'. */
  sha256?: string;
  /** UUID del plugin (el de su `manifest.json`). Obligatorio si `kind` es 'plugin'. */
  uuid?: string;
  /** Licencia en texto corto (ej. "MIT"): informativo. */
  license?: string;
}

/** Cuántas acciones de cada clase de las que preocupan trae un perfil. */
export interface ResumenRiesgo {
  botones: number;
  scripts: string[];
  programas: string[];
  atajosGlobales: string[];
  /** Direcciones a las que el perfil mandaria datos al pulsar un boton. */
  webhooks: string[];
  /** Lo que el perfil teclea o pulsa: atajos, texto y macros. Teclear es ejecutar. */
  teclas: string[];
  /** Direcciones que el perfil abre en el navegador al pulsar. */
  urls: string[];
  /** Disparadores que se ejecutan solos, sin pulsar: temporizadores y sensores. */
  automaticos: string[];
  /** Efectos al pulsar no cubiertos arriba: voz, cierre de apps, portapapeles, integraciones. */
  integraciones: string[];
}

/**
 * Solo `https`, y ninguna dirección que apunte a la propia máquina.
 *
 * Sin lo segundo, una entrada del manifiesto podría hacer que VirtualDeck
 * pidiera cosas a `127.0.0.1` o a la red interna en nombre del usuario — el
 * proceso principal no tiene CSP ni cortafuegos de navegador.
 */
function direccionAceptable(url: string): boolean {
  let u: URL;
  try { u = new URL(url); } catch { return false; }
  if (u.protocol !== 'https:') return false;
  const h = u.hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.localhost')) return false;
  if (/^127\./.test(h) || h === '::1' || h === '0.0.0.0') return false;
  if (/^10\./.test(h) || /^192\.168\./.test(h)) return false;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return false;
  if (/^169\.254\./.test(h)) return false;
  return true;
}

async function traerJson(url: string): Promise<unknown> {
  if (!direccionAceptable(url)) throw new Error(tm('gal.badUrl'));
  const res = await net.fetch(url, { signal: AbortSignal.timeout(MS_ESPERA) });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const texto = await res.text();
  // Se mide después de leer porque `Content-Length` puede faltar o mentir; el
  // tope está para que un archivo enorme no deje el proceso sin memoria.
  if (texto.length > TOPE_BYTES) throw new Error(tm('gal.tooBig'));
  return JSON.parse(texto);
}

/** Una fila del manifiesto que trae lo mínimo (id + url válida). */
function esFilaValida(p: EntradaGaleria): boolean {
  return !!p && typeof p.id === 'string' && typeof p.url === 'string' && direccionAceptable(p.url);
}

/**
 * Un plugin ejecuta código ajeno: sin SHA-256 y sin UUID no se instala, así
 * que ni se lista (ver `instalarDesdeUrl`).
 */
function traeRespaldoPlugin(p: EntradaGaleria): boolean {
  if (p.kind !== 'plugin') return true;
  return validarSha256(p.sha256) && validarUuid(p.uuid);
}

/** El tipo de la fila: lo desconocido es perfil (formato v1). */
function tipoDe(p: EntradaGaleria): TipoEntradaGaleria | undefined {
  if (p.kind === 'page') return 'page';
  if (p.kind === 'plugin') return 'plugin';
  return undefined;
}

/** SHA-256, UUID y licencia de una entrada de plugin, o nada si no es plugin. */
function respaldoPlugin(p: EntradaGaleria): Pick<EntradaGaleria, 'sha256' | 'uuid' | 'license'> {
  if (p.kind !== 'plugin') return {};
  return {
    sha256: validarSha256(p.sha256) ? p.sha256.toLowerCase() : undefined,
    uuid: validarUuid(p.uuid) ? p.uuid : undefined,
    license: typeof p.license === 'string' ? p.license.slice(0, 32) : undefined,
  };
}

/** La fila del manifiesto saneada, o `null` si no vale. */
function sanearEntrada(p: EntradaGaleria): EntradaGaleria | null {
  if (!esFilaValida(p) || !traeRespaldoPlugin(p)) return null;
  return {
    id: p.id, label: String(p.label ?? p.id), author: p.author ? String(p.author) : undefined,
    description: p.description ? String(p.description) : undefined,
    url: p.url, tags: Array.isArray(p.tags) ? p.tags.map(String) : undefined,
    kind: tipoDe(p),
    version: typeof p.version === 'string' ? p.version : undefined,
    minAppVersion: typeof p.minAppVersion === 'string' ? p.minAppVersion : undefined,
    targetApp: typeof p.targetApp === 'string' ? p.targetApp : undefined,
    requires: Array.isArray(p.requires) ? p.requires.map(String) : undefined,
    readme: typeof p.readme === 'string' ? p.readme.slice(0, TOPE_README) : undefined,
    readmeUrl: typeof p.readmeUrl === 'string' && direccionAceptable(p.readmeUrl) ? p.readmeUrl : undefined,
    icono: typeof p.icono === 'string' ? p.icono.slice(0, 64) : undefined,
    portada: typeof p.portada === 'string' && direccionAceptable(p.portada) ? p.portada : undefined,
    capturas: Array.isArray(p.capturas)
      ? p.capturas.filter((c): c is string => typeof c === 'string' && direccionAceptable(c)).slice(0, MAX_CAPTURAS)
      : undefined,
    ...respaldoPlugin(p),
  };
}

/**
 * Clave de una fila ya saneada para descartar repetidas: el uuid identifica
 * al plugin de verdad; el resto va por tipo e id.
 */
function claveDeFila(p: EntradaGaleria): string {
  if (p.kind === 'plugin' && p.uuid) return `plugin:${p.uuid}`;
  return `${p.kind ?? 'profile'}:${p.id}`;
}

export async function manifiesto(url: string): Promise<{ ok: true; profiles: EntradaGaleria[] } | { ok: false; error: string }> {
  try {
    const j = await traerJson(url) as { profiles?: unknown };
    if (!Array.isArray(j?.profiles)) return { ok: false, error: tm('gal.badManifest') };
    const profiles: EntradaGaleria[] = [];
    const vistas = new Set<string>();
    for (const p of (j.profiles as EntradaGaleria[])) {
      const entrada = sanearEntrada(p);
      if (!entrada) continue;
      // Un manifiesto puede traer la misma fila dos veces (basta con que al
      // publicarla se añada a una lista que ya la tenía). La primera manda y
      // el orden se respeta: la tienda enseña una tarjeta por cosa.
      const clave = claveDeFila(entrada);
      if (vistas.has(clave)) continue;
      vistas.add(clave);
      profiles.push(entrada);
    }
    return { ok: true, profiles };
  } catch (e) {
    return { ok: false, error: String((e as Error).message ?? e) };
  }
}

/**
 * Qué va a ejecutar este perfil, en una lista que se pueda leer.
 *
 * Es lo único que separa «importar un perfil» de «ejecutar código de un
 * desconocido cuando pulses un botón». No se resume ni se recorta: si trae
 * treinta scripts, se ven los treinta.
 */
function resumirRiesgo(perfil: unknown): ResumenRiesgo {
  const botones = (perfil as { buttons?: Array<Record<string, unknown>> })?.buttons ?? [];
  const scripts: string[] = [];
  const programas: string[] = [];
  const atajosGlobales: string[] = [];
  const webhooks: string[] = [];
  const urls: string[] = [];
  const teclas: string[] = [];
  const automaticos: string[] = [];
  const integraciones: string[] = [];

  /** Las listas que se llenan al mirar acciones. */
  interface Colector {
    scripts: string[];
    programas: string[];
    webhooks: string[];
    urls: string[];
    teclas: string[];
    integraciones: string[];
  }
  const c: Colector = { scripts, programas, webhooks, urls, teclas, integraciones };

  /**
   * Una accion puede llevar otras dentro, y hay que entrar en todas.
   *
   * Antes se miraban solo `action` y `actions`. Medido con un perfil de prueba
   * que llevaba dos scripts —uno suelto y otro dentro de un `countdown`—: se
   * enseñaba **uno**. O sea que bastaba con meter el script dentro de un
   * temporizador, una rama, una carpeta o la accion de mantener pulsado para
   * que no saliera en la lista. Y esa lista es lo unico que separa «importar un
   * perfil» de «ejecutar codigo de un desconocido».
   */
  /** Lo que una acción suelta ejecuta o abre, sin entrar en hijas. */
  const mirarDirectas = (x: Record<string, any>, c: Colector): void => {
    if (x.type === 'script' && x.script) c.scripts.push(String(x.script));
    if ((x.type === 'app' || x.type === 'shortcut') && (x.appPath || x.shortcutPath)) {
      c.programas.push(String(x.appPath ?? x.shortcutPath));
    }
    if (x.type === 'webhook' && x.webhookUrl) c.webhooks.push(String(x.webhookUrl));
    // Mandar sobre otro equipo tambien es salir a la red, y con un token dentro.
    if (x.type === 'remote' && x.remoteHost) c.webhooks.push(`${String(x.remoteHost)} (otro VirtualDeck)`);
    // Teclear tambien es ejecutar: `Win+R` y un comando abre lo que sea.
    if (x.type === 'hotkey' && x.hotkey) c.teclas.push(String(x.hotkey));
    if (x.type === 'type-text' && x.typeText) c.teclas.push(`"${String(x.typeText)}"`);
    // Abrir una dirección también es salir: con `file:` el sistema ejecuta lo
    // que tenga asociado. No cabía en `webhooks` porque esa lista es «a dónde
    // manda datos», y aquí no se manda nada: se abre.
    if (x.type === 'web' && x.url) c.urls.push(String(x.url));
  };

  /** Coordenada de un paso de macro que puede faltar. */
  const coord = (v: unknown): string => String(v ?? '?');

  /**
   * Los campos que el reproductor de macros intercala en un script.
   *
   * Van aquí todos, no solo los del tipo de paso que se esté mirando: el
   * `Start-Sleep` se emite para cualquier paso con `delayMs`, y las coordenadas
   * se leen en `click` y `move`.
   */
  const CAMPO_NUMERICO = ['delayMs', 'x', 'y', 'scrollY'];

  /** Un paso suelto de macro. */
  const mirarPasoMacro = (paso: any, c: Colector): void => {
    if (!paso || typeof paso !== 'object') return;
    // Un campo numérico que no es número no es una macro grabada: es un
    // intento de colar código en el script de PowerShell que genera el
    // reproductor (`delayMs: "1; Start-Process …"`). El motor ya lo acota, pero
    // el resumen de riesgos es lo único que ve la persona antes de instalar, y
    // un perfil que lleva eso dentro no es un perfil: es un ataque. Se dice.
    if (CAMPO_NUMERICO.some((k) => paso[k] !== undefined && typeof paso[k] !== 'number')) {
      c.integraciones.push(tm('gal.risk.macroNumerico'));
      return;
    }
    const v = paso.value;
    switch (paso.type) {
      case 'hotkey':
      case 'key':
        if (v) c.teclas.push(String(v));
        break;
      case 'text':
        if (v) c.teclas.push(`"${String(v)}"`);
        break;
      case 'click':
        c.teclas.push(tm('gal.risk.click', { x: coord(paso.x), y: coord(paso.y) }));
        break;
      case 'move':
        c.teclas.push(tm('gal.risk.move', { x: coord(paso.x), y: coord(paso.y) }));
        break;
      case 'scroll':
        c.teclas.push(tm('gal.risk.scroll', { n: coord(paso.scrollY) }));
        break;
      case 'delay':
        // Una pausa no hace nada por sí sola. Lo que sí puede llevar un payload
        // es el `delayMs` de **cualquier** paso —el `Start-Sleep` se emite para
        // todos ellos—, y eso es lo que se comprueba arriba, antes del switch.
        break;
    }
  };

  /** Pasos de macro: teclas, texto y también ratón (un clic ejecuta igual). */
  const mirarMacro = (x: Record<string, any>, c: Colector): void => {
    if (x.type !== 'macro' || !Array.isArray(x.macroSteps)) return;
    for (const paso of x.macroSteps) mirarPasoMacro(paso, c);
  };

  /** Efectos al pulsar sobre el equipo: voz, procesos, portapapeles, audio y capturas. */
  const mirarEfectos = (x: Record<string, any>, c: Colector): void => {
    if (x.type === 'tts' && x.ttsText) c.integraciones.push(tm('gal.risk.voice', { texto: String(x.ttsText) }));
    if (x.type === 'kill-process' && x.processName) c.integraciones.push(tm('gal.risk.kill', { nombre: String(x.processName) }));
    if (x.type === 'clipboard' && x.clipboardText != null) c.integraciones.push(tm('gal.risk.clipboard', { n: String(String(x.clipboardText).length) }));
    if (x.type === 'audio-device' && (x.deviceId || x.deviceName)) c.integraciones.push(tm('gal.risk.audio', { nombre: String(x.deviceName ?? x.deviceId) }));
    if (x.type === 'region-capture') c.integraciones.push(tm('gal.risk.capture'));
  };

  /** Integraciones de terceros y plugins: lo que se enchufa al botón. */
  const mirarIntegraciones = (x: Record<string, any>, c: Colector): void => {
    if (x.type === 'discord' && x.discordAction) c.integraciones.push(tm('gal.risk.discord', { accion: String(x.discordAction) }));
    if (x.type === 'spotify') c.integraciones.push(tm('gal.risk.spotify', { accion: String(x.spotifyAction ?? x.spotifyUri ?? tm('gal.risk.play')) }));
    // Un plugin **es** código de un desconocido, y lo que hace al pulsarlo no
    // está en el perfil: no se puede ni resumir ni leer antes de aceptarlo. Va
    // con los scripts —la lista que se enseña en rojo, la de «esto ejecuta
    // cosas»— y no con las integraciones, porque aquí la diferencia entre una
    // macro y un plugin es de grado, no de letra.
    if (x.type === 'plugin' && x.plugin) c.scripts.push(tm('gal.risk.plugin', { plugin: String(x.plugin.pluginUuid ?? '?') }));
  };

  // Tope de nodos recorridos: un perfil puede anidar acciones sin límite, y
  // antes el tope de profundidad (8) ocultaba lo que quedaba por debajo. Ahora
  // se recorre con una pila y, si se supera el tope, se considera riesgo
  // máximo (no importable) en vez de silenciarlo.
  const MAX_NODOS_RIESGO = 20000;
  let nodosRiesgo = 0;
  let riesgoExcedido = false;

  /** Encola las hijas de una acción (ramas, temporizador, carpeta, cuadrantes). */
  const encolarSubButton = (s: unknown, pila: Array<unknown>): void => {
    if (!s || typeof s !== 'object') return;
    const o = s as Record<string, any>;
    if (o.action) pila.push(o.action);
    if (Array.isArray(o.actions)) for (const sub of o.actions) pila.push(sub);
    if (o.actionToggleOff) pila.push(o.actionToggleOff);
    if (o.longPressAction) pila.push(o.longPressAction);
  };

  const encolarHijas = (x: Record<string, any>, pila: Array<unknown>): void => {
    for (const clave of ['branchThen', 'branchElse', 'timerActions']) {
      const arr = Array.isArray(x[clave]) ? x[clave] : [];
      for (const sub of arr) pila.push(sub);
    }
    const fb = Array.isArray(x.folderButtons) ? x.folderButtons : [];
    for (const f of fb) {
      if (f && typeof f === 'object' && (f as Record<string, any>).action) {
        pila.push((f as Record<string, any>).action);
      }
    }
    const sb = Array.isArray(x.subButtons) ? x.subButtons : [];
    for (const s of sb) encolarSubButton(s, pila);
  };

  const encolarModosPerilla = (y: Record<string, any>, pila: Array<unknown>): void => {
    if (!Array.isArray(y.modosPerilla)) return;
    for (const m of y.modosPerilla) {
      if (!m || typeof m !== 'object') continue;
      const mo = m as Record<string, any>;
      if (mo.izq) pila.push(mo.izq);
      if (mo.der) pila.push(mo.der);
    }
  };

  const procesarBoton = (y: Record<string, any>, pila: Array<unknown>): void => {
    if (!y || typeof y !== 'object') return;
    if (y.globalHotkey) atajosGlobales.push(String(y.globalHotkey));
    mirarTimer(y);
    const st = y.sensorTrigger;
    if (st && typeof st === 'object') {
      automaticos.push(tm('gal.risk.sensor', { id: String(st.id ?? '?'), op: String(st.op ?? '?'), valor: String(st.value ?? '?') }));
    }
    if (y.action) pila.push(y.action);
    if (Array.isArray(y.actions)) for (const a of y.actions) pila.push(a);
    if (y.actionToggleOff) pila.push(y.actionToggleOff);
    if (y.longPressAction) pila.push(y.longPressAction);
    encolarModosPerilla(y, pila);
  };

  const procesarAccion = (x: Record<string, any>, pila: Array<unknown>): void => {
    mirarDirectas(x, c);
    mirarMacro(x, c);
    mirarEfectos(x, c);
    mirarIntegraciones(x, c);
    encolarHijas(x, pila);
  };

  const pila: Array<unknown> = [];
  for (const b of botones) pila.push({ __boton__: true, b });

  while (pila.length > 0 && !riesgoExcedido) {
    const item = pila.pop();
    nodosRiesgo++;
    if (nodosRiesgo > MAX_NODOS_RIESGO) { riesgoExcedido = true; break; }
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, any>;
    if (o.__boton__) { procesarBoton(o.b as Record<string, any>, pila); continue; }
    procesarAccion(o, pila);
  }

  if (riesgoExcedido) {
    throw new Error(tm('gal.risk.tooManyNodes'));
  }

  /**
   * El disparo programado: la hora y, si el perfil los trae, los días elegidos
   * (`timerTriggerDias`, números de `Date.getDay()`).
   */
  function mirarTimer(y: Record<string, any>): void {
    if (typeof y.timerTriggerAt !== 'string' || !y.timerTriggerAt) return;
    const dias = Array.isArray(y.timerTriggerDias)
      ? (y.timerTriggerDias as unknown[]).filter((d): d is number => typeof d === 'number')
      : [];
    if (dias.length === 0) {
      automaticos.push(tm('gal.risk.timer', { hora: y.timerTriggerAt }));
      return;
    }
    automaticos.push(tm('gal.risk.timerDias', { hora: y.timerTriggerAt, dias: diasDeLaSemana(dias) }));
  }

  /**
   * Lo propio de cada botón: sus acciones más lo que se dispara solo.
   * Un temporizador o un sensor ejecutan código sin que nadie pulse nada,
   * así que van en lista aparte (`automaticos`), no mezclados con el resto.
   */
  // Los botones ya se procesaron arriba (pila sembrada con `__boton__`).
  return { botones: botones.length, scripts, programas, atajosGlobales, webhooks, urls, teclas, automaticos, integraciones };
}

/**
 * Riesgo de una entrada de plugin de la tienda (manifiesto v3).
 *
 * Un plugin **es** código de un desconocido y lo que hace al pulsar no está
 * en el manifiesto: no se puede resumir ni leer antes de aceptar. Se enseña
 * la misma línea que un botón con acción de plugin (`gal.risk.plugin`).
 */
export function resumirRiesgoPlugin(entrada: EntradaGaleria): ResumenRiesgo {
  const quien = typeof entrada.uuid === 'string' && entrada.uuid ? entrada.uuid : entrada.id;
  return {
    botones: 0,
    scripts: [tm('gal.risk.plugin', { plugin: String(quien) })],
    programas: [],
    atajosGlobales: [],
    webhooks: [],
    urls: [],
    teclas: [],
    automaticos: [],
    integraciones: [],
  };
}

/** 32 bytes en base64 (icono 16×16) y origen de uno de los dos catálogos. */
const BITS_CATALOGO = /^[A-Za-z0-9+/]{43}=$/;
const ORIGENES_CATALOGO = /^(marcas|acciones):/;

/** Un cuadrante 2×2 con `iconoPuntos` válido, o sin el campo. */
function sanearIconoPuntosCuadrante(s: unknown): void {
  if (!s || typeof s !== 'object') return;
  const o = s as Record<string, any>;
  const ip = o.iconoPuntos;
  if (ip === undefined) return;
  const ok = ip && typeof ip === 'object'
    && typeof ip.bits === 'string' && BITS_CATALOGO.test(ip.bits)
    && typeof ip.origen === 'string' && ORIGENES_CATALOGO.test(ip.origen);
  if (!ok) delete o.iconoPuntos;
}

/**
 * Un perfil viene de un desconocido: su icono de catálogo en los cuadrantes
 * (roadmap 93) solo se acepta con la forma que el pintor sabe dibujar. Lo que
 * no cuadre se quita, como si el cuadrante no lo trajera.
 */
function sanearCuadrantesDePerfil(perfil: unknown): void {
  const botones = (perfil as { buttons?: unknown })?.buttons;
  if (!Array.isArray(botones)) return;
  for (const b of botones) {
    if (!b || typeof b !== 'object') continue;
    const subs = (b as { subButtons?: unknown }).subButtons;
    if (!Array.isArray(subs)) continue;
    for (const s of subs) sanearIconoPuntosCuadrante(s);
  }
}

export async function perfil(url: string): Promise<{ ok: true; perfil: unknown; riesgo: ResumenRiesgo } | { ok: false; error: string }> {
  try {
    const j = await traerJson(url);
    if (!j || typeof j !== 'object') return { ok: false, error: tm('gal.notObject') };
    sanearCuadrantesDePerfil(j);
    return { ok: true, perfil: j, riesgo: resumirRiesgo(j) };
  } catch (e) {
    return { ok: false, error: String((e as Error).message ?? e) };
  }
}

/**
 * El README de una entrada (`readmeUrl`): texto plano para la ficha.
 * Pasa por el mismo filtro de direcciones que el resto —un manifiesto
 * ajeno no puede hacer que la app lea la red interna— y se corta al tope.
 */
export async function leerTexto(url: string): Promise<{ ok: true; texto: string } | { ok: false; error: string }> {
  try {
    if (!direccionAceptable(url)) throw new Error(tm('gal.badUrl'));
    const res = await net.fetch(url, { signal: AbortSignal.timeout(MS_ESPERA) });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const texto = await res.text();
    return { ok: true, texto: texto.slice(0, TOPE_README) };
  } catch (e) {
    return { ok: false, error: String((e as Error).message ?? e) };
  }
}
