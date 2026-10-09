import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MainB } from './screens/MainB';
import { EsperaVista } from './screens/EsperaVista';
import { VistasSecundarias } from './screens/VistasSecundarias';
import { OverlaysApp } from './screens/OverlaysApp';
import { NowPlayingProvider } from './utils/nowPlaying';
import { LanguageProvider } from './utils/i18n';
import { ThemeProvider, useTheme } from './utils/theme';
import { migrateConfig, validateConfig, sanearConfig, sanearPagina, CURRENT_CONFIG_VERSION } from './utils/configMigration';
import { useDisparadores } from './utils/useDisparadores';
import { useSuperficies } from './utils/superficies/useSuperficies';
import { COLORES_LCD } from './utils/superficies/pintarTecla';
import { esGlifoDot, svgDeBoton } from './components/celda/iconoSvg';
import { playGiro, playSound, sonidoActivo, perfilSonido } from './utils/sound';
import { useSensors } from './utils/sensors';
import { DEFAULT_CONFIG, PAGES_DEFAULT, conHuecosCompletos } from './utils/configDefaults';
import { botonesResueltos } from './utils/botonesFijos';
import { botonPorId } from './utils/botonPorId';
import { useDeck } from './utils/useDeck';
import { pulsarBoton, pulsacionLarga, type EntornoPulsacion } from './utils/pulsarBoton';
import { navegarDesdeApp } from './utils/acciones/pageNav';
import { useAutoProfile } from './utils/useAutoProfile';
import { useConfigExterna } from './utils/useConfigExterna';
import { useAppShortcuts } from './utils/useAppShortcuts';
import { installGlobalErrorHandlers, logError } from './utils/logger';
import { aplicarPedidoTienda } from './utils/tiendaAplicar';
import type { ButtonConfig, PageConfig } from './types';

