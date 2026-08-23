import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MainB } from './screens/MainB';
import { FullscreenB } from './screens/FullscreenB';
import { EditorB } from './screens/EditorB';
import { WallpaperB } from './screens/WallpaperB';
import { RGBManagerB } from './screens/RGBManagerB';
import { BarConfigB } from './screens/BarConfigB';
import { SearchOverlay } from './components/SearchOverlay';
import { Onboarding } from './components/Onboarding';
import { NowPlayingProvider } from './utils/nowPlaying';
import { LanguageProvider, useT } from './utils/i18n';
import { ThemeProvider, useTheme } from './utils/theme';
import { migrateConfig, validateConfig, CURRENT_CONFIG_VERSION } from './utils/configMigration';
import { useDisparadores } from './utils/useDisparadores';
import { playSound } from './utils/sound';
import { useSensors } from './utils/sensors';
import { DEFAULT_CONFIG, PAGES_DEFAULT, makeDefaultButtons } from './utils/configDefaults';
import { useDeck } from './utils/useDeck';
import { runActionSequence, executeAction } from './utils/actions';
import { installGlobalErrorHandlers, logError } from './utils/logger';
import type { ButtonConfig, DeckConfig, PageConfig } from './types';

type View = 'main' | 'fullscreen' | 'wallpaper' | 'rgb' | 'barra';

// Banner de actualización lista. Extraído como componente para que pueda usar
// useT() (App renderiza el LanguageProvider, así que su cuerpo queda fuera del
// contexto i18n; sus hijos sí lo tienen).
function PantallaCargando() {
  const VD = useTheme();
  return (
    <div style={{ width: '100vw', height: '100vh', background: VD.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: VD.textMuted, fontFamily: VD.mono, fontSize: 12, letterSpacing: 2 }}>
      CARGANDO...
    </div>
  );
}

function AvisoDeshacer({ texto }: { texto: string }) {
  const VD = useTheme();
  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      zIndex: 300,
      background: VD.surface, border: `1px solid ${VD.borderStrong}`,
      borderRadius: VD.radius.md, padding: '8px 14px',
      fontFamily: VD.mono, fontSize: 10, color: VD.text, letterSpacing: 0.5,
      boxShadow: VD.shadow.menu,
    }}>
      {texto}
    </div>
  );
}

function AvisoError({ texto, onCerrar }: { texto: string; onCerrar: () => void }) {
  const VD = useTheme();
  return (
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
      <span style={{ flex: 1, lineHeight: 1.5 }}>{texto}</span>
      <button
        onClick={onCerrar}
        style={{ background: 'none', border: 'none', color: VD.textMuted, cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0 }}
      >&times;</button>
    </div>
  );
}

