/* Empaquetador de los plugins propios de VirtualDeck (T-TND-11).
 *
 * De cada carpeta `<uuid>.sdPlugin` de `docs/galeria-ejemplo/plugins/` saca un
 * `<uuid>.streamDeckPlugin` en `dist/`: un ZIP con la carpeta dentro, tal como
 * los instala `electron/main/plugins/instalacion.ts` (raiz `<uuid>.sdPlugin`,
 * `manifest.json` dentro, nada fuera). Luego calcula el sha256 de cada uno y
 * anade la entrada al manifiesto de la galeria con el `kind: 'plugin'`.
 *
 * Sin dependencias nuevas: el ZIP se escribe a mano con `zlib.deflateRawSync`
 * (no hay escritor de ZIP instalado, `yauzl` solo lee) y el PNG del icono se
 * codifica con `zlib.deflateSync`, como en `scripts/generate-companion-icons.mjs`.
 * El icono de cada plugin sale del catalogo DOT del proyecto
 * (`src/data/iconosDot/acciones.json`, 16×16 en base64), que es el mismo `id`
 * que se pone en el campo `icono` de la entrada de la galeria.
 *
 * Uso: `npm run build:plugins`
 */

// @ts-check
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateRawSync, deflateSync, crc32 as crc32Node } from 'node:zlib';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGEN = join(RAIZ, 'docs', 'galeria-ejemplo', 'plugins');
const DESTINO = join(ORIGEN, 'dist');
const MANIFIESTO_GALERIA = join(RAIZ, 'docs', 'galeria-ejemplo', 'manifest.json');
const CATALOGO_ACCIONES = join(RAIZ, 'src', 'data', 'iconosDot', 'acciones.json');
const INDICE_ACCIONES = join(RAIZ, 'src', 'data', 'iconosDot', 'indice.json');
const BASE_CRUDO = 'https://raw.githubusercontent.com/AndyVillatoro/virtualdeck/main/docs/galeria-ejemplo/plugins/dist';
const VERSION_MINIMA = '0.14.1';
const LADO_ICONO = 128;

/**
 * Los seis plugins. `code` es el `CodePath`, `icono` el id del catalogo DOT (que
 * va tambien en la entrada de la galeria) y `etiqueta`/`descripcion` lo que se
 * ve en la tienda.
 */
const PLUGINS = [
  {
    uuid: 'com.virtualdeck.cronometro',
    etiqueta: 'Cronometro',
    code: 'cronometro.html',
    icono: 'stopwatch',
    etiquetas: ['plugin', 'utilidad', 'cronometro'],
    descripcion: 'Cronometro con arranque, pausa y reinicio con pulsacion larga. La hora se pinta en puntos.',
  },
  {
    uuid: 'com.virtualdeck.temporizador-pomodoro',
    etiqueta: 'Temporizador pomodoro',
    code: 'temporizador-pomodoro.html',
    icono: 'hourglass-high',
    etiquetas: ['plugin', 'utilidad', 'productividad'],
    descripcion: '25 de foco y 5 de pausa, con los minutos de cada fase ajustables desde el inspector del boton.',
  },
  {
    uuid: 'com.virtualdeck.contador',
    etiqueta: 'Contador',
    code: 'contador.html',
    icono: 'hash',
    etiquetas: ['plugin', 'utilidad', 'contador'],
    descripcion: 'Suma uno con cada pulsacion, se reinicia con la pulsacion larga y guarda el valor con el boton.',
  },
  {
    uuid: 'com.virtualdeck.reloj-mundial',
    etiqueta: 'Reloj mundial',
    code: 'reloj-mundial.html',
    icono: 'world',
    etiquetas: ['plugin', 'utilidad', 'reloj'],
    descripcion: 'La hora de la zona horaria que elijas en el inspector del boton, con su desfase con UTC.',
  },
  {
    uuid: 'com.virtualdeck.dado',
    etiqueta: 'Dado',
    code: 'dado.html',
    icono: 'dice',
    etiquetas: ['plugin', 'utilidad', 'juego'],
    descripcion: 'Tira un dado de 6 o de 20 con cada pulsacion; el ultimo resultado se guarda con el boton.',
  },
  {
    uuid: 'com.virtualdeck.fecha',
    etiqueta: 'Fecha',
    code: 'fecha.html',
    icono: 'calendar-week',
    etiquetas: ['plugin', 'utilidad', 'reloj'],
    descripcion: 'El dia y el mes con la semana ISO del ano. No necesita ajustes.',
  },
];

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

