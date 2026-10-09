import { useEffect } from 'react';
import type { PageConfig } from '../types';
import { indiceRealPorNumero } from './acciones/pageNav';

interface AppShortcutsOptions {
  view: string;
  setView: (view: 'main' | 'fullscreen' | 'wallpaper' | 'rgb' | 'barra' | 'devices') => void;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean | ((v: boolean) => boolean)) => void;
  undo: () => void;
  pages: PageConfig[];
  setActivePage: (idx: number) => void;
}

function manejarEscape(
  searchOpen: boolean,
  setSearchOpen: (open: boolean) => void,
  editingId: string | null,
  setEditingId: (id: string | null) => void,
  view: string,
  setView: (view: 'main') => void,
): boolean {
  if (searchOpen) {
    setSearchOpen(false);
    return true;
  }
  if (editingId !== null) {
    setEditingId(null);
    return true;
  }
  if (view !== 'main') {
    setView('main');
    return true;
  }
  return false;
}

export function useAppShortcuts({
  view,
  setView,
  editingId,
  setEditingId,
  searchOpen,
  setSearchOpen,
  undo,
  pages,
  setActivePage,
}: AppShortcutsOptions): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const inField = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag);

      // Ctrl+K: búsqueda global (funciona incluso en inputs)
      if (e.ctrlKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (view === 'main' && editingId === null) setSearchOpen((v) => !v);
        return;
      }

      // Ctrl+Z: undo
      if (e.ctrlKey && e.key === 'z' && editingId === null && !searchOpen && !inField) {
        undo();
        return;
      }

      // Escape
      if (e.key === 'Escape') {
        manejarEscape(searchOpen, setSearchOpen, editingId, setEditingId, view, setView);
        return;
      }

      // 1-9: solo páginas del deck (las de dock no tienen número aquí).
      if (editingId !== null || searchOpen || inField) return;
      const destino = indiceRealPorNumero(pages, e.key);
      if (destino !== null) setActivePage(destino);
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [editingId, view, pages, undo, searchOpen, setEditingId, setSearchOpen, setView, setActivePage]);
}
