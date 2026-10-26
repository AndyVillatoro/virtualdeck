/* Prueba del reemplazo en el sitio (T-PLG-04, 83 f).
 *
 * Carga `electron/main/plugins/instalar.ts` con un `electron` de mentira
 * (patrón de `probar-resumir-riesgo.ts`): `app.getPath` apunta a un área
 * temporal, `utilityProcess.fork` es un `child_process.fork` real y
 * `BrowserWindow.getAllWindows` no devuelve ventanas. Así el flujo entero
 * (extraer, validar, apartar la vieja, entrar la nueva, arrancar) corre con
 * disco y procesos de verdad, sin Electron.
 *
 * Correr en la raíz del repo:
 *   npx tsx scripts/probar-actualizar-plugin.ts
 *
 * Escenarios:
 * 1. Instalar v1 de cero (sin `actualizar`): `ok`, 1.0.0, en marcha.
 * 2. Actualizar el plugin en marcha a v2: `ok`, 2.0.0, re-arrancado,
 *    `<uuid>.global.json` intacto y sin `.old-*` ni temporales.
 * 3. Deshabilitar y actualizar a v3: `ok`, 3.0.0, sigue deshabilitado, no se
 *    arranca y `global.json` intacto (actualizar no rehabilita).
 * 4. Rehabilitar, bloquear la carpeta con un proceso vivo (su `cwd`) y
 *    actualizar a v4: `rename` falla con los reintentos, la vieja queda en su
 *    sitio y vuelve a correr, el temporal se limpia y `global.json` intacto.
 */

