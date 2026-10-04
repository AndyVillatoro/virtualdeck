import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { IconNone, VD_ACTION_ICONS } from '../VDIcon';
import type { ButtonConfig } from '../../types';

/**
 * El SVG del icono que pinta una celda, como texto, para dibujarlo en un
 * canvas (teclas físicas).
 *
 * Usa **el mismo** `VD_ACTION_ICONS` que `celda/derivados.ts`, así que un
 * cambio en `VDIcon` llega solo a las teclas LCD. Vive en `components/` porque
 * `src/utils/` no puede importar componentes; quien pinta lo recibe inyectado
 * (`opciones.iconoSvg`).
 *
 * Los iconos de marca no pasan por aquí: son bitmaps del catálogo y
 * `pintarTecla` los carga por su cuenta con el `import()` diferido de
 * `data/brandIcons` (el mismo que usa la interfaz).
 */
export function svgDeBoton(boton: ButtonConfig, color: string): string | null {
  const Icono = VD_ACTION_ICONS[boton.action.type] ?? IconNone;
  let svg = renderToStaticMarkup(<Icono size={64} color={color} />);
  // `currentColor` y los estilos con variables CSS no existen fuera del
  // documento: se resuelven con el color pedido antes de rasterizar.
  svg = svg.replace(/currentColor/g, color).replace(/var\(--vd-accent\)/g, color);
  return svg
    .replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')
    .replace('</svg>', `<style>.fill-stroke{fill:${color};stroke:${color}}.danger{stroke:${color}}</style></svg>`);
}
