/**
 * Reexportación del catálogo de marcas.
 *
 * Los datos viven en `src/comun/brandIcons.ts` porque el proceso principal
 * también los necesita (el mando móvil resuelve la marca en `src/comun/marcaSvg`),
 * y `electron/main` no puede importar de `src/data`. Aquí solo se conserva la
 * ruta vieja para no tocar a los llamadores (y para que el `import()` diferido
 * de `utils/catalogoMarcas` siga apuntando al mismo chunk).
 */

export * from '../comun/brandIcons';
