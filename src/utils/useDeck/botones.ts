import { useCallback, useState } from 'react';
import type { ActionType, ButtonConfig } from '../../types';
import type { ContextoDeck } from './contexto';

/**
 * Los botones: editarlos, duplicarlos, copiarlos, pegarlos, moverlos y limpiarlos.
 *
 * Todo lo de una celda concreta va aquí, incluido el portapapeles, que es
 * estado de este grupo y no de la configuración: no se guarda en disco ni entra
 * en el historial, porque copiar no es un cambio del deck.
 */
export function useDeckBotones({ config, withHistory, t }: ContextoDeck) {
  const updateButton = useCallback((updated: ButtonConfig) => {
    withHistory(t('undo.edit', { nombre: updated.label || updated.action.type }), (prev) => ({
      ...prev,
      buttons: prev.buttons.map((b) => b.id === updated.id ? updated : b),
    }));
  }, [withHistory, t]);

  const [buttonClipboard, setButtonClipboard] = useState<ButtonConfig | null>(null);

  const copyButton = useCallback((id: string): boolean => {
    const src = config.buttons.find((b) => b.id === id);
    if (!src) return false;
    setButtonClipboard(src);
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(JSON.stringify({ type: 'virtualdeck-button', version: 1, button: src }));
      }
    } catch {}
    return true;
  }, [config.buttons]);

  const pasteButton = useCallback((targetId: string): boolean => {
    if (!buttonClipboard) return false;
    withHistory(t('undo.paste'), (prev) => {
      const target = prev.buttons.find((b) => b.id === targetId);
      if (!target) return prev;
      return {
        ...prev,
        buttons: prev.buttons.map((b) => {
          if (b.id !== targetId) return b;
          return {
            ...buttonClipboard,
            id: target.id,
            page: target.page,
          };
        }),
      };
    });
    return true;
  }, [buttonClipboard, withHistory, t]);

  const duplicateButton = useCallback((id: string) => {
    withHistory(t('undo.duplicate'), (prev) => {
      const src = prev.buttons.find((b) => b.id === id);
      if (!src) return prev;
      const emptySlot = prev.buttons.find((b) =>
        b.page === src.page && b.action.type === 'none' && !b.label && !b.icon && !b.imageData && b.id !== id
      );
      if (!emptySlot) return prev;
      return {
        ...prev,
        buttons: prev.buttons.map((b) => b.id === emptySlot.id
          ? { ...src, id: emptySlot.id, page: emptySlot.page }
          : b
        ),
      };
    });
  }, [withHistory, t]);

  const clearButton = useCallback((id: string) => {
    withHistory(t('undo.clear'), (prev) => ({
      ...prev,
      buttons: prev.buttons.map((b) => b.id === id
        ? { id: b.id, page: b.page, label: '', icon: '', action: { type: 'none' as ActionType } }
        : b
      ),
    }));
  }, [withHistory, t]);

  // Mover (o copiar) un botón a otra página. Usa el primer slot vacío del destino.
  // Devuelve true si se realizó la operación, false si no había slot libre.
  const moveButtonToPage = useCallback((buttonId: string, targetPage: number, copy: boolean): boolean => {
    let moved = false;
    withHistory(t(copy ? 'undo.copyBetweenPages' : 'undo.moveBetweenPages'), (prev) => {
      const src = prev.buttons.find((b) => b.id === buttonId);
      if (!src || targetPage < 0 || targetPage >= prev.pages.length) return prev;
      if (src.page === targetPage) return prev;
      const targetSlot = prev.buttons.find((b) =>
        b.page === targetPage && b.action.type === 'none'
        && !b.label && !b.icon && !b.imageData && !b.brandIcon
      );
      if (!targetSlot) return prev;
      moved = true;
      return {
        ...prev,
        buttons: prev.buttons.map((b) => {
          if (b.id === targetSlot.id) return { ...src, id: targetSlot.id, page: targetPage };
          if (!copy && b.id === buttonId) return { id: b.id, page: b.page, label: '', icon: '', action: { type: 'none' as ActionType } };
          return b;
        }),
      };
    });
    return moved;
  }, [withHistory, t]);

  /**
   * Vaciar varios botones de una vez.
   *
   * La barra de selección multiple llamaba a `clearButton` en un bucle, y cada
   * llamada es **un paso de deshacer y un guardado en disco**: vaciar diez
   * botones dejaba diez pasos que había que deshacer uno a uno, y escribía la
   * configuración diez veces. Aquí es una sola cosa, que es como se siente.
   */
  const clearButtons = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    const cuantos = new Set(ids);
    withHistory(t('undo.clearMany', { n: ids.length }), (prev) => ({
      ...prev,
      buttons: prev.buttons.map((b) => (cuantos.has(b.id)
        ? { id: b.id, page: b.page, label: '', icon: '', action: { type: 'none' as ActionType } }
        : b)),
    }));
  }, [withHistory, t]);

  /**
   * Mover o copiar varios botones a otra página, en una sola operación.
   *
   * Devuelve cuántos cupieron: la página de destino puede quedarse sin huecos
   * a mitad, y antes eso pasaba en silencio porque el bucle de la barra
   * ignoraba el `false` que devolvía cada llamada.
   */
  const moveButtonsToPage = useCallback((ids: string[], targetPage: number, copy: boolean): number => {
    if (ids.length === 0) return 0;
    let movidos = 0;
    withHistory(t(copy ? 'undo.copyBetweenPages' : 'undo.moveBetweenPages'), (prev) => {
      if (targetPage < 0 || targetPage >= prev.pages.length) return prev;
      const esHueco = (b: ButtonConfig) =>
        b.page === targetPage && b.action.type === 'none'
        && !b.label && !b.icon && !b.imageData && !b.brandIcon;
      const huecos = prev.buttons.filter(esHueco);
      // Los pares origen→hueco se deciden antes de tocar nada: así no se puede
      // dar el caso de que un botón caiga en el hueco que acaba de dejar otro.
      const pares: { origen: ButtonConfig; huecoId: string }[] = [];
      for (const id of ids) {
        const src = prev.buttons.find((b) => b.id === id);
        if (!src || src.page === targetPage) continue;
        const hueco = huecos[pares.length];
        if (!hueco) break;
        pares.push({ origen: src, huecoId: hueco.id });
      }
      if (pares.length === 0) return prev;
      movidos = pares.length;
      const porHueco = new Map(pares.map((p) => [p.huecoId, p.origen]));
      const origenes = new Set(pares.map((p) => p.origen.id));
      return {
        ...prev,
        buttons: prev.buttons.map((b) => {
          const src = porHueco.get(b.id);
          if (src) return { ...src, id: b.id, page: targetPage };
          if (!copy && origenes.has(b.id)) {
            return { id: b.id, page: b.page, label: '', icon: '', action: { type: 'none' as ActionType } };
          }
          return b;
        }),
      };
    });
    return movidos;
  }, [withHistory, t]);

  const swapButtons = useCallback((idA: string, idB: string) => {
    withHistory(t('undo.reorder'), (prev) => {
      const a = prev.buttons.find((b) => b.id === idA);
      const b = prev.buttons.find((b) => b.id === idB);
      if (!a || !b) return prev;
      return {
        ...prev,
        buttons: prev.buttons.map((btn) => {
          if (btn.id === idA) return { ...b, id: idA, page: a.page };
          if (btn.id === idB) return { ...a, id: idB, page: b.page };
          return btn;
        }),
      };
    });
  }, [withHistory, t]);

  return {
    updateButton, duplicateButton, copyButton, pasteButton, buttonClipboard, clearButton,
    moveButtonToPage, swapButtons, clearButtons, moveButtonsToPage,
  };
}
