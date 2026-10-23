/**
 * SHIM INTENCIONAL — NO borrar ni "unificar" con `src/types/` (roadmap 124).
 *
 * Un solo `export *`, pero lo importan ~199 ficheros del renderer por ruta
 * corta (`./types`, `../types`, `../../types`…) y 33 de `electron/main` por
 * `../../../src/types`: `.dependency-cruiser.cjs` permite a main/preload
 * `^src/types(/|\.ts$|$)` junto a `src/comun/`, o sea este shim forma parte
 * del contrato de dependencias. Los tipos de verdad viven en `src/types/`.
 */
export * from './types/index';
