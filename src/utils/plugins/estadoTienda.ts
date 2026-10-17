import type { EntradaGaleria, PluginInfo } from '../../types';
import { versionMayor } from '../galeriaComun';

/**
 * Estado de un plugin de la tienda frente a lo instalado (T-TND-10).
 *
 * Puro para que la ficha de la tienda lo use sin pedir nada por IPC: dado el
 * manifiesto y la lista de plugins instalados, dice si el plugin está
 * `disponible`, `instalado` o `actualizable` (el manifiesto trae una versión
 * mayor que la instalada). Se casa por `uuid`, no por `id` de entrada: el
 * `id` nombra la fila del manifiesto y el `uuid` al plugin de verdad.
 */

export type EstadoPluginTienda = 'disponible' | 'instalado' | 'actualizable';

/** El estado de una entrada de plugin frente a lo instalado. */
export function estadoPluginTienda(
  entrada: EntradaGaleria,
  instalados: PluginInfo[],
): EstadoPluginTienda {
  if (!entrada.uuid) return 'disponible';
  const instalado = instalados.find((p) => p.uuid === entrada.uuid);
  if (!instalado) return 'disponible';
  if (entrada.version && instalado.version && versionMayor(entrada.version, instalado.version)) {
    return 'actualizable';
  }
  return 'instalado';
}
