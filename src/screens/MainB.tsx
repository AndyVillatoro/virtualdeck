import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTheme } from '../utils/theme';
import { useT } from '../utils/i18n';
import { BarraLateral } from './main/BarraLateral';
import { PanelMusicaLateral } from './main/PanelesMusica';
import { AvisosContextuales } from './main/AvisosContextuales';
import { BarraSuperiorMain } from './main/BarraSuperiorMain';
import { CeldaPrincipal } from './main/CeldaPrincipal';
import { useAtajosSeleccion } from './main/atajosSeleccion';
import { FolderOverlay } from './main/OverlayCarpeta';
import { PestanasPagina } from './main/PestanasPagina';
import { MenuContextualPagina } from './main/MenuContextualPagina';
import { BarraSeleccionLote } from './main/BarraSeleccionLote';
import { ModalVincularApp } from './main/ModalVincularApp';
import { pulsarBoton, pulsacionLarga, type EntornoPulsacion } from '../utils/pulsarBoton';
import { logError } from '../utils/logger';
import { Wallpaper } from '../components/Wallpaper';
import { useDatosWidget, useClimaWidget, useDivisas } from '../components/celda/useDatosWidget';
import { useEstadoSistema } from '../utils/estadoSistema';
import { RejillaBotones } from '../components/rejilla/RejillaBotones';
import { resolverBotonesPagina } from '../utils/botonesPagina';
import { DotGlyphIcon } from '../components/dot480/DotGlyphIcon';
import { useNowPlaying, useNowPlayingActivation } from '../utils/nowPlaying';
import { useSensors } from '../utils/sensors';
import type { ButtonConfig } from '../types';
import { type MainBProps, getSourceName } from './main/tipos';

