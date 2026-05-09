import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IconMediaSkipBack, IconMediaPlay, IconMediaPause, IconMediaSkipForward } from '../components/VDIcon';
import { VD } from '../design';
import { DotText } from '../components/DotText';
import { DotLabel } from '../components/DotLabel';
import { Wallpaper } from '../components/Wallpaper';
import { ButtonCell } from '../components/ButtonCell';
import { playSound } from '../utils/sound';
import { executeAction, runActionSequence } from '../utils/actions';
import { useNowPlaying } from '../utils/nowPlaying';
import { useSensors } from '../utils/sensors';
import { SensorCard, groupSensorsByHardware } from '../components/SensorPanel';
import type { ButtonConfig, DeckConfig } from '../types';

const FS_DAY_FMT = new Intl.DateTimeFormat('es-HN', { weekday: 'short' });
const FS_DATE_FMT = new Intl.DateTimeFormat('es-HN', { month: 'short', day: 'numeric' });


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
  const [now, setNow] = useState(new Date());
  const nowPlaying = useNowPlaying();
  const { sensors: sensorList, status: sensorStatus } = useSensors();
  const [activePage, setActivePage] = useState(0);
  const [toggledIds, setToggledIds] = useState<Set<string>>(new Set());
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const errorTimer = useRef<number>();
  const gridWrapperRef = useRef<HTMLDivElement>(null);
  const [gridBox, setGridBox] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  // 5.5 — Modo kiosko: oculta topbar, deshabilita context menu y pide PIN para salir.
  // Activación per-session (no persistida); el PIN sí se guarda para próximos turnos.
  const [kioskActive, setKioskActive] = useState(false);
  const [pinPrompt, setPinPrompt] = useState<null | 'set' | 'exit'>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinShake, setPinShake] = useState(false);
  const storedPin = config.kiosk?.pin ?? '';

  const enterKiosk = () => {
    if (!storedPin) {
      setPinInput('');
      setPinPrompt('set');
    } else {
      setKioskActive(true);
    }
  };
  const requestExitKiosk = () => { setPinInput(''); setPinPrompt('exit'); };

  const submitPin = () => {
    if (pinInput.length !== 4 || !/^\d{4}$/.test(pinInput)) {
      setPinShake(true); setTimeout(() => setPinShake(false), 350); return;
    }
    if (pinPrompt === 'set') {
      onSetKioskPin(pinInput);
      setKioskActive(true); setPinPrompt(null); setPinInput('');
    } else if (pinPrompt === 'exit') {
      if (pinInput === storedPin) {
        setKioskActive(false); setPinPrompt(null); setPinInput('');
      } else {
        setPinShake(true); setTimeout(() => setPinShake(false), 350);
        setPinInput('');
      }
    }
  };

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
        const r = await executeAction(btn.actionToggleOff, api, config.state, config.rgb?.profiles);
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
            return { ok: out.success, output: out.output, error: out.success ? undefined : 'El script terminó con error.' };
          } catch (e) { return { ok: false, error: `Error script: ${(e as Error).message}` }; }
        }
        try {
          const ok = await api.launch.script(script, shell);
          return { ok, error: ok ? undefined : 'El script terminó con error.' };
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
  }, [toggledIds, handleToggle, config.state, config.rgb?.profiles, onStateUpdate]);

  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const dayStr = FS_DAY_FMT.format(now).toUpperCase();
  const dateStr = FS_DATE_FMT.format(now).toUpperCase();

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

  // Same JS-driven grid sizing as MainB. FullscreenB uses gridSize × gridSize
  // (it doesn't expose gridRows separately). Aspect = 1 in 'square' mode.
  useEffect(() => {
    const el = gridWrapperRef.current;
    if (!el) return;
    const compute = () => {
      const W = el.clientWidth, H = el.clientHeight;
      if (W === 0 || H === 0) return;
      if (config.tileMode === 'fill') { setGridBox({ w: W, h: H }); return; }
      const ratio = gridSize / gridRows;
      let w = W, h = W / ratio;
      if (h > H) { h = H; w = H * ratio; }
      setGridBox({ w: Math.floor(w), h: Math.floor(h) });
    };
    compute();
    const observer = new ResizeObserver(compute);
    observer.observe(el);
    return () => observer.disconnect();
  }, [gridSize, gridRows, config.tileMode]);

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
        <span>VIRTUALDECK · MODO PANTALLA COMPLETA</span>
        <div style={{ flex: 1 }} />
        <span>{dayStr} {dateStr}</span>
        <button onClick={enterKiosk} title="Activar modo kiosko (oculta UI, ESC pide PIN)" style={{
          background: 'transparent', border: `1px solid ${VD.border}`,
          color: VD.textDim, fontFamily: VD.mono, fontSize: 9,
          letterSpacing: 1, padding: '3px 8px', cursor: 'pointer',
          marginRight: 4,
        }}>
          🔒 KIOSKO
        </button>
        <button onClick={onExit} style={{
          background: 'transparent', border: `1px solid ${VD.border}`,
          color: VD.textDim, fontFamily: VD.mono, fontSize: 9,
          letterSpacing: 1, padding: '3px 8px', cursor: 'pointer',
        }}>
          SALIR ⤡
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
            <DotLabel size={8} color={VD.textMuted} spacing={2} style={{ marginBottom: 8, display: 'block' }}>HORA LOCAL</DotLabel>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <DotText text={hours} dotSize={7} gap={2} color={VD.text} />
              <DotText text={minutes} dotSize={7} gap={2} color={VD.textDim} />
            </div>
          </div>

          {/* Sensor cards — fills the space between clock and page selector. */}
          {(config.sensors?.showWidget ?? true) && (
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <DotLabel size={8} color={VD.textMuted} spacing={2}>SENSORES</DotLabel>
              <span style={{
                fontFamily: VD.mono, fontSize: 7, letterSpacing: 1,
                color: sensorStatus?.connected ? VD.success : sensorStatus?.enabled ? VD.warning : VD.textMuted,
              }}>
                {sensorStatus?.connected ? '● LHM' : sensorStatus?.enabled ? '○ OFFLINE' : '○ DISABLED'}
              </span>
            </div>
            {sensorGroups.length === 0 ? (
              <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, padding: '8px 0' }}>
                {sensorStatus?.enabled ? 'Sin datos. Verifica que LibreHardwareMonitor esté corriendo.' : 'Sensores deshabilitados. Configura LHM en TitleBar.'}
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

        {/* Right: button grid — same two-mode logic as MainB. */}
        <div ref={gridWrapperRef} style={{
          flex: 1, padding: 20, minWidth: 0, minHeight: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
        }}>
          <div style={{
            width: gridBox.w || '100%',
            height: gridBox.h || '100%',
            display: 'grid',
            gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${gridRows}, minmax(0, 1fr))`,
            gap: 8,
          }}>
            {pageButtons.map((btn) => (
              <ButtonCell
                key={btn.id}
                button={btn}
                accent={config.accent}
                toggled={toggledIds.has(btn.id)}
                soundEnabled={soundOnPress}
                soundProfile={soundProfile}
                onEdit={() => {}}
                onExecute={() => executeButton(btn)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* PIN prompt — set new (kiosk activation) o exit (kiosk deactivation) */}
      {pinPrompt && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: VD.surface, border: `1px solid ${VD.borderStrong}`,
            borderRadius: VD.radius.lg, padding: 28, width: 340,
            boxShadow: VD.shadow.modal,
            display: 'flex', flexDirection: 'column', gap: 14,
            transform: pinShake ? 'translateX(-6px)' : 'none',
            transition: 'transform 60ms',
            animation: pinShake ? 'vd-pin-shake 0.32s' : undefined,
          }}>
            <DotLabel size={10} color={VD.text} spacing={2}>
              {pinPrompt === 'set' ? 'ESTABLECER PIN DE 4 DÍGITOS' : 'INGRESA PIN PARA SALIR'}
            </DotLabel>
            <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, letterSpacing: 1 }}>
              {pinPrompt === 'set'
                ? 'Necesario una vez para activar el modo kiosko. Lo guardamos en tu config.'
                : 'Modo kiosko activo. ESC desactiva con PIN.'}
            </div>
            <input
              autoFocus
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitPin();
                if (e.key === 'Escape') { e.preventDefault(); setPinPrompt(null); setPinInput(''); }
              }}
              placeholder="••••"
              style={{
                fontFamily: VD.mono, fontSize: 22, letterSpacing: 12,
                textAlign: 'center', padding: '12px 14px',
                background: VD.elevated, border: `1px solid ${VD.borderStrong}`,
                color: VD.text, outline: 'none', borderRadius: VD.radius.md,
              }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setPinPrompt(null); setPinInput(''); }}
                style={{
                  padding: '8px 14px', background: 'transparent', border: `1px solid ${VD.border}`,
                  color: VD.textDim, fontFamily: VD.mono, fontSize: 9, letterSpacing: 1,
                  cursor: 'pointer', borderRadius: VD.radius.sm,
                }}
              >CANCELAR</button>
              <button
                onClick={submitPin}
                style={{
                  padding: '8px 14px', background: VD.accentBg, border: `1px solid ${config.accent}`,
                  color: config.accent, fontFamily: VD.mono, fontSize: 9, letterSpacing: 1,
                  cursor: 'pointer', borderRadius: VD.radius.sm,
                }}
              >{pinPrompt === 'set' ? 'GUARDAR' : 'CONFIRMAR'}</button>
            </div>
          </div>
        </div>
      )}

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
        <div style={{
          flex: 1, minWidth: 0, border: `1px solid ${VD.border}`,
          padding: '5px 8px', display: 'flex', gap: 8, alignItems: 'center', background: VD.elevated,
        }}>
          <div className="vd-fs-thumb" style={{
            width: 36, height: 36, background: VD.overlay, flexShrink: 0, borderRadius: VD.radius.md,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', border: `1px solid ${VD.border}`, position: 'relative',
          }}>
            <div style={{ opacity: 0.35 }}>
              {isPlaying
                ? <IconMediaPlay size={16} color={VD.textDim} />
                : <IconMediaPause size={16} color={VD.textDim} />
              }
            </div>
            {nowPlaying?.thumbnail && (
              <img
                src={nowPlaying.thumbnail}
                alt=""
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {nowPlaying ? (
              <>
                <div style={{ color: VD.text, fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500, lineHeight: 1.2 }}>
                  {nowPlaying.title || '—'}
                </div>
                <div style={{ color: VD.textDim, fontSize: 9, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: VD.mono, lineHeight: 1.2 }}>
                  {nowPlaying.artist}{sourceName ? ` · ${sourceName}` : ''}
                </div>
              </>
            ) : (
              <div style={{ color: VD.textMuted, fontSize: 10, fontFamily: VD.mono, letterSpacing: 1 }}>SIN REPRODUCCIÓN</div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
            {([
              { key: 'prev',       Icon: IconMediaSkipBack,                          title: 'Anterior'  },
              { key: 'play-pause', Icon: isPlaying ? IconMediaPause : IconMediaPlay, title: 'Play/Pausa' },
              { key: 'next',       Icon: IconMediaSkipForward,                       title: 'Siguiente' },
            ] as const).map(({ key, Icon, title }) => (
              <button
                key={key}
                title={title}
                onClick={() => {
                  window.electronAPI?.media.control(key as 'play-pause' | 'next' | 'prev');
                  if (soundOnPress) playSound(soundProfile);
                }}
                style={{
                  width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: VD.overlay, border: `1px solid ${VD.border}`,
                  cursor: 'pointer', borderRadius: VD.radius.sm, transition: 'border-color 0.1s',
                  padding: 0,
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = config.accent; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = VD.border; }}
              >
                <Icon size={12} color={VD.textDim} />
              </button>
            ))}
          </div>
        </div>

        {/* Page indicator — drops out on narrow windows via .vd-fs-page CSS rule. */}
        <div className="vd-fs-page" style={{
          width: 86, border: `1px solid ${VD.border}`, padding: '5px 8px',
          background: VD.elevated, flexShrink: 0, display: 'flex', flexDirection: 'column',
          justifyContent: 'center', gap: 2,
        }}>
          <DotLabel size={7} color={VD.textMuted} spacing={2}>PÁGINA</DotLabel>
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
