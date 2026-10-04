import type { ButtonConfig, PageConfig } from '../types';
import { resolverFijos } from './botonesFijos';

/**
 * Resuelve la lista de botones que deben mostrarse en una página de la grilla.
 *
 * 7.4 — Botones anclados globales: cualquier botón con `pinned: true` en
 * cualquier página del deck se proyecta en su misma ranura (slot) en todas las
 * páginas, manteniéndose fijo y accesible en toda la navegación.
 *
 * T-HW-12 — Botones fijos por grupo (`fijo: true`): si se pasan `pages`, los
 * propios se resuelven con `botonesResueltos` antes de proyectar los anclados.
 * El anclado global se aplica después y manda en su hueco.
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

  // Botones anclados en cualquier página
  const anclados = allButtons.filter((b) => b.pinned);
  if (anclados.length === 0) return botonesPagina;

  const resultado = [...botonesPagina];

  // Agrupación de botones por página para determinar la ranura (slot) original de cada anclado
  const porPagina = new Map<number, ButtonConfig[]>();
  for (const b of allButtons) {
    let lista = porPagina.get(b.page);
    if (!lista) {
      lista = [];
      porPagina.set(b.page, lista);
    }
    lista.push(b);
  }

  for (const anclado of anclados) {
    const listaHome = porPagina.get(anclado.page) ?? [];
    const slot = listaHome.indexOf(anclado);
    if (slot >= 0 && slot < maxCeldas) {
      resultado[slot] = anclado;
    }
  }

  return resultado;
}

