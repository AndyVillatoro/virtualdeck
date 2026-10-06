import type { Sensor, SensorCondition } from '../types';

/**
 * Quién se ve y qué condición se cumple, compartido entre el deck y el mando.
 *
 * Vive en `src/comun/` porque las dos partes aplican la misma regla y la copia
 * del mando (`mandoVivo.ts`) ya había divergido en detalles: el proceso
 * principal no puede importar de `src/utils` (regla `main-no-renderer`).
 */

/** El nombre de proceso tal como se guarda y se compara: sin `.exe`, minúsculas, sin espacios. */
export function normalizarApp(valor: string | null | undefined): string {
  return (valor ?? '').trim().replace(/\.exe$/i, '').toLowerCase();
}

/** Evalúa una condición de sensor contra el valor actual. */
export function evalCondition(cond: SensorCondition, current: number): boolean {
  switch (cond.op) {
    case '>':  return current > cond.value;
    case '<':  return current < cond.value;
    case '>=': return current >= cond.value;
    case '<=': return current <= cond.value;
    case '==': return current === cond.value;
  }
}

/** Lo mínimo de un botón para decidir su visibilidad condicional. */
export interface BotonVisible {
  visibleIf?: { app?: string; sensor?: SensorCondition };
}

/**
 * Visibilidad condicional: por aplicación en primer plano o por sensor.
 *
 * `sensores === null` significa «aquí no hay lecturas de sensores», no «el
 * sensor no tiene valor»: la condición por sensor se ignora y el botón se ve.
 * Sin dato del sensor (lista no nula pero sin ese id) → oculto, que es lo
 * mismo que «la condición no se cumple».
 */
export function botonVisibleSegun(
  boton: BotonVisible,
  procesos: ReadonlySet<string>,
  sensores: Sensor[] | null,
): boolean {
  const v = boton.visibleIf;
  if (!v) return true;
  if (v.app && !procesos.has(normalizarApp(v.app))) return false;
  const cond = v.sensor;
  if (cond && sensores !== null) {
    const s = sensores.find((x) => x.id === cond.id) ?? null;
    if (!s) return false;
    if (!evalCondition(cond, s.value)) return false;
  }
  return true;
}