export function MainB({
  config, activePage, autostart, toggledIds, soundOnPress, soundProfile,
  onPageChange, onToggle, onFullscreen, onEditButton, onWallpaper, onRGB,
  onConfigChange, onUpdateButton, onDuplicateButton, onCopyButton, onPasteButton, canPasteButton, onClearButton,
  onConfigExport, onConfigImport, onSwapButtons,
  onPageRename, onPageAdd, onDuplicatePage, onPageDelete, onPageReorder, onPageSetGrid, onMoveButtonToPage, onMoveButtonsToPage, onClearButtons,
  onSaveProfile, onLoadProfile, onAppendProfilePages, onAppendPagesFromProfile, onDeleteProfile, onAutostartToggle, onSoundToggle, onSoundProfileChange, onStateUpdate,
  uiScale, onUiScaleChange, alwaysOnTop, onAlwaysOnTopToggle, onFloatingBar, theme, onThemeChange, language, onLanguageChange, hintsDismissed, onDismissHint, onPageExport, onPageImport, onReplayOnboarding,
}: MainBProps) {
  const VD = useTheme();
  const t = useT();
  const api = window.electronAPI;
  const nowPlaying = useNowPlaying();
  const setNowPlayingActive = useNowPlayingActivation();
  const { sensors: sensorList, status: sensorStatus } = useSensors();
  const [showSidebar, setShowSidebar] = useState(true);
  // El panel de musica. Viene apagado: quien no lo quiera no pierde 300 px de
  // rejilla, y quien lo encienda lo ve aparecer solo cuando hay algo sonando.
  const panelMusica = config.musicPanel ?? { enabled: false, side: 'right' as const };
  const [renamingPageId, setRenamingPageId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [pageContextMenu, setPageContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dragSourceId, setDragSourceId] = useState<string | null>(null);
  const [dragPageIdx, setDragPageIdx] = useState<number | null>(null);
  const [dragOverPageIdx, setDragOverPageIdx] = useState<number | null>(null);
  const [openFolderBtn, setOpenFolderBtn] = useState<ButtonConfig | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [clock, setClock] = useState(() => new Date());
  const [bindingAppPageId, setBindingAppPageId] = useState<string | null>(null);
  // El sondeo del sistema y las dos funciones que lo leen se comparten con
  // kiosko, que no las tenia.
  const estadoSistema = useEstadoSistema(api);
  const { rgbStatus } = estadoSistema;

  const handleTogglePin = useCallback((buttonId: string) => {
    const btn = config.buttons.find((b) => b.id === buttonId);
    if (!btn) return;
    const nextPinned = !btn.pinned;
    const nextButtons = config.buttons.map((b) => (b.id === buttonId ? { ...b, pinned: nextPinned || undefined } : b));
    onConfigChange({ ...config, buttons: nextButtons });
  }, [config, onConfigChange]);

  const [execLog, setExecLog] = useState<{ id: number; ts: number; label: string; actionType: string; ok: boolean; error?: string }[]>([]);
  const execLogIdRef = useRef(0);
  const [showLog, setShowLog] = useState(false);
  const [runningButtons, setRunningButtons] = useState<Set<string>>(new Set());
  const toastTimer = useRef<number>();
  const touchStartXRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);
  const lastSwipeAtRef = useRef<number>(0);

  const [windowHeight, setWindowHeight] = useState(() => (typeof window !== 'undefined' ? window.innerHeight : 720));
  useEffect(() => {
    const handleResize = () => setWindowHeight(window.innerHeight);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [uiScale]);
  const isCompact = windowHeight < 540;

  // Grid sizing — JS-driven because pure-CSS `aspect-ratio + max-width/height`
  // collapses when children are 100%-sized (no intrinsic dimension). We measure
  // the wrapper and compute exact px so the grid expands to the largest box
  // that fits while keeping cells square.

  // Clear selection when switching pages
  useEffect(() => { setSelectedIds(new Set()); }, [activePage]);

  // Pausar el polling de nowPlaying cuando la sidebar está oculta (no hay consumidor visible).
  // El sondeo de reproduccion cuesta un PowerShell por tic, asi que solo corre
  // si hay algo que lo enseñe (barra lateral, panel de música flotante o widget en la cuadrícula).
  const tieneWidgetNowPlaying = config.buttons.some((b) => b.widget === 'now-playing');
  const necesitaMedia = showSidebar || panelMusica.enabled || tieneWidgetNowPlaying;
  useEffect(() => { setNowPlayingActive(necesitaMedia); }, [necesitaMedia, setNowPlayingActive]);

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // El sondeo del clima vive con el resto de datos de widget, para que kiosko
  // lo tenga igual que la pantalla principal.
  const widgetWeather = useClimaWidget(config.buttons.some((b) => b.widget === 'weather'), api);

  useEffect(() => {
    if (!pageContextMenu) return;
    const close = () => setPageContextMenu(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [pageContextMenu]);

  const showToast = useCallback((text: string) => {
    setToast(text);
    clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 6000);
  }, []);

  const limpiarSeleccion = useCallback(() => setSelectedIds(new Set()), []);

  const conmutarSeleccion = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  useAtajosSeleccion({
    selectedIds, onCopyButton, onPasteButton, canPasteButton,
    onDuplicateButton, onClearButton, onLimpiarSeleccion: limpiarSeleccion,
    avisar: showToast, t,
  });

  // Se asigna en cada render, no en un efecto: solo la leen los manejadores
  // de pulsacion, y ahi hace falta el valor de ahora, no el del render en el
  // que se creo la celda.
  // Igual que `toggledIds`: la celda conserva el manejador de su primer render,
  // asi que leer `config` del cierre daba el de entonces. Se notaba en las
  // acciones que interpolan `{variable}`: una accion `n = vi-{m}` escribia el
  // valor de `m` de cuando se dibujo la celda, no el de ahora. Solo se salvaban
  // los botones cuya **etiqueta** lleva `{}`, porque eso si fuerza el redibujo.
  const configRef = useRef(config);
  configRef.current = config;

  const toggledRef = useRef(toggledIds);
  toggledRef.current = toggledIds;

  const entorno = useCallback((): EntornoPulsacion => ({
    api: api!,
    config: configRef.current, toggledIds: () => toggledRef.current, onToggle, onStateUpdate,
    avisar: showToast, t,
  // `toggledIds` no va aqui: se lee por referencia. Dejarlo ademas recreaba
  // el entorno en cada encendido, sin ninguna falta.
  }), [api, onToggle, onStateUpdate, showToast, t]);

  /** Anota lo ejecutado en el registro lateral. Es lo unico propio de esta pantalla. */
  const anotar = useCallback((etiqueta: string, tipo: string, ok: boolean, error?: string) => {
    setExecLog((prev) => [
      { id: ++execLogIdRef.current, ts: Date.now(), label: etiqueta, actionType: tipo, ok, error },
      ...prev.slice(0, 99),
    ]);
  }, []);

  const executeButton = useCallback(async (btn: ButtonConfig) => {
    if (!api) return;
    // Una carpeta abre un overlay; no hay accion que ejecutar.
    if (btn.action.type === 'folder') { setOpenFolderBtn(btn); return; }

    setRunningButtons((prev) => { const s = new Set(prev); s.add(btn.id); return s; });
    try {
      const r = await pulsarBoton(btn, entorno());
      anotar(btn.label || btn.action.type, r.tipo, r.ok, r.error);
      if (!r.ok && r.error) logError(`action:${btn.action.type}`, r.error, { label: btn.label });
    } finally {
      setRunningButtons((prev) => { const s = new Set(prev); s.delete(btn.id); return s; });
    }
  }, [api, entorno, anotar]);

  const executeLongPressButton = useCallback(async (btn: ButtonConfig) => {
    if (!api) return;
    const r = await pulsacionLarga(btn, entorno());
    if (r) anotar(`⇓ ${btn.label || r.tipo}`, r.tipo, r.ok, r.error);
  }, [api, entorno, anotar]);

  const currentPage = config.pages[activePage];
  const gridSize = currentPage?.gridSize ?? 4;
  const gridRows = currentPage?.gridRows ?? gridSize;
  const pageButtons = resolverBotonesPagina(config.buttons, activePage, gridSize, gridRows);
  const sourceName = nowPlaying ? getSourceName(nowPlaying.source) : '';

  const divisas = useDivisas(config.buttons, api);
  const widgetDataMap = useDatosWidget({
    botones: config.buttons,
    estado: config.state,
    reloj: clock,
    clima: widgetWeather,
    sonando: nowPlaying,
    sensores: sensorList,
    divisas,
  });

  const isPlaying = nowPlaying?.status === 'Playing';
  // Para hints contextuales: ¿el deck ya tiene al menos un botón configurado?
  const hasConfiguredButtons = config.buttons.some(
    (b) => b.action.type !== 'none' || b.label || b.icon || b.imageData || b.brandIcon
  );

  function confirmRename(id: string) {
    if (renameValue.trim()) onPageRename(id, renameValue.trim().toUpperCase());
    setRenamingPageId(null);
  }

  return (
    <div style={{
      width: '100%', height: '100%',
      background: VD.bg, color: VD.text, fontFamily: VD.font,
      position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      <Wallpaper kind={config.wallpaper as any} />

      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <BarraSuperiorMain
          config={config}
          panelMusica={panelMusica}
          compact={isCompact}
          onConfigChange={onConfigChange}
          onAppendPagesFromProfile={onAppendPagesFromProfile}
          autostart={autostart}
          soundOnPress={soundOnPress}
          soundProfile={soundProfile}
          onFullscreen={onFullscreen}
          onWallpaper={onWallpaper}
          onRGB={onRGB}
          rgbStatus={rgbStatus}
          sensorsStatus={sensorStatus}
          onConfigExport={onConfigExport}
          onConfigImport={onConfigImport}
          onAutostartToggle={onAutostartToggle}
          onSoundToggle={onSoundToggle}
          onSoundProfileChange={onSoundProfileChange}
          onSaveProfile={onSaveProfile}
          onLoadProfile={onLoadProfile}
          onAppendProfilePages={onAppendProfilePages}
          onDeleteProfile={onDeleteProfile}
          uiScale={uiScale}
          onUiScaleChange={onUiScaleChange}
          alwaysOnTop={alwaysOnTop}
          onAlwaysOnTopToggle={onAlwaysOnTopToggle}
          onFloatingBar={onFloatingBar}
          theme={theme}
          onThemeChange={onThemeChange}
          language={language}
          onLanguageChange={onLanguageChange}
          hintsDismissed={hintsDismissed}
          onDismissHint={onDismissHint}
          onReplayOnboarding={onReplayOnboarding}
        />

        {/* Page tabs */}
        <PestanasPagina
          config={config}
          activePage={activePage}
          onPageChange={onPageChange}
          onPageAdd={onPageAdd}
          onPageExport={onPageExport}
          onPageImport={onPageImport}
          onPageReorder={onPageReorder}
          onMoveButtonToPage={onMoveButtonToPage}
          renamingPageId={renamingPageId}
          setRenamingPageId={setRenamingPageId}
          renameValue={renameValue}
          setRenameValue={setRenameValue}
          setPageContextMenu={setPageContextMenu}
          dragPageIdx={dragPageIdx}
          setDragPageIdx={setDragPageIdx}
          dragOverPageIdx={dragOverPageIdx}
          setDragOverPageIdx={setDragOverPageIdx}
          dragSourceId={dragSourceId}
          setDragSourceId={setDragSourceId}
          showSidebar={showSidebar}
          setShowSidebar={setShowSidebar}
          showToast={showToast}
          confirmRename={confirmRename}
          compact={isCompact}
        />


        <MenuContextualPagina
          contextMenu={pageContextMenu}
          pages={config.pages}
          accent={config.accent}
          onStartRename={(page) => {
            setRenamingPageId(page.id);
            setRenameValue(page.name);
          }}
          onOpenAppBinding={(pageId) => setBindingAppPageId(pageId)}
          onSetGrid={onPageSetGrid}
          onDuplicatePage={onDuplicatePage}
          onDeletePage={onPageDelete}
          onClose={() => setPageContextMenu(null)}
        />

        <div style={{ flex: 1, display: 'flex', minHeight: 0, position: 'relative' }}>
          {/* El panel de musica, si toca por la izquierda. */}
          <PanelMusicaLateral
            config={config}
            panelMusica={panelMusica}
            lado="left"
            onConfigChange={onConfigChange}
            nowPlaying={nowPlaying}
            isPlaying={isPlaying}
            sourceName={sourceName}
            api={api}
          />
          {/* Hints contextuales (uno a la vez). Descartables. */}
          <AvisosContextuales
            hayBotones={hasConfiguredButtons}
            hintsDismissed={hintsDismissed}
            onDismissHint={onDismissHint}
            accent={config.accent}
          />
          <RejillaBotones
            botones={pageButtons}
            columnas={gridSize}
            filas={gridRows}
            modo={config.tileMode === 'fill' ? 'fill' : 'square'}
            relleno={isCompact ? 6 : 16}
            senal={showSidebar}
            onTouchStart={(e) => {
              touchStartXRef.current = e.touches[0].clientX;
              touchStartYRef.current = e.touches[0].clientY;
            }}
            onTouchEnd={(e) => {
              const dx = e.changedTouches[0].clientX - touchStartXRef.current;
              const dy = e.changedTouches[0].clientY - touchStartYRef.current;
              const w = (e.currentTarget as HTMLDivElement).clientWidth || 600;
              const threshold = Math.max(50, Math.min(120, w * 0.08));
              const now = Date.now();
              const isHorizontal = Math.abs(dx) > Math.abs(dy) * 1.5;
              const debounced = now - lastSwipeAtRef.current < 300;
              if (!isHorizontal || debounced || Math.abs(dx) < threshold) return;
              lastSwipeAtRef.current = now;
              if (dx < 0 && activePage < config.pages.length - 1) onPageChange(activePage + 1);
              else if (dx > 0 && activePage > 0) onPageChange(activePage - 1);
            }}
            celda={(btn) => (
              <CeldaPrincipal
                btn={btn}
                accent={config.accent}
                toggledIds={toggledIds}
                selectedIds={selectedIds}
                estadoSistema={estadoSistema}
                sensorList={sensorList}
                widgetDataMap={widgetDataMap}
                runningButtons={runningButtons}
                soundOnPress={soundOnPress}
                soundProfile={soundProfile}
                deckState={config.state ?? {}}
                canPasteButton={canPasteButton}
                onEditButton={onEditButton}
                executeButton={executeButton}
                executeLongPressButton={executeLongPressButton}
                onStateUpdate={onStateUpdate}
                onDuplicateButton={onDuplicateButton}
                onCopyButton={onCopyButton}
                onPasteButton={onPasteButton}
                onClearButton={onClearButton}
                onUpdateButton={onUpdateButton}
                onTogglePin={handleTogglePin}
                onConmutarSeleccion={conmutarSeleccion}
                onArrastrar={setDragSourceId}
                onSwapButtons={onSwapButtons}
                showToast={showToast}
              />
            )}
          />

          {/* Bulk-select toolbar */}
          <BarraSeleccionLote
            selectedIds={selectedIds}
            pages={config.pages}
            activePage={activePage}
            accent={config.accent}
            onMoveButtonsToPage={onMoveButtonsToPage}
            onClearButtons={onClearButtons}
            onClearSelection={() => setSelectedIds(new Set())}
            showToast={showToast}
          />

          {/* Sidebar */}
          {showSidebar && (
            <BarraLateral
              config={config}
              clock={clock}
              api={api}
              sensorList={sensorList}
              sensorStatus={sensorStatus}
              rgbStatus={rgbStatus}
              onRGB={onRGB}
              execLog={execLog}
              setExecLog={setExecLog}
              showLog={showLog}
              setShowLog={setShowLog}
              nowPlaying={nowPlaying}
              isPlaying={isPlaying}
              sourceName={sourceName}
              showToast={showToast}
              ocultarMusica={panelMusica.enabled}
            />
          )}

          <PanelMusicaLateral
            config={config}
            panelMusica={panelMusica}
            lado="right"
            onConfigChange={onConfigChange}
            nowPlaying={nowPlaying}
            isPlaying={isPlaying}
            sourceName={sourceName}
            api={api}
          />

          {/* Script output toast */}
          {toast && (
            <div style={{
              position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)',
              background: VD.surface, border: `1px solid ${VD.borderStrong}`,
              borderRadius: VD.radius.lg, padding: '10px 16px',
              maxWidth: 'min(500px, 60%)', minWidth: 240,
              fontFamily: VD.mono, fontSize: 10, color: VD.text,
              boxShadow: VD.shadow.menu, zIndex: 100,
              display: 'flex', gap: 12, alignItems: 'flex-start',
            }}>
              <span style={{ flex: 1, whiteSpace: 'pre-wrap', maxHeight: 140, overflowY: 'auto', lineHeight: 1.6 }}>{toast}</span>
              <button onClick={() => setToast(null)} style={{ background: 'none', border: 'none', color: VD.textMuted, cursor: 'pointer', flexShrink: 0, padding: 2, display: 'flex', alignItems: 'center' }}>
                <DotGlyphIcon glyph="CLOSE" size={8} color={VD.textMuted} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Folder overlay */}
      {openFolderBtn && (
        <FolderOverlay
          btn={openFolderBtn}
          accent={config.accent}
          soundEnabled={soundOnPress}
          soundProfile={soundProfile}
          entorno={entorno}
          onClose={() => setOpenFolderBtn(null)}
        />
      )}

      {/* App binding modal */}
      {bindingAppPageId && (() => {
        const targetPage = config.pages.find((p) => p.id === bindingAppPageId);
        if (!targetPage) return null;
        return (
          <ModalVincularApp
            page={targetPage}
            accent={config.accent}
            runningProcesses={estadoSistema.runningProcesses}
            onSave={(cleaned) => {
              const updatedPages = config.pages.map((p) =>
                p.id === bindingAppPageId ? { ...p, targetApp: cleaned || undefined } : p,
              );
              onConfigChange({ ...config, pages: updatedPages });
              setBindingAppPageId(null);
            }}
            onClose={() => setBindingAppPageId(null)}
          />
        );
      })()}
    </div>
  );
}

// ── Folder sub-deck overlay ────────────────────────────────────────────────
