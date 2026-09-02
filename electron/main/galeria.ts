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
  const botones = (perfil as { buttons?: Array<{ action?: Record<string, unknown>; actions?: Array<Record<string, unknown>>; globalHotkey?: string }> })?.buttons ?? [];
  const scripts: string[] = [];
  const programas: string[] = [];
  const atajosGlobales: string[] = [];
  for (const b of botones) {
    if (b.globalHotkey) atajosGlobales.push(String(b.globalHotkey));
    for (const a of [b.action, ...(b.actions ?? [])]) {
      if (!a) continue;
      if (a.type === 'script' && a.script) scripts.push(String(a.script));
      if ((a.type === 'app' || a.type === 'shortcut') && (a.appPath || a.shortcutPath)) {
        programas.push(String(a.appPath ?? a.shortcutPath));
      }
    }
  }
  return { botones: botones.length, scripts, programas, atajosGlobales };
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