type View = 'main' | 'fullscreen' | 'wallpaper' | 'rgb' | 'barra' | 'devices';

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

  useEffect(() => {
    document.documentElement.style.setProperty('--vd-accent', config.accent);
  }, [config.accent]);

  // Apply UI scale via Electron zoom factor
  useEffect(() => {
    if (!api || config.uiScale === undefined) return;
    api.app.setZoom(config.uiScale).catch(() => {});
  }, [api, config.uiScale]);

  // Primer plano. El proceso principal ya lo aplica al crear la ventana leyendo
  // la config del disco; esto es para cuando el usuario lo cambia en caliente.
  useEffect(() => {
    api?.window.setAlwaysOnTop(!!config.alwaysOnTop);
  }, [api, config.alwaysOnTop]);

  // Clamp activePage when pages change
  useEffect(() => {
    setActivePage((curr) => (curr >= config.pages.length ? Math.max(0, config.pages.length - 1) : curr));
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

  // Toggle state for toggle-mode buttons (runtime only, not persisted)
  // Los interruptores encendidos salen de la configuración, no de un estado
  // propio: es lo único que la barra flotante —otra ventana, otro React— puede
  // ver. `toggleButton` los escribe.
  const toggledIds = useMemo(() => new Set(config.toggledIds ?? []), [config.toggledIds]);
  // Igual que en las pantallas: lo leen manejadores creados en otro render.
  const configRef = useRef(config);
  configRef.current = config;
  const toggledRef = useRef(toggledIds);
  toggledRef.current = toggledIds;
  // Lo mismo que `configRef`: el hardware y los disparadores llaman en
  // cualquier momento y el cierre mentiría.
  const activePageRef = useRef(activePage);
  activePageRef.current = activePage;
  const superficiesRef = useRef<ReturnType<typeof useSuperficies> | null>(null);

  const handleToggle = toggleButton;

  /**
   * Pedidos de la tienda (`#tienda`): validar y aplicar aquí.
   *
   * La tienda no escribe configuración —esta ventana es la única con el
   * estado al día— así que el pedido cruza por IPC y se aplica con las mismas
   * funciones de la galería empotrada. Se lee `configRef` y no `config`: el
   * pedido puede llegar en cualquier momento y el cierre mentiría.
   */
  useEffect(() => {
    if (!api?.tienda) return;
    return api.tienda.onAplicar((pedido) => {
      const r = aplicarPedidoTienda(pedido, {
        config: configRef.current,
        guardar: (siguiente) => saveConfig(siguiente),
        agregarPaginasDePerfil: appendPagesFromProfile,
        agregarPagina: appendPageFromGallery,
        t,
      });
      api.tienda.resultado(r).catch(() => {});
    });
  }, [api, saveConfig, appendPagesFromProfile, appendPageFromGallery, t]);








  // Page export
  const handlePageExport = useCallback(async (pageIdx: number) => {
    if (!api) return;
    const page = config.pages[pageIdx];
    // Lo que se ve, pero la copia de un fijo de otra página sale como botón normal.
    const buttons = botonesResueltos(config, pageIdx).map((b) => (b.page === pageIdx ? b : { ...b, fijo: undefined }));
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
      // puede usar ni deshacer desde la interfaz. `sanearPagina` es la misma
      // que usan la carga del disco y la importacion de la configuracion
      // entera, que es donde faltaba.
      const { pagina: acotada } = sanearPagina(imported.page!);
      const cols = acotada.gridSize ?? 4;
      const newPage: PageConfig = {
        ...acotada, gridSize: cols, gridRows: acotada.gridRows ?? cols,
        id: `page_${Date.now()}`,
        name: (imported.page!.name || t('page.importedName')).toUpperCase(),
      };
      // Se rellena hasta cubrir la rejilla. Un archivo con menos botones que
      // huecos dejaba celdas que **no existian**: no se podian pulsar para
      // crear un boton, porque no habia objeto detras. La configuracion
      // completa ya se rellenaba al importarse; una pagina suelta no.
      const soloDeEstaPagina = (imported.buttons ?? []).map((b) => ({ ...b, page: 0 }));
      const rellenados = conHuecosCompletos([newPage], soloDeEstaPagina)
        .map((b, i) => ({ ...b, id: `p${Date.now()}_${i}`, page: newIdx }));
      return { ...prev, pages: [...prev.pages, newPage], buttons: [...prev.buttons, ...rellenados] };
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
  // El entorno de una pulsación disparada desde fuera de las pantallas, el
  // mismo para la corta y la larga (mando móvil, enlaces, dock, atajos).
  const entorno = useCallback((opts?: { serial?: string }): EntornoPulsacion | null => {
    if (!api) return null;
    return {
      api, config: configRef.current, toggledIds: () => toggledRef.current,
      onToggle: handleToggle, onStateUpdate: updateState,
      // Un fallo de una accion disparada sola no se veia en ninguna parte.
      avisar: setImportError, t,
      // `page-nav`: desde un dock entre sus páginas, desde lo demás entre las
      // del deck (así `useAutoProfile` lo toma como elección manual).
      navegar: (a) => navegarDesdeApp(a, configRef.current.pages, activePageRef.current, opts?.serial, setActivePage, superficiesRef.current),
    };
  }, [api, handleToggle, updateState, t]);

  const dispararBoton = useCallback(async (btn: ButtonConfig, opts?: { sonido?: 'giro'; serial?: string }) => {
    if (!api) return;
    // Una carpeta necesita pantalla para su overlay: `pulsarBoton` lo avisa
    // como error en vez de no hacer nada.
    // Suena igual que si lo hubieras pulsado. Un boton que se dispara solo —a
    // una hora, por un sensor, por un atajo global— no da ninguna otra señal
    // de que ha pasado algo, que es justo cuando mas falta hace. Los giros de
    // perilla o tira suenan con el tic de giro. Se lee `configRef` y no
    // `config`: el cierre no tiene `config` en las dependencias y si no el
    // hardware se quedaría con el sonido del primer render.
    const cfg = configRef.current;
    if (sonidoActivo(cfg)) {
      if (opts?.sonido === 'giro') playGiro(perfilSonido(cfg));
      else playSound(perfilSonido(cfg));
    }
    const env = entorno(opts);
    if (env) return await pulsarBoton(btn, env);
  }, [api, entorno]);

  // Mantener pulsado desde el mando móvil, `virtualdeck://press/<id>?largo=1`
  // o una tecla del dock (con su serial, para `page-nav`).
  const dispararBotonLargo = useCallback(async (btn: ButtonConfig, opts?: { serial?: string }) => {
    if (!api || !btn.longPressAction || btn.longPressAction.type === 'none') return;
    const cfg = configRef.current;
    if (sonidoActivo(cfg)) playSound(perfilSonido(cfg));
    const env = entorno(opts);
    if (env) return await pulsacionLarga(btn, env);
  }, [api, entorno]);

  // Atajo global del sistema y menu de la bandeja: el proceso principal emite
  // button:trigger y aqui se ejecuta la cadena del boton.
  useEffect(() => {
    if (!api?.events) return;
    return api.events.onButtonTrigger((id, opciones) => {
      const btn = botonPorId(config.buttons, id);
      if (!btn) return;
      if (opciones?.largo) void dispararBotonLargo(btn);
      else void dispararBoton(btn);
    });
  }, [api, config.buttons, dispararBoton, dispararBotonLargo]);

  // `virtualdeck://page/<n>`. El indice llega ya en base 0 y se acota aqui:
  // el enlace lo escribe una persona y puede pedir una pagina que no existe.
  useEffect(() => {
    if (!api?.events) return;
    return api.events.onNavPage((i) => {
      if (i >= 0 && i < config.pages.length) setActivePage(i);
    });
  }, [api, config.pages.length]);

  const { sensors: sensorList } = useSensors();
  useDisparadores({ botones: config.buttons, sensores: sensorList, disparar: dispararBoton });
  // Controladores físicos (Stream Dock N3...). Como los disparadores, vive en
  // `App`, que está montada siempre: el hardware tiene que responder también
  // en kiosko y con la ventana oculta en la bandeja.
  // El icono lo pinta la capa de componentes: `src/utils` no puede importarlos.
  const superficies = useSuperficies({
    api, config, dispararBoton, dispararLargo: dispararBotonLargo, crearPaginaSuperficie,
    colores: COLORES_LCD, iconoSvg: svgDeBoton, esGlifoDot,
    // Perilla multimodo (T-HW-19): que se note el cambio de modo en el deck.
    alCambiarModo: (m) => showUndoToast(
      t('disp.modos.aviso', { n: m.perilla, i: m.modo + 1, total: m.total, modo: m.label }),
    ),
  });
  superficiesRef.current = superficies;

  // Se manda `config`, lo que hay en pantalla, y no se deja que el proceso
  // principal lo relea del disco: si el archivo estuviera ilegible saldria un
  // export con `{}` diciendo que fue bien.
  const handleConfigExport = useCallback(async () => { await api?.config.export(config); }, [api, config]);

  const [importError, setImportError] = useState<string | null>(null);

  const applyImportedConfig = useCallback((raw: unknown) => {
    const migrated = migrateConfig(raw);
    const v = validateConfig(migrated, t);
    if (!v.ok || !v.config) {
      setImportError(t('import.rejected', { motivo: v.error ?? t('import.badShape') }));
      return false;
    }
    // `validateConfig` mira los tipos, no los rangos: un `gridSize: 99` pasaba
    // entero y `conHuecosCompletos` creaba 9801 botones en esa pagina. El
    // acotado existia **solo** en la importacion de una pagina suelta.
    const s = { ...v.config, pages: v.config.pages.map((p) => sanearPagina(p).pagina) };
    const merged = conHuecosCompletos(s.pages, s.buttons);
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
  }, [api, setConfig, t]);

  const handleConfigImport = useCallback(async () => {
    const data = await api?.config.import();
    if (!data) return;
    applyImportedConfig(data);
  }, [api, applyImportedConfig]);

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
