/**
 * Pruebas del empaquetador reproducible de la extensión Companion (T-EXT-03).
 *
 * No necesita Electron ni red: construye los dos ZIP en un directorio temporal,
 * lee su directorio central, descomprime los `manifest.json` y comprueba que
 * dos corridas producen exactamente el mismo sha256.
 *
 * Uso: `npx tsx scripts/probar-empaquetar-extension.ts`
 */

import assert from 'node:assert';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32, inflateRawSync } from 'node:zlib';
import { empaquetarExtension } from './empaquetar-extension.mjs';

/** Raíz del repo, para no depender del directorio desde el que se lanza. */
const RAIZ = dirname(dirname(fileURLToPath(import.meta.url)));
const ORIGEN = join(RAIZ, 'companion-extension');

/** Una entrada del directorio central de un ZIP. */
type EntradaZip = {
  nombre: string;
  offset: number;
  metodo: number;
  crc: number;
  tamComprimido: number;
  tamDatos: number;
};

type Resultado = { ruta: string; sha256: string; bytes: number };

const SIG_LOCAL = 0x04034b50;
const SIG_CENTRAL = 0x02014b50;
const SIG_FIN = 0x06054b50;
const ID_GECKO = 'companion@virtualdeck.app';

/** Archivos que debe traer cualquier paquete (los comunes + los iconos). */
const COMUNES = ['background.js', 'content.js', 'popup.css', 'popup.html', 'popup.js'];
const ICONOS = ['icons/icon-16.png', 'icons/icon-32.png', 'icons/icon-48.png', 'icons/icon-128.png'];
const ESPERADOS_CHROMIUM = ['manifest.json', ...COMUNES, 'offscreen.html', 'offscreen.js', ...ICONOS].sort();
const ESPERADOS_FIREFOX = ['manifest.json', ...COMUNES, ...ICONOS].sort();

/** Lee el directorio central (o lanza si el ZIP está corto o a medias). */
function indiceCentral(zip: Buffer): EntradaZip[] {
  let fin = -1;
  for (let i = zip.length - 22; i >= 0; i--) {
    if (zip.readUInt32LE(i) === SIG_FIN) {
      fin = i;
      break;
    }
  }
  assert.ok(fin >= 0, 'sin marca de fin de directorio central (EOCD)');

  const total = zip.readUInt16LE(fin + 10);
  const tamDirectorio = zip.readUInt32LE(fin + 12);
  let posicion = zip.readUInt32LE(fin + 16);
  const entradas: EntradaZip[] = [];
  for (let i = 0; i < total; i++) {
    assert.strictEqual(zip.readUInt32LE(posicion), SIG_CENTRAL, `directorio central roto en ${i}`);
    const nombreLen = zip.readUInt16LE(posicion + 28);
    const extraLen = zip.readUInt16LE(posicion + 30);
    const comentarioLen = zip.readUInt16LE(posicion + 32);
    entradas.push({
      nombre: zip.subarray(posicion + 46, posicion + 46 + nombreLen).toString('utf8'),
      offset: zip.readUInt32LE(posicion + 42),
      metodo: zip.readUInt16LE(posicion + 10),
      crc: zip.readUInt32LE(posicion + 16),
      tamComprimido: zip.readUInt32LE(posicion + 20),
      tamDatos: zip.readUInt32LE(posicion + 24),
    });
    posicion += 46 + nombreLen + extraLen + comentarioLen;
  }
  assert.strictEqual(
    posicion,
    zip.readUInt32LE(fin + 16) + tamDirectorio,
    'el directorio central no cuadra con el EOCD',
  );
  return entradas;
}

