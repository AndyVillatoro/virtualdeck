import { useCallback } from 'react';
import { conHuecosCompletos } from '../configDefaults';
import { sanearPagina } from '../configMigration';
import type { ButtonConfig, OrigenInstalacion, PageConfig, Profile } from '../../types';
import type { ContextoDeck } from './contexto';

/**
 * Los perfiles: guardar, cargar y borrar una disposicion entera del deck, y
 * añadir paginas sueltas desde la galería o desde un perfil.
 *
 * Las tres operaciones de perfil pasan por `withHistory` como todo lo demas. No
 * lo hacian, y eso dejaba **borrar un perfil fuera del deshacer**: un clic de
 * mas en la × y la unica copia de una disposicion entera se iba sin aviso ni
 * vuelta atras, cuando borrar una pagina —que es menos— si se deshace.
 */
export function useDeckPerfiles({ config, withHistory, setActivePage, t }: ContextoDeck) {
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
        // Volver a guardar con el mismo nombre actualiza el perfil, no lo
        // reinicia: la app vinculada y el origen (tienda) que ya tenía se
        // conservan. Sin esto, re-guardar borraba el `targetApp` y el aviso
        // de updates perdía de qué entrada vino.
        ...(yaEsta?.targetApp ? { targetApp: yaEsta.targetApp } : {}),
        ...(yaEsta?.origen ? { origen: yaEsta.origen } : {}),
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

  const appendPagesFromProfile = useCallback((profile: Profile) => {
    let newActivePage = 0;
    withHistory(t('undo.appendProfile', { nombre: profile.name }), (prev) => {
      const baseIdx = prev.pages.length;
      newActivePage = baseIdx;
      const timestamp = Date.now();
      const newPages: PageConfig[] = profile.pages.map((p, i) => {
        const { pagina: acotada } = sanearPagina(p);
        const gs = acotada.gridSize ?? 4;
        const gr = acotada.gridRows ?? gs;
        return {
          ...acotada,
          gridSize: gs,
          gridRows: gr,
          id: `page_${timestamp}_${i}`,
          name: p.name || `${t('page.importedName')} ${baseIdx + i + 1}`,
        };
      });

      const botonesRemapeados: ButtonConfig[] = [];
      for (let i = 0; i < newPages.length; i++) {
        const targetPage = baseIdx + i;
        const botonesOriginales = (profile.buttons ?? []).filter((b) => b.page === i);
        const botonesNormalizados = conHuecosCompletos([newPages[i]], botonesOriginales.map((b) => ({ ...b, page: 0 })))
          .map((b, slotIdx) => ({
            ...b,
            id: `p${timestamp}_${targetPage}_${slotIdx}`,
            page: targetPage,
          }));
        botonesRemapeados.push(...botonesNormalizados);
      }

      return {
        ...prev,
        pages: [...prev.pages, ...newPages],
        buttons: [...prev.buttons, ...botonesRemapeados],
      };
    });
    if (newActivePage > 0) setActivePage(newActivePage);
  }, [withHistory, setActivePage, t]);

  const appendProfilePages = useCallback((id: string) => {
    const profile = config.profiles?.find((p) => p.id === id);
    if (!profile) return;
    appendPagesFromProfile(profile);
  }, [config.profiles, appendPagesFromProfile]);

  /**
   * Agrega UNA página suelta (tienda, kind 'page') como página nueva.
   *
   * Igual que la importación de página local, pero con dos extras: deja
   * constancia del origen (manifiesto + versión, para avisar updates) y
   * limpia los atajos globales que choquen con los que ya hay — un atajo
   * duplicado haría que dos botones respondieran a la misma tecla.
   * Devuelve cuántos atajos se limpiaron, para avisarlo en pantalla.
   */
  const appendPageFromGallery = useCallback((page: PageConfig, buttons: ButtonConfig[], origen?: OrigenInstalacion): number => {
    const ocupados = new Set(
      config.buttons.map((b) => b.globalHotkey).filter((h): h is string => !!h),
    );
    let limpiados = 0;
    const sinChoques = buttons.map((b) => {
      if (b.globalHotkey && ocupados.has(b.globalHotkey)) {
        limpiados++;
        const { globalHotkey: _quitado, ...resto } = b;
        return resto as ButtonConfig;
      }
      if (b.globalHotkey) ocupados.add(b.globalHotkey);
      return b;
    });
    const newIdx = config.pages.length;
    withHistory(t('undo.appendPage', { nombre: page.name || `#${newIdx + 1}` }), (prev) => {
      const { pagina: acotada } = sanearPagina(page);
      const cols = acotada.gridSize ?? 4;
      const timestamp = Date.now();
      const newPage: PageConfig = {
        ...acotada, gridSize: cols, gridRows: acotada.gridRows ?? cols,
        id: `page_${timestamp}`,
        name: (page.name || t('page.importedName')).toUpperCase(),
        ...(origen ? { origen } : {}),
      };
      const rellenados = conHuecosCompletos([newPage], sinChoques.map((b) => ({ ...b, page: 0 })))
        .map((b, i) => ({ ...b, id: `p${timestamp}_${newIdx}_${i}`, page: newIdx }));
      return { ...prev, pages: [...prev.pages, newPage], buttons: [...prev.buttons, ...rellenados] };
    });
    setActivePage(newIdx);
    return limpiados;
  }, [config.buttons, config.pages.length, withHistory, setActivePage, t]);

  const deleteProfile = useCallback((id: string) => {
    withHistory('', (prev) => ({
      ...prev,
      profiles: (prev.profiles ?? []).filter((p) => p.id !== id),
    }), (prev) => t('undo.deleteProfile', {
      nombre: prev.profiles?.find((p) => p.id === id)?.name ?? '',
    }));
  }, [withHistory, t]);

  return {
    saveProfile, loadProfile, appendProfilePages, appendPagesFromProfile, appendPageFromGallery, deleteProfile,
  };
}
