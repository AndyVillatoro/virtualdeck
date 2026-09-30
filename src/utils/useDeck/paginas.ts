import { useCallback } from 'react';
import type { ActionType, ButtonConfig, PageConfig } from '../../types';
import type { ContextoDeck } from './contexto';

/**
 * Las páginas: crearlas, duplicarlas, renombrarlas, borrarlas, reordenarlas y
 * cambiar su cuadrícula.
 *
 * Es el único grupo, aparte del de perfiles, que **mueve la vista**: al borrar o
 * reordenar hay que corregir la página visible, y por eso necesita
 * `setActivePage`. Lo hace con el actualizador funcional (`p => ...`) y no
 * leyendo `config`, para no decidir la página nueva con un render de atraso.
 */
export function useDeckPaginas({ config, withHistory, setActivePage, t }: ContextoDeck) {
  // Page management
  const renamePage = useCallback((id: string, name: string) => {
    withHistory(t('undo.renameTo', { nombre: name }), (prev) => ({
      ...prev,
      pages: prev.pages.map((p) => p.id === id ? { ...p, name } : p),
    }));
  }, [withHistory, t]);

  const addPage = useCallback(() => {
    withHistory(t('undo.addPage'), (prev) => {
      if (prev.pages.length >= 8) return prev;
      const newIdx = prev.pages.length;
      const newPage: PageConfig = { id: `page_${Date.now()}`, name: t('page.defaultName', { n: newIdx + 1 }) };
      const newButtons: ButtonConfig[] = Array.from({ length: 16 }, (_, slot) => ({
        id: `p${Date.now()}_${slot}`,
        page: newIdx,
        label: '', icon: '', action: { type: 'none' as ActionType },
      }));
      return { ...prev, pages: [...prev.pages, newPage], buttons: [...prev.buttons, ...newButtons] };
    });
  }, [withHistory, t]);

  const duplicatePage = useCallback((id: string) => {
    withHistory(t('undo.duplicatePage'), (prev) => {
      if (prev.pages.length >= 8) return prev;
      const pageIdx = prev.pages.findIndex((p) => p.id === id);
      if (pageIdx < 0) return prev;
      const srcPage = prev.pages[pageIdx];
      const newIdx = prev.pages.length;
      const newPage: PageConfig = {
        ...srcPage,
        id: `page_${Date.now()}`,
        name: `${srcPage.name} (2)`,
      };
      const srcButtons = prev.buttons.filter((b) => b.page === pageIdx);
      const newButtons: ButtonConfig[] = srcButtons.map((b, slot) => ({
        ...b,
        id: `p${Date.now()}_${slot}`,
        page: newIdx,
      }));
      return { ...prev, pages: [...prev.pages, newPage], buttons: [...prev.buttons, ...newButtons] };
    });
    setActivePage(config.pages.length);
  }, [config.pages.length, withHistory, t, setActivePage]);

  const deletePage = useCallback((id: string) => {
    withHistory(t('undo.delPage'), (prev) => {
      if (prev.pages.length <= 1) return prev;
      const pageIdx = prev.pages.findIndex((p) => p.id === id);
      if (pageIdx < 0) return prev;
      const newPages = prev.pages.filter((_, i) => i !== pageIdx);
      const newButtons = prev.buttons
        .filter((b) => b.page !== pageIdx)
        .map((b) => b.page > pageIdx ? { ...b, page: b.page - 1 } : b);
      return { ...prev, pages: newPages, buttons: newButtons };
    });
    // A donde se va la vista depende de **cual** se borro, y el `id` no
    // llegaba hasta aqui: se restaba uno siempre. Las paginas se borran desde
    // el menu de cualquier pestana, no solo de la abierta, asi que borrar una
    // posterior a la que estabas viendo te cambiaba de pagina sin motivo.
    const idx = config.pages.findIndex((pg) => pg.id === id);
    if (idx >= 0 && config.pages.length > 1) {
      setActivePage((p) => (idx > p ? p : Math.max(0, p - 1)));
    }
  }, [withHistory, setActivePage, config.pages, t]);

  // Reorder pages by drag-and-drop
  const reorderPages = useCallback((fromIdx: number, toIdx: number) => {
    withHistory(t('undo.movePage'), (prev) => {
      if (fromIdx === toIdx) return prev;
      const pages = [...prev.pages];
      const [moved] = pages.splice(fromIdx, 1);
      pages.splice(toIdx, 0, moved);
      // Build index map: old index → new index
      const idxMap = new Map<number, number>();
      prev.pages.forEach((p, i) => { idxMap.set(i, pages.findIndex((np) => np.id === p.id)); });
      const buttons = prev.buttons.map((b) => ({ ...b, page: idxMap.get(b.page) ?? b.page }));
      return { ...prev, pages, buttons };
    });
    // Seguir a la pagina que se estaba viendo, no saltar a la arrastrada.
    setActivePage((p) => {
      if (p === fromIdx) return toIdx;
      const q = p > fromIdx ? p - 1 : p;
      return q >= toIdx ? q + 1 : q;
    });
  }, [withHistory, setActivePage, t]);

  // Set grid size for a page (extends to 5×5, 6×6, and rectangular gridRows)
  const setPageGridSize = useCallback((pageId: string, gs: 3 | 4 | 5 | 6, gridRows?: number) => {
    withHistory(t('undo.gridSize', { tam: `${gs}×${gridRows ?? gs}` }), (prev) => {
      const pageIdx = prev.pages.findIndex((p) => p.id === pageId);
      if (pageIdx < 0) return prev;
      const needed = gs * (gridRows ?? gs);
      const existing = prev.buttons.filter((b) => b.page === pageIdx);
      const extra: ButtonConfig[] = [];
      for (let slot = existing.length; slot < needed; slot++) {
        extra.push({ id: `p${Date.now()}_${slot}`, page: pageIdx, label: '', icon: '', action: { type: 'none' as ActionType } });
      }
      return {
        ...prev,
        pages: prev.pages.map((p) => p.id === pageId ? { ...p, gridSize: gs, gridRows: gridRows ?? gs } : p),
        buttons: extra.length > 0 ? [...prev.buttons, ...extra] : prev.buttons,
      };
    });
  }, [withHistory, t]);

  return { renamePage, addPage, duplicatePage, deletePage, reorderPages, setPageGridSize };
}