/** Descomprime una entrada con su cabecera local y valida su CRC-32. */
function leerEntrada(zip: Buffer, entrada: EntradaZip): Buffer {
  assert.strictEqual(zip.readUInt32LE(entrada.offset), SIG_LOCAL, `cabecera local rota: ${entrada.nombre}`);
  const nombreLen = zip.readUInt16LE(entrada.offset + 26);
  const extraLen = zip.readUInt16LE(entrada.offset + 28);
  const inicio = entrada.offset + 30 + nombreLen + extraLen;
  const comprimido = zip.subarray(inicio, inicio + entrada.tamComprimido);
  assert.strictEqual(entrada.metodo, 8, `${entrada.nombre}: método distinto de deflate`);
  const datos = inflateRawSync(comprimido);
  assert.strictEqual(datos.length, entrada.tamDatos, `${entrada.nombre}: tamaño sin cuadrar`);
  assert.strictEqual(crc32(datos), entrada.crc, `${entrada.nombre}: CRC-32 distinto`);
  return datos;
}

/** El `manifest.json` descomprimido de un paquete. */
function manifiestoDe(zip: Buffer): Record<string, any> {
  const entrada = indiceCentral(zip).find((e) => e.nombre === 'manifest.json');
  assert.ok(entrada, 'el ZIP no trae manifest.json');
  return JSON.parse(leerEntrada(zip, entrada).toString('utf8'));
}

/** Comprueba la forma del resumen y que el archivo en disco cuadra. */
function comprobarResultado(clave: string, resultado: Resultado, esperado: string) {
  assert.ok(existsSync(resultado.ruta), `${clave}: no se escribió ${resultado.ruta}`);
  assert.ok(resultado.ruta.endsWith(esperado), `${clave}: nombre de archivo inesperado`);
  const bytes = readFileSync(resultado.ruta);
  assert.strictEqual(bytes.length, resultado.bytes, `${clave}: bytes del resumen ≠ tamaño en disco`);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  assert.strictEqual(sha256, resultado.sha256, `${clave}: sha256 del resumen ≠ sha256 del archivo`);
  assert.match(resultado.sha256, /^[0-9a-f]{64}$/, `${clave}: sha256 mal formado`);
  return bytes;
}

/** Entradas de un paquete: mismas que las esperadas y en orden determinista. */
function comprobarEntradas(clave: string, zip: Buffer, esperados: string[]) {
  assert.strictEqual(zip.subarray(0, 4).readUInt32LE(0), SIG_LOCAL, `${clave}: no empieza por PK\\x03\\x04`);
  const nombres = indiceCentral(zip).map((e) => e.nombre);
  assert.deepStrictEqual(nombres, esperados, `${clave}: entradas inesperadas`);
  assert.deepStrictEqual([...nombres].sort(), nombres, `${clave}: entradas sin ordenar`);
  // Cada entrada se descomprime de verdad y su CRC cuadra.
  for (const entrada of indiceCentral(zip)) leerEntrada(zip, entrada);
  return nombres;
}

