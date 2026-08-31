import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTheme } from '../utils/theme';
import { useT } from '../utils/i18n';
import { BarraLateral } from './main/BarraLateral';
import { FolderOverlay, PageCtxItem } from './main/OverlayCarpeta';
import { PestanasPagina } from './main/PestanasPagina';
import { interpolate } from '../utils/actions';
import { pulsarBoton, pulsacionLarga, type EntornoPulsacion } from '../utils/pulsarBoton';
import { logError } from '../utils/logger';
import { TitleBar } from '../components/TitleBar';
import { Wallpaper } from '../components/Wallpaper';
import { ButtonCell } from '../components/ButtonCell';
import { useDatosWidget, useClimaWidget, useDivisas } from '../components/celda/useDatosWidget';
import { useEstadoSistema, botonActivo, botonVisible } from '../utils/estadoSistema';
import { RejillaBotones } from '../components/rejilla/RejillaBotones';
import { Hint } from '../components/Hint';
import { useNowPlaying, useNowPlayingActivation } from '../utils/nowPlaying';
import { useSensors } from '../utils/sensors';
import type { ButtonConfig, DeckConfig } from '../types';


interface MainBProps {
  config: DeckConfig;
  activePage: number;
  autostart: boolean;
  toggledIds: Set<string>;
  soundOnPress: boolean;
  soundProfile: import('../types').SoundProfileId;
  onPageChange: (page: number) => void;
  onToggle: (id: string) => void;
  onFullscreen: () => void;
  onEditButton: (id: string) => void;
  onWallpaper: () => void;
  onRGB: () => void;
  onConfigChange: (c: DeckConfig) => void;
  onDuplicateButton: (id: string) => void;
  onClearButton: (id: string) => void;
  onConfigExport: () => void;
  onConfigImport: () => void;
  onSwapButtons: (idA: string, idB: string) => void;
  onPageRename: (id: string, name: string) => void;
  onPageAdd: () => void;
  onPageDelete: (id: string) => void;
  onPageReorder: (fromIdx: number, toIdx: number) => void;
  onPageSetGrid: (pageId: string, gs: 3 | 4 | 5 | 6, gridRows?: number) => void;
  onMoveButtonToPage: (buttonId: string, targetPage: number, copy: boolean) => boolean;
  onMoveButtonsToPage: (ids: string[], targetPage: number, copy: boolean) => number;
  onClearButtons: (ids: string[]) => void;
  onSaveProfile: (name: string) => void;
  onLoadProfile: (id: string) => void;
  onDeleteProfile: (id: string) => void;
  onAutostartToggle: () => void;
  onSoundToggle: () => void;
  onSoundProfileChange: (id: import('../types').SoundProfileId) => void;
  onStateUpdate: (update: Record<string, string>) => void;
  uiScale?: number;
  onUiScaleChange?: (scale: number) => void;
  alwaysOnTop?: boolean;
  onAlwaysOnTopToggle?: () => void;
  onFloatingBar?: () => void;
  theme?: 'dark' | 'light' | 'system';
  onThemeChange?: (theme: 'dark' | 'light' | 'system') => void;
  language?: 'system' | 'es' | 'en';
  onLanguageChange?: (language: 'system' | 'es' | 'en') => void;
  hintsDismissed?: string[];
  onDismissHint?: (id: string) => void;
  onPageExport?: (pageIdx: number) => Promise<void>;
  onPageImport?: () => Promise<void>;
  onReplayOnboarding?: () => void;
}

function getSourceName(src: string): string {
  if (!src) return '';
  // Fuente puede venir de: SMTC (AppUserModelId, ej. "SpotifyAB.SpotifyMusic_zpdnekdrzrea0!Spotify")
  // o del fallback por window title (ej. "Spotify", "YouTube Music", "YouTube", "SoundCloud", "VLC").
  if (/youtube\s*music/i.test(src)) return 'YouTube Music';
  if (/youtube/i.test(src))         return 'YouTube';
  if (/spotify/i.test(src))         return 'Spotify';
  if (/soundcloud/i.test(src))      return 'SoundCloud';
  if (/chrome/i.test(src))          return 'Chrome';
  if (/msedge|edge/i.test(src))     return 'Edge';
  if (/firefox/i.test(src))         return 'Firefox';
  if (/vlc/i.test(src))             return 'VLC';
  if (/foobar/i.test(src))          return 'foobar2000';
  const parts = src.split(/[\\./]/);
  return parts[parts.length - 1]?.replace(/\.exe$/i, '') || '';
}

