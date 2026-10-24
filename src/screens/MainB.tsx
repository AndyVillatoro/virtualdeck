import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTheme } from '../utils/theme';
import { useT } from '../utils/i18n';
import { BarraSuperiorMain } from './main/BarraSuperiorMain';
import { PestanasPagina } from './main/PestanasPagina';
import { MenuContextualPagina } from './main/MenuContextualPagina';
import { useAtajosSeleccion } from './main/atajosSeleccion';
import { useTamanoVentana } from '../utils/useTamanoVentana';
import { useFormatoPantalla } from '../utils/useFormatoPantalla';
import { Wallpaper } from '../components/Wallpaper';
import { useDatosWidget, useClimaWidget, useDivisas } from '../components/celda/useDatosWidget';
import { useEstadoSistema } from '../utils/estadoSistema';
import { resolverBotonesPagina } from '../utils/botonesPagina';
import { useNowPlaying, useNowPlayingActivation } from '../utils/nowPlaying';
import { useSensors } from '../utils/sensors';
import type { ButtonConfig } from '../types';
import { type MainBProps, getSourceName } from './main/tipos';
import { panelesQueCaben } from './main/panelesQueCaben';
import { useEjecucionMain } from './main/useEjecucionMain';
import { ZonaCentral } from './main/ZonaCentral';
import { OverlaysEmergentes } from './main/OverlaysEmergentes';

