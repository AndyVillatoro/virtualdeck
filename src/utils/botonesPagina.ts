import type { ButtonConfig, PageConfig } from '../types';
import { resolverFijos } from './botonesFijos';

/**
 * Resuelve la lista de botones que deben mostrarse en una página de la grilla.
 *
 * T-HW-12 — Botones fijos por grupo (`fijo: true`): si se pasan `pages`, los
 * propios se resuelven con `botonesResueltos` (el deck y cada dock por su
 * lado). Sin `pages`, los de la página tal cual.
 */
export function resolverBotonesPagina(
  allButtons: ButtonConfig[],
  activePage: number,
  gridSize: number,
  gridRows: number,
  pages?: PageConfig[],
): ButtonConfig[] {
  const maxCeldas = gridSize * gridRows;
  // Botones de la página activa: propios, o resueltos con los fijos de su
  // grupo si se conoce la lista de páginas.
  const botonesPagina = pages
    ? resolverFijos(pages, allButtons, activePage).slice(0, maxCeldas)
    : allButtons.filter((b) => b.page === activePage).slice(0, maxCeldas);

  return botonesPagina;
}