function UpdateBanner({ version, onRestart, onLater }: { version: string; onRestart: () => void; onLater: () => void }) {
  const VD = useTheme();
  const t = useT();
  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      zIndex: 320,
      background: VD.surface, border: `1px solid ${VD.accent}`,
      borderRadius: VD.radius.md, padding: '10px 16px',
      fontFamily: VD.mono, fontSize: 11, color: VD.text,
      boxShadow: VD.shadow.menu, display: 'flex', gap: 12, alignItems: 'center',
    }}>
      <span>{t('update.ready', { version })}</span>
      <button
        onClick={onRestart}
        style={{ padding: '5px 12px', background: VD.accent, border: 'none', color: '#fff', fontFamily: VD.mono, fontSize: 10, cursor: 'pointer', borderRadius: VD.radius.sm, letterSpacing: 1 }}
      >{t('update.restart')}</button>
      <button
        onClick={onLater}
        style={{ padding: '5px 8px', background: 'none', border: `1px solid ${VD.border}`, color: VD.textMuted, fontFamily: VD.mono, fontSize: 10, cursor: 'pointer', borderRadius: VD.radius.sm }}
      >{t('update.later')}</button>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<View>('main');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activePage, setActivePage] = useState(0);
  const [autostart, setAutostart] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const [undoToast, setUndoToast] = useState<string | null>(null);
  const undoToastTimer = useRef<number>();
  const [updateReady, setUpdateReady] = useState<string | null>(null);
  const api = window.electronAPI;

  const showUndoToast = useCallback((text: string) => {
    setUndoToast(text);
    clearTimeout(undoToastTimer.current);
    undoToastTimer.current = window.setTimeout(() => setUndoToast(null), 3000);
  }, []);

  // Toda la configuracion y lo que la cambia vive en este hook. App se queda
  // con la vista, los avisos y el onboarding.
  const deck = useDeck({ api, showUndoToast, setActivePage });
  const {
    config, setConfig, loaded, setLoaded, t,
    withHistory, undo, saveConfig,
    updateButton, duplicateButton, clearButton, moveButtonToPage, swapButtons,
    renamePage, addPage, deletePage, reorderPages, setPageGridSize,
    saveProfile, loadProfile, deleteProfile,
    setUiScale, setTheme, setLanguage, dismissHint,
    toggleSoundOnPress, setSoundProfile, setKioskPin, updateState,
    toggleAlwaysOnTop,
  } = deck;

  useEffect(() => {
    document.documentElement.style.setProperty('--vd-accent', config.accent);
  }, [config.accent]);

  // Apply UI scale via Electron zoom factor
  useEffect(() => {
    if (!api || config.uiScale === undefined) return;
    api.app.setZoom(config.uiScale).catch(() => {});
  }, [config.uiScale]);

  // Primer plano. El proceso principal ya lo aplica al crear la ventana leyendo
  // la config del disco; esto es para cuando el usuario lo cambia en caliente.
  useEffect(() => {
    api?.window.setAlwaysOnTop(!!config.alwaysOnTop);
  }, [config.alwaysOnTop]);

  // Clamp activePage when pages change
  useEffect(() => {
    if (activePage >= config.pages.length) setActivePage(config.pages.length - 1);
  }, [config.pages.length]);

  // Install global error handlers once (forwards to main-process log file).
  useEffect(() => { installGlobalErrorHandlers(); }, []);

  // Listen for auto-update events (downloaded → offer restart).
  useEffect(() => {
    if (!api?.update?.onStatus) return;
    return api.update.onStatus((s: { status: string; version?: string }) => {
      if (s.status === 'downloaded') setUpdateReady(s.version ?? '');
    });
  }, [api]);

  // Load config + autostart on mount
  useEffect(() => {
    if (!api) { setLoaded(true); return; }
    Promise.all([
      api.config.load().catch((e) => { logError('config.load', e); return {}; }),
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
      // Primera ejecución: instalación virgen (sin config en disco) → s no trae
      // onboardingCompleted. La migración v3→v4 lo marca true para usuarios
      // existentes, así que solo los nuevos ven el tutorial.
      if (s.onboardingCompleted !== true) setShowOnboarding(true);
      setLoaded(true);
    });
  }, []);

  // Marca el onboarding como completado (o saltado) y persiste el flag.
  const finishOnboarding = useCallback(() => {
    setShowOnboarding(false);
    setConfig((prev) => {
      const next = { ...prev, onboardingCompleted: true };
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








  // Page export
  const handlePageExport = useCallback(async (pageIdx: number) => {
    if (!api) return;
    const page = config.pages[pageIdx];
    const buttons = config.buttons.filter((b) => b.page === pageIdx);
    await api.page.export({ page, buttons }).catch(() => {});
  }, [api, config]);

  // Page import
  const handlePageImport = useCallback(async () => {
    if (!api) return;
    const raw = await api.page.import().catch(() => null);
    // `null` es «el usuario cancelo el dialogo»: ahi no hay nada que decir.
    if (raw === null || raw === undefined) return;
    const imported = raw as { page?: PageConfig; buttons?: ButtonConfig[] };
    if (typeof raw !== 'object' || !imported.page || !Array.isArray(imported.buttons)) {
      // Antes esto era un `return` mudo: elegias un archivo que no era una
      // pagina y no pasaba nada, sin decir por que.
      setImportError(t('page.importRejected'));
      return;
    }
    withHistory(t('undo.importPage'), (prev) => {
      const newIdx = prev.pages.length;
      // La rejilla viene del archivo y hay que acotarla: un `gridSize: 99` en
      // el JSON pasaba tal cual y creaba una pagina de 99 columnas que no se
      // puede usar ni deshacer desde la interfaz.
      const cols = [3, 4, 5, 6].includes(Number(imported.page!.gridSize))
        ? (Number(imported.page!.gridSize) as 3 | 4 | 5 | 6) : 4;
      const filasCrudas = Number(imported.page!.gridRows);
      const filas = Number.isFinite(filasCrudas) && filasCrudas >= 1 && filasCrudas <= 8
        ? Math.round(filasCrudas) : cols;
      const newPage: PageConfig = {
        ...imported.page!, gridSize: cols, gridRows: filas,
        id: `page_${Date.now()}`,
        name: (imported.page!.name || t('page.importedName')).toUpperCase(),
      };
      const newButtons: ButtonConfig[] = (imported.buttons ?? []).map((b, i) => ({
        ...b,
        id: `p${Date.now()}_${i}`,
        page: newIdx,
      }));
      return { ...prev, pages: [...prev.pages, newPage], buttons: [...prev.buttons, ...newButtons] };
    });
  }, [api, withHistory, t]);




  // 1.2 — Mutar el estado global (variables) tras una acción set-var / incr-var.
  // Se persiste con debounce mínimo para no escribir el config tras cada incremento
  // si el usuario hace varios clicks seguidos.

  // 1.4 — Disparadores externos. Cuando el main proceso emite button:trigger
  // (por hotkey global o tray), ejecutamos la cadena del botón. Funciona
  // independiente de la vista actual; toggles aún se actualizan vía toggledIds.
  /**
   * Disparar un boton sin que nadie lo pulse: atajo global, menu de la
   * bandeja, hora programada o umbral de un sensor.
   *
   * Vive en `App` porque `App` esta montada siempre. Los disparadores por hora
   * y por sensor estaban dentro de `MainB`, asi que **dejaban de sonar en
   * kiosko** — justo el modo de dejar el deck solo, que es donde una accion
   * programada tiene mas sentido.
   */
  const dispararBoton = useCallback(async (btn: ButtonConfig) => {
    if (!api) return;
    if (btn.action.type === 'folder') return; // Una carpeta necesita interfaz.
    // Suena igual que si lo hubieras pulsado. Un boton que se dispara solo —a
    // una hora, por un sensor, por un atajo global— no da ninguna otra señal
    // de que ha pasado algo, que es justo cuando mas falta hace.
    if (config.soundOnPress ?? true) playSound(config.soundProfile ?? 'click');
    if (btn.isToggle) {
      const estaba = toggledIds.has(btn.id);
      handleToggle(btn.id);
      if (estaba && btn.actionToggleOff && btn.actionToggleOff.type !== 'none') {
        const r = await executeAction(btn.actionToggleOff, api, config.state, config.rgb?.profiles, t);
        if (r.stateUpdate) updateState(r.stateUpdate as Record<string, string>);
        return;
      }
    }
    const acciones = (btn.actions && btn.actions.length > 0) ? btn.actions : [btn.action];
    const estadoBase = config.state ?? {};
    const r = await runActionSequence(acciones, api, estadoBase, undefined, config.rgb?.profiles, t);
    const nuevas = Object.keys(r.stateUpdate).filter((k) => r.stateUpdate[k] !== estadoBase[k]);
    if (nuevas.length > 0) {
      const cambio: Record<string, string> = {};
      for (const k of nuevas) cambio[k] = r.stateUpdate[k];
      updateState(cambio);
    }
  }, [api, config.state, config.rgb?.profiles, config.soundOnPress, config.soundProfile,
      toggledIds, updateState, handleToggle, t]);

  // Atajo global del sistema y menu de la bandeja: el proceso principal emite
  // button:trigger y aqui se ejecuta la cadena del boton.
  useEffect(() => {
    if (!api?.events) return;
    return api.events.onButtonTrigger((id) => {
      const btn = config.buttons.find((b) => b.id === id);
      if (btn) void dispararBoton(btn);
    });
  }, [api, config.buttons, dispararBoton]);

  const { sensors: sensorList } = useSensors();
  useDisparadores({ botones: config.buttons, sensores: sensorList, disparar: dispararBoton });

  const handleConfigExport = useCallback(async () => { await api?.config.export(); }, [api]);

  const [importError, setImportError] = useState<string | null>(null);

  const applyImportedConfig = useCallback((raw: unknown) => {
    const migrated = migrateConfig(raw);
    const v = validateConfig(migrated, t);
    if (!v.ok || !v.config) {
      setImportError(t('import.rejected', { motivo: v.error ?? t('import.badShape') }));
      return false;
    }
    const s = v.config;
    const merged = makeDefaultButtons(s.pages).map((def) => {
      const found = s.buttons.find((b) => b.id === def.id);
      return found ?? def;
    });
    const final = { ...DEFAULT_CONFIG, ...s, buttons: merged, configVersion: CURRENT_CONFIG_VERSION };
    setConfig(final);
    // Guardar aqui y no en el proceso principal, por dos motivos: solo se
    // escribe lo que ha pasado la validacion, y se escribe **esto** —migrado y
    // fusionado— y no el JSON crudo del archivo. Ademas hace que la
    // importacion desde una URL persista: antes solo cambiaba el estado de
    // React y al reiniciar el perfil descargado ya no estaba.
    api?.config.save(final).catch(() => {});
    setImportError(null);
    return true;
  }, [api, t]);

  const handleConfigImport = useCallback(async () => {
    const data = await api?.config.import();
    if (!data) return;
    applyImportedConfig(data);
  }, [api, applyImportedConfig]);

  // 6.1 — Importar perfil desde URL (galería remota)
  const handleConfigImportFromUrl = useCallback(async (url: string) => {
    if (!url.trim()) return;
    // La descarga la hace el proceso principal: la CSP del renderer solo
    // permite 'self' y los dos servicios del clima, asi que un fetch de aqui
    // se rechaza siempre.
    const r = await api?.config.fetchRemote(url);
    if (!r) return;
    if (!r.ok) {
      setImportError(t('import.downloadFailed', { motivo: r.error ?? '' }));
      return;
    }
    applyImportedConfig(r.data);
  }, [api, applyImportedConfig, t]);

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
        if (view === 'barra') { setView('main'); return; }
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
    // Envuelta en el proveedor de tema porque `App` renderiza el proveedor: su
    // propio cuerpo queda fuera del contexto, asi que el color tiene que salir
    // de un componente hijo o siempre seria el oscuro.
    return (
      <ThemeProvider theme={config.theme ?? 'dark'} accent={config.accent}>
        <PantallaCargando />
      </ThemeProvider>
    );
  }

  const editingButton = editingId ? config.buttons.find((b) => b.id === editingId) ?? null : null;

  return (
    <LanguageProvider pref={config.language}>
    <ThemeProvider theme={config.theme ?? 'dark'} accent={config.accent}>
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
          onFloatingBar={() => setView('barra')}
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
          uiScale={config.uiScale ?? 1}
          onUiScaleChange={setUiScale}
          alwaysOnTop={config.alwaysOnTop ?? false}
          onAlwaysOnTopToggle={toggleAlwaysOnTop}
          theme={config.theme ?? 'dark'}
          onThemeChange={setTheme}
          language={config.language ?? 'system'}
          onLanguageChange={setLanguage}
          hintsDismissed={config.hintsDismissed ?? []}
          onDismissHint={dismissHint}
          onPageExport={handlePageExport}
          onPageImport={handlePageImport}
          onReplayOnboarding={() => setShowOnboarding(true)}
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

      {view === 'barra' && (
        <BarConfigB
          config={config}
          onConfigChange={saveConfig}
          onBack={() => setView('main')}
        />
      )}

      {editingButton && (
        <EditorB
          button={editingButton}
          rgbProfiles={config.rgb?.profiles ?? []}
          deckState={config.state ?? {}}
          onClose={() => setEditingId(null)}
          onSave={(updated) => { updateButton(updated); setEditingId(null); }}
        />
      )}

      {showOnboarding && (
        <Onboarding accent={config.accent} onClose={finishOnboarding} />
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
        <AvisoDeshacer texto={undoToast} />
      )}

      {/* Update ready — bottom-center, offers restart */}
      {updateReady !== null && (
        <UpdateBanner
          version={updateReady}
          onRestart={() => api?.update.quitAndInstall()}
          onLater={() => setUpdateReady(null)}
        />
      )}

      {/* Import error — bottom-center, dismissible */}
      {importError && (
        <AvisoError texto={importError} onCerrar={() => setImportError(null)} />
      )}

    </div>
    </NowPlayingProvider>
    </ThemeProvider>
    </LanguageProvider>
  );
}
