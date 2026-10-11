import { useSyncExternalStore } from 'react';
import type { PluginVisual } from '../../types/plugins';

/**
 * Lo último que cada plugin ha pintado en cada botón (`setImage`, `setTitle`,
 * `setState`), guardado por `contexto`.
 *
 * Es un store y no estado de React a propósito: lo escribe un evento del
 * proceso principal que llega **sin que nadie lo haya pedido**, y lo lee una
 * celda que está memoizada (`ButtonCell` solo se redibuja cuando cambian sus
 * props). Pasarlo por prop obligaría a subirlo hasta el deck entero; con
 * `useSyncExternalStore` la celda que lo necesita se entera sola, y solo esa.
 *
 * El snapshot es el objeto guardado, que no cambia entre actualizaciones: es
 * lo que pide `useSyncExternalStore` (un `getSnapshot` que devuelve algo
 * nuevo en cada llamada provocaría un bucle de renders).
 */

const visuales = new Map<string, PluginVisual>();
const oyentes = new Set<() => void>();

/** Guarda lo pintado por un plugin y avisa a las celdas de ese contexto. */
export function guardarVisual(visual: PluginVisual): void {
  visuales.set(visual.contexto, visual);
  for (const o of oyentes) o();
}

/**
 * Olvida lo pintado por un contexto que ya no está en pantalla.
 *
 * Sin esto, un plugin que se desinstala deja su imagen clavada en la celda
 * para siempre: no vuelve a mandar `setImage` y el botón se queda con la
 * última foto que dio.
 */
export function borrarVisual(contexto: string): void {
  if (!visuales.has(contexto)) return;
  visuales.delete(contexto);
  for (const o of oyentes) o();
}

function suscribir(oyente: () => void): () => void {
  oyentes.add(oyente);
  return () => { oyentes.delete(oyente); };
}

/**
 * Lo que el plugin pintó en este botón, o `undefined`.
 *
 * Con `contexto === null` (el botón no es de plugin) no se abre la suscripción:
 * una celda normal no tiene por qué enterarse de los `setImage` de nadie.
 */
export function useVisualPlugin(contexto: string | null): PluginVisual | undefined {
  return useSyncExternalStore(
    suscribir,
    () => (contexto ? visuales.get(contexto) : undefined),
    () => undefined,
  );
}
