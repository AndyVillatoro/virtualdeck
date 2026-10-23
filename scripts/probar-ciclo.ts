import { CICLO, setEjecutorCiclo } from '../src/utils/acciones/ciclo';
import { aplicarAspectoCiclo, resolverAspectoCiclo } from '../src/comun/cicloIcono';
import { OK, type ActionResult } from '../src/utils/acciones/base';
import type { ButtonAction, CycleStep, ElectronAPI } from '../src/types';

/**
 * Pruebas puras del manejador `cycle` (T-CYC-01).
 *
 * No toca el sistema: el ejecutor de sub-acciones es un mock que cuenta
 * ejecuciones y devuelve lo que se le pide.
 */

let ejecuciones: string[] = [];

const ejecutorMock = async (action: ButtonAction): Promise<ActionResult> => {
  ejecuciones.push(action.type);
  // Una sub-acción que cambia una variable: el ciclo no debe perderla.
  return action.type === 'set-var' ? { ok: true, stateUpdate: { modo: 'x' } } : OK;
};

setEjecutorCiclo(ejecutorMock);

// El manejador no llega a usar la API: la sub-acción la ejecuta el mock.
const API_VACIA = {} as ElectronAPI;

const t = (k: string, v?: Record<string, string | number>) => {
  let s = k;
  if (v) for (const [key, val] of Object.entries(v)) s = s.replace(`{${key}}`, String(val));
  return s;
};

const paso = (id: string, type: string): CycleStep => ({
  id,
  label: id.toUpperCase(),
  action: { type: type as ButtonAction['type'] },
});

function corre(action: ButtonAction, state: Record<string, string>, buttonId = 'b1') {
  return CICLO['cycle']({ action, api: API_VACIA, state, t, buttonId });
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`FALLA: ${msg}`);
  console.log(`ok  ${msg}`);
}

async function main() {
  ejecuciones = [];

  // Avance de índice
  const accion: ButtonAction = {
    type: 'cycle',
    cycleSteps: [paso('a', 'hotkey'), paso('b', 'hotkey')],
  };
  const r1 = await corre(accion, {}, 'b1');
  assert(r1.ok && r1.stateUpdate?.['__cycle_b1'] === '1' && ejecuciones[0] === 'hotkey', 'primer paso avanza a 1');

  const r2 = await corre(accion, { '__cycle_b1': '1' }, 'b1');
  assert(r2.ok && r2.stateUpdate?.['__cycle_b1'] === '0' && ejecuciones[1] === 'hotkey', 'segundo paso vuelve a 0');

  // Vuelta al principio con 3 pasos
  const accion3: ButtonAction = {
    type: 'cycle',
    cycleSteps: [paso('a', 'hotkey'), paso('b', 'hotkey'), paso('c', 'hotkey')],
  };
  const r3 = await corre(accion3, { '__cycle_b1': '2' }, 'b1');
  assert(r3.ok && r3.stateUpdate?.['__cycle_b1'] === '0', 'vuelta al principio con 3 pasos');

  // Lista vacía
  const vacia: ButtonAction = { type: 'cycle', cycleSteps: [] };
  const rv = await corre(vacia, {}, 'b1');
  assert(!rv.ok && rv.error === t('act.err.cycleVacio'), 'lista vacía falla');

  // Índice fuera de rango (paso borrado) se reinicia
  const rb = await corre(accion, { '__cycle_b1': '99' }, 'b1');
  assert(rb.ok && rb.stateUpdate?.['__cycle_b1'] === '1', 'índice fuera de rango reinicia a 0 y avanza');

  // Rechazo de recursión
  const recursiva: ButtonAction = {
    type: 'cycle',
    cycleSteps: [{ id: 'r', label: 'R', action: { type: 'cycle', cycleSteps: [] } }],
  };
  const rr = await corre(recursiva, {}, 'b1');
  assert(!rr.ok && rr.error === t('act.err.cycleRecursivo'), 'cycle anidado rechazado');

  // La sub-acción conserva su stateUpdate
  const conVar: ButtonAction = { type: 'cycle', cycleSteps: [paso('v', 'set-var'), paso('w', 'hotkey')] };
  const rs = await corre(conVar, {}, 'b2');
  assert(rs.ok && rs.stateUpdate?.modo === 'x' && rs.stateUpdate?.['__cycle_b2'] === '1', 'stateUpdate de la sub-accion se conserva');

  // El aspecto del paso gana al del botón; lo vacío del paso cae al botón
  const conAspecto: ButtonAction = {
    type: 'cycle',
    cycleSteps: [{ id: 'p', label: 'GAMING', sublabel: '', fgColor: '#ff3300', action: { type: 'hotkey' } }],
  };
  const boton = { label: 'AMBIENTE', sublabel: 'RGB', fgColor: '#e6e8eb', bgColor: '#111315' };
  const visto = aplicarAspectoCiclo(boton, resolverAspectoCiclo(conAspecto, {}, 'b3'));
  assert(visto.label === 'GAMING' && visto.fgColor === '#ff3300', 'el paso gana al boton');
  assert(visto.sublabel === 'RGB' && visto.bgColor === '#111315', 'lo vacio del paso cae al boton');

  console.log('Todas las pruebas de cycle pasaron.');
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