export function MainB({
  config, activePage, autostart, toggledIds, soundOnPress, soundProfile,
  onPageChange, onToggle, onFullscreen, onEditButton, onWallpaper, onRGB, onDispositivos,
  onConfigChange, onUpdateButton, onDuplicateButton, onCopyButton, onPasteButton, canPasteButton, onClearButton,
  onConfigExport, onConfigImport, onSwapButtons,
  onPageRename, onPageAdd, onDuplicatePage, onPageDelete, onPageReorder, onPageSetGrid, onMoveButtonToPage, onMoveButtonsToPage, onClearButtons,
  onSaveProfile, onLoadProfile, onAppendProfilePages, onDeleteProfile, onAutostartToggle, onSoundToggle, onSoundProfileChange, onStateUpdate,
  uiScale, onUiScaleChange, alwaysOnTop, onAlwaysOnTopToggle, onFloatingBar, theme, onThemeChange, language, onLanguageChange, hintsDismissed, onDismissHint, onPageExport, onPageImport, onReplayOnboarding, onFijarTargetApp, onCrearDesdePlantilla,
}: MainBProps) {
  const VD = useTheme();
  const t = useT();
  const api = window.electronAPI;
  const nowPlaying = useNowPlaying();
  const setNowPlayingActive = useNowPlayingActivation('main');
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

  const handleToggleFijo = useCallback((buttonId: string) => {
    const btn = config.buttons.find((b) => b.id === buttonId);
    if (!btn) return;
    const nextFijo = !(btn.fijo === true);
    const nextButtons = config.buttons.map((b) => (b.id === buttonId ? { ...b, fijo: nextFijo || undefined } : b));
    onConfigChange({ ...config, buttons: nextButtons });
  }, [config, onConfigChange]);

  const handleCrearPaginaBarra = useCallback(() => {
    pendingBarraPageRef.current = { prevLength: config.pages.length };
    onPageAdd();
  }, [config.pages.length, onPageAdd]);

  const [showLog, setShowLog] = useState(false);
  const toastTimer = useRef<number>();
  const pendingBarraPageRef = useRef<{ prevLength: number } | null>(null);

  const { ancho: anchoVentana, alto: altoVentana } = useTamanoVentana();
  const isCompact = altoVentana < 540;
  // En `barra` (1280×480 del dueño) la rejilla manda: el panel de música, si
  // está encendido, sustituye a la barra lateral en vez de sumarse.
  const enBarra = useFormatoPantalla().formato === 'barra';
  // En ventanas estrechas los paneles laterales (barra 220 px, música 300 px)
  // aplastaban la rejilla. Por debajo de 760 px no se enseña ninguno; por
  // debajo de 1100 px no caben los dos, y se queda la barra lateral, que ya
  // lleva su propia franja de música.
  const { verBarraLateral, panelMusicaVisible } = panelesQueCaben(anchoVentana, showSidebar, panelMusica, enBarra);

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

  useEffect(() => {
    if (!pendingBarraPageRef.current) return;
    const { prevLength } = pendingBarraPageRef.current;
    if (config.pages.length > prevLength) {
      const newPageIdx = prevLength;
      const newPage = config.pages[newPageIdx];
      if (newPage) {
        onPageSetGrid(newPage.id, 6, 2);
        onPageChange(newPageIdx);
      }
      pendingBarraPageRef.current = null;
    }
  }, [config.pages, onPageSetGrid, onPageChange]);

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

  // La ejecución de botones, con su registro lateral y su entorno de
  // pulsación, extraída a `src/screens/main/useEjecucionMain.ts`.
  const {
    execLog, setExecLog, runningButtons, entorno, executeButton, executeLongPressButton,
  } = useEjecucionMain({
    api, config, toggledIds, activePage, onToggle, onStateUpdate,
    showToast, t, onPageChange, setOpenFolderBtn,
  });

  const currentPage = config.pages[activePage];
  const gridSize = currentPage?.gridSize ?? 4;
  const gridRows = currentPage?.gridRows ?? gridSize;
  const pageButtons = resolverBotonesPagina(config.buttons, activePage, gridSize, gridRows, config.pages);
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
          autostart={autostart}
          soundOnPress={soundOnPress}
          soundProfile={soundProfile}
          onFullscreen={onFullscreen}
          onWallpaper={onWallpaper}
          onRGB={onRGB}
          onDispositivos={onDispositivos}
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
          barra={enBarra}
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

        <ZonaCentral
          config={config}
          activePage={activePage}
          pageButtons={pageButtons}
          gridSize={gridSize}
          gridRows={gridRows}
          isCompact={isCompact}
          enBarra={enBarra}
          verBarraLateral={verBarraLateral}
          panelMusica={panelMusica}
          panelMusicaVisible={panelMusicaVisible}
          nowPlaying={nowPlaying}
          isPlaying={isPlaying}
          sourceName={sourceName}
          api={api}
          estadoSistema={estadoSistema}
          rgbStatus={rgbStatus}
          sensorList={sensorList}
          sensorStatus={sensorStatus}
          widgetDataMap={widgetDataMap}
          hasConfiguredButtons={hasConfiguredButtons}
          hintsDismissed={hintsDismissed}
          onDismissHint={onDismissHint}
          toggledIds={toggledIds}
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
          onCrearPaginaBarra={handleCrearPaginaBarra}
          runningButtons={runningButtons}
          soundOnPress={soundOnPress}
          soundProfile={soundProfile}
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
          onToggleFijo={handleToggleFijo}
          onConmutarSeleccion={conmutarSeleccion}
          setDragSourceId={setDragSourceId}
          onSwapButtons={onSwapButtons}
          onMoveButtonsToPage={onMoveButtonsToPage}
          onClearButtons={onClearButtons}
          onConfigChange={onConfigChange}
          onRGB={onRGB}
          clock={clock}
          showSidebar={showSidebar}
          execLog={execLog}
          setExecLog={setExecLog}
          showLog={showLog}
          setShowLog={setShowLog}
          showToast={showToast}
          onPageChange={onPageChange}
          toast={toast}
          setToast={setToast}
        />
      </div>

      {/* Overlays: carpeta abierta y modal de vincular app a página */}
      <OverlaysEmergentes
        openFolderBtn={openFolderBtn}
        setOpenFolderBtn={setOpenFolderBtn}
        bindingAppPageId={bindingAppPageId}
        setBindingAppPageId={setBindingAppPageId}
        config={config}
        soundOnPress={soundOnPress}
        soundProfile={soundProfile}
        entorno={entorno}
        estadoSistema={estadoSistema}
        onFijarTargetApp={onFijarTargetApp}
        onConfigChange={onConfigChange}
        onCrearDesdePlantilla={onCrearDesdePlantilla}
      />
    </div>
  );
}
