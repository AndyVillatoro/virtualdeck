/**
 * Reexportación del pack de tipos de marca.
 *
 * Los tipos viven en `src/comun/brandIconTypes.ts` porque el proceso principal
 * también los necesita (el mando móvil resuelve la marca en `src/comun/marcaSvg`),
 * y `electron/main` no puede importar de `src/data`. Aquí solo se conserva la
 * ruta vieja para no tocar a los llamadores.
 */

export * from '../comun/brandIconTypes';
