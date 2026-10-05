import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DotGlyphIcon, resolveDotGlyph } from '../dot480/DotGlyphIcon';
import { GLIFO_POR_TIPO_ACCION } from '../dot480/glifosPorTipoAccion';
import type { ButtonConfig } from '../../types';

/**
 * Los SVG del centro de una tecla física, como texto, para dibujarlos en un
 * canvas.
 *
 * Usa **los mismos** componentes que la celda: `DotGlyphIcon` (el glifo DOT
 * 8×8 de `button.icon`, con relieve) y el glifo del tipo de acción de
 * `GLIFO_POR_TIPO_ACCION` (último recurso). Vive en `components/` porque `src/utils/` no puede
 * importar componentes; quien pinta lo recibe inyectado
 * (`opciones.iconoSvg` / `opciones.esGlifoDot`).
 *
 * Devuelve `null` cuando el centro es **texto**: eso lo dibuja `pintarTecla`
 * con las fuentes reales del canvas. Los iconos de marca no pasan por aquí
 * (son bitmaps del catálogo y se cargan con el `import()` diferido).
 */

/** ¿`button.icon` es un nombre que resuelve a glifo DOT 8×8? */
export function esGlifoDot(boton: ButtonConfig): boolean {
  return !!(boton.icon && resolveDotGlyph(boton.icon));
}

/**
 * SVG del centro según la precedencia de la celda. `sobreFondo` indica que va
 * encima de una imagen o icono de marca: ahí el glifo va sin puntos apagados
 * (`showRecessed`), como en `ContenidoCentral`.
 */
export function svgDeBoton(
  boton: ButtonConfig,
  color: string,
  dimColor = 'transparent',
  sobreFondo = false,
): string | null {
  if (boton.icon) {
    const glifo = resolveDotGlyph(boton.icon);
    if (!glifo) return null;
    const svg = renderToStaticMarkup(
      <DotGlyphIcon glyph={glifo} size={64} color={color} dimColor={dimColor} showRecessed={!sobreFondo} />,
    );
    return normalizar(svg, color);
  }
  const glifo = GLIFO_POR_TIPO_ACCION[boton.action.type] ?? 'DOTS';
  return normalizar(
    renderToStaticMarkup(
      <DotGlyphIcon glyph={glifo} size={64} color={color} dimColor={dimColor} showRecessed={!sobreFondo} />,
    ),
    color,
  );
}

/**
 * Deja el SVG listo para rasterizar fuera del documento: sin `currentColor`
 * (no hay contexto de color), sin variables CSS y con el `xmlns` que exige
 * cargarlo como imagen.
 */
function normalizar(svg: string, color: string): string {
  return svg
    .replace(/currentColor/g, color)
    .replace(/var\(--vd-accent\)/g, color)
    .replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')
    .replace('</svg>', `<style>.fill-stroke{fill:${color};stroke:${color}}.danger{stroke:${color}}</style></svg>`);
}
