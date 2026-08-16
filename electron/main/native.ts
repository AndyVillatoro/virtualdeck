/**
 * Carga del núcleo nativo (`vd-core`, compilado como módulo de Node).
 *
 * ## Por qué existe
 *
 * Toda la capa nativa de VirtualDeck pasaba por PowerShell con C# embebido en
 * cadenas: entre 150 y 400 ms por operación —solo *arrancar* `powershell.exe`
 * cuesta unos 150 ms en esta máquina— y los errores más caros del proyecto,
 * porque el compilador no puede revisar código que vive dentro de un string.
 *
 * `vd-core` hace lo mismo llamando a COM y WinRT en proceso: 2 ms.
 *
 * ## Por qué se carga así y no con un `import`
 *
 * El `.node` va **fuera del asar** (ver `asarUnpack` en package.json): Node no
 * puede cargar una biblioteca dinámica desde dentro del archivo empaquetado. Eso
 * obliga a resolver la ruta a mano, y a que sea distinta en desarrollo y en la
 * aplicación instalada.
 *
 * ## Y por qué puede faltar
 *
 * Si alguien clona el repositorio y no ha corrido `npm run build:native`, el
 * módulo no está. En vez de reventar al arrancar con un error de `require` que
 * no dice nada, se devuelve `null` y cada módulo decide qué hacer — hoy, seguir
 * usando su camino anterior.
 */

import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export interface AudioDevice {
  id: string;
  name: string;
  isDefault: boolean;
}

/** Lo que expone el módulo nativo. Los nombres los genera napi desde Rust. */
export interface NucleoNativo {
  version: () => string;
  listAudioDevices: () => AudioDevice[];
  setDefaultAudioDevice: (deviceId: string) => boolean;
  findAudioDeviceByName: (name: string) => AudioDevice | null;
}

/** Rutas donde puede estar el `.node`, en orden de preferencia. */
function rutasCandidatas(): string[] {
  const rutas: string[] = [];

  // Aplicación instalada: el empaquetador lo deja junto a los recursos, fuera
  // del asar.
  if (process.resourcesPath) {
    rutas.push(join(process.resourcesPath, 'app.asar.unpacked', 'native', 'vd-core.node'));
    rutas.push(join(process.resourcesPath, 'native', 'vd-core.node'));
  }
  // Desarrollo: lo que deja `npm run build:native` en la raíz del repositorio.
  rutas.push(join(process.cwd(), 'native', 'vd-core.node'));

  return rutas;
}

let cargado: NucleoNativo | null | undefined;

/**
 * Devuelve el núcleo nativo, o `null` si no está disponible.
 *
 * El resultado se recuerda: si falta, no tiene sentido volver a buscarlo en cada
 * llamada, y si está, cargarlo dos veces no aporta nada.
 */
export function nucleo(): NucleoNativo | null {
  if (cargado !== undefined) return cargado;

  const requerir = createRequire(import.meta.url);
  for (const ruta of rutasCandidatas()) {
    if (!existsSync(ruta)) continue;
    try {
      const modulo = requerir(ruta) as NucleoNativo;
      // Se llama a `version` antes de darlo por bueno: un `.node` de otra
      // arquitectura carga y luego falla en la primera llamada de verdad, que
      // es un sitio mucho peor para enterarse.
      console.log(`[nativo] núcleo ${modulo.version()} cargado desde ${ruta}`);
      cargado = modulo;
      return cargado;
    } catch (e) {
      console.error(`[nativo] no se pudo cargar ${ruta}:`, (e as Error).message);
    }
  }

  console.warn(
    '[nativo] núcleo no disponible; se usará el camino anterior (PowerShell). ' +
      'Ejecutá `npm run build:native` para compilarlo.',
  );
  cargado = null;
  return cargado;
}

/** Si el núcleo nativo está disponible. Para decidir qué camino tomar. */
export function hayNucleo(): boolean {
  return nucleo() !== null;
}