/** Un chunk PNG: longitud, tipo, datos y CRC. */
function chunkPng(tipo, datos) {
  const longitud = Buffer.alloc(4);
  longitud.writeUInt32BE(datos.length, 0);
  const cuerpo = Buffer.concat([Buffer.from(tipo, 'ascii'), datos]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(cuerpo), 0);
  return Buffer.concat([longitud, cuerpo, crc]);
}

/**
 * El icono del plugin como PNG de `LADO_ICONO`.
 *
 * El bitmap del catalogo es de 16×16 en base64 (fila a fila, `x + 16*y`, bit
 * mas significativo primero). Se dibuja como lo que es: una rejilla de puntos,
 * los apagados en gris de superficie y los encendidos en el acento, sobre el
 * fondo OLED puro.
 */
function pngIcono(bitsBase64) {
  const bits = Buffer.from(bitsBase64, 'base64');
  const lado = LADO_ICONO;
  const celda = lado / 16;
  const radio = celda * 0.38;
  const firma = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(lado, 0);
  ihdr.writeUInt32BE(lado, 4);
  ihdr.writeUInt8(8, 8);
  ihdr.writeUInt8(6, 9);
  const bytesPorFila = 1 + lado * 4;
  const pixeles = Buffer.alloc(bytesPorFila * lado);
  const pintar = (x, y, color) => {
    if (x < 0 || y < 0 || x >= lado || y >= lado) return;
    const px = y * bytesPorFila + 1 + x * 4;
    pixeles[px] = color[0];
    pixeles[px + 1] = color[1];
    pixeles[px + 2] = color[2];
    pixeles[px + 3] = 255;
  };
  const fondo = [7, 8, 9];
  const apagado = [27, 30, 34];
  const encendido = [255, 59, 48];
  for (let y = 0; y < lado; y++) {
    pixeles.writeUInt8(0, y * bytesPorFila);
    for (let x = 0; x < lado; x++) pintar(x, y, fondo);
  }
  for (let gx = 0; gx < 16; gx++) {
    for (let gy = 0; gy < 16; gy++) {
      const indice = gx + 16 * gy;
      const encendidoEn = (bits[indice >> 3] >> (7 - (indice & 7))) & 1;
      const color = encendidoEn ? encendido : apagado;
      const cx = gx * celda + celda / 2;
      const cy = gy * celda + celda / 2;
      for (let y = Math.floor(cy - radio); y <= Math.ceil(cy + radio); y++) {
        for (let x = Math.floor(cx - radio); x <= Math.ceil(cx + radio); x++) {
          const dx = x + 0.5 - cx;
          const dy = y + 0.5 - cy;
          if (dx * dx + dy * dy <= radio * radio) pintar(x, y, color);
        }
      }
    }
  }
  return Buffer.concat([
    firma,
    chunkPng('IHDR', ihdr),
    chunkPng('IDAT', deflateSync(pixeles, { level: 9 })),
    chunkPng('IEND', Buffer.alloc(0)),
  ]);
}

/**
 * Un ZIP (metodo deflate) con las entradas dadas.
 *
 * Solo lo que necesita un `.streamDeckPlugin`: cabeceras locales, directorio
 * central y fin. Sin directorios explicitos ni marcas de flujo: los tamanos se
 * conocen antes de escribir, que es lo que espera `yauzl` con
 * `validateEntrySizes`.
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

/** Los ids del catalogo de acciones, para no apuntar a uno que no exista. */
function idsDelCatalogo() {
  const indice = JSON.parse(readFileSync(INDICE_ACCIONES, 'utf-8'));
  return new Set(indice.acciones.map((accion) => accion[0]));
}

/** El bitmap de un icono del catalogo (`acciones:<id>`), o `null`. */
function bitsDeIcono(catalogo, id) {
  const hallado = catalogo.iconos.find((icono) => icono[0] === id);
  return hallado ? hallado[1] : null;
}

/**
 * Rellena el `CategoryIcon` del manifiesto con el PNG del icono.
 *
 * El resto del manifiesto se respeta tal cual: esta es la fuente de verdad de
 * cada plugin y la escribe a mano. Se escribe solo si cambia, para que el
 * `manifest.json` del repositorio no cambie en cada corrida.
 */
function sellarCategoryIcon(rutaManifiesto, png) {
  const manifiesto = JSON.parse(readFileSync(rutaManifiesto, 'utf-8'));
  const datos = 'data:image/png;base64,' + png.toString('base64');
  if (manifiesto.CategoryIcon === datos) return;
  manifiesto.CategoryIcon = datos;
  writeFileSync(rutaManifiesto, JSON.stringify(manifiesto, null, 2) + '\n', 'utf-8');
}

