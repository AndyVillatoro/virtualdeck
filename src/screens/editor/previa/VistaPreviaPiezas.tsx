/**
 * Fachada de la vista previa del editor: aquí siguen estando los mismos
 * exports con las mismas firmas de siempre, pero la carne vive en `piezas/`
 * (roadmap 121b: el archivo pasaba de 560 líneas y mezclaba todo).
 *
 * Quien importa de `./VistaPreviaPiezas` no cambia: `VistaPrevia.tsx` sigue
 * igual. Si vas a añadir algo, elige la pieza que le corresponda por
 * responsabilidad en vez de crecer este archivo.
 */
export type { VistaCampos } from './piezas/armarBoton';
export { armarBotonParaVista } from './piezas/armarBoton';
export { AlternadorToggle, AlternadorCuadrantes2x2, InfoAccionesExtra } from './piezas/alternadores';
export { SeccionHardwareDock, useDockInfoVista } from './piezas/hardware';
export { useConfigVivo, ejecutarClickPreview, useLiveWidgetData } from './piezas/vivo';
