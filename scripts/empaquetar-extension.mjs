/* Empaquetador reproducible de la extensión VirtualDeck Companion (T-EXT-03).
 *
 * De `companion-extension/` saca dos ZIP en `dist/extension/`:
 *
 *   - `virtualdeck-companion-chrome.zip`    → `manifest.json` (Chromium MV3)
 *   - `virtualdeck-companion-firefox.zip`   → `manifest.firefox.json` renombrado
 *     a `manifest.json` dentro del ZIP (Firefox 121+)
 *
 * Sin dependencias nuevas: el ZIP se escribe a mano con `zlib.deflateRawSync`,
 * el mismo patrón (y las mismas cabeceras fijas) que
 * `scripts/empaquetar-plugins.mjs`. Nada del sistema entra en el resultado:
 * los nombres se ordenan, la fecha de cada entrada es siempre 1980-01-01 y el
 * contenido son bytes leídos del repositorio, así que dos corridas producen el
 * mismo sha256 byte a byte.
 *
 * Uso:
 *   node scripts/empaquetar-extension.mjs            → imprime el resumen
 *   import { empaquetarExtension } from './empaquetar-extension.mjs'
 */

// @ts-check
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { crc32 as crc32Node, deflateRawSync } from 'node:zlib';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGEN = join(RAIZ, 'companion-extension');
const DIR_SALIDA_DEFECTO = join(RAIZ, 'dist', 'extension');

/** Archivos comunes a los dos paquetes, en la raíz del ZIP. */
const ARCHIVOS_COMUNES = ['background.js', 'content.js', 'popup.css', 'popup.html', 'popup.js'];
/** Solo Chromium: Firefox no tiene API offscreen (ni permiso `offscreen`). */
const ARCHIVOS_CHROMIUM = ['offscreen.html', 'offscreen.js'];

/**
 * Los dos paquetes. `manifest` es el archivo de origen dentro de
 * `companion-extension/`; dentro del ZIP siempre se llama `manifest.json`,
 * que es como lo lee cada navegador.
 */
const PAQUETE_CHROMIUM = {
  nombre: 'virtualdeck-companion-chrome.zip',
  manifest: 'manifest.json',
  extra: ARCHIVOS_CHROMIUM,
};
const PAQUETE_FIREFOX = {
  nombre: 'virtualdeck-companion-firefox.zip',
  manifest: 'manifest.firefox.json',
  extra: [],
};

/** El CRC-32 de `zlib` si existe (Node >= 20.15); si no, la tabla estandar. */
function crc32(datos) {
  if (typeof crc32Node === 'function') return crc32Node(datos);
  let c = 0xffffffff;
  for (let i = 0; i < datos.length; i++) {
    c ^= datos[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
  }
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * Un ZIP (metodo deflate) con las entradas dadas, en el orden dado.
 *
 * Cabeceras locales, directorio central y fin. Sin directorios explicitos,
 * sin marcas de flujo y con la fecha de modificacion clavada en 1980-01-01
 * (`0x0021`): los tamanos se conocen antes de escribir, que es lo que espera
 * `yauzl` con `validateEntrySizes`, y la salida no depende del reloj.
 */
function escribirZip(entradas) {
  const locales = [];
  const central = [];
  let desplazamiento = 0;
  for (const entrada of entradas) {
    const nombre = Buffer.from(entrada.nombre, 'utf8');
    const crudo = Buffer.isBuffer(entrada.datos) ? entrada.datos : Buffer.from(entrada.datos);
    const comprimido = deflateRawSync(crudo, { level: 9 });
    const suma = crc32(crudo);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0x21, 12);
    local.writeUInt32LE(suma, 14);
    local.writeUInt32LE(comprimido.length, 18);
    local.writeUInt32LE(crudo.length, 22);
    local.writeUInt16LE(nombre.length, 26);
    locales.push(local, nombre, comprimido);
    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0x0800, 8);
    cd.writeUInt16LE(8, 10);
    cd.writeUInt16LE(0, 12);
    cd.writeUInt16LE(0x21, 14);
    cd.writeUInt32LE(suma, 16);
    cd.writeUInt32LE(comprimido.length, 20);
    cd.writeUInt32LE(crudo.length, 24);
    cd.writeUInt16LE(nombre.length, 28);
    cd.writeUInt32LE(desplazamiento, 42);
    central.push(cd, nombre);
    desplazamiento += local.length + nombre.length + comprimido.length;
  }
  const directorio = Buffer.concat(central);
  const fin = Buffer.alloc(22);
  fin.writeUInt32LE(0x06054b50, 0);
  fin.writeUInt16LE(entradas.length, 8);
  fin.writeUInt16LE(entradas.length, 10);
  fin.writeUInt32LE(directorio.length, 12);
  fin.writeUInt32LE(desplazamiento, 16);
  return Buffer.concat([...locales, directorio, fin]);
}