export function MainB({
  config, activePage, autostart, toggledIds, soundOnPress, soundProfile,
  onPageChange, onToggle, onFullscreen, onEditButton, onWallpaper, onRGB,
  onConfigChange, onDuplicateButton, onClearButton,
  onConfigExport, onConfigImport, onSwapButtons,
  onPageRename, onPageAdd, onPageDelete, onPageReorder, onPageSetGrid, onMoveButtonToPage, onMoveButtonsToPage, onClearButtons,
  onSaveProfile, onLoadProfile, onDeleteProfile, onAutostartToggle, onSoundToggle, onSoundProfileChange, onStateUpdate,
  uiScale, onUiScaleChange, alwaysOnTop, onAlwaysOnTopToggle, onFloatingBar, theme, onThemeChange, language, onLanguageChange, hintsDismissed, onDismissHint, onPageExport, onPageImport, onReplayOnboarding,
}: MainBProps) {
  const VD = useTheme();
  const t = useT();
  const api = window.electronAPI;
  const nowPlaying = useNowPlaying();
  const setNowPlayingActive = useNowPlayingActivation();
  const { sensors: sensorList, status: sensorStatus } = useSensors();
  const [showSidebar, setShowSidebar] = useState(true);
  const [renamingPageId, setRenamingPageId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [pageContextMenu, setPageContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkMoveTarget, setBulkMoveTarget] = useState<number | null>(null);
  const [dragSourceId, setDragSourceId] = useState<string | null>(null);
  const [dragPageIdx, setDragPageIdx] = useState<number | null>(null);
  const [dragOverPageIdx, setDragOverPageIdx] = useState<number | null>(null);
  const [openFolderBtn, setOpenFolderBtn] = useState<ButtonConfig | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [clock, setClock] = useState(() => new Date());
  // El sondeo del sistema y las dos funciones que lo leen se comparten con
  // kiosko, que no las tenia.
  const estadoSistema = useEstadoSistema(api);
  const { rgbStatus } = estadoSistema;
  const [execLog, setExecLog] = useState<{ id: number; ts: number; label: string; actionType: string; ok: boolean; error?: string }[]>([]);
  const execLogIdRef = useRef(0);
  const [showLog, setShowLog] = useState(false);
  const [runningButtons, setRunningButtons] = useState<Set<string>>(new Set());
  const toastTimer = useRef<number>();
  const touchStartXRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);
  const lastSwipeAtRef = useRef<number>(0);
  // Grid sizing — JS-driven because pure-CSS `aspect-ratio + max-width/height`
  // collapses when children are 100%-sized (no intrinsic dimension). We measure
  // the wrapper and compute exact px so the grid expands to the largest box
  // that fits while keeping cells square.

  // Clear selection when switching pages
  useEffect(() => { setSelectedIds(new Set()); }, [activePage]);

  // Pausar el polling de nowPlaying cuando la sidebar está oculta (no hay consumidor visible).
  useEffect(() => { setNowPlayingActive(showSidebar); }, [showSidebar, setNowPlayingActive]);

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
  const pageButtons = config.buttons.filter((b) => b.page === activePage).slice(0, gridSize * gridRows);
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
        <TitleBar
          pageName=""
          accent={config.accent}
          autostart={autostart}
          soundOnPress={soundOnPress}
          profiles={config.profiles ?? []}
          onFullscreen={onFullscreen}
          onWallpaper={onWallpaper}
          onRGB={onRGB}
          rgbStatus={rgbStatus}
          rgbConfig={config.rgb}
          onRGBConfigChange={(rgb) => onConfigChange({ ...config, rgb })}
          sensorsConfig={config.sensors ?? { enabled: false, host: '127.0.0.1', port: 8085 }}
          sensorsStatus={sensorStatus}
          onSensorsConfigChange={(sensors) => onConfigChange({ ...config, sensors })}
          onConfigExport={onConfigExport}
          onConfigImport={onConfigImport}
          onAccentChange={(color) => onConfigChange({ ...config, accent: color })}
          onAutostartToggle={onAutostartToggle}
          onSoundToggle={onSoundToggle}
          soundProfile={soundProfile}
          onSoundProfileChange={onSoundProfileChange}
          onSaveProfile={onSaveProfile}
          onLoadProfile={onLoadProfile}
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
          tileMode={config.tileMode ?? 'square'}
          onTileModeChange={(m) => onConfigChange({ ...config, tileMode: m })}
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
        />

        {/* Page context menu */}
        {pageContextMenu && (() => {
          const ctxPage = config.pages.find(pp => pp.id === pageContextMenu.id);
          const ctxGs = ctxPage?.gridSize ?? 4;
          return (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'fixed', left: pageContextMenu.x, top: pageContextMenu.y,
                zIndex: 9999, background: VD.surface, border: `1px solid ${VD.borderStrong}`,
                borderRadius: VD.radius.lg, overflow: 'hidden', boxShadow: VD.shadow.menu, minWidth: 160,
              }}
            >
              <PageCtxItem label={t('page.rename')} onClick={() => {
                if (ctxPage) { setRenamingPageId(ctxPage.id); setRenameValue(ctxPage.name); }
                setPageContextMenu(null);
              }} />
              {/* Grid — columnas y filas independientes */}
              {(() => {
                const ctxRows = ctxPage?.gridRows ?? ctxGs;
                return (
                  <div style={{ padding: '8px 14px', borderBottom: `1px solid ${VD.border}` }}>
                    <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, marginBottom: 6, letterSpacing: 1 }}>
                      {t('page.grid')} · {ctxGs}×{ctxRows}
                    </div>
                    <div style={{ fontFamily: VD.mono, fontSize: 7, color: VD.textMuted, marginBottom: 4, letterSpacing: 1 }}>{t('ui.columns')}</div>
                    <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                      {([3, 4, 5, 6] as const).map(cols => (
                        <button
                          key={cols}
                          onClick={() => { onPageSetGrid(pageContextMenu.id, cols, ctxRows); }}
                          style={{
                            flex: 1, padding: '4px 0', cursor: 'pointer', borderRadius: VD.radius.sm,
                            background: ctxGs === cols ? VD.accentBg : VD.elevated,
                            border: `1px solid ${ctxGs === cols ? config.accent : VD.border}`,
                            fontFamily: VD.mono, fontSize: 9,
                            color: ctxGs === cols ? config.accent : VD.textDim,
                          }}
                        >{cols}</button>
                      ))}
                    </div>
                    <div style={{ fontFamily: VD.mono, fontSize: 7, color: VD.textMuted, marginBottom: 4, letterSpacing: 1 }}>{t('ui.rows')}</div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {([2, 3, 4, 5, 6] as const).map(rows => (
                        <button
                          key={rows}
                          onClick={() => { onPageSetGrid(pageContextMenu.id, ctxGs as 3 | 4 | 5 | 6, rows); }}
                          style={{
                            flex: 1, padding: '4px 0', cursor: 'pointer', borderRadius: VD.radius.sm,
                            background: ctxRows === rows ? VD.accentBg : VD.elevated,
                            border: `1px solid ${ctxRows === rows ? config.accent : VD.border}`,
                            fontFamily: VD.mono, fontSize: 9,
                            color: ctxRows === rows ? config.accent : VD.textDim,
                          }}
                        >{rows}</button>
                      ))}
                    </div>
                  </div>
                );
              })()}
              {config.pages.length > 1 && (
                <PageCtxItem label={t('page.delete')} danger onClick={() => {
                  onPageDelete(pageContextMenu.id);
                  setPageContextMenu(null);
                }} />
              )}
            </div>
          );
        })()}

        <div style={{ flex: 1, display: 'flex', minHeight: 0, position: 'relative' }}>
          {/* Hints contextuales (uno a la vez): deck vacío → "creá tu primer
              botón"; deck con botones → tip de búsqueda Ctrl+K. Descartables. */}
          {onDismissHint && !hasConfiguredButtons && (
            <Hint
              id="firstButton"
              textKey="hint.firstButton"
              dismissed={hintsDismissed}
              onDismiss={onDismissHint}
              accent={config.accent}
              style={{ top: 12, left: '50%', transform: 'translateX(-50%)' }}
            />
          )}
          {onDismissHint && hasConfiguredButtons && (
            <Hint
              id="search"
              textKey="hint.search"
              dismissed={hintsDismissed}
              onDismiss={onDismissHint}
              accent={config.accent}
              style={{ bottom: 12, left: '50%', transform: 'translateX(-50%)' }}
            />
          )}
          <RejillaBotones
            botones={pageButtons}
            columnas={gridSize}
            filas={gridRows}
            modo={config.tileMode === 'fill' ? 'fill' : 'square'}
            relleno={16}
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
              <ButtonCell
                key={btn.id}
                button={btn}
                accent={config.accent}
                toggled={toggledIds.has(btn.id)}
                isSelected={selectedIds.has(btn.id)}
                isActive={botonActivo(btn, estadoSistema)}
                isHidden={!botonVisible(btn, estadoSistema, sensorList)}
                isRunning={runningButtons.has(btn.id)}
                widgetData={widgetDataMap[btn.id]}
                soundEnabled={soundOnPress}
                soundProfile={soundProfile}
                resolvedLabel={btn.label.includes('{') ? interpolate(btn.label, config.state ?? {}) : undefined}
                onEdit={() => onEditButton(btn.id)}
                onExecute={() => executeButton(btn)}
                onAdjustWheel={(signo) => executeButton({ ...btn, action: {
                  ...btn.action, adjustDelta: Math.abs(btn.action.adjustDelta ?? 10) * signo,
                } })}
                onLongPress={btn.longPressAction && btn.longPressAction.type !== 'none' ? () => executeLongPressButton(btn) : undefined}
                onSelect={() => setSelectedIds((prev) => {
                  const next = new Set(prev);
                  if (next.has(btn.id)) next.delete(btn.id); else next.add(btn.id);
                  return next;
                })}
                onDuplicate={() => onDuplicateButton(btn.id)}
                onClear={() => onClearButton(btn.id)}
                onDragStart={() => setDragSourceId(btn.id)}
                onDragEnd={() => setDragSourceId(null)}
                onDrop={(sourceId) => {
                  if (sourceId && sourceId !== btn.id) onSwapButtons(sourceId, btn.id);
                  setDragSourceId(null);
                }}
              />
            )}
          />

          {/* Bulk-select toolbar — floats over grid when ≥1 button selected */}
          {selectedIds.size > 0 && (
            <div style={{
              position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
              zIndex: 50, display: 'flex', alignItems: 'center', gap: 8,
              background: VD.surface, border: `1px solid ${VD.borderStrong}`,
              borderRadius: VD.radius.lg, padding: '8px 14px',
              boxShadow: VD.shadow.menu, fontFamily: VD.mono,
            }}>
              <span style={{ fontSize: 9, color: VD.textDim, letterSpacing: 1, marginRight: 4 }}>
                {t('bulk.selected', { n: selectedIds.size })}
              </span>

              {/* Move-to-page picker */}
              <select
                value={bulkMoveTarget ?? ''}
                onChange={(e) => setBulkMoveTarget(e.target.value === '' ? null : parseInt(e.target.value, 10))}
                style={{
                  background: VD.elevated, border: `1px solid ${VD.border}`, color: VD.text,
                  fontFamily: VD.mono, fontSize: 8, padding: '3px 6px', borderRadius: VD.radius.sm,
                  outline: 'none',
                }}
              >
                <option value="">{t('ui.moveTo')}</option>
                {config.pages.map((p, i) => i !== activePage && (
                  <option key={p.id} value={i}>{p.name}</option>
                ))}
              </select>

              {bulkMoveTarget !== null && (
                <button
                  onClick={() => {
                    // Una sola operacion, no una por boton: antes cada una era
                    // su propio paso de deshacer y su propio guardado.
                    const ids = Array.from(selectedIds);
                    const movidos = onMoveButtonsToPage(ids, bulkMoveTarget!, false);
                    if (movidos < ids.length) {
                      showToast(t('bulk.partial', { n: movidos, total: ids.length }));
                    }
                    setSelectedIds(new Set()); setBulkMoveTarget(null);
                  }}
                  style={{ padding: '4px 10px', background: VD.accentBg, border: `1px solid ${config.accent}`, color: config.accent, fontFamily: VD.mono, fontSize: 8, cursor: 'pointer', borderRadius: VD.radius.sm, letterSpacing: 1 }}
                >{t('bulk.move')}</button>
              )}
              {bulkMoveTarget !== null && (
                <button
                  onClick={() => {
                    // Una sola operacion, no una por boton: antes cada una era
                    // su propio paso de deshacer y su propio guardado.
                    const ids = Array.from(selectedIds);
                    const movidos = onMoveButtonsToPage(ids, bulkMoveTarget!, true);
                    if (movidos < ids.length) {
                      showToast(t('bulk.partial', { n: movidos, total: ids.length }));
                    }
                    setSelectedIds(new Set()); setBulkMoveTarget(null);
                  }}
                  style={{ padding: '4px 10px', background: VD.accentBg, border: `1px solid ${config.accent}`, color: config.accent, fontFamily: VD.mono, fontSize: 8, cursor: 'pointer', borderRadius: VD.radius.sm, letterSpacing: 1 }}
                >{t('bulk.copy')}</button>
              )}

              <button
                onClick={() => {
                  onClearButtons(Array.from(selectedIds));
                  setSelectedIds(new Set());
                }}
                style={{ padding: '4px 10px', background: 'none', border: `1px solid ${VD.danger}`, color: VD.danger, fontFamily: VD.mono, fontSize: 8, cursor: 'pointer', borderRadius: VD.radius.sm, letterSpacing: 1 }}
              >{t('bulk.clear')}</button>

              <button
                onClick={() => { setSelectedIds(new Set()); setBulkMoveTarget(null); }}
                style={{ padding: '4px 8px', background: 'none', border: `1px solid ${VD.border}`, color: VD.textMuted, fontFamily: VD.mono, fontSize: 8, cursor: 'pointer', borderRadius: VD.radius.sm }}
              >×</button>
            </div>
          )}

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
            />
          )}

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
              <button onClick={() => setToast(null)} style={{ background: 'none', border: 'none', color: VD.textMuted, cursor: 'pointer', fontSize: 16, lineHeight: 1, flexShrink: 0, padding: 0 }}>×</button>
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
    </div>
  );
}

// ── Folder sub-deck overlay ────────────────────────────────────────────────
