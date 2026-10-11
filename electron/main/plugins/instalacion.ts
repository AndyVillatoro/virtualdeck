import { createWriteStream, promises as fs } from 'fs';
import { dirname, join } from 'path';
import { Readable, Transform } from 'stream';
import { pipeline } from 'stream/promises';
import { openPromise } from 'yauzl';
import type { Entry, ZipFile } from 'yauzl';

/**
 * Instalación de un `.streamDeckPlugin` (roadmap 83, MVP).
 *
 * Un `.streamDeckPlugin` es un ZIP con `<uuid>.sdPlugin/manifest.json` dentro.
 * Se descomprime a una carpeta temporal y el gestor la valida (manifiesto) y
 * la mueve a su sitio solo si vale: nunca queda una instalación a medias.
 *
 * Seguridad (todo aquí, en un solo sitio):
 * - UUID validado con `^[a-z0-9][a-z0-9._-]{2,100}$` (en minúsculas).
 * - Protección zip-slip: cada entrada se descompone en segmentos y el destino
 *   se reconstruye desde ellos; se rechazan rutas absolutas, `..`, unidades
 *   (`C:`) y symlinks. Nada se escribe fuera de la carpeta destino.
 * - Topes: ZIP <= 100 MB, descomprimido <= 300 MB (contando bytes reales, no
 *   solo los declarados), <= 5000 entradas.
 * - No se extrae con comandos del sistema: solo `yauzl` (MIT).
 *
 * Las validaciones son puras (`validarUuid`, `esRutaEntradaSegura`) para
 * probarlas con `npx tsx` sin tocar disco. Cómo correr las pruebas (en la
 * raíz del repo):
 *
 *   npx tsx --eval "import { validarUuid } from './electron/main/plugins/instalacion.ts'; const assert = (c, m) => { if (!c) { console.error('FALLO: ' + m); process.exit(1); } }; assert(validarUuid('com.elgato.contador'), 'uuid bien formado'); assert(validarUuid('a1') === false, 'uuid de 2 caracteres'); assert(!validarUuid('Com.Mayusculas'), 'uuid en mayusculas'); assert(!validarUuid('../fuera'), 'uuid con puntos'); assert(!validarUuid('com/elgato'), 'uuid con barra'); console.log('instalacion: ok');"
 *
 * Las rutas zip-slip (`esRutaEntradaSegura`, privada como `rutaServida` en
 * `archivos.ts`) se prueban de punta a punta con `extraerZipSeguro`: un ZIP
 * con `../`, uno con ruta absoluta y uno con symlink dan `invalido` sin
 * escribir nada fuera (ver el mensaje de handoff de T-PLG-01).
 *
 * La extracción entera (`extraerZipSeguro`) se prueba con un ZIP de mentira
 * en `%TEMP%` (ver el mensaje de handoff de T-PLG-01): uno bueno, uno con
 * `../`, uno con ruta absoluta y uno sin `manifest.json`.
 */

const UUID_RE = /^[a-z0-9][a-z0-9._-]{2,100}$/;

/** ZIP de entrada: más de esto ni se abre. */
const LIMITE_ZIP_BYTES = 100 * 1024 * 1024;
/** Total descomprimido, contando bytes reales escritos, no los declarados. */
const LIMITE_DESCOMPRIMIDO_BYTES = 300 * 1024 * 1024;
/** Entradas del central directory: más de esto huele a bomba. */
const LIMITE_ENTRADAS = 5000;

const SUFIJO_CARPETA = '.sdPlugin';
const SUFIJO_MIN = SUFIJO_CARPETA.toLowerCase();

/** El UUID de un plugin: minúsculas, 3–101 caracteres. */
export function validarUuid(valor: unknown): valor is string {
  return typeof valor === 'string' && UUID_RE.test(valor);
}

/** Segmentos de una ruta de ZIP, tratando `/` y `\` como separadores. */
function segmentosDe(ruta: string): string[] {
  return ruta
    .split('/')
    .flatMap((tramo) => tramo.split('\\'))
    .filter((tramo) => tramo !== '' && tramo !== '.');
}

/**
 * Una ruta de entrada de ZIP que no puede salirse de la carpeta destino.
 *
 * Se rechazan las absolutas (`/...`, `C:/...`), los bytes nulos, las unidades
 * de Windows como segmento (`C:`) y cualquier `..`. La extracción además
 * reconstruye el destino desde estos segmentos, así que ningún separador
 * original sobrevive al camino al disco.
 */
