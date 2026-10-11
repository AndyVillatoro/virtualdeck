import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs';
import { join } from 'path';
import { validarUuid } from './instalacion';

/**
 * Lo que el gestor recuerda en disco (roadmap 83, MVP).
 *
 * - `plugins.json` (junto a la config, como `companion.json`): los UUID
 *   **deshabilitados**. Lo que no está ahí está habilitado: instalar ya deja
 *   el plugin encendido y un archivo corrupto no apaga nada.
 * - `<uuid>.global.json` (dentro de `plugins/`): los `setGlobalSettings` de
 *   cada plugin, para responder `getGlobalSettings` tras reiniciar.
 *
 * Escritura atómica (temporal + renombre, como `companion/ajustes.ts`) en los
 * dos. Es síncrono a propósito: se guarda en momentos puntuales (habilitar,
 * `setGlobalSettings`), no en caliente.
 *
 * Puro en el sentido que importa para probarlo con `npx tsx`: no importa
 * Electron, la carpeta se pasa como parámetro. Cómo correr las pruebas (en la
 * raíz del repo):
 *
 *   npx tsx --eval "import { leerDeshabilitados, guardarDeshabilitados, leerGlobales, guardarGlobales } from './electron/main/plugins/ajustesPlugins.ts'; import { mkdtempSync } from 'fs'; import { join } from 'path'; import { tmpdir } from 'os'; const assert = (c, m) => { if (!c) { console.error('FALLO: ' + m); process.exit(1); } }; const dir = mkdtempSync(join(tmpdir(), 'vd-plg-')); assert(leerDeshabilitados(dir).size === 0, 'vacio al empezar'); guardarDeshabilitados(dir, new Set(['com.a.b'])); assert(leerDeshabilitados(dir).has('com.a.b'), 'ida y vuelta'); guardarDeshabilitados(dir, new Set(['../malo', 'com.a.b'])); const otra = leerDeshabilitados(dir); assert(otra.size === 1 && otra.has('com.a.b'), 'lo que no es uuid no se guarda'); assert(leerGlobales(dir, 'com.a.b') === undefined, 'sin globales al empezar'); guardarGlobales(dir, 'com.a.b', { ficha: 'x' }); assert((leerGlobales(dir, 'com.a.b')).ficha === 'x', 'globales en ida y vuelta'); console.log('ajustes: ok');"
 */

const ARCHIVO_ESTADO = 'plugins.json';

function rutaEstado(dirPlugins: string): string {
  return join(dirPlugins, '..', ARCHIVO_ESTADO);
}

function rutaGlobales(dirPlugins: string, uuid: string): string {
  return join(dirPlugins, `${uuid}.global.json`);
}

/** Escritura a temporal y renombrado: un corte a medias no deja nada roto. */
function escribirAtomico(ruta: string, texto: string): void {
  const temporal = `${ruta}.tmp`;
  writeFileSync(temporal, texto, 'utf-8');
  renameSync(temporal, ruta);
}

/** Los UUID deshabilitados. Si el archivo no se puede leer, ninguno. */
export function leerDeshabilitados(dirPlugins: string): Set<string> {
  try {
    const datos = JSON.parse(readFileSync(rutaEstado(dirPlugins), 'utf-8')) as { deshabilitados?: unknown };
    const lista = Array.isArray(datos?.deshabilitados) ? datos.deshabilitados : [];
    return new Set(lista.filter((uuid) => validarUuid(uuid)));
  } catch {
    return new Set();
  }
}

export function guardarDeshabilitados(dirPlugins: string, deshabilitados: Set<string>): void {
  try {
    const dir = join(dirPlugins, '..');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const lista = [...deshabilitados].filter((uuid) => validarUuid(uuid)).sort();
    escribirAtomico(rutaEstado(dirPlugins), JSON.stringify({ deshabilitados: lista }, null, 2));
  } catch {
    // Sin permiso o disco lleno: se sigue con el estado en memoria.
  }
}

/** Los ajustes globales de un plugin, o `undefined` si nunca guardó ninguno. */
export function leerGlobales(dirPlugins: string, uuid: string): Record<string, unknown> | undefined {
  if (!validarUuid(uuid)) return undefined;
  try {
    const datos = JSON.parse(readFileSync(rutaGlobales(dirPlugins, uuid), 'utf-8')) as unknown;
    if (!datos || typeof datos !== 'object' || Array.isArray(datos)) return undefined;
    return datos as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

export function guardarGlobales(dirPlugins: string, uuid: string, globales: unknown): void {
  if (!validarUuid(uuid) || !globales || typeof globales !== 'object') return;
  try {
    if (!existsSync(dirPlugins)) mkdirSync(dirPlugins, { recursive: true });
    escribirAtomico(rutaGlobales(dirPlugins, uuid), JSON.stringify(globales));
  } catch {
    // Sin permiso o disco lleno: se sigue con los ajustes en memoria.
  }
}
