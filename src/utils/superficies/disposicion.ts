import type {
  ControlFisico, ControlSuperficie, DisposicionSuperficie, EntradaSuperficie, LcdControl,
} from '../../types/superficies';

/**
 * De los controles de un modelo a los huecos de su página, y vuelta.
 *
 * Los huecos siguen el orden de `DisposicionSuperficie.controles`: una tecla o
 * un botón ocupan 1, una perilla 3 (girar a la izquierda, pulsar, girar a la
 * derecha) y una tira táctil 2 (deslizar a la izquierda, a la derecha). Así el
 * editor, el pintado, deshacer e importar/exportar funcionan sin cambios: son
 * huecos de una página normal. En el N3 (6 teclas, 3 botones, 3 perillas)
 * salen los mismos 18 huecos que en la fase 1.
 */

const HUECOS_POR_TIPO: Record<ControlSuperficie, number> = { key: 1, button: 1, knob: 3, swipe: 2 };

/** Lo que admite una página: 6 columnas × 8 filas (`configMigration`). */
const COLUMNAS_MAX = 6;
const FILAS_MAX = 8;

/** Primer hueco de cada control, en el mismo orden que `controles`. */
function bases(d: DisposicionSuperficie): number[] {
  const salida: number[] = [];
  let acumulado = 0;
  for (const c of d.controles) {
    salida.push(acumulado);
    acumulado += HUECOS_POR_TIPO[c.tipo];
  }
  return salida;
}

export function totalHuecos(d: DisposicionSuperficie): number {
  return d.controles.reduce((n, c) => n + HUECOS_POR_TIPO[c.tipo], 0);
}

/**
 * Rejilla de la página que se crea para un dispositivo. Tres columnas mientras
 * quepa en 18 huecos (el N3 queda en 3×6, como en la fase 1); si no, seis.
 * Un modelo de más de 48 huecos no cabe en una página: `null`.
 */
export function rejillaDe(d: DisposicionSuperficie): { columnas: number; filas: number } | null {
  const total = totalHuecos(d);
  const columnas = total <= 18 ? 3 : COLUMNAS_MAX;
  const filas = Math.max(1, Math.ceil(total / columnas));
  return filas > FILAS_MAX ? null : { columnas, filas };
}

/**
 * Columnas de la página de un dock a partir de las de su `rejillaDe`.
 *
 * Estaba escrito dos veces en `useDeck/paginas` con dos condiciones
 * distintas (`=== 3` al crear, `<= 3` al añadir): una sola función.
 */
export function columnasDock(columnasRejilla: number): 3 | 6 {
  return columnasRejilla <= 3 ? 3 : 6;
}

/** Hueco de la página para una entrada, o `null` si no dispara nada (un `up`, o un control que el modelo no tiene). */
export function huecoDeEntrada(
  d: DisposicionSuperficie,
  e: Pick<EntradaSuperficie, 'control' | 'indice' | 'gesto'>,
): number | null {
  if (e.gesto === 'up') return null;
  const i = d.controles.findIndex((c) => c.tipo === e.control && c.indice === e.indice);
  if (i < 0) return null;
  const base = bases(d)[i];
  switch (e.control) {
    case 'key':
    case 'button':
      return base;
    case 'knob':
      if (e.gesto === 'izq') return base;
      if (e.gesto === 'der') return base + 2;
      return base + 1;
    case 'swipe':
      return e.gesto === 'der' ? base + 1 : base;
  }
}

export type GestoHueco = 'izq' | 'pulsar' | 'der';

/** El control físico al que pertenece un hueco (para la pantalla de dispositivos). */
export function controlDeHueco(d: DisposicionSuperficie, hueco: number):
  { control: ControlSuperficie; indice: number; gesto?: GestoHueco } | null {
  if (hueco < 0) return null;
  const b = bases(d);
  for (let i = 0; i < d.controles.length; i++) {
    const c = d.controles[i];
    const resto = hueco - b[i];
    if (resto < 0 || resto >= HUECOS_POR_TIPO[c.tipo]) continue;
    if (c.tipo === 'knob') return { control: c.tipo, indice: c.indice, gesto: (['izq', 'pulsar', 'der'] as const)[resto] };
    if (c.tipo === 'swipe') return { control: c.tipo, indice: c.indice, gesto: resto === 0 ? 'izq' : 'der' };
    return { control: c.tipo, indice: c.indice };
  }
  return null;
}

/** Los huecos de un control (1, 2 o 3), en orden. */
export function huecosDeControl(d: DisposicionSuperficie, control: ControlFisico): number[] {
  const i = d.controles.indexOf(control);
  if (i < 0) return [];
  const base = bases(d)[i];
  return Array.from({ length: HUECOS_POR_TIPO[control.tipo] }, (_, k) => base + k);
}

/** Las teclas con pantalla, con su hueco y su LCD: lo que hay que pintar. */
export function teclasLcd(d: DisposicionSuperficie): Array<{ hueco: number; indice: number; lcd: LcdControl }> {
  const b = bases(d);
  const salida: Array<{ hueco: number; indice: number; lcd: LcdControl }> = [];
  d.controles.forEach((c, i) => {
    if (c.tipo === 'key' && c.lcd) salida.push({ hueco: b[i], indice: c.indice, lcd: c.lcd });
  });
  return salida;
}
