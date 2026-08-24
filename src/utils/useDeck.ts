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


  /**
   * Apila el estado actual y aplica el siguiente.
   *
   * El rotulo puede llegar hecho o **calcularse a partir del estado anterior**
   * (`rotulo`), que es lo que hace falta para decir «eliminar perfil "X"»: el
   * nombre solo existe antes de borrarlo. Sin eso habria que buscarlo fuera,
   * sobre una copia de `config` que puede ir un render por detras.
   */
  const withHistory = useCallback((
    label: string,
    updater: (prev: DeckConfig) => DeckConfig,
    rotulo?: (prev: DeckConfig) => string,
  ) => {
    setConfig((prev) => {
      historyRef.current = [...historyRef.current.slice(-19), { config: prev, label: rotulo ? rotulo(prev) : label }];
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
    showUndoToast(t('undo.done', { label: last.label }));
  }, [api, showUndoToast, t]);

  const saveConfig = useCallback((next: DeckConfig) => {
    setConfig((prev) => {
      historyRef.current = [...historyRef.current.slice(-19), { config: prev, label: t('undo.configChange') }];
      api?.config.save(next).catch(() => {});
      return next;
    });
  }, [api, t]);

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
  }, [withHistory]);

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
  }, [withHistory, setActivePage, t]);

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
  }, [withHistory, setActivePage, t]);

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

  /*
   * Perfiles: guardar, cargar y borrar una disposicion entera del deck.
   *
   * Las tres pasan por `withHistory` como todo lo demas. No lo hacian, y eso
   * dejaba **borrar un perfil fuera del deshacer**: un clic de mas en la × y
   * la unica copia de una disposicion entera se iba sin aviso ni vuelta atras,
   * cuando borrar una pagina —que es menos— si se deshace.
   */

  /**
   * Guardar con un nombre que ya existe **sobrescribe** ese perfil, no crea un
   * segundo con el mismo nombre. Volver a guardar es la forma natural de
   * actualizar uno, y antes dejaba dos filas identicas en la lista sin manera
   * de saber cual era cual.
   */
  const saveProfile = useCallback((name: string) => {
    const limpio = name.trim();
    if (!limpio) return;
    withHistory('', (prev) => {
      const previos = prev.profiles ?? [];
      const yaEsta = previos.find((p) => p.name.toLowerCase() === limpio.toLowerCase());
      const profile: Profile = {
        id: yaEsta?.id ?? `profile_${Date.now()}`,
        name: limpio,
        pages: prev.pages,
        buttons: prev.buttons,
        accent: prev.accent,
        // El fondo va con el resto del aspecto. Sin el, cargar un perfil
        // devolvia su color de acento pero dejaba el fondo del anterior.
        wallpaper: prev.wallpaper,
      };
      return {
        ...prev,
        profiles: yaEsta
          ? previos.map((p) => (p.id === yaEsta.id ? profile : p))
          : [...previos, profile],
      };
    }, (prev) => t(
      (prev.profiles ?? []).some((p) => p.name.toLowerCase() === limpio.toLowerCase())
        ? 'undo.updateProfile' : 'undo.saveProfile',
      { nombre: limpio },
    ));
  }, [withHistory, t]);

  const loadProfile = useCallback((id: string) => {
    withHistory(t('undo.loadProfile'), (prev) => {
      const profile = prev.profiles?.find((p) => p.id === id);
      if (!profile) return prev;
      return {
        ...prev,
        pages: profile.pages,
        buttons: profile.buttons,
        accent: profile.accent,
        wallpaper: profile.wallpaper ?? prev.wallpaper,
      };
    });
    setActivePage(0);
  }, [withHistory, setActivePage, t]);

  const deleteProfile = useCallback((id: string) => {
    withHistory('', (prev) => ({
      ...prev,
      profiles: (prev.profiles ?? []).filter((p) => p.id !== id),
    }), (prev) => t('undo.deleteProfile', {
      nombre: prev.profiles?.find((p) => p.id === id)?.name ?? '',
    }));
  }, [withHistory, t]);

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
    clearButtons, moveButtonsToPage,
    renamePage, addPage, deletePage, reorderPages, setPageGridSize,
    saveProfile, loadProfile, deleteProfile,
    setUiScale, setTheme, setLanguage, dismissHint,
    toggleSoundOnPress, setSoundProfile, setKioskPin, updateState,
    toggleAlwaysOnTop,
  };
}