/** Los archivos del paquete, con la carpeta del plugin dentro del ZIP. */
function archivosDelPaquete(carpeta, uuid) {
  const archivos = readdirSync(carpeta, { withFileTypes: true })
    .filter((entrada) => entrada.isFile() && !entrada.name.startsWith('.'))
    .map((entrada) => ({
      nombre: `${uuid}.sdPlugin/${entrada.name}`,
      datos: readFileSync(join(carpeta, entrada.name)),
    }));
  const nombres = archivos.map((archivo) => archivo.nombre.split('/').pop());
  if (!nombres.includes('manifest.json')) throw new Error(`${uuid}: sin manifest.json`);
  if (!nombres.includes('icon.png')) throw new Error(`${uuid}: sin icon.png`);
  return archivos;
}

/**
 * Anade las entradas de los plugins al manifiesto de la galeria.
 *
 * Van **dentro de `profiles`**, con `kind: 'plugin'`, porque es la unica lista
 * que lee el cargador: `manifiesto()` en `electron/main/galeria.ts:170` hace
 * `j.profiles` y recorre eso, y `sanearEntrada` ya distingue `plugin` de `page`
 * y de perfil (mismo archivo, linea 131). Una clave `plugins` propia seria un
 * manifiesto que la tienda no ve.
 *
 * Lo que ya habia de estos plugins se quita antes de volver a anadirlo, para
 * que dos corridas no dejen las entradas repetidas; las entradas que no son
 * nuestras (perfiles y paginas) se dejan como estaban y de sitio.
 */
function actualizarGaleria(entradas) {
  const manifiesto = JSON.parse(readFileSync(MANIFIESTO_GALERIA, 'utf-8'));
  const mios = new Set(entradas.map((entrada) => entrada.id));
  const antes = Array.isArray(manifiesto.profiles) ? manifiesto.profiles : [];
  manifiesto.profiles = [...antes.filter((entrada) => !mios.has(entrada?.id)), ...entradas];
  delete manifiesto.plugins;
  writeFileSync(MANIFIESTO_GALERIA, JSON.stringify(manifiesto, null, 2) + '\n', 'utf-8');
}

function main() {
  const ids = idsDelCatalogo();
  const catalogo = JSON.parse(readFileSync(CATALOGO_ACCIONES, 'utf-8'));
  mkdirSync(DESTINO, { recursive: true });
  const entradas = [];
  for (const plugin of PLUGINS) {
    const carpeta = join(ORIGEN, `${plugin.uuid}.sdPlugin`);
    if (!existsSync(carpeta)) throw new Error(`falta la carpeta ${relative(RAIZ, carpeta)}`);
    const bits = bitsDeIcono(catalogo, plugin.icono);
    if (!bits) {
      const donde = ids.has(plugin.icono) ? 'el indice' : 'ni el indice ni el catalogo';
      throw new Error(`${plugin.uuid}: el icono '${plugin.icono}' no esta en ${donde} DOT`);
    }
    const png = pngIcono(bits);
    writeFileSync(join(carpeta, 'icon.png'), png);
    sellarCategoryIcon(join(carpeta, 'manifest.json'), png);
    const zip = escribirZip(archivosDelPaquete(carpeta, plugin.uuid));
    const rutaZip = join(DESTINO, `${plugin.uuid}.streamDeckPlugin`);
    writeFileSync(rutaZip, zip);
    const sha256 = createHash('sha256').update(zip).digest('hex');
    entradas.push({
      kind: 'plugin',
      id: plugin.uuid,
      label: plugin.etiqueta,
      author: '@AndyVillatoro',
      description: plugin.descripcion,
      version: '1.0.0',
      url: `${BASE_CRUDO}/${plugin.uuid}.streamDeckPlugin`,
      sha256,
      uuid: plugin.uuid,
      license: 'MIT',
      icono: plugin.icono,
      tags: plugin.etiquetas,
      minAppVersion: VERSION_MINIMA,
    });
    console.log(`${plugin.uuid}.streamDeckPlugin  ${zip.length} bytes  ${png.length} bytes de icono  sha256 ${sha256.slice(0, 12)}`);
  }
  actualizarGaleria(entradas);
  console.log(`\n${entradas.length} plugins en ${relative(RAIZ, DESTINO)} y entradas en ${relative(RAIZ, MANIFIESTO_GALERIA)}`);
}

main();