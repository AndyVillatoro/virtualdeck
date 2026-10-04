import type { DeckConfig } from '../../types';

/**
 * Brillo y giro por dispositivo, no por página.
 *
 * Antes `superficie.brillo`/`rotacion` se copiaban en cada página del mismo
 * serial (al crear, al añadir y al fijar en todas) y se leían de la página
 * activa, con un 80 escrito en dos pantallas si faltaba y un `aplicarBrillo`
 * que no hacía nada con `undefined`. Ahora viven en un mapa por serial en la
 * raíz (`DeckConfig.superficies`) con **un** valor por defecto aquí. Lo que
 * leía `superficie.brillo`/`rotacion` lee este mapa; la migración v4→v5 toma
 * el de la primera página de cada serial y lo quita de las páginas.
 */

/** El brillo que enseña la pantalla cuando el dispositivo no dice otro. */
export const BRILLO_SUPERFICIE_POR_DEFECTO = 80;

/** Brillo de las teclas de un dispositivo (0–100). */
export function brilloDeSuperficie(cfg: Pick<DeckConfig, 'superficies'>, serial: string): number {
  return cfg.superficies?.[serial]?.brillo ?? BRILLO_SUPERFICIE_POR_DEFECTO;
}

/**
 * Giro elegido por el usuario (0/90/180/270), o `undefined` si no hay: manda
 * el del modelo. Quien pinta usa `?? lcd.rotacion`.
 */
export function rotacionDeSuperficie(
  cfg: Pick<DeckConfig, 'superficies'>, serial: string,
): number | undefined {
  return cfg.superficies?.[serial]?.rotacion;
}
