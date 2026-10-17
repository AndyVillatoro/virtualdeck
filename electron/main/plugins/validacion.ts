import { lstatSync, readFileSync, realpathSync } from 'fs';
import { extname, join, resolve, sep } from 'path';

/**
 * Validaciones del gestor de plugins en un solo sitio (hallazgos #4, #9, #10
 * de la revisión T-DEL-D).
 *
 * - `validarUuid`: el UUID de un plugin (minúsculas, 3–101 caracteres). Vive
 *   aquí para que `manifiesto.ts` lo use sin importar `instalacion.ts`
 *   (`instalacion.ts` lo reexporta para no mover a sus clientes).
 * - `esSegmentoProhibido`: un tramo de ruta que no puede tocar disco (`..`,
 *   `C:`, `:` dentro —Alternate Data Streams—, reservados de Windows). Lo
 *   usan la extracción del ZIP y la resolución de imágenes.
 * - `esObjetoPlano` + `cabeEnLimite`: lo que `setSettings`/`setGlobalSettings`
 *   pueden guardar (objeto plano de hasta 64 KB, ni arrays ni basura).
 * - `resolverImagenVisual`: un `setImage` convertido a `data:` listo para el
 *   renderer, o `null` si se rechaza (solo `data:image/...;base64` válido o
 *   ruta relativa contenida en la carpeta del plugin).
 *
 * Puro salvo `resolverImagenVisual` (lee disco, proceso principal). Cómo
 * correr las pruebas (en la raíz del repo):
 *
 *   npx tsx --eval "import { validarUuid, esSegmentoProhibido, esObjetoPlano, cabeEnLimite, resolverImagenVisual } from './electron/main/plugins/validacion.ts'; import { mkdtempSync, writeFileSync } from 'fs'; import { join } from 'path'; import { tmpdir } from 'os'; const assert = (c, m) => { if (!c) { console.error('FALLO: ' + m); process.exit(1); } }; assert(validarUuid('com.elgato.contador'), 'uuid bien formado'); assert(!validarUuid('Com.Mayusculas'), 'uuid en mayusculas'); assert(!validarUuid('../fuera'), 'uuid con puntos'); assert(esSegmentoProhibido('..'), 'puntos'); assert(esSegmentoProhibido('a:b'), 'dos puntos dentro'); assert(esSegmentoProhibido('NUL'), 'reservado'); assert(esSegmentoProhibido('com1.png'), 'reservado con extension'); assert(!esSegmentoProhibido('icono.png'), 'normal vale'); assert(esObjetoPlano({ a: 1 }), 'plano vale'); assert(!esObjetoPlano([1]), 'array no vale'); assert(!esObjetoPlano(null), 'null no vale'); assert(cabeEnLimite({ a: 1 }), 'pequeno cabe'); assert(!cabeEnLimite({ a: 'x'.repeat(70000) }), 'grande no cabe'); assert(resolverImagenVisual('', '/tmp') === '', 'vacio borra'); assert(resolverImagenVisual('https://x/y.png', '/tmp') === null, 'https se rechaza'); assert(resolverImagenVisual('data:image/png;base64,iVBORw0KGgo=', '/tmp')?.startsWith('data:'), 'data valido'); assert(resolverImagenVisual('data:text/html;base64,eA=', '/tmp') === null, 'data no imagen se rechaza'); const dir = mkdtempSync(join(tmpdir(), 'vd-img-')); writeFileSync(join(dir, 'foto.png'), Buffer.from('iVBORw0KGgo=', 'base64')); assert(resolverImagenVisual('foto.png', dir)?.startsWith('data:image/png'), 'relativa resuelve'); assert(resolverImagenVisual('../fuera.png', dir) === null, 'escape se rechaza'); console.log('validacion: ok');"
 */

const UUID_RE = /^[a-z0-9][a-z0-9._-]{2,100}$/;

/** El UUID de un plugin: minúsculas, 3–101 caracteres. */
export function validarUuid(valor: unknown): valor is string {
  return typeof valor === 'string' && UUID_RE.test(valor);
}

/** Tope de `setSettings`/`setGlobalSettings` (lo que Elgato permite por contexto). */
const MAX_SETTINGS_BYTES = 64 * 1024;

/** Tope de una imagen de botón traída a `data:` (un icono pesa KB). */
const LIMITE_IMAGEN_BYTES = 2 * 1024 * 1024;

/** Nombres que Windows no deja crear, con o sin extensión. */
const RESERVADOS_WINDOWS = new Set([
  'CON', 'PRN', 'AUX', 'NUL',
  'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
]);