import { fork, spawn, type ForkOptions } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import Module, { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as zlib from 'node:zlib';

/** Área de trabajo: aquí viven `plugins/` y `plugins.json` de la prueba. */
const AREA = mkdtempSync(join(tmpdir(), 'vd-act-'));
const UUID = 'com.vd.prueba-actualizar';
const SELLO = '{"sello":"no-borrar"}';
const VIDA_PROCESO_MS = 12000;

/**
 * Un `BrowserWindow` que no muestra nada: solo las piezas que `procesos.ts` y
 * `eventos.ts` piden en el camino (en la prueba no se crea ninguna ventana:
 * los plugins de prueba son de tipo node).
 */
class VentanaFalsa {
  static getAllWindows(): unknown[] { return []; }
  webContents = { send() {}, on() {}, executeJavaScript: async () => {}, setWindowOpenHandler() { return {}; } };
  on() {}
  isDestroyed() { return true; }
  destroy() {}
  loadURL() { return Promise.resolve(); }
}

/** El `electron` que ven los módulos del gestor cargados más abajo. */
const electronFalso = {
  app: { getPath: () => AREA, getLocale: () => 'es-ES' },
  dialog: {},
  shell: { openExternal: async () => {} },
  session: { fromPartition: () => ({ setPermissionRequestHandler: () => {} }) },
  BrowserWindow: VentanaFalsa,
  utilityProcess: {
    fork: (modulo: string, argumentos: string[], opciones: object) =>
      fork(modulo, argumentos, { ...(opciones as ForkOptions), execArgv: [] }),
  },
};

function cargar(ruta: string): any {
  const cargaOriginal = Module._load;
  Module._load = function (request: string, ...resto: unknown[]) {
    if (request === 'electron') return electronFalso;
    return cargaOriginal.call(this, request, ...resto);
  };
  const exigir = createRequire(import.meta.url);
  try { return exigir(ruta); } finally { Module._load = cargaOriginal; }
}

const fallos: string[] = [];
function comprobar(cond: boolean, msg: string): void {
  if (cond) { console.log(`  ok ${msg}`); return; }
  fallos.push(msg);
  console.error(`  FALLO: ${msg}`);
}

function esperar(ms: number): Promise<void> {
  return new Promise((listo) => setTimeout(listo, ms));
}

/* --- El ZIP de mentira, escrito a mano como en `empaquetar-plugins.mjs` --- */

/** El CRC-32 de `zlib` si existe (Node >= 20.15); si no, la tabla estándar. */
function crc32(datos: Buffer): number {
  // Por propiedad, no por import nominal: en un Node sin `crc32`, el import
  // de la exportación inexistente revienta al cargar el módulo entero.
  const deZlib = (zlib as { crc32?: (d: Buffer) => number }).crc32;
  if (typeof deZlib === 'function') return deZlib(datos);
  let c = 0xffffffff;
  for (let i = 0; i < datos.length; i++) {
    c ^= datos[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
  }
  return (c ^ 0xffffffff) >>> 0;
}

/** Un ZIP deflate (cabeceras locales + central + fin) tal como lo espera yauzl. */
function zipDe(entradas: { nombre: string; datos: Buffer }[]): Buffer {
  const locales: Buffer[] = [];
  const central: Buffer[] = [];
  let desplazamiento = 0;
  for (const entrada of entradas) {
    const nombre = Buffer.from(entrada.nombre, 'utf8');
    const comprimido = zlib.deflateRawSync(entrada.datos, { level: 9 });
    const suma = crc32(entrada.datos);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(suma, 14);
    local.writeUInt32LE(comprimido.length, 18);
    local.writeUInt32LE(entrada.datos.length, 22);
    local.writeUInt16LE(nombre.length, 26);
    locales.push(local, nombre, comprimido);
    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0x0800, 8);
    cd.writeUInt16LE(8, 10);
    cd.writeUInt32LE(suma, 16);
    cd.writeUInt32LE(comprimido.length, 20);
    cd.writeUInt32LE(entrada.datos.length, 24);
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

/** Un `.streamDeckPlugin` con la versión dada: `manifest.json` + `plugin.js`. */
function paquete(version: string): string {
  const manifiesto = JSON.stringify({
    Name: 'Prueba actualizar',
    Version: version,
    UUID,
    OS: [{ Platform: 'windows' }],
    CodePath: 'plugin.js',
    Actions: [{ UUID: `${UUID}.accion`, Name: 'Prueba', Controllers: ['Keypad'] }],
  });
  const codigo = `// Solo tiene que seguir vivo con cwd en su carpeta:\nsetTimeout(() => process.exit(0), ${VIDA_PROCESO_MS});\n`;
  const ruta = join(AREA, `prueba-${version}.streamDeckPlugin`);
  writeFileSync(ruta, zipDe([
    { nombre: `${UUID}.sdPlugin/manifest.json`, datos: Buffer.from(manifiesto, 'utf8') },
    { nombre: `${UUID}.sdPlugin/plugin.js`, datos: Buffer.from(codigo, 'utf8') },
  ]));
  return ruta;
}

/* --- Sondas de disco sobre lo que la prueba no debe poder romper --- */

/* Cargados una vez, con el `electron` de mentira ya en su sitio: los tres son
 * instancias compartidas (instalar.ts importa estado y cicloVida). */
const gestor = cargar('../electron/main/plugins/instalar');
const ciclo = cargar('../electron/main/plugins/cicloVida');
const { estado: estadoVivo, dirDe, dirPlugins } = cargar('../electron/main/plugins/estado');

function versionEnDisco(): string {
  return String(JSON.parse(readFileSync(join(dirDe(UUID), 'manifest.json'), 'utf-8')).Version);
}

function selloEnDisco(): string | null {
  try { return readFileSync(join(dirPlugins(), `${UUID}.global.json`), 'utf-8'); } catch { return null; }
}

/** En `plugins/` solo puede quedar el plugin y su `global.json`: sin residuos. */
function sinResiduos(): boolean {
  return readdirSync(dirPlugins()).every((nombre) => !nombre.startsWith('.'));
}

async function main(): Promise<void> {
  const zipV1 = paquete('1.0.0');
  const zipV2 = paquete('2.0.0');
  const zipV3 = paquete('3.0.0');
  const zipV4 = paquete('4.0.0');

  // 1) Instalar de cero: el camino de siempre, sin opciones.
  console.log('\n1. instalar v1 de cero');
  const r1 = await gestor.instalarDesdeZip(zipV1);
  comprobar(r1.ok === true, 'instalar v1: ok');
  if (r1.ok === true) comprobar(r1.plugin.version === '1.0.0', 'instalar v1: version 1.0.0');
  comprobar(estadoVivo.enMarcha.has(UUID), 'instalar v1: en marcha');
  writeFileSync(join(dirPlugins(), `${UUID}.global.json`), SELLO, 'utf-8');

  // 2) Actualizar en el sitio con el plugin en marcha.
  console.log('\n2. actualizar a v2 en marcha');
  const r2 = await gestor.instalarDesdeZip(zipV2, { uuidEsperado: UUID, actualizar: true });
  comprobar(r2.ok === true, 'actualizar v2: ok');
  if (r2.ok === true) comprobar(r2.plugin.version === '2.0.0', 'actualizar v2: version 2.0.0');
  comprobar(estadoVivo.enMarcha.has(UUID), 'actualizar v2: sigue en marcha');
  comprobar(selloEnDisco() === SELLO, 'actualizar v2: global.json intacto');
  comprobar(sinResiduos(), 'actualizar v2: sin .old-* ni temporales');

  // 3) Deshabilitar y actualizar: no se rehabilita ni se arranca.
  console.log('\n3. deshabilitar y actualizar a v3');
  await gestor.habilitarPlugin(UUID, false);
  comprobar(!estadoVivo.enMarcha.has(UUID), 'deshabilitar: sin marcha');
  const r3 = await gestor.instalarDesdeZip(zipV3, { uuidEsperado: UUID, actualizar: true });
  comprobar(r3.ok === true, 'actualizar v3: ok');
  if (r3.ok === true) {
    comprobar(r3.plugin.version === '3.0.0', 'actualizar v3: version 3.0.0');
    comprobar(r3.plugin.habilitado === false, 'actualizar v3: sigue deshabilitado');
  }
  comprobar(!estadoVivo.enMarcha.has(UUID), 'actualizar v3: no se arranca');
  comprobar(estadoVivo.deshabilitados.has(UUID), 'actualizar v3: sigue en deshabilitados');
  comprobar(selloEnDisco() === SELLO, 'actualizar v3: global.json intacto');

  // 4) Carpeta bloqueada por un proceso vivo: el reemplazo falla entero y la
  //    versión vieja queda corriendo, como promete el diseño.
  console.log('\n4. actualizar a v4 con la carpeta bloqueada');
  await gestor.habilitarPlugin(UUID, true);
  const bloqueo = spawn(process.execPath, ['-e', `setTimeout(() => {}, ${VIDA_PROCESO_MS})`], {
    cwd: dirDe(UUID), windowsHide: true, stdio: 'ignore',
  });
  await esperar(300); // que el proceso de bloqueo pise su cwd
  const r4 = await gestor.instalarDesdeZip(zipV4, { uuidEsperado: UUID, actualizar: true });
  comprobar(r4.ok === false && r4.codigo === 'zip' && r4.detalle === 'rename', 'actualizar v4: rename falla');
  comprobar(versionEnDisco() === '3.0.0', 'actualizar v4: la vieja queda en su sitio (3.0.0)');
  comprobar(estadoVivo.enMarcha.has(UUID), 'actualizar v4: la marcha se recompuso');
  comprobar(selloEnDisco() === SELLO, 'actualizar v4: global.json intacto');
  comprobar(sinResiduos(), 'actualizar v4: sin .old-* ni temporales');

  bloqueo.kill();
  await esperar(300);

  ciclo.detenerGestorPlugins();
  rmSync(AREA, { recursive: true, force: true });

  if (fallos.length > 0) {
    console.error(`\nprobar-actualizar-plugin: ${fallos.length} fallo(s)`);
    process.exit(1);
  }
  console.log('\nprobar-actualizar-plugin: ok');
  process.exit(0);
}

main().catch((e: Error) => {
  console.error(`probar-actualizar-plugin: revienta: ${e.message}`);
  cicloFinal();
  process.exit(1);
});

/** Si la prueba revienta a mitad, no deja procesos del plugin colgados. */
function cicloFinal(): void {
  try {
    ciclo.detenerGestorPlugins();
  } catch {
    /* ya no había nada que detener */
  }
  if (existsSync(AREA)) rmSync(AREA, { recursive: true, force: true });
}
