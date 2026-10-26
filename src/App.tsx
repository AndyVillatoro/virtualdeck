import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { MainB } from './screens/MainB';
import { EsperaVista } from './screens/EsperaVista';
import { VistasSecundarias } from './screens/VistasSecundarias';
import { OverlaysApp } from './screens/OverlaysApp';
import { NowPlayingProvider } from './utils/nowPlaying';
import { LanguageProvider } from './utils/i18n';
import { ThemeProvider } from './utils/theme';
import { migrateConfig, sanearConfig, CURRENT_CONFIG_VERSION } from './utils/configMigration';
import { useDisparadores } from './utils/useDisparadores';
import { usePluginAjustes } from './utils/plugins/usePluginAjustes';
import { usePluginsVisibles } from './utils/plugins/usePluginsVisibles';
import { useSuperficies } from './utils/superficies/useSuperficies';
import { COLORES_LCD } from './utils/superficies/pintarTecla';
import { esGlifoDot, prepararIconosLcd, svgDeBoton } from './components/celda/iconoSvg';
import { sonidoActivo, perfilSonido } from './utils/sound';
import { useSensors } from './utils/sensors';
import { DEFAULT_CONFIG, PAGES_DEFAULT, conHuecosCompletos } from './utils/configDefaults';
import { useDeck } from './utils/useDeck';
import { useAutoProfile } from './utils/useAutoProfile';
import { useConfigExterna } from './utils/useConfigExterna';
import { useAppShortcuts } from './utils/useAppShortcuts';
import { logError } from './utils/logger';
import { PantallaCargando } from './app/PantallaCargando';
import { useEfectosApp } from './app/useEfectosApp';
import { useAppCentral } from './app/useAppCentral';
import type { View } from './app/tiposVista';

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
  const [importError, setImportError] = useState<string | null>(null);
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
    clearButtons, moveButtonsToPage, rellenarBotones,
    renamePage, addPage, duplicatePage, deletePage, reorderPages, setPageGridSize,
    crearPaginaSuperficie, agregarPaginaSuperficie, crearPaginaDesdePlantilla, fijarTargetAppPagina,
    fijarBrilloSuperficie, fijarRotacionSuperficie, fijarModosPerilla,
    saveProfile, loadProfile, appendProfilePages, appendPagesFromProfile, appendPageFromGallery, deleteProfile,
    setUiScale, setTheme, setLanguage, dismissHint,
    toggleSoundOnPress, setSoundProfile, setKioskPin, updateState, toggleButton,
    toggleAlwaysOnTop,
    copyButton, pasteButton, buttonClipboard,
  } = deck;

  useAutoProfile({
    config,
    activePage,
    onPageChange: setActivePage,
    onLoadProfile: loadProfile,
  });

  // Efectos de entorno (acento, zoom, primer plano, acotado de página,
  // manejadores de error y aviso de actualización), extraídos a `src/app/`.
  useEfectosApp({ api, config, setActivePage, setUpdateReady });

  // Load config + autostart on mount
  useEffect(() => {
    if (!api) { setLoaded(true); return; }
    Promise.all([
      api.config.load().catch((e) => { logError('config.load', e); return {}; }),
      api.app.getAutostart().catch(() => false),
    ]).then(([saved, as]) => {
      const migrated = migrateConfig(saved);
      // Se sanea antes de tocarlo: un `pages` con la forma rota reventaba el
      // primer `.map` y dejaba la ventana **en blanco**, sin mensaje ni forma
      // de llegar a los ajustes para arreglarlo.
      const { config: s, reparado } = sanearConfig(migrated);
      if (reparado.length > 0) setImportError(t('config.repaired', { partes: reparado.join(', ') }));
      if (s && s.buttons && s.buttons.length > 0) {
        const merged = conHuecosCompletos(s.pages || PAGES_DEFAULT, s.buttons);
        // Los interruptores encendidos ahora se guardan; si un boton dejo de
        // existir, su id se quedaria ahi para siempre.
        const vivos = new Set(merged.flatMap((b) => [b.id, ...(b.subButtons?.map((sb) => sb.id) ?? [])]));
        s.toggledIds = (s.toggledIds ?? []).filter((id) => vivos.has(id));
        setConfig({ ...DEFAULT_CONFIG, ...s, buttons: merged, configVersion: CURRENT_CONFIG_VERSION });
      }
      setAutostart(as as boolean);
      // Primera ejecución: instalación virgen (sin config en disco) → s no trae
      // onboardingCompleted. La migración v3→v4 lo marca true para usuarios
      // existentes, así que solo los nuevos ven el tutorial.
      if (s.onboardingCompleted !== true) setShowOnboarding(true);
      setLoaded(true);
      // Si el archivo estaba ilegible, decirlo. Sin esto el deck sale vacío y
      // parece que se ha borrado solo — que es justo lo que el usuario piensa.
      api.config.damaged().then((ruta) => {
        if (ruta) setImportError(t('config.damaged', { ruta }));
      }).catch(() => {});
    });
  }, [api, setConfig, setLoaded, t]);

  useConfigExterna(api, setConfig);

  // Marca el onboarding como completado (o saltado) y persiste el flag.
  const finishOnboarding = useCallback(() => {
    setShowOnboarding(false);
    setConfig((prev) => {
      const next = { ...prev, onboardingCompleted: true };
      api?.config.save(next).catch(() => {});
      return next;
    });
  }, [api, setConfig]);

  const toggleAutostart = useCallback(() => {
    const next = !autostart;
    setAutostart(next);
    api?.app.setAutostart(next).catch(() => {});
  }, [api, autostart]);

  // El puente central: disparadores de botones sin pulsación (mando móvil,
  // dock, atajos, bandeja, hora y sensores), pedido de la tienda y
  // importación/exportación de configuración y páginas. Extraído a `src/app/`.
  const {
    toggledIds, handleToggle, superficiesRef,
    dispararBoton, dispararBotonLargo,
    handlePageExport, handlePageImport, handleConfigExport, handleConfigImport,
  } = useAppCentral({
    api, config, activePage, setActivePage, setConfig, t, updateState, toggleButton,
    saveConfig, withHistory, appendPagesFromProfile, appendPageFromGallery, setImportError,
  });

  const { sensors: sensorList } = useSensors();
  useDisparadores({ botones: config.buttons, sensores: sensorList, disparar: dispararBoton });
  // Plugins (83): lo que pintan en cada botón y los ajustes que guardan desde
  // su Property Inspector. Como los disparadores, en `App`, que está montada
  // siempre — en kiosko o con la ventana oculta también hay que poder guardar.
  usePluginAjustes({ api, botones: config.buttons, updateButton });
  usePluginsVisibles({ api, config, pagina: activePage, visible: view === 'main' || view === 'fullscreen' });
  // Controladores físicos (Stream Dock N3...). Como los disparadores, vive en
  // `App`, que está montada siempre: el hardware tiene que responder también
  // en kiosko y con la ventana oculta en la bandeja.
  // El icono lo pinta la capa de componentes: `src/utils` no puede importarlos.
  const superficies = useSuperficies({
    api, config, dispararBoton, dispararLargo: dispararBotonLargo, crearPaginaSuperficie,
    colores: COLORES_LCD, iconoSvg: svgDeBoton, esGlifoDot,
    // `react-dom/server` va diferido: las teclas LCD esperan a que llegue.
    prepararIconos: prepararIconosLcd,
    // Perilla multimodo (T-HW-19): que se note el cambio de modo en el deck.
    alCambiarModo: (m) => showUndoToast(
      t('disp.modos.aviso', { n: m.perilla, i: m.modo + 1, total: m.total, modo: m.label }),
    ),
  });
  superficiesRef.current = superficies;

  const handleEnterFullscreen = useCallback(async () => {
    if (config.targetDisplayId !== undefined && api?.window?.moveToDisplay) {
      await api.window.moveToDisplay(config.targetDisplayId).catch(() => {});
    }
    api?.window?.fullscreen();
    setView('fullscreen');
  }, [api, config.targetDisplayId]);

  const handleExitFullscreen = useCallback(() => {
    api?.window?.fullscreen();
    setView('main');
  }, [api]);

  useAppShortcuts({
    view,
    setView,
    editingId,
    setEditingId,
    searchOpen,
    setSearchOpen,
    undo,
    pages: config.pages,
    setActivePage,
  });

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
      <Suspense fallback={<EsperaVista />}>
      {view === 'main' && (
        <MainB
          onCrearDesdePlantilla={(p, a) => { const i = config.pages.length; if (crearPaginaDesdePlantilla(p, a, null)) setActivePage(i); }}
          config={config}
          activePage={activePage}
          autostart={autostart}
          onPageChange={setActivePage}
          onFullscreen={handleEnterFullscreen}
          onEditButton={(id) => setEditingId(id)}
          onWallpaper={() => setView('wallpaper')}
          onRGB={() => setView('rgb')}
          onDispositivos={() => setView('devices')}
          onFloatingBar={() => setView('barra')}
          onConfigChange={saveConfig}
          onUpdateButton={updateButton}
          onDuplicateButton={duplicateButton}
          onCopyButton={copyButton}
          onPasteButton={pasteButton}
          canPasteButton={!!buttonClipboard}
          onClearButton={clearButton}
          onConfigExport={handleConfigExport}
          onConfigImport={handleConfigImport}
          onSwapButtons={swapButtons}
          onPageRename={renamePage}
          onPageAdd={addPage}
          onDuplicatePage={duplicatePage}
          onPageDelete={deletePage}
          onSaveProfile={saveProfile}
          onLoadProfile={loadProfile}
          onAppendProfilePages={appendProfilePages}
          onDeleteProfile={deleteProfile}
          onAutostartToggle={toggleAutostart}
          toggledIds={toggledIds}
          onToggle={handleToggle}
          onPageReorder={reorderPages}
          onPageSetGrid={setPageGridSize}
          onMoveButtonToPage={moveButtonToPage}
          onMoveButtonsToPage={moveButtonsToPage}
          onClearButtons={clearButtons}
          soundOnPress={sonidoActivo(config)}
          soundProfile={perfilSonido(config)}
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
          onFijarTargetApp={fijarTargetAppPagina}
          onReplayOnboarding={() => setShowOnboarding(true)}
        />
      )}

      {view !== 'main' && (
        <VistasSecundarias
          view={view}
          config={config}
          soundOnPress={sonidoActivo(config)}
          soundProfile={perfilSonido(config)}
          onExitFullscreen={handleExitFullscreen}
          onSetKioskPin={setKioskPin}
          onStateUpdate={updateState}
          onToggle={handleToggle}
          onBack={() => setView('main')}
          onSaveConfig={saveConfig}
          superficies={superficies}
          fijarModosPerilla={fijarModosPerilla}
          onEditarBoton={(id) => setEditingId(id)}
          api={api}
          fijarBrilloSuperficie={fijarBrilloSuperficie}
          fijarRotacionSuperficie={fijarRotacionSuperficie}
          agregarPaginaSuperficie={agregarPaginaSuperficie}
          fijarTargetAppPagina={fijarTargetAppPagina}
          renamePage={renamePage}
          deletePage={deletePage}
          rellenarBotones={rellenarBotones}
          crearPaginaDesdePlantilla={crearPaginaDesdePlantilla}
        />
      )}
      </Suspense>

      <OverlaysApp
        editingButton={editingButton}
        config={config}
        setEditingId={setEditingId}
        updateButton={updateButton}
        clearButton={clearButton}
        showOnboarding={showOnboarding}
        setLanguage={setLanguage}
        setTheme={setTheme}
        saveConfig={saveConfig}
        handleConfigExport={handleConfigExport}
        handleConfigImport={handleConfigImport}
        finishOnboarding={finishOnboarding}
        searchOpen={searchOpen}
        setSearchOpen={setSearchOpen}
        view={view}
        setActivePage={setActivePage}
        undoToast={undoToast}
        undo={undo}
        updateReady={updateReady}
        setUpdateReady={setUpdateReady}
        api={api}
        importError={importError}
        setImportError={setImportError}
      />

    </div>
    </NowPlayingProvider>
    </ThemeProvider>
    </LanguageProvider>
  );
}
