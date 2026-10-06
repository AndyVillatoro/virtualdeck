import type { ButtonConfig } from '../types';

/**
 * El botón que se pide por id desde fuera de las pantallas: atajo global,
 * menú de la bandeja, mando móvil o `virtualdeck://press/<id>`.
 *
 * Un cuadrante de un botón 2×2 tiene su propio id y no está en
 * `config.buttons`: se arma un botón con sus campos y la página del padre,
 * para que `pulsarBoton` lo trate igual que a cualquier otro.
 */
export function botonPorId(botones: ButtonConfig[], id: string): ButtonConfig | undefined {
  const directo = botones.find((b) => b.id === id);
  if (directo) return directo;
  for (const padre of botones) {
    const sub = padre.subButtons?.find((s) => s.id === id);
    if (!sub) continue;
    return {
      id: sub.id, page: padre.page, label: sub.label || '', sublabel: sub.sublabel,
      icon: sub.icon, bgColor: sub.bgColor, fgColor: sub.fgColor,
      action: sub.action, actions: sub.actions, isToggle: sub.isToggle,
      actionToggleOff: sub.actionToggleOff, longPressAction: sub.longPressAction,
    };
  }
  return undefined;
}
