import React, { useCallback, useMemo, useRef, useState } from 'react';
import { DEFAULT_CONFIG } from './configDefaults';
import { makeT, resolveLang } from './i18n';
import type {
  ActionType, ButtonConfig, DeckConfig, ElectronAPI, PageConfig, Profile, SoundProfileId,
} from '../types';

/**
 * La configuracion del deck y todo lo que la cambia.
 *
 * Estaba en `App`, mezclado con la vista actual, los avisos y el onboarding:
 * veinticinco `useCallback` seguidos que solo tenian en comun que escriben en
 * el mismo objeto. Aqui se ven juntos, y `App` se queda con lo que de verdad
 * es suyo — que pantalla se muestra y que se le avisa al usuario.
 *
 * Cada operacion pasa por `withHistory`, que es lo que hace que Ctrl+Z
 * funcione: guarda el estado anterior antes de cambiarlo. Guardar en disco es
 * un efecto secundario de cada cambio, no un paso aparte, para que no exista
 * el caso "lo cambie y no se guardo".
 */

interface Opciones {
  api: ElectronAPI | undefined;
  /** Aviso flotante de "se deshizo X". Lo pinta App. */
  showUndoToast: (texto: string) => void;
  /** La pagina visible: al borrar o reordenar hay que moverla. */
  setActivePage: React.Dispatch<React.SetStateAction<number>>;
}

