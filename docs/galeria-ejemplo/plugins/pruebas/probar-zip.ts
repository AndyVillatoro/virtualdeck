/* Prueba de los seis `.streamDeckPlugin` de `docs/galeria-ejemplo/plugins/`.
 *
 * Pasa cada ZIP por lo mismo que pasa en la app: `extraerZipSeguro` (que es la
 * parte de instalacion que decide) y despues `leerManifiesto` sobre lo
 * extraido. Comprueba tambien que el sha256 del ZIP sea el que anuncia el
 * manifiesto de la galeria y que las imagenes que pintan los plugins passes
 * `resolverImagenVisual` (el filtro del anfitrion para `setImage`).
 *
 * Sin Electron: `instalacion.ts` y `manifiesto.ts` no lo necesitan. Correr en la
 * raiz del repo:
 *
 *   npm run build:plugins && npx tsx docs/galeria-ejemplo/plugins/pruebas/probar-zip.ts
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { extraerZipSeguro, validarUuid } from '../../../../electron/main/plugins/instalacion.ts';
import { leerManifiesto } from '../../../../electron/main/plugins/manifiesto.ts';
import { resolverImagenVisual } from '../../../../electron/main/plugins/validacion.ts';

const ORIGEN = resolve(join(import.meta.dirname, '..'));
const DIST = join(ORIGEN, 'dist');
const GALERIA = resolve(join(ORIGEN, '..', 'manifest.json'));

const fallos: string[] = [];

function comprobar(condicion: boolean, mensaje: string): void {
  if (condicion) return;
  fallos.push(mensaje);
  console.error('  FALLO: ' + mensaje);
}

/**
 * Las entradas de plugin del manifiesto de la galeria.
 *
 * Van dentro de `profiles` —es la unica lista que lee el cargador— con
 * `kind: 'plugin'` (`probar-manifiesto.ts` lo comprueba con el parser real).
 */
function entradasDeGaleria(): { uuid: string; sha256: string; url: string; icono: string }[] {
  const manifiesto = JSON.parse(readFileSync(GALERIA, 'utf-8'));
  if (!Array.isArray(manifiesto.profiles)) throw new Error('el manifiesto de la galeria no trae `profiles`');
  return manifiesto.profiles.filter((entrada: { kind?: string }) => entrada.kind === 'plugin');
}

async function pruebaPlugin(entrada: { uuid: string; sha256: string; url: string; icono: string }): Promise<void> {
  const zip = join(DIST, `${entrada.uuid}.streamDeckPlugin`);
  const carpeta = mkdtempSync(join(tmpdir(), 'vd-plugin-'));
  try {
    const sha = createHash('sha256').update(readFileSync(zip)).digest('hex');
    comprobar(sha === entrada.sha256, `${entrada.uuid}: el sha256 del ZIP no es el del manifiesto`);

    const resultado = await extraerZipSeguro(zip, carpeta);
    if (resultado.ok !== true) {
      comprobar(false, `${entrada.uuid}: extraerZipSeguro devolvio ${JSON.stringify(resultado)}`);
      return;
    }
    comprobar(validarUuid(resultado.uuid), `${entrada.uuid}: el ZIP no trae un uuid valido`);
    comprobar(resultado.uuid === entrada.uuid, `${entrada.uuid}: el ZIP instala otro plugin`);

    const lectura = leerManifiesto(resultado.carpeta);
    if (lectura.estado !== 'ok') {
      comprobar(false, `${entrada.uuid}: el manifiesto no vale (${lectura.codigo})`);
      return;
    }
    const manifiesto = lectura.manifiesto;
    comprobar(manifiesto.tipo === 'html', `${entrada.uuid}: CodePath ${manifiesto.codePath} no es HTML`);
    comprobar(manifiesto.acciones.length > 0, `${entrada.uuid}: el manifiesto no declara acciones`);
    const accion = manifiesto.acciones[0];
    comprobar(
      accion.uuid.startsWith(manifiesto.uuid + '.'),
      `${entrada.uuid}: la accion ${accion.uuid} no cuelga del uuid del plugin`,
    );
    comprobar(
      accion.controladores.includes('Keypad'),
      `${entrada.uuid}: la accion no declara el control Keypad`,
    );
    /* El PI va por accion (`PropertyInspectorPath`); si lo hay, que exista. */
    const pi = accion.piPath ?? manifiesto.piPath;
    comprobar(
      !accion.piPath || existsSync(join(resultado.carpeta, accion.piPath)),
      `${entrada.uuid}: el PI ${accion.piPath} no esta en el paquete`,
    );
    if (pi) {
      comprobar(
        readFileSync(join(resultado.carpeta, pi), 'utf-8').includes('sdk.js'),
        `${entrada.uuid}: el PI no usa el puente del protocolo`,
      );
    }
    const code = readFileSync(join(resultado.carpeta, manifiesto.codePath), 'utf-8');
    comprobar(code.includes('sdk.js') && code.includes('punto.js'), `${entrada.uuid}: el CodePath no carga el puente ni los puntos`);
    comprobar(!/[\u{1F300}-\u{1FAFF}]/u.test(code), `${entrada.uuid}: hay un emoji en el plugin`);

    /* La imagen que pinta tiene que pasar el filtro del anfitrion. */
    const imagen = 'data:image/svg+xml;base64,' + Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"></svg>',
      'utf-8',
    ).toString('base64');
    comprobar(resolverImagenVisual(imagen, resultado.carpeta) === imagen, `${entrada.uuid}: un SVG en base64 se rechaza`);
    comprobar(
      resolverImagenVisual('data:image/svg+xml,<svg/>', resultado.carpeta) === null,
      `${entrada.uuid}: un SVG sin base64 deberia rechazarse`,
    );

    console.log(`  ok ${entrada.uuid} (${manifiesto.nombre} ${manifiesto.version}, ${manifiesto.acciones.length} accion/es)`);
  } finally {
    rmSync(carpeta, { recursive: true, force: true });
  }
}

async function main(): Promise<void> {
  console.log('plugins: empaquetado y manifiesto');
  const entradas = entradasDeGaleria();
  comprobar(entradas.length === 6, `el manifiesto anuncia ${entradas.length} plugins y se esperan 6`);
  for (const entrada of entradas) {
    comprobar(entrada.url.endsWith(`${entrada.uuid}.streamDeckPlugin`), `${entrada.uuid}: la url no apunta a su ZIP`);
    comprobar(entrada.minAppVersion === '0.14.1', `${entrada.uuid}: minAppVersion ${entrada.minAppVersion}`);
    comprobar(entrada.license === 'MIT', `${entrada.uuid}: licencia ${entrada.license}`);
    comprobar(!!entrada.icono, `${entrada.uuid}: sin icono del catalogo DOT`);
    await pruebaPlugin(entrada);
  }
  if (fallos.length) {
    console.error(`\nplugins: ${fallos.length} fallo(s)`);
    process.exitCode = 1;
    return;
  }
  console.log('plugins: ok — 6 ZIP pasan extraerZipSeguro y leerManifiesto');
}

main();