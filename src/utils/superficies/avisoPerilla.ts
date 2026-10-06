import type { ButtonConfig } from '../../types';
import type { TFunc } from '../i18n';
import { actionLabel, type DetalleAccion } from '../acciones/base';

/**
 * El aviso de la tecla LCD al girar una perilla (T-HW-21, roadmap 85).
 *
 * Es la parte pura del mecanismo: qué texto se enseña y de dónde sale. El
 * pintado (canvas) vive en `pintarTecla`, el estado y los temporizadores en
 * `useAvisoPerilla`, y el valor lo produce cada acción (`DetalleAccion`).
 *
 * `AvisoPerilla` es el mismo contrato que devuelve un manejador: `valor`
 * (0-100, con barra de puntos y `etiqueta`) o `texto` ya montado.
 */

export type AvisoPerilla = DetalleAccion;

/** El texto del aviso, tal cual se lee: «VOL 65 %», «PÁG 2/3», «MODO 2/4». */
export function textoDeAviso(a: AvisoPerilla): string {
  if (a.valor !== undefined) {
    const n = Math.min(100, Math.max(0, Math.round(a.valor)));
    return a.etiqueta ? `${a.etiqueta} ${n} %` : `${n} %`;
  }
  return (a.texto ?? '').trim();
}

/**
 * El aviso de un giro: el detalle que dejó la acción o, si no hay valor,
 * la etiqueta del botón (y si tampoco, la de la acción). Así un giro siempre
 * enseña algo.
 */
export function avisoDeGiro(detalle: DetalleAccion | undefined, boton: ButtonConfig, t: TFunc): AvisoPerilla {
  if (detalle && (detalle.valor !== undefined || (detalle.texto ?? '').trim())) return detalle;
  const etiqueta = (boton.label ?? '').trim();
  return { texto: etiqueta || actionLabel(boton.action, t) };
}

/** El aviso de página, en base 1: «PÁG 2/3». */
export function avisoDePagina(indice: number, total: number, t: TFunc): AvisoPerilla {
  return { texto: t('disp.aviso.pagina', { n: indice + 1, total }) };
}

/** El aviso del cambio de modo, en base 1: «MODO 2/4». */
export function avisoDeModo(siguiente: number, total: number, t: TFunc): AvisoPerilla {
  return { texto: t('disp.aviso.modo', { n: siguiente + 1, total }) };
}

/**
 * El aviso de un mosaico 2×2: la tecla física es una pulsación única y no
 * puede elegir cuadrante, así que no dispara nada y lo dice (roadmap 82).
 */
export function avisoDeCuadrantes(t: TFunc): AvisoPerilla {
  return { texto: t('disp.aviso.cuadrantes') };
}
