import type { PluginInfo } from '../../types';

/**
 * Inventario de plugins sin uuid repetido.
 *
 * El inventario sale de leer las carpetas `<uuid>.sdPlugin` de
 * `userData/plugins` (`electron/main/plugins/inventario.ts`): una copia o los
 * restos de una instalación cortada pueden dejar el mismo uuid en dos
 * carpetas, y entonces la lista lo trae dos veces. El primero gana y el orden
 * se mantiene — un plugin se identifica por su uuid, así que se enseña una
 * vez. El manifiesto de la tienda manda sobre este inventario: la tarjeta de
 * la tienda siempre es la entrada del manifiesto, y esto solo quita repetidos
 * del inventario local.
 */
export function deduplicarPlugins(plugins: PluginInfo[]): PluginInfo[] {
  const vistos = new Set<string>();
  const salida: PluginInfo[] = [];
  for (const p of plugins) {
    if (vistos.has(p.uuid)) continue;
    vistos.add(p.uuid);
    salida.push(p);
  }
  return salida;
}
