import React from 'react';
import { DotGlyphIcon, resolveDotGlyph } from '../dot480/DotGlyphIcon';
import { IconoPuntos } from '../dot480/IconoPuntos';
import { GLIFO_POR_TIPO_ACCION } from '../dot480/glifosPorTipoAccion';
import type { ButtonConfig } from '../../types';

/**
 * Los SVG del centro de una tecla física, como texto, para dibujarlos en un
 * canvas.
 *
 * Usa **los mismos** componentes que la celda: `IconoPuntos` (el icono del
 * catálogo 16×16 copiado en el botón), `DotGlyphIcon` (el glifo DOT 8×8 de
 * `button.icon`, con relieve) y el glifo del tipo de acción de
 * `GLIFO_POR_TIPO_ACCION` (último recurso), en el mismo orden que
 * `ContenidoCentral`. Vive en `components/` porque `src/utils/` no puede
 * importar componentes; quien pinta lo recibe inyectado
 * (`opciones.iconoSvg` / `opciones.esGlifoDot`).
 *
 * Devuelve `null` cuando el centro es **texto**: eso lo dibuja `pintarTecla`
 * con las fuentes reales del canvas. Los iconos de marca no pasan por aquí
 * (son bitmaps del catálogo y se cargan con el `import()` diferido).
 */

/**
 * El renderizador de componentes a texto SVG.
 *
 * `react-dom/server` pesa ~68 KiB y solo lo necesitan los iconos de las teclas
 * LCD de los docks y la previa del hardware, así que se pide con `import()`
 * una sola vez y el arranque del deck no lo paga. Hasta que llega, `svgDeBoton`
 * responde `null` («sin icono»); quien pinta teclas LCD espera antes con
 * `prepararIconosLcd()` para que la primera pintura ya salga con iconos.
 */
type Renderizador = typeof import('react-dom/server');

let renderizador: Renderizador | null = null;
let carga: Promise<void> | null = null;

/** Carga `react-dom/server` (una sola vez: la promesa está memorizada aquí). */
export function prepararIconosLcd(): Promise<void> {
  if (!carga) {
    carga = import('react-dom/server').then((modulo) => { renderizador = modulo; }, (error: unknown) => {
      carga = null; // que el siguiente lo reintente
      throw error;
    });
  }
  return carga;
}

/** ¿`button` trae un icono en puntos (catálogo 16×16 o glifo DOT 8×8 por nombre)? */
export function esGlifoDot(boton: ButtonConfig): boolean {
  return !!(boton.iconoPuntos?.bits || (boton.icon && resolveDotGlyph(boton.icon)));
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
  // Sin el renderizador cargado se contesta lo mismo que si el centro fuera
  // texto, que es lo que ya significa `null` (ver `prepararIconosLcd`).
  if (!renderizador) return null;
  const renderToStaticMarkup = renderizador.renderToStaticMarkup;
  // El catálogo 16×16 va primero: en la celda está por encima del glifo por
  // nombre. Si los bits no decodifican se cae a `icon`, como si no hubiera.
  if (boton.iconoPuntos?.bits) {
    const svg = renderToStaticMarkup(
      <IconoPuntos bits={boton.iconoPuntos.bits} size={64} color={color} dimColor={dimColor} showRecessed={!sobreFondo} />,
    );
    if (svg) return normalizar(svg, color);
  }
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
