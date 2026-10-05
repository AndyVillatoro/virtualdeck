import './efectosPuntos.js';
import { DOT_GLYPHS_8X8, resolveDotGlyph } from './dotGlyphsCatalog';
import { GLIFO_POR_TIPO_ACCION } from './glifosPorTipoAccion';
import { matrizDePuntos16 } from './puntos16';
import type { ButtonConfig } from '../../types';

/**
 * Lo que un boton enseña cuando esta encendido, y su matriz animable.
 *
 * Dos ayudas puras para las superficies que pintan en pantalla:
 *
 * - `botonEfectivo`: si el boton es `isToggle` y esta en `toggledIds`
 *   (`encendido`), se pinta con `aspectoEncendido` (roadmap 79): su icono
 *   (el del catalogo gana, como siempre), sus colores. Si el aspecto trae
 *   `icon` se olvida el `iconoPuntos` original, o el viejo seguiria ganando
 *   por precedencia y el nuevo no se veria nunca.
 * - `matrizDeBoton`: la matriz de booleanos que anima el motor
 *   (`efectosPuntos.js`), en la misma precedencia que `ContenidoCentral`:
 *   catalogo 16x16 -> glifo por nombre -> tipo de accion. `null` cuando el
 *   centro no son puntos (imagen o marca de fondo, dibujo 5x7 propio, texto)
 *   o la celda esta vacia: ahi no hay nada que animar.
 *
 * El puente de abajo es para la tecla fisica: `src/utils` no puede importar
 * componentes (regla `utils-no-ui`), asi que el resolvedor se registra en el
 * propio motor y el animador del LCD (`useAnimacionLcd`) lo usa si existe.
 * Sin registro no hay animacion de puntos, pero tampoco error.
 */

/** Boton tal como se pinta: con el aspecto de encendido si toca. */
export function botonEfectivo(boton: ButtonConfig, encendido: boolean): ButtonConfig {
  if (!encendido || boton.isToggle !== true) return boton;
  const aspecto = boton.aspectoEncendido;
  if (!aspecto) return boton;
  const next: ButtonConfig = { ...boton };
  if (aspecto.iconoPuntos) next.iconoPuntos = aspecto.iconoPuntos;
  if (aspecto.icon !== undefined) {
    next.icon = aspecto.icon;
    if (!aspecto.iconoPuntos) next.iconoPuntos = undefined;
  }
  if (aspecto.bgColor) next.bgColor = aspecto.bgColor;
  if (aspecto.fgColor) next.fgColor = aspecto.fgColor;
  return next;
}

/** Filas 8x8 (bit 7 = izquierda) a matriz de booleanos. */
function matriz8(nombre: string | null | undefined): boolean[][] | null {
  if (!nombre) return null;
  const filas = DOT_GLYPHS_8X8[nombre];
  if (!filas) return null;
  return filas.map((fila) => Array.from({ length: 8 }, (_, x) => Boolean((fila >> (7 - x)) & 1)));
}

/** Matriz animable del boton, o `null` si su centro no son puntos. */
export function matrizDeBoton(boton: ButtonConfig, vacia?: boolean): boolean[][] | null {
  if (vacia) return null;
  if (boton.imageData || boton.brandIcon) return null;
  if (boton.customGlyph57?.length === 7) return null;
  if (boton.iconoPuntos?.bits) {
    const catalogo = matrizDePuntos16(boton.iconoPuntos.bits);
    if (catalogo) return catalogo;
  }
  if (boton.icon) {
    const nombrado = matriz8(resolveDotGlyph(boton.icon));
    if (nombrado) return nombrado;
    return null;
  }
  return matriz8(GLIFO_POR_TIPO_ACCION[boton.action.type] ?? 'DOTS');
}

if (typeof globalThis.EfectosPuntos === 'object' && !globalThis.EfectosPuntos.matrizDeBoton) {
  globalThis.EfectosPuntos.matrizDeBoton = (boton) => matrizDeBoton(boton as ButtonConfig);
}

if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
  window.dispatchEvent(new Event('vd:motor-listo'));
}
