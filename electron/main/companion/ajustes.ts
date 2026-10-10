import { app } from 'electron';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs';
import { join } from 'path';
import {
  COMPANION_POR_DEFECTO,
  puertoCompanionValido,
  type CompanionSettings,
} from '../../../src/types';

/**
 * Dónde viven los ajustes de la extensión compañera.
 *
 * **No van en `deck-config.json`**, y es a propósito. El deck —la ventana
 * principal— tiene la configuración entera en memoria y la vuelve a escribir
 * completa en cada cambio (`api.config.save`), desde el estado de React. Un
 * campo que solo el proceso principal actualiza se lo lleva por delante el
 * siguiente guardado: es el motivo por el que existe `useConfigExterna` con su
 * lista de campos «adoptados», y por el que el token efímero se regeneraba en
 * cada arranque sin que nadie lo notara.
 *
 * Un archivo propio, al lado de la configuración, no lo puede pisar nadie más.
 * Se lee también el bloque `companion` de `deck-config.json` si existe, para
 * que una configuración que ya trajera estos ajustes no se quede sin ellos.
 */

const ARCHIVO = 'companion.json';
const CONFIG_DECK = 'deck-config.json';

function rutaAjustes(): string {
  return join(app.getPath('userData'), ARCHIVO);
}

/** Ajustes que nunca se escriben tal cual: se limpian al leer y al guardar. */
function sanear(bruto: unknown): CompanionSettings {
  const b = (typeof bruto === 'object' && bruto !== null ? bruto : {}) as Partial<CompanionSettings>;
  const puerto = b.port;
  return {
    enabled: b.enabled !== false,
    port: typeof puerto === 'number' && puertoCompanionValido(puerto) ? puerto : COMPANION_POR_DEFECTO.port,
    token: typeof b.token === 'string' ? b.token : '',
  };
}

/** Bloque `companion` de la configuración del deck, si alguien lo guardó ahí. */
function delDeckConfig(): Partial<CompanionSettings> | null {
  try {
    const ruta = join(app.getPath('userData'), CONFIG_DECK);
    if (!existsSync(ruta)) return null;
    const datos = JSON.parse(readFileSync(ruta, 'utf-8')) as { companion?: unknown };
    return typeof datos.companion === 'object' && datos.companion !== null
      ? (datos.companion as Partial<CompanionSettings>)
      : null;
  } catch {
    return null;
  }
}

export function leerAjustesCompanion(): CompanionSettings {
  try {
    const ruta = rutaAjustes();
    if (existsSync(ruta)) {
      return sanear(JSON.parse(readFileSync(ruta, 'utf-8')));
    }
  } catch {
    // Archivo ilegible: se regenera abajo en vez de impedir arrancar la app.
  }
  const heredados = delDeckConfig();
  if (heredados) return sanear(heredados);
  return { ...COMPANION_POR_DEFECTO, token: '' };
}

/**
 * Escritura a temporal y renombrado, como `configManager`: escribir encima
 * trunca el archivo, y un corte aquí —que es el que guarda con qué token se
 * emparejó la extensión— dejaría a la extensión sin poder conectar.
 */
export function guardarAjustesCompanion(ajustes: CompanionSettings): void {
  try {
    const dir = app.getPath('userData');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const ruta = rutaAjustes();
    const temporal = `${ruta}.tmp`;
    writeFileSync(temporal, JSON.stringify(sanear(ajustes), null, 2), 'utf-8');
    renameSync(temporal, ruta);
  } catch {
    // Sin permiso o disco lleno: se sigue con los ajustes en memoria.
  }
}