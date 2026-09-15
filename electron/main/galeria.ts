import { net } from 'electron';
import { tm } from './idioma';

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

export type TipoEntradaGaleria = 'profile' | 'page';

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

export async function manifiesto(url: string): Promise<{ ok: true; profiles: EntradaGaleria[] } | { ok: false; error: string }> {
  try {
    const j = await traerJson(url) as { profiles?: unknown };
    if (!Array.isArray(j?.profiles)) return { ok: false, error: tm('gal.badManifest') };
    const profiles = (j.profiles as EntradaGaleria[])
      .filter((p) => p && typeof p.id === 'string' && typeof p.url === 'string' && direccionAceptable(p.url))
      .map((p) => ({
        id: p.id, label: String(p.label ?? p.id), author: p.author ? String(p.author) : undefined,
        description: p.description ? String(p.description) : undefined,
        url: p.url, tags: Array.isArray(p.tags) ? p.tags.map(String) : undefined,
        kind: (p.kind === 'page' ? 'page' : undefined) as TipoEntradaGaleria | undefined,
        version: typeof p.version === 'string' ? p.version : undefined,
        minAppVersion: typeof p.minAppVersion === 'string' ? p.minAppVersion : undefined,
        targetApp: typeof p.targetApp === 'string' ? p.targetApp : undefined,
        requires: Array.isArray(p.requires) ? p.requires.map(String) : undefined,
      }));
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
  const teclas: string[] = [];
  const automaticos: string[] = [];
  const integraciones: string[] = [];

  /** Las cinco listas que se llenan al mirar acciones. */
  interface Colector {
    scripts: string[];
    programas: string[];
    webhooks: string[];
    teclas: string[];
    integraciones: string[];
  }
  const c: Colector = { scripts, programas, webhooks, teclas, integraciones };

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
  };

  /** Coordenada de un paso de macro que puede faltar. */
  const coord = (v: unknown): string => String(v ?? '?');

  /** Un paso suelto de macro. */
  const mirarPasoMacro = (paso: any, c: Colector): void => {
    if (!paso || typeof paso !== 'object') return;
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
    }
  };

  /** Pasos de macro: teclas, texto y también ratón (un clic ejecuta igual). */
  const mirarMacro = (x: Record<string, any>, c: Colector): void => {
    if (x.type !== 'macro' || !Array.isArray(x.macroSteps)) return;
    for (const paso of x.macroSteps) mirarPasoMacro(paso, c);
  };

  /** Efectos al pulsar que no son scripts, programas, red ni teclas. */
  const mirarIntegraciones = (x: Record<string, any>, c: Colector): void => {
    if (x.type === 'tts' && x.ttsText) c.integraciones.push(tm('gal.risk.voice', { texto: String(x.ttsText) }));
    if (x.type === 'kill-process' && x.processName) c.integraciones.push(tm('gal.risk.kill', { nombre: String(x.processName) }));
    if (x.type === 'clipboard' && x.clipboardText != null) c.integraciones.push(tm('gal.risk.clipboard', { n: String(String(x.clipboardText).length) }));
    if (x.type === 'audio-device' && (x.deviceId || x.deviceName)) c.integraciones.push(tm('gal.risk.audio', { nombre: String(x.deviceName ?? x.deviceId) }));
    if (x.type === 'region-capture') c.integraciones.push(tm('gal.risk.capture'));
    if (x.type === 'discord' && x.discordAction) c.integraciones.push(tm('gal.risk.discord', { accion: String(x.discordAction) }));
    if (x.type === 'spotify') c.integraciones.push(tm('gal.risk.spotify', { accion: String(x.spotifyAction ?? x.spotifyUri ?? tm('gal.risk.play')) }));
  };

  /** Acciones dentro de acciones: ramas, temporizador, carpetas y cuadrantes. */
  const mirarHijas = (x: Record<string, any>, hondura: number): void => {
    for (const clave of ['branchThen', 'branchElse', 'timerActions']) {
      for (const sub of (Array.isArray(x[clave]) ? x[clave] : [])) mirar(sub, hondura + 1);
    }
    // Los botones de una carpeta llevan su propia accion, y ahi cabe cualquier cosa.
    for (const fb of (Array.isArray(x.folderButtons) ? x.folderButtons : [])) mirar(fb?.action, hondura + 1);
    // Los cuadrantes 2×2 llevan sus propias acciones, con la misma libertad.
    for (const sb of (Array.isArray(x.subButtons) ? x.subButtons : [])) {
      if (!sb || typeof sb !== 'object') continue;
      mirar(sb.action, hondura + 1);
      for (const sub of (Array.isArray(sb.actions) ? sb.actions : [])) mirar(sub, hondura + 1);
      mirar(sb.actionToggleOff, hondura + 1);
      mirar(sb.longPressAction, hondura + 1);
    }
  };

  const mirar = (a: unknown, hondura = 0): void => {
    if (!a || typeof a !== 'object' || hondura > 8) return;
    const x = a as Record<string, any>;
    mirarDirectas(x, c);
    mirarMacro(x, c);
    mirarIntegraciones(x, c);
    mirarHijas(x, hondura);
  };

  /**
   * Lo propio de cada botón: sus acciones más lo que se dispara solo.
   * Un temporizador o un sensor ejecutan código sin que nadie pulse nada,
   * así que van en lista aparte (`automaticos`), no mezclados con el resto.
   */
  const mirarBoton = (b: unknown): void => {
    if (!b || typeof b !== 'object') return;
    const y = b as Record<string, any>;
    if (y.globalHotkey) atajosGlobales.push(String(y.globalHotkey));
    if (typeof y.timerTriggerAt === 'string' && y.timerTriggerAt) automaticos.push(tm('gal.risk.timer', { hora: y.timerTriggerAt }));
    const st = y.sensorTrigger;
    if (st && typeof st === 'object') automaticos.push(tm('gal.risk.sensor', { id: String(st.id ?? '?'), op: String(st.op ?? '?'), valor: String(st.value ?? '?') }));
    mirar(y.action);
    for (const a of (Array.isArray(y.actions) ? y.actions : [])) mirar(a);
    mirar(y.actionToggleOff);
    mirar(y.longPressAction);
  };

  for (const b of botones) mirarBoton(b);
  return { botones: botones.length, scripts, programas, atajosGlobales, webhooks, teclas, automaticos, integraciones };
}

export async function perfil(url: string): Promise<{ ok: true; perfil: unknown; riesgo: ResumenRiesgo } | { ok: false; error: string }> {
  try {
    const j = await traerJson(url);
    if (!j || typeof j !== 'object') return { ok: false, error: tm('gal.notObject') };
    return { ok: true, perfil: j, riesgo: resumirRiesgo(j) };
  } catch (e) {
    return { ok: false, error: String((e as Error).message ?? e) };
  }
}
