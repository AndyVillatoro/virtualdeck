import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MainB } from './screens/MainB';
import { FullscreenB } from './screens/FullscreenB';
import { EditorB } from './screens/EditorB';
import { WallpaperB } from './screens/WallpaperB';
import { RGBManagerB } from './screens/RGBManagerB';
import { SearchOverlay } from './components/SearchOverlay';
import { NowPlayingProvider } from './utils/nowPlaying';
import { VD } from './design';
import { migrateConfig, validateConfig, CURRENT_CONFIG_VERSION } from './utils/configMigration';
import { runActionSequence, executeAction } from './utils/actions';
import type { ActionType, ButtonConfig, DeckConfig, PageConfig, Profile, SoundProfileId } from './types';

const PAGES_DEFAULT: PageConfig[] = [
  { id: 'main', name: 'PRINCIPAL' },
  { id: 'stream', name: 'STREAM' },
  { id: 'trabajo', name: 'TRABAJO' },
  { id: 'musica', name: 'MÚSICA' },
  { id: 'macros', name: 'MACROS' },
];

function makeDefaultButtons(pages: PageConfig[] = PAGES_DEFAULT): ButtonConfig[] {
  const btns: ButtonConfig[] = [];
  for (let page = 0; page < pages.length; page++) {
    for (let slot = 0; slot < 16; slot++) {
      btns.push({ id: `${page}-${slot}`, page, label: '', icon: '', action: { type: 'none' } });
    }
  }
  return btns;
}

const DEFAULT_CONFIG: DeckConfig = {
  pages: PAGES_DEFAULT,
  buttons: makeDefaultButtons(),
  accent: '#4a8ef0',
  wallpaper: 'solid',
  profiles: [],
  configVersion: CURRENT_CONFIG_VERSION,
};

type View = 'main' | 'fullscreen' | 'wallpaper' | 'rgb';

