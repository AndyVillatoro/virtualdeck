import { useEffect, useReducer } from 'react';

/**
 * Posición de la canción que suena, interpolada entre sondeos de SMTC.
 *
 * SMTC da la posición y el instante en que la midió (`timelineUpdatedAt`), y el
 * sondeo de `nowPlaying` es cada 5 s: sin interpolar, la barra saltaría de
 * 5 en 5 s. Aquí se suma el tiempo transcurrido desde esa medida, solo mientras
 * la pista está reproduciéndose. El sondeo no se toca.
 */

/** Lo que la barra necesita de `NowPlaying`. `status` va como texto: el kiosko lo tipa así. */
export interface EntradaProgreso {
  status: string;
  positionMs?: number;
  durationMs?: number;
  timelineUpdatedAt?: number;
}

export interface ProgresoCancion {
  posicionMs: number;
  duracionMs: number;
}

/** Más de una hora desde la medida: la app publica mal el timeline; no se interpola. */
const MAX_EDAD_INTERPOLAR_MS = 60 * 60 * 1000;

/** Frecuencia del reloj mientras la barra suena: la barra avanza al segundo. */
export const PERIODO_RELOJ_MS = 1000;

/**
 * Posición y duración para pintar la barra en el instante `ahora` (epoch ms).
 *
 * - Sin `durationMs` o con `durationMs <= 0`: `null` (no hay barra).
 * - Sin `positionMs`: se pinta en 0.
 * - Interpola solo si suena (`Playing`) y `timelineUpdatedAt` está entre
 *   hace 1 h y ahora. Si está en el futuro o es más antiguo, usa `positionMs`.
 * - El resultado se acota a `[0, durationMs]`.
 */
export function calcularProgreso(
  entrada: EntradaProgreso | null | undefined,
  ahora: number,
): ProgresoCancion | null {
  if (!entrada) return null;
  const duracionMs = entrada.durationMs;
  if (duracionMs === undefined || !(duracionMs > 0)) return null;

  let posicionMs = entrada.positionMs ?? 0;
  const medida = entrada.timelineUpdatedAt;
  if (entrada.status === 'Playing' && medida !== undefined) {
    const edad = ahora - medida;
    if (edad >= 0 && edad <= MAX_EDAD_INTERPOLAR_MS) posicionMs += edad;
  }

  return { posicionMs: Math.min(Math.max(posicionMs, 0), duracionMs), duracionMs };
}

/** `m:ss`, o `h:mm:ss` a partir de una hora. Para los tiempos de la barra. */
export function formatearTiempo(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${s}`;
  return `${m}:${s}`;
}

/**
 * Hook de la barra: devuelve la posición interpolada y redibuja cada segundo.
 *
 * El reloj solo existe mientras hay barra (duración válida) **y** la pista
 * suena. En pausa o sin duración no hay `setInterval`: el valor queda en
 * `positionMs` hasta el siguiente sondeo.
 */
export function useProgresoCancion(entrada: EntradaProgreso | null | undefined): ProgresoCancion | null {
  const [, redibujar] = useReducer((n: number) => n + 1, 0);
  const hayBarra = (entrada?.durationMs ?? 0) > 0;
  const suena = entrada?.status === 'Playing';
  const positionMs = entrada?.positionMs;
  const medida = entrada?.timelineUpdatedAt;

  useEffect(() => {
    if (!hayBarra || !suena) return;
    const id = window.setInterval(redibujar, PERIODO_RELOJ_MS);
    return () => window.clearInterval(id);
    // El sondeo cambia `positionMs`/`timelineUpdatedAt`: al llegar, el reloj reparte desde ahí.
  }, [hayBarra, suena, positionMs, medida]);

  return calcularProgreso(entrada, Date.now());
}
