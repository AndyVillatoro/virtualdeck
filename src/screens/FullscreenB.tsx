import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from '../utils/theme';
import { useT, useLang } from '../utils/i18n';
import { PinKiosko, type ModoPin } from './fullscreen/PinKiosko';
import { SonandoAhora } from './fullscreen/SonandoAhora';
import { DotText } from '../components/DotText';
import { DotLabel } from '../components/DotLabel';
import { Wallpaper } from '../components/Wallpaper';
import { ButtonCell } from '../components/ButtonCell';
import { useDatosWidget, useClimaWidget } from '../components/celda/useDatosWidget';
import { formatoDia, formatoDiaMes } from '../utils/formatos';
import { RejillaBotones } from '../components/rejilla/RejillaBotones';
import { executeAction, runActionSequence } from '../utils/actions';
import { useNowPlaying } from '../utils/nowPlaying';
import { useSensors } from '../utils/sensors';
import { SensorCard, groupSensorsByHardware } from '../components/SensorPanel';
import type { ButtonConfig, DeckConfig } from '../types';



interface FullscreenBProps {
  config: DeckConfig;
  soundOnPress: boolean;
  soundProfile: import('../types').SoundProfileId;
  onExit: () => void;
  /** Persiste el PIN del modo kiosko para próximas activaciones. */
  onSetKioskPin: (pin: string) => void;
  onStateUpdate: (update: Record<string, string>) => void;
}

function getSourceName(src: string): string {
  if (!src) return '';
  if (/youtube\s*music/i.test(src)) return 'YouTube Music';
  if (/youtube/i.test(src))         return 'YouTube';
  if (/spotify/i.test(src))         return 'Spotify';
  if (/soundcloud/i.test(src))      return 'SoundCloud';
  if (/chrome/i.test(src))          return 'Chrome';
  if (/msedge|edge/i.test(src))     return 'Edge';
  if (/firefox/i.test(src))         return 'Firefox';
  if (/vlc/i.test(src))             return 'VLC';
  const parts = src.split(/[\\./]/);
  return parts[parts.length - 1]?.replace(/\.exe$/i, '') || '';
}

