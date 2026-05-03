import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  IconMediaSkipBack, IconMediaPlay, IconMediaPause, IconMediaSkipForward,
} from '../components/VDIcon';
import { useTheme } from '../utils/theme';
import { playSound } from '../utils/sound';
import { executeAction, runActionSequence, interpolate } from '../utils/actions';
import { DotLabel } from '../components/DotLabel';
import { DotText } from '../components/DotText';
import { TitleBar } from '../components/TitleBar';
import { Wallpaper } from '../components/Wallpaper';
import { ButtonCell } from '../components/ButtonCell';
import { WeatherWidget, wxInfo } from '../components/WeatherWidget';
import { useNowPlaying, useNowPlayingActivation } from '../utils/nowPlaying';
import type { ButtonConfig, DeckConfig, FolderButton, RGBStatus } from '../types';

// Formatters reutilizables — evita instanciar Intl.DateTimeFormat cada tick.
const TIME_FMT = new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit', hour12: false });
const DATE_FMT = new Intl.DateTimeFormat('es', { weekday: 'short', day: '2-digit', month: 'short' });

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
  onConfigImportFromUrl: (url: string) => void;
  onSwapButtons: (idA: string, idB: string) => void;
  onPageRename: (id: string, name: string) => void;
  onPageAdd: () => void;
  onPageDelete: (id: string) => void;
  onPageReorder: (fromIdx: number, toIdx: number) => void;
  onPageSetGrid: (pageId: string, gs: 3 | 4 | 5 | 6, gridRows?: number) => void;
  onMoveButtonToPage: (buttonId: string, targetPage: number, copy: boolean) => boolean;
  onSaveProfile: (name: string) => void;
  onLoadProfile: (id: string) => void;
  onDeleteProfile: (id: string) => void;
  onAutostartToggle: () => void;
  onSoundToggle: () => void;
  onSoundProfileChange: (id: import('../types').SoundProfileId) => void;
  onStateUpdate: (update: Record<string, string>) => void;
  uiScale?: number;
  onUiScaleChange?: (scale: number) => void;
  theme?: 'dark' | 'light' | 'system';
  onThemeChange?: (theme: 'dark' | 'light' | 'system') => void;
  onPageExport?: (pageIdx: number) => Promise<void>;
  onPageImport?: () => Promise<void>;
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
  onConfigExport, onConfigImport, onConfigImportFromUrl, onSwapButtons,
  onPageRename, onPageAdd, onPageDelete, onPageReorder, onPageSetGrid, onMoveButtonToPage,
  onSaveProfile, onLoadProfile, onDeleteProfile, onAutostartToggle, onSoundToggle, onSoundProfileChange, onStateUpdate,
  uiScale, onUiScaleChange, theme, onThemeChange, onPageExport, onPageImport,
}: MainBProps) {
  const VD = useTheme();
  const api = window.electronAPI;
  const nowPlaying = useNowPlaying();
  const setNowPlayingActive = useNowPlayingActivation();
  const [showSidebar, setShowSidebar] = useState(true);
  const [renamingPageId, setRenamingPageId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [pageContextMenu, setPageContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [dragSourceId, setDragSourceId] = useState<string | null>(null);
  const [dragPageIdx, setDragPageIdx] = useState<number | null>(null);
  const [dragOverPageIdx, setDragOverPageIdx] = useState<number | null>(null);
  const [openFolderBtn, setOpenFolderBtn] = useState<ButtonConfig | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [clock, setClock] = useState(() => new Date());
  const [rgbStatus, setRgbStatus] = useState<RGBStatus | null>(null);
  const [activeAudioDeviceId, setActiveAudioDeviceId] = useState<string | null>(null);
  const [runningProcesses, setRunningProcesses] = useState<Set<string>>(new Set());
  const [execLog, setExecLog] = useState<{ ts: number; label: string; actionType: string; ok: boolean; error?: string }[]>([]);
  const [showLog, setShowLog] = useState(false);
  const [runningButtons, setRunningButtons] = useState<Set<string>>(new Set());
  const [widgetWeather, setWidgetWeather] = useState<{ temp: number; code: number; city: string; country: string } | null>(null);
  const toastTimer = useRef<number>();
  const lastFiredMinuteRef = useRef<string | null>(null);
  const touchStartXRef = useRef<number>(0);

  // Poll RGB status cada 5s y cuando OpenRGB notifica cambios.
  useEffect(() => {
    if (!api) return;
    let cancelled = false;
    const tick = async () => {
      const s = await api.rgb.status().catch(() => null);
      if (!cancelled) setRgbStatus(s ?? null);
    };
    tick();
    const t = setInterval(tick, 5000);
    const off = api.events.onRGBDevicesChanged?.(() => { tick(); });
    return () => { cancelled = true; clearInterval(t); off?.(); };
  }, [api]);

  // Poll active audio device and running processes every 5s to drive button state indicators.
  useEffect(() => {
    if (!api) return;
    let cancelled = false;
    const tick = async () => {
      const [audioList, procs] = await Promise.all([
        api.audio.list().catch(() => []),
        api.state.activeApps().catch(() => [] as string[]),
      ]);
      if (cancelled) return;
      const defDev = audioList.find((d) => d.isDefault);
      setActiveAudioDeviceId(defDev?.id ?? null);
      setRunningProcesses(new Set(procs));
    };
    tick();
    const t = setInterval(tick, 5000);
    return () => { cancelled = true; clearInterval(t); };
  }, [api]);

  // Pausar el polling de nowPlaying cuando la sidebar está oculta (no hay consumidor visible).
  useEffect(() => { setNowPlayingActive(showSidebar); }, [showSidebar, setNowPlayingActive]);

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Poll weather for widget buttons (15 min TTL, same as WeatherWidget sidebar).
  useEffect(() => {
    if (!api) return;
    const hasWeather = config.buttons.some((b) => b.widget === 'weather');
    if (!hasWeather) return;
    let cancelled = false;
    const poll = async () => {
      try { const d = await api.weather.get(); if (!cancelled && d) setWidgetWeather(d); } catch {}
    };
    poll();
    const t = setInterval(poll, 15 * 60 * 1000);
    return () => { cancelled = true; clearInterval(t); };
  }, [api]);

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

  const executeButton = useCallback(async (btn: ButtonConfig) => {
    if (!api) return;

    // Folder abre overlay
    if (btn.action.type === 'folder') {
      setOpenFolderBtn(btn);
      return;
    }

    setRunningButtons((prev) => { const s = new Set(prev); s.add(btn.id); return s; });
    try {

    // Toggle: decide qué rama ejecutar
    if (btn.isToggle) {
      const wasToggled = toggledIds.has(btn.id);
      onToggle(btn.id);
      // Radio group: desactivar otros botones del mismo grupo al activar este
      if (!wasToggled && btn.radioGroup) {
        config.buttons
          .filter((b) => b.radioGroup === btn.radioGroup && b.id !== btn.id && toggledIds.has(b.id))
          .forEach((b) => onToggle(b.id));
      }
      if (wasToggled && btn.actionToggleOff && btn.actionToggleOff.type !== 'none') {
        const r = await executeAction(btn.actionToggleOff, api, config.state, config.rgb?.profiles);
        if (!r.ok && r.error) showToast(r.error);
        if (r.stateUpdate) onStateUpdate(r.stateUpdate as Record<string, string>);
        return;
      }
    }

    const actionsToRun = (btn.actions && btn.actions.length > 0) ? btn.actions : [btn.action];
    const baseState = config.state ?? {};
    const r = await runActionSequence(actionsToRun, api, baseState, {
      runScript: async (script, shell) => {
        const actionDef = actionsToRun.find(a => a.type === 'script' && a.script === script);
        const needsCapture = actionDef?.showOutput || actionDef?.captureToVar;
        if (needsCapture) {
          try {
            const out = await api.launch.scriptCapture(script, shell);
            if (actionDef?.showOutput && out.output) showToast(out.output);
            return { ok: out.success, output: out.output, error: out.success ? undefined : 'El script terminó con error.' };
          } catch (e) { return { ok: false, error: `Error script: ${(e as Error).message}` }; }
        }
        try {
          const ok = await api.launch.script(script, shell);
          return { ok, error: ok ? undefined : 'El script terminó con error.' };
        } catch (e) { return { ok: false, error: `Error script: ${(e as Error).message}` }; }
      },
    }, config.rgb?.profiles);
    // Diff state update vs baseState para sólo persistir lo nuevo.
    const newKeys = Object.keys(r.stateUpdate).filter((k) => r.stateUpdate[k] !== baseState[k]);
    if (newKeys.length > 0) {
      const update: Record<string, string> = {};
      for (const k of newKeys) update[k] = r.stateUpdate[k];
      onStateUpdate(update);
    }
    setExecLog((prev) => [
      { ts: Date.now(), label: btn.label || btn.action.type, actionType: btn.action.type, ok: r.ok, error: r.error },
      ...prev.slice(0, 99),
    ]);
    if (!r.ok && r.error) showToast(r.error);
    } finally {
      setRunningButtons((prev) => { const s = new Set(prev); s.delete(btn.id); return s; });
    }
  }, [api, toggledIds, onToggle, showToast, config.state, onStateUpdate, config.buttons]);

  const executeLongPressButton = useCallback(async (btn: ButtonConfig) => {
    if (!api || !btn.longPressAction || btn.longPressAction.type === 'none') return;
    const r = await executeAction(btn.longPressAction, api, config.state, config.rgb?.profiles);
    setExecLog((prev) => [
      { ts: Date.now(), label: `⇓ ${btn.label || btn.longPressAction!.type}`, actionType: btn.longPressAction!.type, ok: r.ok, error: r.error },
      ...prev.slice(0, 99),
    ]);
    if (r.stateUpdate) onStateUpdate(r.stateUpdate as Record<string, string>);
    if (!r.ok && r.error) showToast(r.error);
  }, [api, config.state, config.rgb?.profiles, onStateUpdate, showToast]);

  const currentPage = config.pages[activePage];
  const gridSize = currentPage?.gridSize ?? 4;
  const gridRows = currentPage?.gridRows ?? gridSize;
  const pageButtons = config.buttons.filter((b) => b.page === activePage).slice(0, gridSize * gridRows);
  const sourceName = nowPlaying ? getSourceName(nowPlaying.source) : '';

  const widgetDataMap = useMemo(() => {
    const map: Record<string, { line1: string; line2?: string }> = {};
    for (const btn of config.buttons) {
      if (!btn.widget) continue;
      // 'now-playing' on an audio-device button is an invalid combo: the cell
      // would show the playing track instead of the configured device name.
      if (btn.widget === 'now-playing' && btn.action.type === 'audio-device') continue;
      if (btn.widget === 'clock') {
        map[btn.id] = { line1: TIME_FMT.format(clock), line2: DATE_FMT.format(clock).toUpperCase() };
      } else if (btn.widget === 'weather' && widgetWeather) {
        const [emoji] = wxInfo(widgetWeather.code);
        map[btn.id] = { line1: `${emoji} ${widgetWeather.temp}°`, line2: widgetWeather.city };
      } else if (btn.widget === 'now-playing' && nowPlaying) {
        map[btn.id] = { line1: nowPlaying.title || '—', line2: nowPlaying.artist || undefined };
      }
    }
    return map;
  }, [config.buttons, clock, widgetWeather, nowPlaying]);

  // Scheduled triggers: check every 15s for buttons with timerTriggerAt matching current HH:MM.
  useEffect(() => {
    const t = setInterval(() => {
      const nowStr = TIME_FMT.format(new Date());
      if (nowStr === lastFiredMinuteRef.current) return;
      const scheduled = config.buttons.filter((b) => b.timerTriggerAt === nowStr && b.page === activePage);
      if (scheduled.length > 0) {
        lastFiredMinuteRef.current = nowStr;
        scheduled.forEach((btn) => executeButton(btn));
      }
    }, 15000);
    return () => clearInterval(t);
  }, [config.buttons, activePage, executeButton]);

  const isPlaying = nowPlaying?.status === 'Playing';

  function extractExeName(appPath: string): string | null {
    if (!appPath) return null;
    const seg = appPath.split(/[/\\]/).pop() ?? appPath;
    return seg.replace(/\s.*$/, '').replace(/\.(exe|lnk|bat|cmd)$/i, '').toLowerCase() || null;
  }

  function isButtonActive(btn: ButtonConfig): boolean {
    const a = btn.action;
    if (a.type === 'audio-device' && a.deviceId) return a.deviceId === activeAudioDeviceId;
    if (a.type === 'app' && a.appPath) {
      const name = extractExeName(a.appPath);
      return !!name && runningProcesses.has(name);
    }
    if (a.type === 'kill-process' && a.processName) {
      return runningProcesses.has(a.processName.replace(/\.exe$/i, '').toLowerCase());
    }
    return false;
  }

  function isButtonVisible(btn: ButtonConfig): boolean {
    if (!btn.visibleIf?.app) return true;
    const name = btn.visibleIf.app.replace(/\.exe$/i, '').toLowerCase();
    return runningProcesses.has(name);
  }

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
          onConfigExport={onConfigExport}
          onConfigImport={onConfigImport}
          onConfigImportFromUrl={onConfigImportFromUrl}
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
          theme={theme}
          onThemeChange={onThemeChange}
        />

        {/* Page tabs */}
        <div style={{
          display: 'flex', padding: '12px 20px 0', gap: 2,
          borderBottom: `1px solid ${VD.border}`,
          background: VD.surface, flexShrink: 0, alignItems: 'flex-end',
        }}>
          {config.pages.map((p, i) => (
            <div
              key={p.id}
              draggable
              onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; setDragPageIdx(i); }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = e.shiftKey && dragSourceId ? 'copy' : 'move';
                setDragOverPageIdx(i);
              }}
              onDragLeave={() => setDragOverPageIdx(null)}
              onDragEnd={() => { setDragPageIdx(null); setDragOverPageIdx(null); }}
              onDrop={(e) => {
                if (dragSourceId && i !== activePage) {
                  // Drop de un botón sobre otra pestaña → mover (o copiar con Shift)
                  const ok = onMoveButtonToPage(dragSourceId, i, e.shiftKey);
                  if (!ok) {
                    setToast(`No hay slot libre en "${p.name}".`);
                    clearTimeout(toastTimer.current);
                    toastTimer.current = window.setTimeout(() => setToast(null), 4000);
                  }
                  setDragSourceId(null);
                } else if (dragPageIdx !== null && dragPageIdx !== i) {
                  onPageReorder(dragPageIdx, i);
                }
                setDragPageIdx(null); setDragOverPageIdx(null);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                setPageContextMenu({ id: p.id, x: e.clientX, y: e.clientY });
              }}
              style={{
                padding: '8px 16px',
                fontFamily: VD.mono, fontSize: 10, letterSpacing: 2,
                color: i === activePage ? VD.text : VD.textDim,
                borderBottom: i === activePage
                  ? `2px solid ${config.accent}`
                  : dragOverPageIdx === i
                  ? `2px solid ${config.accent}66`
                  : '2px solid transparent',
                position: 'relative', top: 1, cursor: 'grab', userSelect: 'none',
                display: 'flex', alignItems: 'center',
                opacity: dragPageIdx === i ? 0.4 : 1,
                transition: 'opacity 0.15s',
              }}
            >
              {renamingPageId === p.id ? (
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => confirmRename(p.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') confirmRename(p.id);
                    if (e.key === 'Escape') setRenamingPageId(null);
                    e.stopPropagation();
                  }}
                  style={{
                    background: 'transparent', border: 'none',
                    outline: `1px solid ${config.accent}`,
                    fontFamily: VD.mono, fontSize: 10, letterSpacing: 2, color: VD.text,
                    width: Math.max(60, renameValue.length * 9), padding: '0 2px',
                  }}
                />
              ) : (
                <span
                  onClick={() => onPageChange(i)}
                  onDoubleClick={() => { setRenamingPageId(p.id); setRenameValue(p.name); }}
                  title="Clic · Doble clic para renombrar · Arrastrar para reordenar · Clic derecho para opciones"
                  style={{ cursor: 'pointer' }}
                >
                  {p.name}
                  {(p.gridSize ?? 4) !== 4 && (
                    <span style={{ fontSize: 7, marginLeft: 4, opacity: 0.5 }}>{p.gridSize ?? 4}×{p.gridRows ?? p.gridSize ?? 4}</span>
                  )}
                </span>
              )}
            </div>
          ))}

          {config.pages.length < 8 && (
            <div
              onClick={onPageAdd}
              title="Agregar página"
              style={{
                padding: '8px 10px', color: VD.textMuted, fontSize: 16,
                cursor: 'pointer', userSelect: 'none', position: 'relative', top: 1, lineHeight: 1,
              }}
            >+</div>
          )}

          <div style={{ flex: 1 }} />
          {onPageExport && (
            <div onClick={() => onPageExport(activePage)} title="Exportar página actual" style={{ padding: '8px 10px', fontSize: 11, cursor: 'pointer', userSelect: 'none', color: VD.textMuted, fontFamily: VD.mono, letterSpacing: 0.5 }}>
              ↗
            </div>
          )}
          {onPageImport && (
            <div onClick={onPageImport} title="Importar página desde archivo" style={{ padding: '8px 10px', fontSize: 11, cursor: 'pointer', userSelect: 'none', color: VD.textMuted, fontFamily: VD.mono, letterSpacing: 0.5 }}>
              ↙
            </div>
          )}
          <div
            onClick={() => setShowSidebar((v) => !v)}
            title={showSidebar ? 'Ocultar panel' : 'Mostrar panel'}
            style={{ padding: '8px 10px', fontSize: 12, cursor: 'pointer', userSelect: 'none', color: showSidebar ? VD.textDim : VD.textMuted, transition: 'color 0.15s' }}
          >
            {showSidebar ? '▶' : '◀'}
          </div>
        </div>

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
              <PageCtxItem label="Renombrar" onClick={() => {
                if (ctxPage) { setRenamingPageId(ctxPage.id); setRenameValue(ctxPage.name); }
                setPageContextMenu(null);
              }} />
              {/* Grid size */}
              <div style={{ padding: '8px 14px', borderBottom: `1px solid ${VD.border}` }}>
                <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, marginBottom: 6, letterSpacing: 1 }}>GRILLA</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {([3, 4, 5, 6] as const).map(gs => (
                    <button
                      key={gs}
                      onClick={() => { onPageSetGrid(pageContextMenu.id, gs); setPageContextMenu(null); }}
                      style={{
                        flex: 1, padding: '5px 0', cursor: 'pointer', borderRadius: VD.radius.sm,
                        background: ctxGs === gs ? VD.accentBg : VD.elevated,
                        border: `1px solid ${ctxGs === gs ? config.accent : VD.border}`,
                        fontFamily: VD.mono, fontSize: 9,
                        color: ctxGs === gs ? config.accent : VD.textDim,
                      }}
                    >
                      {gs}×{gs}
                    </button>
                  ))}
                </div>
              </div>
              {config.pages.length > 1 && (
                <PageCtxItem label="Eliminar página" danger onClick={() => {
                  onPageDelete(pageContextMenu.id);
                  setPageContextMenu(null);
                }} />
              )}
            </div>
          );
        })()}

        <div style={{ flex: 1, display: 'flex', minHeight: 0, position: 'relative' }}>
          {/* Button grid */}
          <div
            style={{
              flex: 1, padding: 16,
              display: 'grid',
              gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
              gridTemplateRows: `repeat(${gridRows}, 1fr)`,
              gap: 8,
            }}
            onTouchStart={(e) => { touchStartXRef.current = e.touches[0].clientX; }}
            onTouchEnd={(e) => {
              const dx = e.changedTouches[0].clientX - touchStartXRef.current;
              if (Math.abs(dx) > 50) {
                if (dx < 0 && activePage < config.pages.length - 1) onPageChange(activePage + 1);
                else if (dx > 0 && activePage > 0) onPageChange(activePage - 1);
              }
            }}
          >
            {pageButtons.map((btn) => (
              <ButtonCell
                key={btn.id}
                button={btn}
                accent={config.accent}
                toggled={toggledIds.has(btn.id)}
                isActive={isButtonActive(btn)}
                isHidden={!isButtonVisible(btn)}
                isRunning={runningButtons.has(btn.id)}
                widgetData={widgetDataMap[btn.id]}
                soundEnabled={soundOnPress}
                soundProfile={soundProfile}
                resolvedLabel={btn.label.includes('{') ? interpolate(btn.label, config.state ?? {}) : undefined}
                onEdit={() => onEditButton(btn.id)}
                onExecute={() => executeButton(btn)}
                onLongPress={btn.longPressAction && btn.longPressAction.type !== 'none' ? () => executeLongPressButton(btn) : undefined}
                onDuplicate={() => onDuplicateButton(btn.id)}
                onClear={() => onClearButton(btn.id)}
                onDragStart={() => setDragSourceId(btn.id)}
                onDrop={() => {
                  if (dragSourceId && dragSourceId !== btn.id) onSwapButtons(dragSourceId, btn.id);
                  setDragSourceId(null);
                }}
              />
            ))}
          </div>

          {/* Sidebar */}
          {showSidebar && (
            <div style={{
              width: 220, borderLeft: `1px solid ${VD.border}`,
              padding: '10px 14px 10px', background: VD.surface,
              display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0,
              overflowY: 'auto',
            }}>
              {/* Clock — DotText es la firma del reloj */}
              <div style={{
                paddingBottom: 10, borderBottom: `1px solid ${VD.border}`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              }}>
                <DotText
                  text={TIME_FMT.format(clock)}
                  dotSize={3} gap={1} color={VD.text}
                />
                <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, letterSpacing: 1 }}>
                  {DATE_FMT.format(clock).toUpperCase()}
                </div>
              </div>

              {/* Weather */}
              <div>
                <DotLabel size={9} color={VD.textMuted} spacing={2} style={{ display: 'block', marginBottom: 6 }}>CLIMA</DotLabel>
                <WeatherWidget />
              </div>

              {/* RGB status */}
              <div>
                <DotLabel size={9} color={VD.textMuted} spacing={2} style={{ display: 'block', marginBottom: 6 }}>RGB</DotLabel>
                <div
                  onClick={onRGB}
                  title="Abrir Gestor RGB"
                  style={{
                    background: VD.elevated, border: `1px solid ${VD.border}`,
                    borderRadius: VD.radius.md, padding: '8px 10px',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                  }}
                >
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: rgbStatus?.connected ? VD.success : rgbStatus?.serverRunning ? VD.warning : VD.textMuted,
                  }} />
                  <div style={{ flex: 1, fontFamily: VD.mono, fontSize: 9, color: VD.textDim, letterSpacing: 0.5 }}>
                    {rgbStatus?.connected
                      ? `${rgbStatus.deviceCount} ${rgbStatus.deviceCount === 1 ? 'DEVICE' : 'DEVICES'}`
                      : rgbStatus?.serverRunning ? 'SERVER ACTIVO' : 'DESCONECTADO'}
                  </div>
                  <span style={{ fontFamily: VD.mono, fontSize: 9, color: config.accent }}>→</span>
                </div>
              </div>

              {/* Execution log */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showLog ? 6 : 0 }}>
                  <DotLabel size={9} color={VD.textMuted} spacing={2}>LOG</DotLabel>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {execLog.length > 0 && (
                      <span
                        onClick={() => setExecLog([])}
                        title="Limpiar log"
                        style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, cursor: 'pointer', letterSpacing: 0.5 }}
                      >✕</span>
                    )}
                    <span
                      onClick={() => setShowLog((v) => !v)}
                      style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, cursor: 'pointer', userSelect: 'none' }}
                    >{showLog ? '▲' : '▼'}</span>
                  </div>
                </div>
                {showLog && (
                  <div style={{ maxHeight: 160, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {execLog.length === 0 ? (
                      <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted }}>Sin actividad</div>
                    ) : execLog.map((entry, i) => (
                      <div key={i} title={entry.error} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ color: entry.ok ? VD.success : VD.danger, fontSize: 8, flexShrink: 0 }}>●</span>
                        <span style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textDim, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.label}</span>
                        <span style={{ fontFamily: VD.mono, fontSize: 7, color: VD.textMuted, flexShrink: 0 }}>
                          {new Date(entry.ts).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Now Playing */}
              <div style={{ marginTop: 'auto', paddingTop: 10, borderTop: `1px solid ${VD.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <DotLabel size={9} color={VD.textMuted} spacing={2}>REPRODUCIENDO</DotLabel>
                  <span
                    onClick={async () => {
                      const r = await api?.media.diagnose();
                      if (!r) return;
                      const lines = r.stdout.split(/\r?\n/).slice(0, 25).join('\n');
                      showToast(`SMTC diagnóstico:\n${lines}${r.stderr ? '\n\nstderr:\n' + r.stderr.slice(0, 300) : ''}`);
                    }}
                    title="Diagnosticar widget de música"
                    style={{
                      fontFamily: VD.mono, fontSize: 8, color: VD.textMuted,
                      cursor: 'pointer', letterSpacing: 1, padding: '2px 4px',
                    }}
                  >?</span>
                </div>
                {nowPlaying ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <div style={{
                        width: 44, height: 44, flexShrink: 0, borderRadius: VD.radius.lg,
                        background: VD.overlay, overflow: 'hidden',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: `1px solid ${VD.border}`, position: 'relative',
                      }}>
                        <div style={{ opacity: 0.35 }}>
                          {isPlaying
                            ? <IconMediaPlay size={18} color={VD.textMuted} />
                            : <IconMediaPause size={18} color={VD.textMuted} />
                          }
                        </div>
                        {nowPlaying.thumbnail && (
                          <img
                            src={nowPlaying.thumbnail}
                            alt=""
                            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                          />
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: VD.font, fontSize: 11, color: VD.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 }}>
                          {nowPlaying.title || '—'}
                        </div>
                        {nowPlaying.artist && (
                          <div style={{ fontFamily: VD.mono, fontSize: 10, color: VD.textDim, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>
                            {nowPlaying.artist}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 6, height: 6, borderRadius: VD.radius.md, background: isPlaying ? VD.success : VD.textMuted, flexShrink: 0 }} />
                      <span style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted }}>
                        {isPlaying ? 'Reproduciendo' : 'Pausado'}{sourceName ? ` · ${sourceName}` : ''}
                      </span>
                    </div>
                    {/* Media controls — Lucide icons, matching app design */}
                    <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
                      {([
                        { key: 'prev',       Icon: IconMediaSkipBack,                          title: 'Anterior'   },
                        { key: 'play-pause', Icon: isPlaying ? IconMediaPause : IconMediaPlay, title: 'Play/Pausa' },
                        { key: 'next',       Icon: IconMediaSkipForward,                       title: 'Siguiente'  },
                      ] as const).map(({ key, Icon, title }) => (
                        <button
                          key={key}
                          title={title}
                          onClick={() => {
                            // Usa SMTC nativo (TrySkipNext/Previous/TogglePlayPause); cae a SendKeys si falla.
                            api?.media.control(key as 'play-pause' | 'next' | 'prev');
                          }}
                          style={{
                            flex: 1, padding: '6px 0',
                            background: VD.elevated, border: `1px solid ${VD.border}`,
                            cursor: 'pointer', borderRadius: VD.radius.md,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'background 0.1s, border-color 0.1s',
                          }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = config.accent; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = VD.border; }}
                        >
                          <Icon size={13} color={VD.textDim} />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontFamily: VD.mono, fontSize: 10, color: VD.textMuted }}>Sin reproducción activa</div>
                )}
              </div>
            </div>
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
          onClose={() => setOpenFolderBtn(null)}
        />
      )}
    </div>
  );
}

// ── Folder sub-deck overlay ────────────────────────────────────────────────
function FolderOverlay({ btn, accent, soundEnabled, soundProfile, onClose }: {
  btn: ButtonConfig;
  accent: string;
  soundEnabled: boolean;
  soundProfile: import('../types').SoundProfileId;
  onClose: () => void;
}) {
  const VD = useTheme();
  const api = window.electronAPI;
  const [flash, setFlash] = useState<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function runFolderAction(fb: FolderButton, idx: number) {
    if (!api) return;
    setFlash(idx);
    setTimeout(() => setFlash(null), 300);
    if (soundEnabled) playSound(soundProfile);
    await executeAction(fb.action, api);
    onClose();
  }

  const buttons: FolderButton[] = btn.action.folderButtons ?? [];

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(0,0,0,0.82)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{
        background: VD.surface, border: `1px solid ${VD.borderStrong}`,
        borderRadius: VD.radius.lg, padding: 20, boxShadow: VD.shadow.modal,
        minWidth: 340,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          {btn.icon && <span style={{ fontSize: 18, color: btn.fgColor || VD.text }}>{btn.icon}</span>}
          <span style={{ fontFamily: VD.mono, fontSize: 11, letterSpacing: 2, color: VD.text }}>
            {btn.label || 'CARPETA'}
          </span>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: VD.textDim, cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
        </div>

        {/* Sub-button grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {buttons.map((fb, i) => (
            <div
              key={i}
              onClick={() => runFolderAction(fb, i)}
              style={{
                height: 72, borderRadius: VD.radius.lg, cursor: 'pointer',
                background: flash === i ? (fb.bgColor ? fb.bgColor : VD.accentBg) : (fb.bgColor || VD.elevated),
                border: `1px solid ${flash === i ? accent : VD.border}`,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 5,
                transition: 'background 0.1s, border-color 0.1s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = accent; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = flash === i ? accent : VD.border; }}
            >
              {fb.icon && <div style={{ fontSize: 18, color: fb.fgColor || VD.text, lineHeight: 1 }}>{fb.icon}</div>}
              <div style={{ fontFamily: VD.mono, fontSize: 8, letterSpacing: 1, color: fb.fgColor || VD.textDim, textAlign: 'center', maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
                {fb.label}
              </div>
              {fb.action.hotkey && (
                <div style={{ fontFamily: VD.mono, fontSize: 7, color: VD.textMuted, opacity: 0.7 }}>{fb.action.hotkey}</div>
              )}
            </div>
          ))}
          {buttons.length === 0 && (
            <div style={{ gridColumn: '1 / -1', padding: 20, textAlign: 'center', fontFamily: VD.mono, fontSize: 10, color: VD.textMuted }}>
              Sin botones configurados. Edita este botón para añadirlos.
            </div>
          )}
        </div>

        <div style={{ marginTop: 12, fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, textAlign: 'center' }}>
          ESC PARA CERRAR
        </div>
      </div>
    </div>
  );
}

// ── Helper components ─────────────────────────────────────────────────────
function PageCtxItem({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  const VD = useTheme();
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: '9px 14px', background: hov ? VD.elevated : 'transparent',
        cursor: 'pointer', fontFamily: VD.mono, fontSize: 11,
        color: danger ? VD.danger : VD.text, letterSpacing: 0.5,
        transition: 'background 0.1s', borderBottom: `1px solid ${VD.border}`,
      }}
    >
      {label}
    </div>
  );
}
