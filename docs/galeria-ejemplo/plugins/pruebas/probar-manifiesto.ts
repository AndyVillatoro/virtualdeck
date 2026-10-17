/* El manifiesto de la galeria pasado por el cargador de verdad.
 *
 * `electron/main/galeria.ts` es el que decide si una entrada se ve en la
 * tienda: `manifiesto()` lee `profiles` (linea 170), `sanearEntrada` separa
 * `profile`/`page`/`plugin` y `traeRespaldoPlugin` **deja fuera** los plugins sin
 * sha256 o sin uuid (uno sin los dos no se instala, asi que ni se lista).
 *
 * Ese modulo pide `net` de electron para bajarse el manifiesto, asi que aqui se
 * sustituye `electron` por un `fetch` que devuelve el manifiesto de este
 * repositorio —el mismo parche `Module._load` que usa `ps-helpers.ts`—. Todo lo
 * demas es el codigo real: filtro de direcciones, saneado y los dos campos que
 * hacen falta para instalar.
 *
 * Correr en la raiz del repo:
 *
 *   npm run build:plugins && npx tsx docs/galeria-ejemplo/plugins/pruebas/probar-manifiesto.ts
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import Module, { createRequire } from 'node:module';
import { join, resolve } from 'node:path';

const RAIZ = resolve(join(import.meta.dirname, '..', '..', '..', '..'));
const MANIFIESTO = join(RAIZ, 'docs', 'galeria-ejemplo', 'manifest.json');
const DIST = join(RAIZ, 'docs', 'galeria-ejemplo', 'plugins', 'dist');
const URL_CRDU = 'https://raw.githubusercontent.com/AndyVillatoro/virtualdeck/main/docs/galeria-ejemplo/manifest.json';
const SHA_RE = /^[0-9a-f]{64}$/;
const fallos: string[] = [];

function comprobar(condicion: boolean, mensaje: string): void {
  if (condicion) return;
  fallos.push(mensaje);
  console.error('  FALLO: ' + mensaje);
}

/** El manifiesto tal cual esta en disco, que es el que se sirve. */
const servido = readFileSync(MANIFIESTO, 'utf-8');

/**
 * El `electron` de mentira: `net.fetch` devuelve el manifiesto local y `app` lo
 * justo para que `idioma.ts` resuelva un idioma (`galeria.ts` lo importa para
 * los textos del resumen de riesgo).
 */
const electronFalso = {
  net: {
    fetch: async (url: string) => {
      comprobar(url === URL_CRDU, `la tienda bajaria ${url}, no el manifiesto del repositorio`);
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => servido,
      };
    },
  },
  app: {
    getLocale: () => 'es-ES',
    getPath: () => RAIZ,
    isPackaged: false,
    on: () => undefined,
    whenReady: async () => undefined,
  },
};

interface Entrada {
  id: string;
  kind?: 'profile' | 'page' | 'plugin';
  sha256?: string;
  uuid?: string;
  url?: string;
  icono?: string;
  [clave: string]: unknown;
}

async function main(): Promise<void> {
  /* El parche va antes de cargar `galeria.ts`: pide `electron` al importarse. */
  const cargar = createRequire(import.meta.url);
  const cargaOriginal = Module._load;
  Module._load = function (request: string, ...resto: unknown[]) {
    if (request === 'electron') return electronFalso;
    return cargaOriginal.call(this, request, ...resto);
  };
  let galeria: typeof import('../../../../electron/main/galeria');
  try {
    galeria = cargar('../../../../electron/main/galeria.ts');
  } finally {
    Module._load = cargaOriginal;
  }

  console.log('plugins: el manifiesto con el cargador de la tienda');
  const leido = await galeria.manifiesto(URL_CRDU);
  comprobar(leido.ok === true, `el cargador no acepto el manifiesto: ${(leido as { error?: string }).error ?? '?'}`);
  if (leido.ok !== true) {
    console.error(`\nplugins: ${fallos.length} fallo(s)`);
    process.exitCode = 1;
    return;
  }

const entradas = leido.profiles as unknown as Entrada[];
  const plugins = entradas.filter((entrada) => entrada.kind === 'plugin');
  const paginas = entradas.filter((entrada) => entrada.kind === 'page');
  /* Lo que no trae `kind` es perfil (formato v1): `tipoDe` devuelve indefinido. */
  const perfiles = entradas.filter((entrada) => entrada.kind === undefined);
  comprobar(plugins.length === 6, `el cargador ve ${plugins.length} plugins y se esperan 6`);
  comprobar(entradas.length === 8, `el cargador ve ${entradas.length} entradas y se esperan 8 (2 de antes + 6 plugins)`);
  comprobar(perfiles.length === 1 && paginas.length === 1, 'los perfiles y paginas de antes deberian seguir en su sitio');

  for (const plugin of plugins) {
    const etiqueta = plugin.uuid ?? plugin.id;
    comprobar(SHA_RE.test(plugin.sha256 ?? ''), `${etiqueta}: el cargador exige sha256 de 64 hex`);
    comprobar(!!plugin.uuid, `${etiqueta}: el cargador exige uuid`);
    comprobar(
      (plugin.url ?? '').endsWith(`${plugin.uuid}.streamDeckPlugin`),
      `${etiqueta}: la url no apunta a su .streamDeckPlugin`,
    );
    comprobar(!!plugin.icono, `${etiqueta}: sin icono del catalogo DOT`);
    /* El sha256 que paso el cargador tiene que ser el del ZIP de verdad. */
    const zip = join(DIST, `${plugin.uuid}.streamDeckPlugin`);
    const real = createHash('sha256').update(readFileSync(zip)).digest('hex');
    comprobar(real === plugin.sha256, `${etiqueta}: el sha256 del manifiesto no es el del ZIP`);
    /* Y lo que el cargador ensena de un plugin: que ejecuta codigo ajeno. */
    const riesgo = galeria.resumirRiesgoPlugin(plugin as never);
    comprobar(riesgo.scripts.length === 1 && riesgo.scripts[0].includes(plugin.uuid as string), `${etiqueta}: el resumen de riesgo deberia nombrar el plugin`);
    console.log(`  ok ${etiqueta} — ${plugin.sha256?.slice(0, 12)} (${plugin.label})`);
  }

  if (fallos.length) {
    console.error(`\nplugins: ${fallos.length} fallo(s)`);
    process.exitCode = 1;
    return;
  }
  console.log('plugins: ok — el cargador ve 6 plugins en `profiles`, con sha256 y uuid');
}

main();