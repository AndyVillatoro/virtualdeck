/**
 * Lo que pertenece al EQUIPO y no a la configuración que se importa
 * (T-SEC-07, H-14).
 *
 * Un `.json` de configuración ajeno podía traer el mando LAN encendido con su
 * propio token y `allowLan`, o `sensors.lhmPath` + `spawnOnStart` +
 * `spawnElevated` apuntando a cualquier `.exe`, que se lanzaba elevado en el
 * siguiente arranque. Al importar, esos campos se quedan como están en este
 * equipo; botones, páginas, perfiles RGB y demás se importan igual que antes.
 *
 * Puro: lo usa el proceso principal al leer el archivo (`config:import`) y lo
 * prueba `scripts/probar-ajustes-equipo.ts`.
 */

type Objeto = Record<string, unknown>;

/** Secciones enteras que son del equipo. */
const SECCIONES_DEL_EQUIPO = ['remote', 'companion'] as const;

/** Campos sueltos que son del equipo dentro de una sección que sí se importa. */
const CAMPOS_DEL_EQUIPO: Record<string, readonly string[]> = {
  sensors: ['host', 'port', 'spawnOnStart', 'spawnElevated', 'lhmPath'],
  rgb: ['openrgbPath', 'host', 'port', 'spawnOnStart'],
};

const esObjeto = (v: unknown): v is Objeto => !!v && typeof v === 'object' && !Array.isArray(v);

/** Copia `clave` de `origen` a `destino`, o la quita si `origen` no la tiene. */
function copiarOQuitar(destino: Objeto, origen: Objeto | undefined, clave: string): void {
  if (origen && clave in origen) destino[clave] = origen[clave];
  else delete destino[clave];
}

export function conservarAjustesDelEquipo(importada: unknown, actual: unknown): unknown {
  if (!esObjeto(importada)) return importada;
  const local = esObjeto(actual) ? actual : {};
  const resultado: Objeto = { ...importada };
  for (const seccion of SECCIONES_DEL_EQUIPO) copiarOQuitar(resultado, local, seccion);
  for (const [seccion, campos] of Object.entries(CAMPOS_DEL_EQUIPO)) {
    const traida = resultado[seccion];
    if (!esObjeto(traida)) continue;
    const propia = esObjeto(local[seccion]) ? local[seccion] as Objeto : undefined;
    const mezclada: Objeto = { ...traida };
    for (const campo of campos) copiarOQuitar(mezclada, propia, campo);
    resultado[seccion] = mezclada;
  }
  return resultado;
}
