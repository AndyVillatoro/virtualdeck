import { useCallback, useRef } from 'react';
import type { ActionType, ButtonConfig, DisposicionSuperficie, InfoSuperficie, PageConfig } from '../../types';
import { PLANTILLAS_APP, repartirPlantillaDock } from '../../data/plantillasApp';
import { resolverIconoCatalogo } from '../../data/iconosDot';
import type { PresetHueco } from '../../data/presetsDock';
import { columnasDock, rejillaDe, totalHuecos } from '../superficies/disposicion';
import { normalizarApp } from '../apps';
import type { ContextoDeck } from './contexto';

/**
 * Destino de `crearPaginaDesdePlantilla`: `null` = página del deck (4×4);
 * con serial y disposición = página del dock de ese dispositivo.
 */
export type DestinoPlantilla = null | {
  serial: string;
  modelo: string;
  disposicion: DisposicionSuperficie;
};

/**
 * Las páginas: crearlas, duplicarlas, renombrarlas, borrarlas, reordenarlas y
 * cambiar su cuadrícula.
 *
 * Es el único grupo, aparte del de perfiles, que **mueve la vista**: al borrar o
 * reordenar hay que corregir la página visible, y por eso necesita
 * `setActivePage`. Lo hace con el actualizador funcional (`p => ...`) y no
 * leyendo `config`, para no decidir la página nueva con un render de atraso.
 */