export function useDeck({ api, showUndoToast, setActivePage }: Opciones) {
  const [config, setConfig] = useState<DeckConfig>(DEFAULT_CONFIG);
  const [loaded, setLoaded] = useState(false);
  const historyRef = useRef<{ config: DeckConfig; label: string }[]>([]);
  /** Guarda el estado de las variables con un respiro, para no escribir en disco en cada tecla. */
  const stateSaveTimer = useRef<number>();

  // El traductor sale de aqui y no llega por parametro: lo construye el idioma
  // de la propia configuracion, que es lo que este hook posee. Pasarlo desde
  // fuera creaba un ciclo — App lo necesitaba para llamar al hook, y para
  // construirlo necesitaba la configuracion que devuelve el hook.
  const t = useMemo(() => makeT(resolveLang(config.language)), [config.language]);


  // Push current state to history then apply next
  const withHistory = useCallback((label: string, updater: (prev: DeckConfig) => DeckConfig) => {
    setConfig((prev) => {
      historyRef.current = [...historyRef.current.slice(-19), { config: prev, label }];
      const next = updater(prev);
      api?.config.save(next).catch(() => {});
      return next;
    });
  }, [api]);

  const undo = useCallback(() => {
    if (historyRef.current.length === 0) return;
    const last = historyRef.current[historyRef.current.length - 1];
    historyRef.current = historyRef.current.slice(0, -1);
    setConfig(last.config);
    api?.config.save(last.config).catch(() => {});
    showUndoToast(`↶ Se deshizo: ${last.label}`);
  }, [api, showUndoToast]);

  const saveConfig = useCallback((next: DeckConfig) => {
    setConfig((prev) => {
      historyRef.current = [...historyRef.current.slice(-19), { config: prev, label: 'Cambio de configuración' }];
      api?.config.save(next).catch(() => {});
      return next;
    });
  }, [api]);

  const updateButton = useCallback((updated: ButtonConfig) => {
    withHistory(`editar "${updated.label || updated.action.type}"`, (prev) => ({
      ...prev,
      buttons: prev.buttons.map((b) => b.id === updated.id ? updated : b),
    }));
  }, [withHistory]);

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
  }, [withHistory]);

  const clearButton = useCallback((id: string) => {
    withHistory(t('undo.clear'), (prev) => ({
      ...prev,
      buttons: prev.buttons.map((b) => b.id === id
        ? { id: b.id, page: b.page, label: '', icon: '', action: { type: 'none' as ActionType } }
        : b
      ),
    }));
  }, [withHistory]);

  // Mover (o copiar) un botón a otra página. Usa el primer slot vacío del destino.
  // Devuelve true si se realizó la operación, false si no había slot libre.
  const moveButtonToPage = useCallback((buttonId: string, targetPage: number, copy: boolean): boolean => {
    let moved = false;
    withHistory(copy ? 'copiar entre páginas' : 'mover entre páginas', (prev) => {
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
  }, [withHistory]);

  const swapButtons = useCallback((idA: string, idB: string) => {
    withHistory('reordenar botones', (prev) => {
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
  }, [withHistory]);

  // Page management
  const renamePage = useCallback((id: string, name: string) => {
    withHistory(`renombrar a "${name}"`, (prev) => ({
      ...prev,
      pages: prev.pages.map((p) => p.id === id ? { ...p, name } : p),
    }));
  }, [withHistory]);

  const addPage = useCallback(() => {
    withHistory(t('undo.addPage'), (prev) => {
      if (prev.pages.length >= 8) return prev;
      const newIdx = prev.pages.length;
      const newPage: PageConfig = { id: `page_${Date.now()}`, name: `PÁGINA ${newIdx + 1}` };
      const newButtons: ButtonConfig[] = Array.from({ length: 16 }, (_, slot) => ({
        id: `p${Date.now()}_${slot}`,
        page: newIdx,
        label: '', icon: '', action: { type: 'none' as ActionType },
      }));
      return { ...prev, pages: [...prev.pages, newPage], buttons: [...prev.buttons, ...newButtons] };
    });
  }, [withHistory]);

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
    setActivePage((p) => Math.max(0, p > 0 ? p - 1 : 0));
  }, [withHistory]);

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
    setActivePage(toIdx);
  }, [withHistory]);

  // Set grid size for a page (extends to 5×5, 6×6, and rectangular gridRows)
  const setPageGridSize = useCallback((pageId: string, gs: 3 | 4 | 5 | 6, gridRows?: number) => {
    withHistory(`cambiar grilla a ${gs}×${gridRows ?? gs}`, (prev) => {
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
  }, [withHistory]);

  // Profile management
  const saveProfile = useCallback((name: string) => {
    setConfig((prev) => {
      const profile: Profile = {
        id: `profile_${Date.now()}`,
        name,
        pages: prev.pages,
        buttons: prev.buttons,
        accent: prev.accent,
      };
      const next = { ...prev, profiles: [...(prev.profiles ?? []), profile] };
      api?.config.save(next).catch(() => {});
      return next;
    });
  }, [api]);

  const loadProfile = useCallback((id: string) => {
    withHistory('cargar perfil', (prev) => {
      const profile = prev.profiles?.find((p) => p.id === id);
      if (!profile) return prev;
      return { ...prev, pages: profile.pages, buttons: profile.buttons, accent: profile.accent };
    });
    setActivePage(0);
  }, [withHistory]);

  const deleteProfile = useCallback((id: string) => {
    setConfig((prev) => {
      const next = { ...prev, profiles: (prev.profiles ?? []).filter((p) => p.id !== id) };
      api?.config.save(next).catch(() => {});
      return next;
    });
  }, [api]);

  // UI scale handler
  const setUiScale = useCallback((scale: number) => {
    const clamped = Math.max(0.75, Math.min(1.75, scale));
    saveConfig({ ...config, uiScale: clamped });
    api?.app.setZoom(clamped).catch(() => {});
  }, [config, saveConfig, api]);

  // Theme handler
  const setTheme = useCallback((theme: 'dark' | 'light' | 'system') => {
    saveConfig({ ...config, theme });
  }, [config, saveConfig]);

  // Language handler
  const setLanguage = useCallback((language: 'system' | 'es' | 'en') => {
    saveConfig({ ...config, language });
  }, [config, saveConfig]);

  // Hints contextuales: marcar uno como descartado (persistente, sin historial).
  const dismissHint = useCallback((id: string) => {
    setConfig((prev) => {
      if (prev.hintsDismissed?.includes(id)) return prev;
      const next = { ...prev, hintsDismissed: [...(prev.hintsDismissed ?? []), id] };
      api?.config.save(next).catch(() => {});
      return next;
    });
  }, [api]);

  // Sound on press toggle
  const toggleSoundOnPress = useCallback(() => {
    setConfig((prev) => {
      const next = { ...prev, soundOnPress: !(prev.soundOnPress ?? true) };
      api?.config.save(next).catch(() => {});
      return next;
    });
  }, [api]);

  const setSoundProfile = useCallback((id: SoundProfileId) => {
    setConfig((prev) => {
      const next = { ...prev, soundProfile: id };
      api?.config.save(next).catch(() => {});
      return next;
    });
  }, [api]);

  const setKioskPin = useCallback((pin: string) => {
    setConfig((prev) => {
      const next = { ...prev, kiosk: { enabled: true, pin } };
      api?.config.save(next).catch(() => {});
      return next;
    });
  }, [api]);

  const updateState = useCallback((update: Record<string, string>) => {
    setConfig((prev) => {
      const next = { ...prev, state: { ...(prev.state ?? {}), ...update } };
      clearTimeout(stateSaveTimer.current);
      stateSaveTimer.current = window.setTimeout(() => api?.config.save(next).catch(() => {}), 400);
      return next;
    });
  }, [api]);

  const toggleAlwaysOnTop = useCallback(() => {
    saveConfig({ ...config, alwaysOnTop: !config.alwaysOnTop });
  }, [config, saveConfig]);

  return {
    config, setConfig, loaded, setLoaded, t,
    withHistory, undo, saveConfig,
    updateButton, duplicateButton, clearButton, moveButtonToPage, swapButtons,
    renamePage, addPage, deletePage, reorderPages, setPageGridSize,
    saveProfile, loadProfile, deleteProfile,
    setUiScale, setTheme, setLanguage, dismissHint,
    toggleSoundOnPress, setSoundProfile, setKioskPin, updateState,
    toggleAlwaysOnTop,
  };
}
