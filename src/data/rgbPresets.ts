/**
 * Los ids de los presets "inteligentes" del RGB.
 *
 * La lista de verdad es `SMART_PRESETS`, en `electron/main/rgb.ts`: si se pide
 * un id que no está allí, `applySmartPreset` devuelve `false` y el botón no
 * hace **nada**, sin error. Por eso `scripts/check-acciones.mjs` comprueba que
 * las dos listas coincidan.
 *
 * Estaba escrita a mano en dos sitios del editor —el formulario del paso 2 y
 * el selector de sub-acciones de las ramas— y uno de los dos enseñaba los ids
 * crudos en vez de los nombres traducidos.
 */
export const RGB_PRESET_IDS = [
  'off', 'gaming', 'cinema', 'work', 'rainbow', 'night-blue', 'alert-red',
] as const;

/** Clave de diccionario del nombre visible de un preset. */
export function clavePreset(id: string): string {
  return `rgb.preset.${id}`;
}