/** Los iconos de `companion-extension/icons/`, ordenados para ser determinista. */
function listarIconos() {
  const dir = join(ORIGEN, 'icons');
  if (!existsSync(dir)) throw new Error(`falta la carpeta ${relative(RAIZ, dir)}`);
  return readdirSync(dir, { withFileTypes: true })
    .filter((entrada) => entrada.isFile() && !entrada.name.startsWith('.'))
    .map((entrada) => `icons/${entrada.name}`)
    .sort();
}

/**
 * Las entradas de un paquete como `{ nombre, datos }`, ordenadas por nombre.
 *
 * `manifest.firefox.json` entra como `manifest.json`: es el nombre que lee
 * Firefox al instalar, y el contenido ya es el manifest MV3 de Gecko.
 */
function entradasDelPaquete(paquete, iconos) {
  const pares = [
    { origen: paquete.manifest, nombre: 'manifest.json' },
    ...ARCHIVOS_COMUNES.map((archivo) => ({ origen: archivo, nombre: archivo })),
    ...paquete.extra.map((archivo) => ({ origen: archivo, nombre: archivo })),
    ...iconos.map((archivo) => ({ origen: archivo, nombre: archivo })),
  ].sort((a, b) => (a.nombre < b.nombre ? -1 : a.nombre > b.nombre ? 1 : 0));

  const vistos = new Set();
  return pares.map((par) => {
    if (vistos.has(par.nombre)) throw new Error(`${paquete.nombre}: entrada repetida ${par.nombre}`);
    vistos.add(par.nombre);
    const ruta = join(ORIGEN, par.origen);
    if (!existsSync(ruta)) throw new Error(`falta ${relative(RAIZ, ruta)}`);
    return { nombre: par.nombre, datos: readFileSync(ruta) };
  });
}

/**
 * Escribe el ZIP de un paquete en `dirSalida` y devuelve su resumen.
 *
 * @param {{ nombre: string, manifest: string, extra: string[] }} paquete
 * @param {string} dirSalida
 * @param {string[]} iconos
 * @returns {{ ruta: string, sha256: string, bytes: number }}
 */
function empaquetarUno(paquete, dirSalida, iconos) {
  const zip = escribirZip(entradasDelPaquete(paquete, iconos));
  const ruta = join(dirSalida, paquete.nombre);
  writeFileSync(ruta, zip);
  return {
    ruta,
    sha256: createHash('sha256').update(zip).digest('hex'),
    bytes: zip.length,
  };
}

/**
 * Construye los dos ZIP de la extension y devuelve su resumen.
 *
 * @param {{ dirSalida?: string }} [opciones] Carpeta de salida
 *   (por defecto `dist/extension/` de la raiz del repo).
 * @returns {{ chrome: { ruta: string, sha256: string, bytes: number },
 *             firefox: { ruta: string, sha256: string, bytes: number } }}
 */
export function empaquetarExtension({ dirSalida = DIR_SALIDA_DEFECTO } = {}) {
  mkdirSync(dirSalida, { recursive: true });
  const iconos = listarIconos();
  return {
    chrome: empaquetarUno(PAQUETE_CHROMIUM, dirSalida, iconos),
    firefox: empaquetarUno(PAQUETE_FIREFOX, dirSalida, iconos),
  };
}

/** Imprime el resumen de una corrida por CLI. */
function main() {
  const { chrome, firefox } = empaquetarExtension();
  const pares = [
    [PAQUETE_CHROMIUM, chrome],
    [PAQUETE_FIREFOX, firefox],
  ];
  for (const [paquete, dato] of pares) {
    console.log(
      `${paquete.nombre}  ${dato.bytes} bytes  sha256 ${dato.sha256}  ${relative(RAIZ, dato.ruta)}`,
    );
  }
  console.log(`\n${pares.length} paquetes en ${relative(RAIZ, DIR_SALIDA_DEFECTO)}`);
}

const ejecutadoComoScript =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (ejecutadoComoScript) main();
