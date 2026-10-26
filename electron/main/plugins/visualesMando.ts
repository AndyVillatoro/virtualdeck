import type { AvisoVisual } from './ordenesVisuales';
import { bytesDeBase64 } from './validacion';

/**
 * Lo último que cada plugin ha pintado en cada botón, en el **proceso
 * principal** (roadmap 83 c): la copia que el mando móvil necesita, porque el
 * aviso `plugins:visual` de `eventos.ts` solo alcanza a las `BrowserWindow`
 * del renderer y la página del mando se sirve por HTTP.
 *
 * Es la mitad del store que el renderer ya mantiene en
 * `src/utils/plugins/visual.ts` (mismas reglas de fusión: un `setTitle` no
 * borra la imagen que pintó un `setImage` anterior), pero guardando solo lo
 * que el mando puede enseñar: la imagen tiene que ser un `data:` de
 * raster (png/jpeg/gif/webp, no SVG) y no pasar del tope, y el `estado` de
 * `setState` no viaja porque la página no sabe qué hacer con él.
 *
 * La validación va **a la entrada**, una vez por orden visual, no en cada
 * `/api/buttons`: el mando sondea cada 3 s y por cada botón de plugin.
 *
 * Puro a propósito (sin Electron ni disco): se prueba con
 * `scripts/probar-visual-mando.ts` (`npx tsx` en la raíz del repo) sin
 * levantar la aplicación.
 */

/** Lo que el mando móvil necesita por botón de plugin. */
export interface VisualPluginMando {
  /** `data:image/...;base64,...` raster, o `''` (el plugin la borró). */
  imagen?: string;
  /** El último `setTitle`; sustituye al rótulo del botón. */
  titulo?: string;
}

/**
 * Mimes de imagen aceptadas para el móvil. El deck también enseña SVG (la
 * `CapasDeFondo` lo carga como `<img>`), pero la página del mando es una
 * página servida en la LAN: el encargo T-PLG-05 acota el raster del plano.
 */
const IMAGEN_MANDO_RE = /^data:image\/(png|jpeg|gif|webp);base64,/;

/** Tope de una imagen de plugin en data URL (decodificada), por botón. */
export const LIMITE_IMAGEN_MANDO_BYTES = 256 * 1024;

const ultimo = new Map<string, VisualPluginMando>();

/**
 * La imagen de un aviso, lista para el mando, o `undefined` si no llega
 * «pintada»:
 *
 * - `''` (el plugin borra la suya) vale tal cual.
 * - Un `data:` raster dentro del tope vale tal cual.
 * - Lo demás (SVG, otro MIME, un `data:` de raster fuera del tope) se salta:
 *   un `setImage` que el mando no puede representar no borra lo anterior,
 *   igual que el anfitrión ignora un `setImage` rechazado — el renderer
 *   tampoco se entera (`avisoVisualDe` devuelve `null`)— y el móvil se queda
 *   con lo último que sí pudo enseñar.
 */
function imagenParaMando(imagen: string | undefined): string | undefined {
  if (imagen === undefined) return undefined;
  if (imagen === '') return '';
  if (!IMAGEN_MANDO_RE.test(imagen)) return undefined;
  return bytesDeBase64(imagen) <= LIMITE_IMAGEN_MANDO_BYTES ? imagen : undefined;
}

/** Guarda lo pintado por un plugin, fusionando claves (un `setTitle` no borra la imagen). */
export function guardarVisualMando(visual: AvisoVisual): void {
  const fusion: VisualPluginMando = { ...ultimo.get(visual.contexto) };
  const imagen = imagenParaMando(visual.imagen);
  if (imagen !== undefined) fusion.imagen = imagen;
  if (visual.titulo !== undefined) fusion.titulo = visual.titulo;
  // Un aviso que no trae nada pintado (un `setState`, un `setTitle` a nada)
  // no crea entradas nuevas: solo completa las que ya había.
  if (!ultimo.has(visual.contexto) && fusion.imagen === undefined && fusion.titulo === undefined) {
    return;
  }
  ultimo.set(visual.contexto, fusion);
}

/** Olvida lo pintado por un contexto que ya no está en pantalla (o murió). */
export function olvidarVisualMando(contexto: string): void {
  ultimo.delete(contexto);
}

/** Olvida lo pintado por varios contextos (los de un plugin detenido o borrado). */
export function olvidarVisualesDe(contextos: string[]): void {
  for (const contexto of contextos) ultimo.delete(contexto);
}

/** Lo que el plugin pintó en este contexto, o `undefined` si no hay nada. */
export function visualParaMando(contexto: string): VisualPluginMando | undefined {
  const visual = ultimo.get(contexto);
  if (!visual) return undefined;
  // Ni imagen vacía ni título vacío cuentan como visual: el botón se queda
  // con su arte estático y su propio rótulo, como pide el encargo.
  if (!visual.imagen && !visual.titulo) return undefined;
  return visual;
}