function main() {
  const raiz = mkdtempSync(join(tmpdir(), 'vd-extension-'));
  try {
    const corrida1 = empaquetarExtension({ dirSalida: join(raiz, 'corrida-1') });
    const corrida2 = empaquetarExtension({ dirSalida: join(raiz, 'corrida-2') });

    const zipChrome = comprobarResultado('chrome', corrida1.chrome, 'virtualdeck-companion-chrome.zip');
    const zipFirefox = comprobarResultado('firefox', corrida1.firefox, 'virtualdeck-companion-firefox.zip');

    const nombresChrome = comprobarEntradas('chrome', zipChrome, ESPERADOS_CHROMIUM);
    const nombresFirefox = comprobarEntradas('firefox', zipFirefox, ESPERADOS_FIREFOX);
    assert.ok(!nombresFirefox.includes('offscreen.html'), 'firefox: trae offscreen.html');
    assert.ok(!nombresFirefox.includes('offscreen.js'), 'firefox: trae offscreen.js');
    assert.ok(!nombresFirefox.includes('manifest.firefox.json'), 'firefox: manifest sin renombrar');
    console.log(`probar-empaquetar-extension: PK + directorio central ok (chrome ${nombresChrome.length}, firefox ${nombresFirefox.length} entradas)`);

    // El manifest de Chrome es el del repositorio, byte a byte.
    const manifestChromium = manifiestoDe(zipChrome);
    const manifestFirefox = manifiestoDe(zipFirefox);
    assert.deepStrictEqual(
      manifestChromium,
      JSON.parse(readFileSync(join(ORIGEN, 'manifest.json'), 'utf8')),
      'chrome: manifest.json distinto del repositorio',
    );
    assert.deepStrictEqual(
      manifestFirefox,
      JSON.parse(readFileSync(join(ORIGEN, 'manifest.firefox.json'), 'utf8')),
      'firefox: manifest.firefox.json distinto del repositorio',
    );

    // Chromium: service_worker y los permisos exclusivos de esa plataforma.
    assert.strictEqual(manifestChromium.manifest_version, 3, 'chrome: manifest_version');
    assert.strictEqual(manifestChromium.background?.service_worker, 'background.js', 'chrome: sin service_worker');
    assert.strictEqual(manifestChromium.background?.scripts, undefined, 'chrome: no debe llevar scripts');
    assert.ok(manifestChromium.permissions.includes('tabCapture'), 'chrome: falta tabCapture');
    assert.ok(manifestChromium.permissions.includes('offscreen'), 'chrome: falta offscreen');

    // Firefox: id de Gecko, background por scripts y permisos sin los de Chromium.
    assert.strictEqual(manifestFirefox.manifest_version, 3, 'firefox: manifest_version');
    assert.strictEqual(
      manifestFirefox.browser_specific_settings?.gecko?.id,
      ID_GECKO,
      'firefox: gecko.id inesperado',
    );
    assert.strictEqual(
      manifestFirefox.browser_specific_settings?.gecko?.strict_min_version,
      '121.0',
      'firefox: strict_min_version inesperado',
    );
    assert.deepStrictEqual(manifestFirefox.background?.scripts, ['background.js'], 'firefox: sin scripts');
    assert.strictEqual(manifestFirefox.background?.service_worker, undefined, 'firefox: no debe llevar service_worker');
    assert.deepStrictEqual(
      manifestFirefox.permissions,
      ['storage', 'alarms', 'activeTab'],
      'firefox: permisos inesperados',
    );
    assert.ok(!manifestFirefox.permissions.includes('tabCapture'), 'firefox: trae tabCapture');
    assert.ok(!manifestFirefox.permissions.includes('offscreen'), 'firefox: trae offscreen');
    assert.deepStrictEqual(
      manifestFirefox.host_permissions,
      manifestChromium.host_permissions,
      'firefox: host_permissions distintas',
    );
    assert.deepStrictEqual(
      manifestFirefox.content_scripts,
      manifestChromium.content_scripts,
      'firefox: content_scripts distintos',
    );
    console.log('probar-empaquetar-extension: manifest de chrome y firefox ok');

    // Determinismo: dos corridas, los mismos bytes y el mismo sha256.
    assert.strictEqual(corrida2.chrome.sha256, corrida1.chrome.sha256, 'chrome: sha256 no determinista');
    assert.strictEqual(corrida2.firefox.sha256, corrida1.firefox.sha256, 'firefox: sha256 no determinista');
    assert.strictEqual(corrida2.chrome.bytes, corrida1.chrome.bytes, 'chrome: bytes no deterministas');
    assert.strictEqual(corrida2.firefox.bytes, corrida1.firefox.bytes, 'firefox: bytes no deterministas');
    const zipChrome2 = readFileSync(corrida2.chrome.ruta);
    const zipFirefox2 = readFileSync(corrida2.firefox.ruta);
    assert.ok(zipChrome.equals(zipChrome2), 'chrome: dos corridas con bytes distintos');
    assert.ok(zipFirefox.equals(zipFirefox2), 'firefox: dos corridas con bytes distintos');
    console.log(`probar-empaquetar-extension: determinismo ok (chrome ${corrida1.chrome.sha256.slice(0, 12)}, firefox ${corrida1.firefox.sha256.slice(0, 12)})`);

    console.log('probar-empaquetar-extension: OK');
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
}

main();