export function FullscreenB({ config, soundOnPress, soundProfile, onExit, onSetKioskPin, onStateUpdate }: FullscreenBProps) {
  // La paleta viene del contexto: importarla fijaba el tema oscuro y esta
  // pantalla se quedaba sin modo claro por completo.
  const VD = useTheme();
  const t = useT();
  const lang = useLang();
  const [now, setNow] = useState(new Date());
  const nowPlaying = useNowPlaying();
  const { sensors: sensorList, status: sensorStatus } = useSensors();
  const [activePage, setActivePage] = useState(0);
  const [toggledIds, setToggledIds] = useState<Set<string>>(new Set());
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const errorTimer = useRef<number>();

  // 5.5 — Modo kiosko: oculta topbar, deshabilita context menu y pide PIN para salir.
  // Activación per-session (no persistida); el PIN sí se guarda para próximos turnos.
  const [kioskActive, setKioskActive] = useState(false);
  const [pinPrompt, setPinPrompt] = useState<ModoPin>(null);
  const storedPin = config.kiosk?.pin ?? '';

  const enterKiosk = () => {
    if (!storedPin) {
      setPinPrompt('set');
    } else {
      setKioskActive(true);
    }
  };
  const requestExitKiosk = () => setPinPrompt('exit');


  useEffect(() => {
    if (!runtimeError) return;
    clearTimeout(errorTimer.current);
    errorTimer.current = window.setTimeout(() => setRuntimeError(null), 5000);
    return () => clearTimeout(errorTimer.current);
  }, [runtimeError]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (pinPrompt) { setPinPrompt(null); return; }
        if (kioskActive) { e.preventDefault(); requestExitKiosk(); return; }
        onExit();
        return;
      }
      const num = parseInt(e.key);
      if (!isNaN(num) && num >= 1 && num <= config.pages.length) setActivePage(num - 1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onExit, config.pages.length, kioskActive, pinPrompt]);

  const handleToggle = useCallback((id: string) => {
    setToggledIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const executeButton = useCallback(async (btn: ButtonConfig) => {
    const api = window.electronAPI;
    if (!api) return;

    if (btn.isToggle) {
      const wasToggled = toggledIds.has(btn.id);
      handleToggle(btn.id);
      if (wasToggled && btn.actionToggleOff && btn.actionToggleOff.type !== 'none') {
        const r = await executeAction(btn.actionToggleOff, api, config.state, config.rgb?.profiles, t);
        if (!r.ok && r.error) setRuntimeError(r.error);
        if (r.stateUpdate) onStateUpdate(r.stateUpdate as Record<string, string>);
        return;
      }
    }

    const actionsToRun = (btn.actions && btn.actions.length > 0) ? btn.actions : [btn.action];
    const baseState = config.state ?? {};
    // Same scriptHooks shape as MainB so script actions with showOutput/captureToVar
    // work in fullscreen — without this, capture/output were silently dropped.
    const r = await runActionSequence(actionsToRun, api, baseState, {
      runScript: async (script, shell) => {
        const actionDef = actionsToRun.find(a => a.type === 'script' && a.script === script);
        const needsCapture = actionDef?.showOutput || actionDef?.captureToVar;
        if (needsCapture) {
          try {
            const out = await api.launch.scriptCapture(script, shell);
            if (actionDef?.showOutput && out.output) setRuntimeError(out.output);
            return { ok: out.success, output: out.output, error: out.success ? undefined : t('act.err.script') };
          } catch (e) { return { ok: false, error: `Error script: ${(e as Error).message}` }; }
        }
        try {
          const ok = await api.launch.script(script, shell);
          return { ok, error: ok ? undefined : t('act.err.script') };
        } catch (e) { return { ok: false, error: `Error script: ${(e as Error).message}` }; }
      },
    }, config.rgb?.profiles);
    const newKeys = Object.keys(r.stateUpdate).filter((k) => r.stateUpdate[k] !== baseState[k]);
    if (newKeys.length > 0) {
      const update: Record<string, string> = {};
      for (const k of newKeys) update[k] = r.stateUpdate[k];
      onStateUpdate(update);
    }
    if (!r.ok && r.error) setRuntimeError(r.error);
  }, [t, toggledIds, handleToggle, config.state, config.rgb?.profiles, onStateUpdate]);

  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const dayStr = formatoDia(lang).format(now).toUpperCase();
  const dateStr = formatoDiaMes(lang).format(now).toUpperCase();

  const currentPage = config.pages[activePage];
  const gridSize = currentPage?.gridSize ?? 4;
  const gridRows = currentPage?.gridRows ?? gridSize;
  const pageButtons = config.buttons.filter((b) => b.page === activePage).slice(0, gridSize * gridRows);
  const isPlaying = nowPlaying?.status === 'Playing';
  const sourceName = nowPlaying ? getSourceName(nowPlaying.source) : '';

  // Group sensors by hardware piece (CPU / GPU / Mainboard / Storage…) and
  // auto-pick the most representative reading per kind. This is the data that
  // fills the left pane below the clock.
  const sensorGroups = useMemo(() => groupSensorsByHardware(sensorList), [sensorList]);

  // Los mismos datos de widget que la pantalla principal. Kiosko los dibujaba
  // sin ellos, asi que un boton con reloj o con un sensor mostraba el icono de
  // la accion y ya.
  const clima = useClimaWidget(config.buttons.some((b) => b.widget === 'weather'), window.electronAPI);
  const datosWidget = useDatosWidget({
    botones: config.buttons,
    estado: config.state,
    reloj: now,
    clima,
    sonando: nowPlaying,
    sensores: sensorList,
  });

  return (
    <div
      onContextMenu={(e) => { if (kioskActive) e.preventDefault(); }}
      style={{
        width: '100%', height: '100%', background: VD.bg,
        color: VD.text, fontFamily: VD.font,
        position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
      }}>
      <Wallpaper kind="dotgrid" />

      {/* Top bar — oculta en modo kiosko */}
      {!kioskActive && (
      <div style={{
        height: 30, display: 'flex', alignItems: 'center',
        padding: '0 20px', gap: 16,
        borderBottom: `1px solid ${VD.border}`,
        fontFamily: VD.mono, fontSize: 9, letterSpacing: 2, color: VD.textDim,
        flexShrink: 0, position: 'relative', zIndex: 1,
      }}>
        <span style={{ color: config.accent }}>●</span>
        <span>{t('full.title')}</span>
        <div style={{ flex: 1 }} />
        <span>{dayStr} {dateStr}</span>
        <button onClick={enterKiosk} title="Activar modo kiosko (oculta UI, ESC pide PIN)" style={{
          background: 'transparent', border: `1px solid ${VD.border}`,
          color: VD.textDim, fontFamily: VD.mono, fontSize: 9,
          letterSpacing: 1, padding: '3px 8px', cursor: 'pointer',
          marginRight: 4,
        }}>
          {t('full.kioskBadge')}
        </button>
        <button onClick={onExit} style={{
          background: 'transparent', border: `1px solid ${VD.border}`,
          color: VD.textDim, fontFamily: VD.mono, fontSize: 9,
          letterSpacing: 1, padding: '3px 8px', cursor: 'pointer',
        }}>
          {t('full.exit')}
        </button>
      </div>
      )}

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0, position: 'relative', zIndex: 1 }}>
        {/* Left: compact clock + sensor cards + page selector. Compacted to
            free vertical space for the sensor stack — the previous layout
            wasted ~50% of this column on a giant clock. */}
        <div style={{
          width: '34%', padding: '20px 24px 16px',
          borderRight: `1px solid ${VD.border}`,
          display: 'flex', flexDirection: 'column', flexShrink: 0, gap: 12,
          minHeight: 0,
        }}>
          <div>
            <DotLabel size={8} color={VD.textMuted} spacing={2} style={{ marginBottom: 8, display: 'block' }}>{t('full.clock')}</DotLabel>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <DotText text={hours} dotSize={7} gap={2} color={VD.text} />
              <DotText text={minutes} dotSize={7} gap={2} color={VD.textDim} />
            </div>
          </div>

          {/* Sensor cards — fills the space between clock and page selector. */}
          {(config.sensors?.showWidget ?? true) && (
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <DotLabel size={8} color={VD.textMuted} spacing={2}>{t('panel.sensors')}</DotLabel>
              <span style={{
                fontFamily: VD.mono, fontSize: 7, letterSpacing: 1,
                color: sensorStatus?.connected ? VD.success : sensorStatus?.enabled ? VD.warning : VD.textMuted,
              }}>
                {sensorStatus?.connected ? '● LHM' : sensorStatus?.enabled ? '○ OFFLINE' : '○ DISABLED'}
              </span>
            </div>
            {sensorGroups.length === 0 ? (
              <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, padding: '8px 0' }}>
                {t(sensorStatus?.enabled ? 'sensors.noData' : 'sensors.offHint')}
              </div>
            ) : (
              sensorGroups.map((g) => <SensorCard key={g.hardware} group={g} />)
            )}
          </div>
          )}
          {!(config.sensors?.showWidget ?? true) && <div style={{ flex: 1 }} />}

          {/* Page selector */}
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            {config.pages.map((p, i) => (
              <button key={p.id} onClick={() => setActivePage(i)} style={{
                flex: 1, padding: '4px 0',
                background: i === activePage ? config.accent : VD.elevated,
                border: `1px solid ${i === activePage ? config.accent : VD.border}`,
                color: i === activePage ? '#fff' : VD.textMuted,
                fontFamily: VD.mono, fontSize: 8, letterSpacing: 1,
                cursor: 'pointer', borderRadius: VD.radius.sm,
              }}>
                {i + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Right: la rejilla, compartida con MainB. */}
        <RejillaBotones
          botones={pageButtons}
          columnas={gridSize}
          filas={gridRows}
          modo={config.tileMode === 'fill' ? 'fill' : 'square'}
          relleno={20}
          celda={(btn) => (
            <ButtonCell
              key={btn.id}
              button={btn}
              accent={config.accent}
              toggled={toggledIds.has(btn.id)}
              widgetData={datosWidget[btn.id]}
              soundEnabled={soundOnPress}
              soundProfile={soundProfile}
              onEdit={() => {}}
              onExecute={() => executeButton(btn)}
            />
          )}
        />
      </div>

      {/* PIN prompt — set new (kiosk activation) o exit (kiosk deactivation) */}
      <PinKiosko
        modo={pinPrompt}
        setModo={setPinPrompt}
        pinGuardado={storedPin}
        accent={config.accent ?? VD.accent}
        onGuardarPin={onSetKioskPin}
        setKioskActive={setKioskActive}
      />

      {/* Runtime error toast */}
      {runtimeError && (
        <div style={{
          position: 'absolute', top: 40, left: '50%', transform: 'translateX(-50%)',
          zIndex: 50, background: VD.surface, border: `1px solid ${VD.danger}`,
          borderRadius: VD.radius.md, padding: '10px 16px',
          fontFamily: VD.mono, fontSize: 11, color: VD.text,
          maxWidth: 'min(560px, 70%)', boxShadow: VD.shadow.menu,
          display: 'flex', gap: 10, alignItems: 'flex-start',
        }}>
          <span style={{ color: VD.danger, fontSize: 12, flexShrink: 0 }}>!</span>
          <span style={{ flex: 1, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{runtimeError}</span>
          <button
            onClick={() => setRuntimeError(null)}
            style={{ background: 'none', border: 'none', color: VD.textMuted, cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0 }}
          >×</button>
        </div>
      )}

      {/* Bottom: now playing + page indicator. Compact + responsive — hides
          the page block on narrow windows and the artwork on very narrow ones. */}
      <div style={{
        borderTop: `1px solid ${VD.border}`,
        padding: '6px 10px', display: 'flex', gap: 6,
        background: VD.surface, flexShrink: 0, position: 'relative', zIndex: 1,
      }}>
        {/* Now Playing */}
        <SonandoAhora
          nowPlaying={nowPlaying}
          isPlaying={isPlaying}
          sourceName={sourceName}
          config={config}
          soundOnPress={soundOnPress}
          soundProfile={soundProfile}
        />

        {/* Page indicator — drops out on narrow windows via .vd-fs-page CSS rule. */}
        <div className="vd-fs-page" style={{
          width: 86, border: `1px solid ${VD.border}`, padding: '5px 8px',
          background: VD.elevated, flexShrink: 0, display: 'flex', flexDirection: 'column',
          justifyContent: 'center', gap: 2,
        }}>
          <DotLabel size={7} color={VD.textMuted} spacing={2}>{t('full.page')}</DotLabel>
          <div style={{ fontFamily: VD.mono, fontSize: 15, color: VD.text, lineHeight: 1 }}>
            {String(activePage + 1).padStart(2, '0')}/{config.pages.length}
          </div>
          <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {currentPage?.name}
          </div>
        </div>
      </div>
    </div>
  );
}
