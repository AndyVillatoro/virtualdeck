import type { ButtonConfig, ButtonAction, CycleStep } from '../types';

/**
 * Aspecto reactivo de un botón `cycle`: enseña el label, sublabel, icono y
 * colores del paso actual (el índice guardado en `state['__cycle_' + id]`).
 *
 * Vive en `src/comun/` porque las cinco superficies (deck, kiosko, barra,
 * tecla LCD y mando móvil) tienen que dar el mismo resultado. Puro: sin React,
 * DOM, Electron ni Node.
 */

/** Dónde guarda un botón `cycle` su paso actual: `config.state['__cycle_<id>']`. */
export const claveCiclo = (id: string): string => `__cycle_${id}`;

export interface AspectoCiclo {
  label?: string;
  sublabel?: string;
  icon?: string;
  iconoPuntos?: { bits: string; origen: string };
  fgColor?: string;
  bgColor?: string;
}

/** El paso actual según el estado guardado. */
function pasoActualCiclo(
  action: ButtonAction,
  state: Record<string, string> | undefined,
  buttonId: string,
): CycleStep | undefined {
  if (action.type !== 'cycle') return undefined;
  const pasos = action.cycleSteps ?? [];
  if (pasos.length === 0) return undefined;
  const raw = state?.[claveCiclo(buttonId)] ?? '0';
  let idx = parseInt(raw, 10);
  if (!Number.isFinite(idx) || idx < 0 || idx >= pasos.length) idx = 0;
  return pasos[idx];
}

/** El aspecto visual del paso actual. */
export function resolverAspectoCiclo(
  action: ButtonAction,
  state: Record<string, string> | undefined,
  buttonId: string,
): AspectoCiclo | null {
  const paso = pasoActualCiclo(action, state, buttonId);
  if (!paso) return null;
  return {
    label: paso.label,
    sublabel: paso.sublabel,
    icon: paso.icon,
    iconoPuntos: paso.iconoPuntos,
    fgColor: paso.fgColor,
    bgColor: paso.bgColor,
  };
}

/** Lo mínimo que puede recibir `aplicarAspectoCiclo`. */
export interface ReceptorCiclo {
  label?: string;
  sublabel?: string;
  icon?: string;
  iconoPuntos?: { bits: string; origen: string };
  fgColor?: string;
  bgColor?: string;
  action?: { type: string };
}

/**
 * Aplica el aspecto del paso actual. A diferencia del audio, aquí **gana el
 * paso**: lo que se configura en el botón es solo el respaldo para los campos
 * que el paso deja vacíos (si no, un botón con rótulo propio —lo normal— no
 * enseñaría nunca en qué paso está).
 */
export function aplicarAspectoCiclo<T extends ReceptorCiclo>(boton: T, aspecto: AspectoCiclo | null): T {
  if (!aspecto) return boton;
  const lleno = (v?: string) => (v?.trim() ? v : undefined);
  return {
    ...boton,
    label: lleno(aspecto.label) ?? boton.label,
    sublabel: lleno(aspecto.sublabel) ?? boton.sublabel,
    icon: lleno(aspecto.icon) ?? boton.icon,
    iconoPuntos: aspecto.iconoPuntos ?? boton.iconoPuntos,
    fgColor: aspecto.fgColor ?? boton.fgColor,
    bgColor: aspecto.bgColor ?? boton.bgColor,
  };
}

/** Versión completa: recibe el botón entero y devuelve uno con el aspecto aplicado. */
export function botonConAspectoCiclo(boton: ButtonConfig, state: Record<string, string> | undefined): ButtonConfig {
  if (boton.action.type !== 'cycle') return boton;
  const aspecto = resolverAspectoCiclo(boton.action, state, boton.id);
  return aplicarAspectoCiclo(boton, aspecto);
}