/**
 * Un tramo de ruta que no puede tocar disco: `..`, unidad (`C:`), dos puntos
 * dentro (`NTFS Alternate Data Streams`) o dispositivo reservado de Windows
 * (`NUL`, `COM1`, también con extensión: `NUL.png` tampoco se puede crear).
 */
export function esSegmentoProhibido(tramo: string): boolean {
  if (tramo === '' || tramo === '.' || tramo === '..') return true;
  if (tramo.includes(':')) return true;
  return RESERVADOS_WINDOWS.has(tramo.split('.')[0].toUpperCase());
}

/** Un objeto plano de JSON (`{...}`): ni `null`, ni array, ni primitiva. */
export function esObjetoPlano(valor: unknown): valor is Record<string, unknown> {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return false;
  const proto = Object.getPrototypeOf(valor);
  return proto === Object.prototype || proto === null;
}

/** El valor serializa a JSON y cabe en `max` bytes (64 KB por defecto). */
export function cabeEnLimite(valor: unknown, max: number = MAX_SETTINGS_BYTES): boolean {
  try {
    const texto = JSON.stringify(valor);
    return typeof texto === 'string' && Buffer.byteLength(texto, 'utf8') <= max;
  } catch {
    return false;
  }
}

const MIME_POR_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',
};

const DATA_IMAGEN_RE = /^data:image\/(png|jpeg|gif|svg\+xml|webp|avif|bmp|x-icon);base64,[A-Za-z0-9+/]+={0,2}$/;

/** Los bytes que pesa un `data:...;base64,...` una vez decodificado. */
function bytesDeBase64(dataUrl: string): number {
  const coma = dataUrl.indexOf(',');
  const cuerpo = coma >= 0 ? dataUrl.slice(coma + 1) : '';
  return Math.floor(cuerpo.length * 3 / 4);
}

/** La carpeta del plugin en su forma canónica, o `null` si no se puede leer. */
function baseRealDe(carpeta: string): string | null {
  try {
    return realpathSync(resolve(carpeta));
  } catch {
    return null;
  }
}

/** El archivo, contenido en la base y con extensión de imagen, o `null`. */
function leerContenida(ruta: string, baseReal: string): { mime: string; base64: string } | null {
  let real: string;
  try {
    const stats = lstatSync(ruta);
    if (stats.isSymbolicLink() || !stats.isFile() || stats.size > LIMITE_IMAGEN_BYTES) return null;
    real = realpathSync(ruta);
  } catch {
    return null;
  }
  if (real !== baseReal && !real.startsWith(baseReal + sep)) return null;
  const mime = MIME_POR_EXT[extname(real).toLowerCase()];
  if (!mime) return null;
  try {
    return { mime, base64: readFileSync(real).toString('base64') };
  } catch {
    return null;
  }
}

/**
 * La imagen de un `setImage` convertida a `data:` lista para el renderer, o
 * `null` si se rechaza.
 *
 * Solo dos orígenes: `data:image/...;base64,...` válido, o ruta relativa
 * contenida en la carpeta del plugin (con la resolución de Elgato cuando no
 * trae extensión: `.svg`, `@2x.png`, `.png`). Los esquemas externos (`https:`,
 * `vd:`, `file:`), las absolutas y los escapes se rechazan: el renderer las
 * cargaba sin validar. `''` se acepta tal cual: es como el plugin borra la
 * imagen.
 */
export function resolverImagenVisual(imagen: string, carpeta: string): string | null {
  if (imagen === '') return '';
  if (imagen.startsWith('data:')) {
    return DATA_IMAGEN_RE.test(imagen) && bytesDeBase64(imagen) <= LIMITE_IMAGEN_BYTES ? imagen : null;
  }
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(imagen)) return null;
  if (imagen.includes('\0')) return null;
  const relativa = imagen.replace(/^[/\\]+/, '');
  if (!relativa || relativa.split(/[\\/]/).some((tramo) => esSegmentoProhibido(tramo))) return null;
  const baseReal = baseRealDe(carpeta);
  if (!baseReal) return null;
  const sinExtension = !extname(relativa);
  const intentos = sinExtension
    ? [relativa + '.svg', relativa + '@2x.png', relativa + '.png']
    : [relativa];
  for (const intento of intentos) {
    const datos = leerContenida(join(carpeta, ...intento.split(/[\\/]/)), baseReal);
    if (datos) return `data:${datos.mime};base64,${datos.base64}`;
  }
  return null;
}
