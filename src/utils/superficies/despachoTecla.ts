import type { ButtonConfig, EntradaSuperficie } from '../../types';

/**
 * Qué hace una entrada del dock una vez resuelta a un botón: el toque normal,
 * el giro con su aviso, y **mantener pulsado** (roadmap 82).
 *
 * El dock disparaba en el flanco de bajada y el `up` se tiraba en
 * `huecoDeEntrada`, así que un botón con `longPressAction` hacía siempre la
 * acción corta: la larga existía en las pantallas y el móvil, no aquí. Solo los
 * botones que **tienen** acción larga esperan; los demás siguen disparando en
 * la bajada, sin retraso.
 *
 * Solo en teclas y botones: al pulsar una perilla el N3 no se ha medido que
 * mande `up` (al girarla no lo manda), y sin `up` cada pulsación acabaría en
 * la larga.
 */

/** Lo mismo que en la celda (`MS_LARGA` de `usePulsacionTactil`). */
const MS_LARGA_DOCK = 500;

type Disparar = (boton: ButtonConfig, opts?: { sonido?: 'giro'; serial?: string }) => unknown;

/**
 * Dispara la entrada ya resuelta a un hueco: un giro de perilla pasa por el
 * aviso de la tecla (T-HW-21), el resto va directo.
 */
function dispararEntrada(
  entrada: EntradaSuperficie,
  boton: ButtonConfig,
  disparar: Disparar,
  avisarGiro: (boton: ButtonConfig) => void,
): void {
  if (entrada.gesto === 'izq' || entrada.gesto === 'der') {
    if (entrada.control === 'knob') avisarGiro(boton);
    else disparar(boton, { sonido: 'giro', serial: entrada.serial });
    return;
  }
  disparar(boton, { serial: entrada.serial });
}

/** ¿Esta bajada tiene que esperar a ver si es larga? */
function esperaLarga(entrada: EntradaSuperficie, boton: ButtonConfig): boolean {
  if (entrada.gesto !== 'down') return false;
  if (entrada.control !== 'key' && entrada.control !== 'button') return false;
  return !!boton.longPressAction && boton.longPressAction.type !== 'none';
}

/** El control físico, sin el gesto: la bajada y la subida comparten clave. */
function claveControl(e: Pick<EntradaSuperficie, 'serial' | 'control' | 'indice'>): string {
  return `${e.serial}:${e.control}:${e.indice}`;
}

interface Reloj {
  poner: (fn: () => void, ms: number) => unknown;
  quitar: (id: unknown) => void;
}

const RELOJ_REAL: Reloj = {
  poner: (fn, ms) => setTimeout(fn, ms),
  quitar: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
};

export interface DetectorLargo {
  /** Bajada de un botón con acción larga: a los `ms` salta la larga. */
  bajar: (clave: string, alCorto: () => void, alLargo: () => void) => void;
  /** Subida: si la larga no saltó, es un toque normal. */
  subir: (clave: string) => void;
}

/**
 * Bajada y subida por control. La larga salta **sin esperar a soltar**, como
 * en la celda y en el móvil; al soltar después ya no se hace nada. Una bajada
 * nueva del mismo control sin subida en medio descarta la anterior. El reloj
 * se inyecta para poder probarlo sin esperar.
 */
export function crearDetectorLargo(ms = MS_LARGA_DOCK, reloj: Reloj = RELOJ_REAL): DetectorLargo {
  const pendientes = new Map<string, { id: unknown; alCorto: () => void }>();
  return {
    bajar(clave, alCorto, alLargo) {
      const previa = pendientes.get(clave);
      if (previa) reloj.quitar(previa.id);
      const id = reloj.poner(() => {
        pendientes.delete(clave);
        alLargo();
      }, ms);
      pendientes.set(clave, { id, alCorto });
    },
    subir(clave) {
      const p = pendientes.get(clave);
      if (!p) return;
      reloj.quitar(p.id);
      pendientes.delete(clave);
      p.alCorto();
    },
  };
}

/**
 * El botón ya resuelto: toque o giro enseguida, o —si tiene acción larga y es
 * una tecla o un botón— esperar a la subida o a los `ms`. Fuera del manejador
 * de `onEntrada` para no sumarle ramas.
 */
export function despacharBoton(
  entrada: EntradaSuperficie,
  boton: ButtonConfig,
  o: {
    disparar: Disparar;
    avisarGiro: (boton: ButtonConfig) => void;
    largo?: (boton: ButtonConfig, opts?: { serial?: string }) => unknown;
    detector: DetectorLargo;
  },
): void {
  const corto = () => dispararEntrada(entrada, boton, o.disparar, o.avisarGiro);
  const largo = o.largo;
  if (!largo || !esperaLarga(entrada, boton)) {
    corto();
    return;
  }
  o.detector.bajar(claveControl(entrada), corto, () => { void largo(boton, { serial: entrada.serial }); });
}

/**
 * Envuelve el manejador de entradas: la subida solo cierra una bajada que
 * esperaba a ver si era larga, y no llega al manejador (que antes la tiraba
 * de todos modos en `huecoDeEntrada`).
 */
export function conSubida(
  detector: DetectorLargo,
  manejar: (entrada: EntradaSuperficie) => void,
): (entrada: EntradaSuperficie) => void {
  return (entrada) => {
    if (entrada.gesto === 'up') detector.subir(claveControl(entrada));
    else manejar(entrada);
  };
}