export function useDeckPaginas({ api, config, setConfig, withHistory, setActivePage, t }: ContextoDeck) {
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
    // La última página de su grupo no se borra —la de un dispositivo, ni la
    // última del deck—: el aparato o la principal se quedarían sin nada que
    // enseñar. Con un deck de una página y un dock había dos en total y se
    // podía borrar la del deck. El chequeo va antes del historial para no
    // apilar un «deshacer» que no cambió nada.
    const serial = config.pages.find((pg) => pg.id === id)?.superficie?.serial;
    const mismoGrupo = (pg: PageConfig) => pg.id !== id && pg.superficie?.serial === serial;
    if (!config.pages.some(mismoGrupo)) return;
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

  /**
   * La página propia de un dispositivo físico (ver `types/superficies.ts`).
   *
   * Los huecos salen de su `disposicion` (contrato): teclas, botones, perillas
   * (3 huecos) y tiras (2). Si el modelo no cabe en una página (`rejillaDe`
   * devuelve `null`), no se crea y se registra.
   */
  const crearPaginaSuperficie = useCallback((info: InfoSuperficie) => {
    const rejilla = rejillaDe(info.disposicion);
    if (!rejilla) {
      console.warn(`[superficies] model ${info.modelo} does not fit in a page`);
      return;
    }
    withHistory(t('undo.addSurfacePage', { nombre: info.nombre }), (prev) => {
      if (prev.pages.some((p) => p.superficie?.serial === info.serial)) return prev;
      const newIdx = prev.pages.length;
      const newPage: PageConfig = {
        id: `page_${Date.now()}`,
        name: info.nombre,
        gridSize: columnasDock(rejilla.columnas),
        gridRows: rejilla.filas,
        superficie: { serial: info.serial, modelo: info.modelo },
      };
      const total = totalHuecos(info.disposicion);
      const newButtons: ButtonConfig[] = Array.from({ length: total }, (_, slot) => ({
        id: `p${Date.now()}_${slot}`,
        page: newIdx,
        label: '', icon: '', action: { type: 'none' as ActionType },
      }));
      return { ...prev, pages: [...prev.pages, newPage], buttons: [...prev.buttons, ...newButtons] };
    });
  }, [withHistory, t]);

  /**
   * Otra página para el mismo dispositivo, a partir de una suya que ya existe.
   *
   * Copia la marca `superficie` (serial y modelo) y la cuadrícula, y crea los
   * huecos vacíos de su `disposicion`. El brillo y el giro no se copian: viven
   * por serial en `config.superficies`, no en cada página. Es la que usa el
   * `+` de la franja de pestañas de DispositivosB. Con historial, como
   * `duplicatePage`, y con su mismo tope de 8 páginas.
   */
  const agregarPaginaSuperficie = useCallback((origenId: string, disposicion: DisposicionSuperficie) => {
    withHistory(t('undo.addSurfacePage', { nombre: '' }), (prev) => {
      if (prev.pages.length >= 8) return prev;
      const origen = prev.pages.find((p) => p.id === origenId);
      if (!origen?.superficie) return prev;
      const rejilla = rejillaDe(disposicion);
      if (!rejilla) return prev;
      const newIdx = prev.pages.length;
      const newPage: PageConfig = {
        id: `page_${Date.now()}`,
        name: `${origen.name} (2)`,
        gridSize: origen.gridSize ?? columnasDock(rejilla.columnas),
        gridRows: origen.gridRows ?? rejilla.filas,
        superficie: { serial: origen.superficie.serial, modelo: origen.superficie.modelo },
      };
      const total = totalHuecos(disposicion);
      const newButtons: ButtonConfig[] = Array.from({ length: total }, (_, slot) => ({
        id: `p${Date.now()}_${slot}`,
        page: newIdx,
        label: '', icon: '', action: { type: 'none' as ActionType },
      }));
      return { ...prev, pages: [...prev.pages, newPage], buttons: [...prev.buttons, ...newButtons] };
    }, (prev) => {
      const origen = prev.pages.find((p) => p.id === origenId);
      return t('undo.addSurfacePage', { nombre: origen ? `${origen.name} (2)` : '' });
    });
  }, [withHistory, t]);

  /**
   * Crear una página entera desde una plantilla de app (roadmap 75).
   *
   * Deck (`destino` null): página 4×4 con los 16 huecos de la plantilla.
   * Dock: los huecos salen del orden de `controles` (`repartirPlantillaDock`);
   * lo que no quepa se descarta y lo que falte queda vacío. La página lleva
   * `targetApp` y va con historial, como `addPage`. Devuelve el id para que
   * quien llama la active; `undefined` si no se creó (tope de 8 páginas,
   * plantilla desconocida, app vacía o modelo que no cabe). No mueve la
   * vista: la activa quien llama.
   */
  const crearPaginaDesdePlantilla = useCallback((
    plantillaId: string,
    app: string,
    destino: DestinoPlantilla,
  ): string | undefined => {
    const plantilla = PLANTILLAS_APP.find((p) => p.id === plantillaId);
    if (!plantilla) return undefined;
    const limpio = normalizarApp(app);
    if (!limpio) return undefined;
    if (destino && !rejillaDe(destino.disposicion)) return undefined;
    if (config.pages.length >= 8) return undefined;
    const id = `page_${Date.now()}`;
    const nombre = t(plantilla.nombre);
    const contenidos: (PresetHueco | null)[] = destino
      ? repartirPlantillaDock(plantilla.dock, destino.disposicion)
      : plantilla.deck;
    const ids = contenidos.map((_, slot) => `p${Date.now()}_${slot}`);
    const iconosPendientes = new Map<string, string>();
    contenidos.forEach((c, i) => {
      if (c?.iconoCatalogo) iconosPendientes.set(ids[i], c.iconoCatalogo);
    });
    withHistory(destino ? t('undo.addSurfacePage', { nombre }) : t('undo.addPage'), (prev) => {
      if (prev.pages.length >= 8) return prev;
      const newIdx = prev.pages.length;
      if (!destino) {
        const newPage: PageConfig = { id, name: nombre, gridSize: 4, targetApp: limpio };
        const newButtons: ButtonConfig[] = plantilla.deck.map((contenido, slot) => ({
          ...(contenido ?? { label: '', icon: '', action: { type: 'none' as ActionType } }),
          id: ids[slot],
          page: newIdx,
        }));
        return { ...prev, pages: [...prev.pages, newPage], buttons: [...prev.buttons, ...newButtons] };
      }
      const rejilla = rejillaDe(destino.disposicion);
      if (!rejilla) return prev;
      const newPage: PageConfig = {
        id,
        name: nombre,
        gridSize: columnasDock(rejilla.columnas),
        gridRows: rejilla.filas,
        superficie: { serial: destino.serial, modelo: destino.modelo },
        targetApp: limpio,
      };
      const newButtons: ButtonConfig[] = contenidos.map((contenido, slot) => ({
        ...(contenido ?? { label: '', icon: '', action: { type: 'none' as ActionType } }),
        id: ids[slot],
        page: newIdx,
      }));
      return { ...prev, pages: [...prev.pages, newPage], buttons: [...prev.buttons, ...newButtons] };
    });
    if (iconosPendientes.size > 0) {
      const promesas = Array.from(iconosPendientes.entries()).map(([buttonId, origen]) =>
        resolverIconoCatalogo(origen).then((resuelto) => ({ buttonId, resuelto }))
      );
      Promise.all(promesas).then((resultados) => {
        const exitosos = resultados.filter(
          (r): r is { buttonId: string; resuelto: { bits: string; origen: string } } => r.resuelto !== null
        );
        if (exitosos.length === 0) return;
        setConfig((prev) => {
          const next = {
            ...prev,
            buttons: prev.buttons.map((b) => {
              const r = exitosos.find((x) => x.buttonId === b.id);
              if (!r) return b;
              return { ...b, icon: '', iconoPuntos: r.resuelto };
            }),
          };
          api?.config.save(next).catch(() => {});
          return next;
        });
      });
    }
    return id;
  }, [config.pages.length, withHistory, t, setConfig, api]);

  /**
   * Vincular una página a una aplicación (o desvincularla con `''`).
   *
   * La limpieza es `normalizarApp` (ver `utils/apps`): sin `.exe`,
   * minúsculas, sin espacios — y lo vacío es «sin vínculo». El rótulo del
   * historial se calcula del estado anterior, que es donde sigue estando el
   * nombre de la página.
   */
  const fijarTargetAppPagina = useCallback(async (id: string, app: string, iconoDirecto?: string) => {
    const cleaned = normalizarApp(app);
    if (!cleaned) {
      withHistory('', (prev) => ({
        ...prev,
        pages: prev.pages.map((p) => p.id === id ? { ...p, targetApp: undefined, iconoApp: undefined } : p),
      }), (prev) => {
        const pagina = prev.pages.find((p) => p.id === id);
        return t('undo.unbindSurfaceApp', { nombre: pagina?.name ?? '' });
      });
      return;
    }

    let icono = iconoDirecto;
    if (icono === undefined) {
      const pedir = api?.launch?.iconoApp ?? window.electronAPI?.launch?.iconoApp;
      if (pedir) {
        try {
          icono = (await pedir(cleaned)) ?? undefined;
        } catch {
          icono = undefined;
        }
      }
    }

    withHistory('', (prev) => ({
      ...prev,
      pages: prev.pages.map((p) => {
        if (p.id !== id) return p;
        const iconoFinal = icono ?? (cleaned === p.targetApp ? p.iconoApp : undefined);
        return {
          ...p,
          targetApp: cleaned,
          iconoApp: iconoFinal,
        };
      }),
    }), () => t('undo.bindSurfaceApp', { nombre: cleaned }));
  }, [api, withHistory, t]);

  /**
   * El brillo de las teclas de un dispositivo, en su mapa por serial.
   *
   * No pasa por el historial (como la escala de la interfaz): es un control
   * continuo y cada paso del deslizador apilaría un «deshacer». La escritura en
   * disco va con respiro, pero la primera es inmediata para no perder el
   * cambio si se cierra la aplicación enseguida (mismo criterio que las
   * variables y los interruptores de `preferencias`).
   */
  const brilloTimer = useRef<number>();
  const fijarBrilloSuperficie = useCallback((serial: string, valor: number) => {
    const brillo = Math.max(0, Math.min(100, Math.round(valor)));
    setConfig((prev) => {
      const next = { ...prev, superficies: { ...prev.superficies, [serial]: { ...prev.superficies?.[serial], brillo } } };
      if (brilloTimer.current === undefined) api?.config.save(next).catch(() => {});
      clearTimeout(brilloTimer.current);
      brilloTimer.current = window.setTimeout(() => {
        brilloTimer.current = undefined;
        api?.config.save(next).catch(() => {});
      }, 400);
      return next;
    });
  }, [api, setConfig]);

  /**
   * El giro de la pantalla de un dispositivo (0/90/180/270), en su mapa por serial.
   *
   * Es la válvula de seguridad de los modelos sin verificar: si la imagen sale
   * girada, el usuario la corrige aquí y `useSuperficies` repinta al ver la
   * firma distinta. Va por el historial porque es una elección, no un
   * deslizador.
   */
  const fijarRotacionSuperficie = useCallback((serial: string, grados: number) => {
    const rotacion = ((Math.round(grados / 90) * 90) % 360 + 360) % 360;
    withHistory(t('undo.rotateSurface', { grados: rotacion }), (prev) => ({
      ...prev,
      superficies: { ...prev.superficies, [serial]: { ...prev.superficies?.[serial], rotacion } },
    }));
  }, [withHistory, t]);

  return {
    renamePage, addPage, duplicatePage, deletePage, reorderPages, setPageGridSize,
    crearPaginaSuperficie, agregarPaginaSuperficie, fijarTargetAppPagina,
    fijarBrilloSuperficie, fijarRotacionSuperficie, crearPaginaDesdePlantilla,
  };
}