function esRutaEntradaSegura(nombre: unknown): boolean {
  if (typeof nombre !== 'string' || nombre === '' || nombre.includes('\0')) return false;
  if (/^[a-zA-Z]:/.test(nombre)) return false;
  if (/^[/\\]/.test(nombre)) return false;
  const segmentos = segmentosDe(nombre);
  if (segmentos.length === 0) return false;
  return !segmentos.some((tramo) => tramo === '..' || /^[a-zA-Z]:$/.test(tramo));
}

/** Señal interna: se superó el tope de bytes descomprimidos escribiendo. */
class LimiteExcedido extends Error {}

type FalloZip =
  | { ok: false; codigo: 'zip'; detalle?: string }
  | { ok: false; codigo: 'tamano'; detalle?: string }
  | { ok: false; codigo: 'invalido'; detalle?: string };

export type ResultadoExtraccion =
  | { ok: true; uuid: string; carpeta: string }
  | FalloZip;

interface EntradaElegida {
  entrada: Entry;
  relativa: string;
}

function raizDe(nombre: string): string {
  return segmentosDe(nombre)[0] ?? '';
}

function uuidDeRaiz(raiz: string): string | null {
  if (!raiz.toLowerCase().endsWith(SUFIJO_MIN)) return null;
  const uuid = raiz.slice(0, -SUFIJO_CARPETA.length);
  return validarUuid(uuid) ? uuid : null;
}

/** Un symlink dentro del ZIP: nunca se sigue, se rechaza. */
function esEnlace(entrada: Entry): boolean {
  return ((entrada.externalFileAttributes >>> 16) & 0o170000) === 0o120000;
}

function esDirectorio(entrada: Entry): boolean {
  return entrada.fileName.endsWith('/');
}

/**
 * Elige qué entradas se extraen y de qué plugin son, o por qué el ZIP no vale.
 *
 * Las entradas fuera de cualquier `<uuid>.sdPlugin/` (p. ej. `__MACOSX/`,
 * `.DS_Store` de quien lo comprimió en macOS) se ignoran, no se rechazan.
 */
function analizarEntradas(entradas: Entry[]): { ok: true; uuid: string; archivos: EntradaElegida[] } | FalloZip {
  const raices = new Map<string, string>();
  const archivos: EntradaElegida[] = [];
  for (const entrada of entradas) {
    if (esDirectorio(entrada)) continue;
    const raiz = raizDe(entrada.fileName);
    if (!raiz.toLowerCase().endsWith(SUFIJO_MIN)) continue;
    const uuid = uuidDeRaiz(raiz);
    if (!uuid) return { ok: false, codigo: 'invalido', detalle: `raiz ${raiz}` };
    raices.set(raiz, uuid);
    const relativa = segmentosDe(entrada.fileName).slice(1).join('/');
    if (!esRutaEntradaSegura(relativa)) return { ok: false, codigo: 'invalido', detalle: entrada.fileName };
    if (esEnlace(entrada)) return { ok: false, codigo: 'invalido', detalle: `enlace ${entrada.fileName}` };
    if (entrada.isEncrypted()) return { ok: false, codigo: 'invalido', detalle: `cifrada ${entrada.fileName}` };
    if (!entrada.canDecodeFileData()) return { ok: false, codigo: 'invalido', detalle: `metodo ${entrada.fileName}` };
    archivos.push({ entrada, relativa });
  }
  if (raices.size === 0) return { ok: false, codigo: 'invalido', detalle: 'sin carpeta .sdPlugin' };
  if (raices.size > 1) return { ok: false, codigo: 'invalido', detalle: 'varias carpetas .sdPlugin' };
  const [[raiz, uuid]] = [...raices];
  if (!archivos.some((a) => a.relativa === 'manifest.json')) {
    return { ok: false, codigo: 'invalido', detalle: `sin manifest.json en ${raiz}` };
  }
  let declarado = 0;
  for (const { entrada } of archivos) declarado += entrada.uncompressedSize;
  if (declarado > LIMITE_DESCOMPRIMIDO_BYTES) return { ok: false, codigo: 'tamano', detalle: 'declarado' };
  return { ok: true, uuid, archivos };
}

