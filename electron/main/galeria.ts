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

export interface EntradaGaleria {
  id: string;
  label: string;
  author?: string;
  description?: string;
  url: string;
  tags?: string[];
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
export function resumirRiesgo(perfil: unknown): ResumenRiesgo {
  const botones = (perfil as { buttons?: Array<Record<string, unknown>> })?.buttons ?? [];
  const scripts: string[] = [];
  const programas: string[] = [];
  const atajosGlobales: string[] = [];
  const webhooks: string[] = [];
  const teclas: string[] = [];

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
  const mirar = (a: unknown, hondura = 0): void => {
    if (!a || typeof a !== 'object' || hondura > 8) return;
    const x = a as Record<string, any>;
    if (x.type === 'script' && x.script) scripts.push(String(x.script));
    if ((x.type === 'app' || x.type === 'shortcut') && (x.appPath || x.shortcutPath)) {
      programas.push(String(x.appPath ?? x.shortcutPath));
    }
    if (x.type === 'webhook' && x.webhookUrl) webhooks.push(String(x.webhookUrl));
    // Teclear tambien es ejecutar: `Win+R` y un comando abre lo que sea.
    if (x.type === 'hotkey' && x.hotkey) teclas.push(String(x.hotkey));
    if (x.type === 'type-text' && x.typeText) teclas.push(`"${String(x.typeText)}"`);
    if (x.type === 'macro' && Array.isArray(x.macroSteps)) {
      for (const paso of x.macroSteps) {
        const v = paso?.value;
        if (paso?.type === 'hotkey' || paso?.type === 'key') { if (v) teclas.push(String(v)); }
        else if (paso?.type === 'text' && v) teclas.push(`"${String(v)}"`);
      }
    }
    for (const clave of ['branchThen', 'branchElse', 'timerActions']) {
      for (const sub of (Array.isArray(x[clave]) ? x[clave] : [])) mirar(sub, hondura + 1);
    }
    // Los botones de una carpeta llevan su propia accion, y ahi cabe cualquier cosa.
    for (const fb of (Array.isArray(x.folderButtons) ? x.folderButtons : [])) mirar(fb?.action, hondura + 1);
  };

  for (const b of botones) {
    if (!b || typeof b !== 'object') continue;
    if (b.globalHotkey) atajosGlobales.push(String(b.globalHotkey));
    mirar(b.action);
    for (const a of (Array.isArray(b.actions) ? b.actions : [])) mirar(a);
    mirar(b.actionToggleOff);
    mirar(b.longPressAction);
  }
  return { botones: botones.length, scripts, programas, atajosGlobales, webhooks, teclas };
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