export default function App() {
  const [view, setView] = useState<View>('main');
  const [config, setConfig] = useState<DeckConfig>(DEFAULT_CONFIG);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [activePage, setActivePage] = useState(0);
  const [autostart, setAutostart] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const historyRef = useRef<{ config: DeckConfig; label: string }[]>([]);
  const [undoToast, setUndoToast] = useState<string | null>(null);
  const undoToastTimer = useRef<number>();
  const api = window.electronAPI;

  const showUndoToast = useCallback((text: string) => {
    setUndoToast(text);
    clearTimeout(undoToastTimer.current);
    undoToastTimer.current = window.setTimeout(() => setUndoToast(null), 3000);
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty('--vd-accent', config.accent);
  }, [config.accent]);

  // Clamp activePage when pages change
  useEffect(() => {
    if (activePage >= config.pages.length) setActivePage(config.pages.length - 1);
  }, [config.pages.length]);

  // Load config + autostart on mount
  useEffect(() => {
    if (!api) { setLoaded(true); return; }
    Promise.all([
      api.config.load().catch(() => ({})),
      api.app.getAutostart().catch(() => false),
    ]).then(([saved, as]) => {
      const migrated = migrateConfig(saved);
      const s = migrated as Partial<DeckConfig>;
      if (s && s.buttons && s.buttons.length > 0) {
        const merged = makeDefaultButtons(s.pages || PAGES_DEFAULT).map((def) => {
          const found = s.buttons?.find((b) => b.id === def.id);
          return found ?? def;
        });
        setConfig({ ...DEFAULT_CONFIG, ...s, buttons: merged, configVersion: CURRENT_CONFIG_VERSION });
      }
      setAutostart(as as boolean);
      setLoaded(true);
    });
  }, []);

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
    withHistory('duplicar botón', (prev) => {
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
    withHistory('limpiar botón', (prev) => ({
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
    withHistory('agregar página', (prev) => {
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
    withHistory('eliminar página', (prev) => {
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

  const toggleAutostart = useCallback(() => {
    const next = !autostart;
    setAutostart(next);
    api?.app.setAutostart(next).catch(() => {});
  }, [api, autostart]);

  // Toggle state for toggle-mode buttons (runtime only, not persisted)
  const [toggledIds, setToggledIds] = useState<Set<string>>(new Set());
  const handleToggle = useCallback((id: string) => {
    setToggledIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  // Reorder pages by drag-and-drop
  const reorderPages = useCallback((fromIdx: number, toIdx: number) => {
    withHistory('reordenar páginas', (prev) => {
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

  // Set grid size for a page
  const setPageGridSize = useCallback((pageId: string, gs: 3 | 4) => {
    withHistory(`cambiar grilla a ${gs}×${gs}`, (prev) => ({
      ...prev,
      pages: prev.pages.map((p) => p.id === pageId ? { ...p, gridSize: gs } : p),
    }));
  }, [withHistory]);

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

  // 1.2 — Mutar el estado global (variables) tras una acción set-var / incr-var.
  // Se persiste con debounce mínimo para no escribir el config tras cada incremento
  // si el usuario hace varios clicks seguidos.
  const stateSaveTimer = useRef<number>();
  const updateState = useCallback((update: Record<string, string>) => {
    setConfig((prev) => {
      const next = { ...prev, state: { ...(prev.state ?? {}), ...update } };
      clearTimeout(stateSaveTimer.current);
      stateSaveTimer.current = window.setTimeout(() => api?.config.save(next).catch(() => {}), 400);
      return next;
    });
  }, [api]);

  // 1.4 — Disparadores externos. Cuando el main proceso emite button:trigger
  // (por hotkey global o tray), ejecutamos la cadena del botón. Funciona
  // independiente de la vista actual; toggles aún se actualizan vía toggledIds.
  useEffect(() => {
    if (!api?.events) return;
    return api.events.onButtonTrigger(async (id) => {
      const btn = config.buttons.find((b) => b.id === id);
      if (!btn || !api) return;
      // Toggle/folder: replicamos lógica de MainB.executeButton de forma simplificada.
      if (btn.action.type === 'folder') return; // Folder requiere UI
      if (btn.isToggle) {
        const wasToggled = toggledIds.has(btn.id);
        handleToggle(btn.id);
        if (wasToggled && btn.actionToggleOff && btn.actionToggleOff.type !== 'none') {
          const r = await executeAction(btn.actionToggleOff, api, config.state, config.rgb?.profiles);
          if (r.stateUpdate) updateState(r.stateUpdate as Record<string, string>);
          return;
        }
      }
      const actionsToRun = (btn.actions && btn.actions.length > 0) ? btn.actions : [btn.action];
      const baseState = config.state ?? {};
      const r = await runActionSequence(actionsToRun, api, baseState, undefined, config.rgb?.profiles);
      const newKeys = Object.keys(r.stateUpdate).filter((k) => r.stateUpdate[k] !== baseState[k]);
      if (newKeys.length > 0) {
        const update: Record<string, string> = {};
        for (const k of newKeys) update[k] = r.stateUpdate[k];
        updateState(update);
      }
    });
  }, [api, config.buttons, config.state, toggledIds, updateState]);

  const handleConfigExport = useCallback(async () => { await api?.config.export(); }, [api]);

  const [importError, setImportError] = useState<string | null>(null);

  const applyImportedConfig = useCallback((raw: unknown) => {
    const migrated = migrateConfig(raw);
    const v = validateConfig(migrated);
    if (!v.ok || !v.config) {
      setImportError(`Importación rechazada: ${v.error ?? 'shape inválido'}`);
      return false;
    }
    const s = v.config;
    const merged = makeDefaultButtons(s.pages).map((def) => {
      const found = s.buttons.find((b) => b.id === def.id);
      return found ?? def;
    });
    setConfig({ ...DEFAULT_CONFIG, ...s, buttons: merged, configVersion: CURRENT_CONFIG_VERSION });
    setImportError(null);
    return true;
  }, []);

  const handleConfigImport = useCallback(async () => {
    const data = await api?.config.import();
    if (!data) return;
    applyImportedConfig(data);
  }, [api, applyImportedConfig]);

  // 6.1 — Importar perfil desde URL (galería remota)
  const handleConfigImportFromUrl = useCallback(async (url: string) => {
    if (!url.trim()) return;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) {
        setImportError(`No se pudo descargar (${res.status} ${res.statusText})`);
        return;
      }
      const json = await res.json();
      applyImportedConfig(json);
    } catch (e) {
      setImportError(`Error de descarga: ${(e as Error).message}`);
    }
  }, [applyImportedConfig]);

  // Keyboard shortcuts
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
      if (e.ctrlKey && e.key === 'z' && editingId === null && !searchOpen) {
        if (!inField) {
          undo();
          return;
        }
      }
      // Escape
      if (e.key === 'Escape') {
        if (searchOpen) { setSearchOpen(false); return; }
        if (editingId !== null) { setEditingId(null); return; }
        if (view === 'fullscreen') { setView('main'); return; }
        if (view === 'wallpaper') { setView('main'); return; }
        if (view === 'rgb') { setView('main'); return; }
        return;
      }
      // 1-5+: switch pages
      if (editingId !== null || searchOpen) return;
      if (inField) return;
      const num = parseInt(e.key);
      if (!isNaN(num) && num >= 1 && num <= config.pages.length) setActivePage(num - 1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [editingId, view, config.pages.length, undo, searchOpen]);

  if (!loaded) {
    return (
      <div style={{ width: '100vw', height: '100vh', background: VD.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: VD.textMuted, fontFamily: VD.mono, fontSize: 12, letterSpacing: 2 }}>
        CARGANDO...
      </div>
    );
  }

  const editingButton = editingId ? config.buttons.find((b) => b.id === editingId) ?? null : null;

  return (
    <NowPlayingProvider>
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative' }}>
      {view === 'main' && (
        <MainB
          config={config}
          activePage={activePage}
          autostart={autostart}
          onPageChange={setActivePage}
          onFullscreen={() => setView('fullscreen')}
          onEditButton={(id) => setEditingId(id)}
          onWallpaper={() => setView('wallpaper')}
          onRGB={() => setView('rgb')}
          onConfigChange={saveConfig}
          onDuplicateButton={duplicateButton}
          onClearButton={clearButton}
          onConfigExport={handleConfigExport}
          onConfigImport={handleConfigImport}
          onConfigImportFromUrl={handleConfigImportFromUrl}
          onSwapButtons={swapButtons}
          onPageRename={renamePage}
          onPageAdd={addPage}
          onPageDelete={deletePage}
          onSaveProfile={saveProfile}
          onLoadProfile={loadProfile}
          onDeleteProfile={deleteProfile}
          onAutostartToggle={toggleAutostart}
          toggledIds={toggledIds}
          onToggle={handleToggle}
          onPageReorder={reorderPages}
          onPageSetGrid={setPageGridSize}
          onMoveButtonToPage={moveButtonToPage}
          soundOnPress={config.soundOnPress ?? true}
          soundProfile={config.soundProfile ?? 'click'}
          onSoundToggle={toggleSoundOnPress}
          onSoundProfileChange={setSoundProfile}
          onStateUpdate={updateState}
        />
      )}

      {view === 'fullscreen' && (
        <FullscreenB
          config={config}
          soundOnPress={config.soundOnPress ?? true}
          soundProfile={config.soundProfile ?? 'click'}
          onExit={() => setView('main')}
          onSetKioskPin={setKioskPin}
          onStateUpdate={updateState}
        />
      )}

      {view === 'wallpaper' && (
        <WallpaperB
          config={config}
          onBack={() => setView('main')}
          onSave={(wallpaper) => saveConfig({ ...config, wallpaper })}
        />
      )}

      {view === 'rgb' && (
        <RGBManagerB
          config={config}
          onConfigChange={saveConfig}
          onBack={() => setView('main')}
        />
      )}

      {editingButton && (
        <EditorB
          button={editingButton}
          rgbProfiles={config.rgb?.profiles ?? []}
          onClose={() => setEditingId(null)}
          onSave={(updated) => { updateButton(updated); setEditingId(null); }}
        />
      )}

      {searchOpen && view === 'main' && (
        <SearchOverlay
          config={config}
          accent={config.accent}
          onClose={() => setSearchOpen(false)}
          onPick={(btn) => {
            setActivePage(btn.page);
            setSearchOpen(false);
            setEditingId(btn.id);
          }}
        />
      )}

      {/* Undo toast — bottom-center, no-blocking */}
      {undoToast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          zIndex: 300,
          background: VD.surface, border: `1px solid ${VD.borderStrong}`,
          borderRadius: VD.radius.md, padding: '8px 14px',
          fontFamily: VD.mono, fontSize: 10, color: VD.text, letterSpacing: 0.5,
          boxShadow: VD.shadow.menu,
        }}>
          {undoToast}
        </div>
      )}

      {/* Import error — bottom-center, dismissible */}
      {importError && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          zIndex: 310,
          background: VD.surface, border: `1px solid ${VD.danger}`,
          borderRadius: VD.radius.md, padding: '10px 16px',
          fontFamily: VD.mono, fontSize: 11, color: VD.text,
          maxWidth: 'min(560px, 80%)', boxShadow: VD.shadow.menu,
          display: 'flex', gap: 10, alignItems: 'flex-start',
        }}>
          <span style={{ color: VD.danger, fontSize: 13, flexShrink: 0 }}>!</span>
          <span style={{ flex: 1, lineHeight: 1.5 }}>{importError}</span>
          <button
            onClick={() => setImportError(null)}
            style={{ background: 'none', border: 'none', color: VD.textMuted, cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0 }}
          >×</button>
        </div>
      )}

    </div>
    </NowPlayingProvider>
  );
}