async function escribirEntrada(zip: ZipFile, elegida: EntradaElegida, destino: string, escritos: { total: number }): Promise<'ok' | 'tamano' | 'zip'> {
  let flujo: Readable;
  try {
    flujo = await zip.openReadStreamPromise(elegida.entrada);
  } catch {
    return 'zip';
  }
  const contar = new Transform({
    transform(trozo: Buffer, _codificacion: string, listo: (error?: Error | null, dato?: Buffer) => void) {
      escritos.total += trozo.length;
      if (escritos.total > LIMITE_DESCOMPRIMIDO_BYTES) listo(new LimiteExcedido());
      else listo(null, trozo);
    },
  });
  try {
    await fs.mkdir(dirname(destino), { recursive: true });
    await pipeline(flujo, contar, createWriteStream(destino));
  } catch (e) {
    if (e instanceof LimiteExcedido) return 'tamano';
    return 'zip';
  }
  return 'ok';
}

/**
 * Descomprime el ZIP en `dirTemporal/<uuid>.sdPlugin` con todos los topes.
 *
 * No mueve nada a su sitio final: eso lo hace el gestor después de validar el
 * manifiesto. Si algo falla, la carpeta parcial se borra.
 */
export async function extraerZipSeguro(zipPath: string, dirTemporal: string): Promise<ResultadoExtraccion> {
  let tamano: number;
  try {
    tamano = (await fs.stat(zipPath)).size;
  } catch {
    return { ok: false, codigo: 'zip', detalle: 'stat' };
  }
  if (tamano > LIMITE_ZIP_BYTES) return { ok: false, codigo: 'tamano', detalle: 'zip' };

  let zip: ZipFile;
  try {
    // `autoClose: false` a propósito: con el valor por defecto (`true`) yauzl
    // se cierra solo al terminar de leer el directorio, y cada
    // `openReadStream` posterior falla con `closed`. Se cierra a mano abajo.
    zip = await openPromise(zipPath, { lazyEntries: true, validateEntrySizes: true, autoClose: false });
  } catch {
    return { ok: false, codigo: 'zip', detalle: 'open' };
  }
  let entradas: Entry[];
  try {
    entradas = await leerTodas(zip);
  } catch (e) {
    cerrar(zip);
    // `yauzl` 3.x valida los nombres al leer el directorio (`absolute path`,
    // `invalid relative path`): es contenido inseguro, no un ZIP roto.
    if (/^(absolute path|invalid relative path)/.test((e as Error).message)) {
      return { ok: false, codigo: 'invalido', detalle: (e as Error).message };
    }
    return { ok: false, codigo: 'zip', detalle: 'directorio' };
  }
  if (entradas.length > LIMITE_ENTRADAS) {
    cerrar(zip);
    return { ok: false, codigo: 'tamano', detalle: 'entradas' };
  }

  const analisis = analizarEntradas(entradas);
  // Ojo: `if (!analisis.ok)` NO estrecha con este tsconfig (`strict: false`);
  // la comparación explícita sí (ver handoff de T-PLG-01).
  if (analisis.ok === false) {
    cerrar(zip);
    return analisis;
  }

  const raiz = `${analisis.uuid}${SUFIJO_CARPETA}`;
  const carpeta = join(dirTemporal, raiz);
  const escritos = { total: 0 };
  for (const elegida of analisis.archivos) {
    const destino = join(carpeta, ...segmentosDe(elegida.relativa));
    const resultado = await escribirEntrada(zip, elegida, destino, escritos);
    if (resultado !== 'ok') {
      cerrar(zip);
      await fs.rm(carpeta, { recursive: true, force: true }).catch(() => {});
      return resultado === 'tamano'
        ? { ok: false, codigo: 'tamano', detalle: 'descomprimido' }
        : { ok: false, codigo: 'zip', detalle: elegida.relativa };
    }
  }
  cerrar(zip);
  return { ok: true, uuid: analisis.uuid, carpeta };
}

function leerTodas(zip: ZipFile): Promise<Entry[]> {
  return new Promise((listo, fallo) => {
    const entradas: Entry[] = [];
    zip.on('error', fallo);
    zip.on('end', () => listo(entradas));
    zip.on('entry', (entrada: Entry) => {
      entradas.push(entrada);
      zip.readEntry();
    });
    zip.readEntry();
  });
}

function cerrar(zip: ZipFile): void {
  try {
    zip.close();
  } catch {
    /* ya estaba cerrado */
  }
}
