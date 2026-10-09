import type { ButtonAction, ButtonConfig, ModoPerilla } from '../../types';

/**
 * Perillas con varios modos («dial stacks», T-HW-19).
 *
 * Una perilla son 3 huecos seguidos (izq, pulsar, der). Si el botón del hueco
 * «pulsar» trae `modosPerilla` no vacío, la perilla es multimodo: **pulsar**
 * pasa al siguiente modo (con vuelta) en vez de ejecutar su acción, y
 * **girar** ejecuta `izq`/`der` del modo activo. El modo 0 son los propios
 * huecos izq/der de la perilla (lo de antes); los de `modosPerilla` son los
 * modos 1..n.
 *
 * Función pura a propósito: la elige `useSuperficies.onEntrada`, que se
 * registra una sola vez y lee el estado por referencia — la decisión de
 * qué botón/acción toca no depende de nada más que de la entrada, los tres
 * botones y el modo activo que le pasan.
 */

export interface EntradaModoPerilla {
  gesto: 'izq' | 'pulsar' | 'der';
  botonIzq?: ButtonConfig;
  botonPulsar?: ButtonConfig;
  botonDer?: ButtonConfig;
  /** Modo activo en memoria (0 = los huecos de la perilla). */
  modoActual: number;
}

export type SalidaModoPerilla =
  | { kind: 'nada' }
  | { kind: 'cambiarModo'; siguiente: number; total: number }
  | { kind: 'disparar'; boton: ButtonConfig };

/** Clave del modo activo en memoria: por serial e índice de perilla. */
export function claveModoPerilla(serial: string, perilla: number): string {
  return `${serial}:${perilla}`;
}


function botonDeHueco(e: EntradaModoPerilla): ButtonConfig | undefined {
  if (e.gesto === 'izq') return e.botonIzq;
  if (e.gesto === 'der') return e.botonDer;
  return e.botonPulsar;
}

/** El botón sintético que se dispara al girar en un modo 1..n. */
function botonDeModo(pulsar: ButtonConfig | undefined, modo: ModoPerilla, accion: ButtonAction): ButtonConfig {
  return {
    id: pulsar?.id ?? `modo-${modo.label}`,
    page: pulsar?.page ?? 0,
    label: modo.label,
    ...(modo.icon ? { icon: modo.icon } : {}),
    action: accion,
  };
}

export function resolverEntradaPerilla(e: EntradaModoPerilla): SalidaModoPerilla {
  const modos = e.botonPulsar?.modosPerilla ?? [];
  // Sin modos es como antes: cada gesto dispara el botón de su hueco.
  if (modos.length === 0) {
    const boton = botonDeHueco(e);
    return boton ? { kind: 'disparar', boton } : { kind: 'nada' };
  }
  const total = modos.length + 1;
  // El modo en memoria siempre cae en rango, pero si los modos se editaron
  // (se quitó el activo) podría no hacerlo: se acota, no se confía.
  const actual = ((e.modoActual % total) + total) % total;
  if (e.gesto === 'pulsar') {
    return { kind: 'cambiarModo', siguiente: (actual + 1) % total, total };
  }
  if (actual === 0) {
    const boton = botonDeHueco(e);
    return boton ? { kind: 'disparar', boton } : { kind: 'nada' };
  }
  const modo = modos[actual - 1];
  if (!modo) return { kind: 'nada' };
  const accion = e.gesto === 'izq' ? modo.izq : modo.der;
  if (!accion || accion.type === 'none') return { kind: 'nada' };
  return { kind: 'disparar', boton: botonDeModo(e.botonPulsar, modo, accion) };
}

/**
 * El modo activo es por página del dock: al cambiar, vuelve a 0.
 *
 * Pura para poder probarla: `useSuperficies` la llama con el antes/ahora de
 * sus páginas activas y guarda lo que devuelve.
 */
export function podarModosPorPagina(
  modos: Record<string, number>,
  antes: Record<string, string>,
  ahora: Record<string, string>,
): Record<string, number> {
  const cambiados = Object.keys(ahora)
    .filter((s) => antes[s] !== undefined && antes[s] !== ahora[s]);
  if (cambiados.length === 0) return modos;
  const next: Record<string, number> = {};
  for (const clave of Object.keys(modos)) {
    if (!cambiados.some((s) => clave === s || clave.startsWith(`${s}:`))) {
      const valor = modos[clave];
      if (valor !== undefined) next[clave] = valor;
    }
  }
  return next;
}

/** Llaves de seriales que ya no tienen página: no volverán a leerse. */
export function podarModosHuerfanos(
  modos: Record<string, number>,
  serialesVivos: string[],
): Record<string, number> {
  const claves = Object.keys(modos);
  if (claves.length === 0) return modos;
  const vivos = new Set(serialesVivos);
  let cambio = false;
  const next: Record<string, number> = {};
  for (const clave of claves) {
    const valor = modos[clave];
    if (valor === undefined) { cambio = true; continue; }
    if (vivos.has(clave.slice(0, clave.lastIndexOf(':')))) next[clave] = valor;
    else cambio = true;
  }
  return cambio ? next : modos;
}
