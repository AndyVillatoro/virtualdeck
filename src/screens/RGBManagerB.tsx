import React, { useCallback, useEffect, useRef, useState } from 'react';
import { VD } from '../design';
import { TitleBar } from '../components/TitleBar';
import { ColorPicker } from '../components/ColorPicker';
import { DotLabel } from '../components/DotLabel';
import type {
  DeckConfig, RGBDeviceInfo, RGBProfile, RGBSettings, RGBStatus, RGBDeviceState,
} from '../types';

const DEFAULT_RGB: RGBSettings = {
  enabled: true,
  host: '127.0.0.1',
  port: 6742,
  autoConnect: true,
  spawnOnStart: false,
  profiles: [],
  zoneSizes: {},
};

// Sugerencias de tamaño cuando el calibrador detecta una zona sin valor guardado.
// Heurística: nombre conocido → cantidad. El usuario puede sobreescribir.
const KNOWN_ZONE_HINTS: Array<{ pattern: RegExp; size: number; note: string }> = [
  { pattern: /uni\s*fan|sl120|sl-?infinity/i, size: 16, note: 'Lian Li UNI Fan SL (16 LEDs por fan)' },
  { pattern: /strimer.*24/i, size: 24, note: 'Strimer Plus 24-pin' },
  { pattern: /strimer.*8/i, size: 8, note: 'Strimer Plus 8-pin' },
  { pattern: /argb.*header|addressable/i, size: 8, note: 'Cabezal ARGB genérico (estimado)' },
];

interface RGBManagerBProps {
  config: DeckConfig;
  onConfigChange: (next: DeckConfig) => void;
  onBack: () => void;
}

export function RGBManagerB({ config, onConfigChange, onBack }: RGBManagerBProps) {
  const api = window.electronAPI;
  const rgbCfg: RGBSettings = config.rgb ?? DEFAULT_RGB;

  const [status, setStatus] = useState<RGBStatus>({
    connected: false, serverRunning: false, deviceCount: 0,
    host: rgbCfg.host, port: rgbCfg.port,
  });
  const [devices, setDevices] = useState<RGBDeviceInfo[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showCalibrator, setShowCalibrator] = useState(false);
  const [pendingSizes, setPendingSizes] = useState<Record<string, Record<string, number>>>({});
  const toastTimer = useRef<number>();

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3500);
  }, []);

  const persistRGB = useCallback((updater: (prev: RGBSettings) => RGBSettings) => {
    onConfigChange({ ...config, rgb: updater(config.rgb ?? DEFAULT_RGB) });
  }, [config, onConfigChange]);

  const refresh = useCallback(async () => {
    if (!api) return;
    const s = await api.rgb.status();
    setStatus(s);
    if (s.connected) {
      const list = await api.rgb.listDevices();
      setDevices(list);
      if (list.length > 0 && (selectedId === null || !list.find((d) => d.id === selectedId))) {
        setSelectedId(list[0].id);
      }
    } else {
      setDevices([]);
      setSelectedId(null);
    }
  }, [api, selectedId]);

  useEffect(() => {
    refresh();
    const off = api?.events.onRGBDevicesChanged(() => { refresh(); });
    return () => { off?.(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConnect = async () => {
    if (!api) return;
    setBusy(true);
    try {
      if (rgbCfg.spawnOnStart && rgbCfg.openrgbPath && !status.serverRunning) {
        const r = await api.rgb.spawnServer(rgbCfg.openrgbPath);
        if (!r.ok) showToast(`No se pudo lanzar OpenRGB: ${r.error ?? 'desconocido'}`);
      }
      const s = await api.rgb.connect(rgbCfg.host, rgbCfg.port);
      setStatus(s);
      if (!s.connected) {
        showToast(s.error ? `Conexión falló: ${s.error}` : 'Conexión falló (¿OpenRGB server activo?)');
      }
      await refresh();
    } finally { setBusy(false); }
  };

  const handleDisconnect = async () => {
    if (!api) return;
    setBusy(true);
    try { await api.rgb.disconnect(); } finally {
      await refresh();
      setBusy(false);
    }
  };

  // Aplicar zoneSizes guardados al conectar (resizeZone para cada zona conocida).
  useEffect(() => {
    if (!api || !status.connected || !rgbCfg.zoneSizes) return;
    let cancelled = false;
    (async () => {
      for (const dev of devices) {
        const sizes = rgbCfg.zoneSizes![dev.name];
        if (!sizes) continue;
        for (const z of dev.zones) {
          if (!z.resizable) continue;
          const want = sizes[z.name];
          if (want && want !== z.ledCount && want >= z.ledsMin && want <= z.ledsMax) {
            await api.rgb.resizeZone(dev.id, z.id, want);
            if (cancelled) return;
          }
        }
      }
    })();
    return () => { cancelled = true; };
  // Sólo cuando los devices acaban de cargarse — no en cada render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.connected, devices.length]);

  const selected = devices.find((d) => d.id === selectedId) ?? null;

  const [deviceColor, setDeviceColorState] = useState('#ffffff');

  const setColor = async (color: string) => {
    if (!api || !selected) return;
    setDeviceColorState(color);
    await api.rgb.setDeviceColor(selected.id, color);
    await refresh();
  };

  const setMode = async (modeName: string, currentColor?: string, speed?: number) => {
    if (!api || !selected) return;
    // Pass the current color for modes that accept user input (colorMode != 0/3)
    const modeInfo = selected.modes.find((m) => m.name === modeName);
    const colorToPass = (modeInfo && modeInfo.colorMode !== 0 && modeInfo.colorMode !== 3)
      ? (currentColor ?? deviceColor)
      : undefined;
    await api.rgb.setMode(selected.id, modeName, colorToPass, undefined, speed);
    await refresh();
  };

  const setZoneColor = async (zoneId: number, color: string) => {
    if (!api || !selected) return;
    const z = selected.zones.find((zz) => zz.id === zoneId);
    if (!z) return;
    const arr = new Array(Math.max(1, z.ledCount)).fill(color);
    await api.rgb.setZoneColors(selected.id, zoneId, arr);
    await refresh();
  };

  const setSingleLedHandler = async (globalIdx: number, hex: string) => {
    if (!api || !selected) return;
    await api.rgb.setSingleLed(selected.id, globalIdx, hex);
  };

  const allOff = async () => {
    if (!api) return;
    setBusy(true);
    try {
      for (const d of devices) await api.rgb.setDeviceColor(d.id, '#000000');
      await refresh();
    } finally { setBusy(false); }
  };

  const allColor = async (hex: string) => {
    if (!api) return;
    setBusy(true);
    try {
      for (const d of devices) await api.rgb.setDeviceColor(d.id, hex);
      await refresh();
    } finally { setBusy(false); }
  };

  // ── Perfiles RGB ──────────────────────────────────────────────────────────
  const captureCurrentAsProfile = (name: string): RGBProfile => {
    const devs: Record<string, RGBDeviceState> = {};
    for (const d of devices) {
      const activeMode = d.modes.find((m) => m.id === d.activeMode);
      // Capturar colores por zona usando el slice del array global de colores.
      const zones: RGBDeviceState['zones'] = [];
      let cursor = 0;
      for (const z of d.zones) {
        const count = z.ledCount;
        zones.push({
          zoneId: z.id, zoneName: z.name,
          colors: d.colors.slice(cursor, cursor + count),
        });
        cursor += count;
      }
      devs[d.name] = {
        mode: activeMode?.name ?? 'Direct',
        zones,
      };
    }
    return { id: `rgb_${Date.now()}`, name, devices: devs };
  };

  const saveProfile = (name: string) => {
    const prof = captureCurrentAsProfile(name);
    persistRGB((prev) => ({ ...prev, profiles: [...prev.profiles, prof] }));
    showToast(`Perfil "${name}" guardado.`);
  };

  const applyProfile = async (id: string) => {
    if (!api) return;
    const prof = rgbCfg.profiles.find((p) => p.id === id);
    if (!prof) return;
    setBusy(true);
    try {
      const ok = await api.rgb.applyProfile(prof);
      if (!ok) showToast('Algunos dispositivos no aceptaron el perfil.');
      await refresh();
    } finally { setBusy(false); }
  };

  const deleteProfile = (id: string) => {
    persistRGB((prev) => ({ ...prev, profiles: prev.profiles.filter((p) => p.id !== id) }));
  };

  // ── Calibrador ────────────────────────────────────────────────────────────
  const resizableZones = devices.flatMap((d) =>
    d.zones.filter((z) => z.resizable).map((z) => ({ device: d, zone: z })),
  );
  const uncalibratedCount = resizableZones.filter(({ device, zone }) => {
    const saved = rgbCfg.zoneSizes?.[device.name]?.[zone.name];
    return !saved;
  }).length;

  const identifyLed = async (deviceId: number, zoneId: number, ledIdx: number, ledCount: number) => {
    if (!api) return;
    // Apaga toda la zona y enciende solo el LED N en blanco.
    const arr = new Array(ledCount).fill('#000000');
    if (ledIdx < arr.length) arr[ledIdx] = '#ffffff';
    await api.rgb.setZoneColors(deviceId, zoneId, arr);
  };

  const sweepZone = async (deviceId: number, zoneId: number, maxLeds: number) => {
    if (!api) return;
    for (let i = 0; i < maxLeds; i++) {
      await identifyLed(deviceId, zoneId, i, maxLeds);
      await new Promise((r) => setTimeout(r, 220));
    }
    // Apagar al final
    await api.rgb.setZoneColors(deviceId, zoneId, new Array(maxLeds).fill('#000000'));
  };

  const commitZoneSize = async (deviceName: string, deviceId: number, zoneId: number, zoneName: string, size: number) => {
    if (!api) return;
    const ok = await api.rgb.resizeZone(deviceId, zoneId, size);
    if (!ok) { showToast('No se pudo redimensionar la zona.'); return; }
    persistRGB((prev) => ({
      ...prev,
      zoneSizes: {
        ...(prev.zoneSizes ?? {}),
        [deviceName]: { ...(prev.zoneSizes?.[deviceName] ?? {}), [zoneName]: size },
      },
    }));
    await refresh();
  };

  const accent = config.accent;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      width: '100vw', height: '100vh', overflow: 'hidden',
      background: VD.bg, color: VD.text, fontFamily: VD.font,
      display: 'flex', flexDirection: 'column',
    }}>
      <TitleBar accent={accent} pageName="RGB MANAGER" showControls={false} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: `1px solid ${VD.border}`, background: VD.surface, flexShrink: 0 }}>
        <button onClick={onBack} style={btnSecondary}>← VOLVER</button>
        <div style={{ flex: 1 }} />
        <StatusBadge status={status} accent={accent} />
        {status.connected ? (
          <button onClick={handleDisconnect} disabled={busy} style={btnSecondary}>DESCONECTAR</button>
        ) : (
          <button onClick={handleConnect} disabled={busy} style={{ ...btnPrimary, borderColor: accent, color: accent }}>CONECTAR</button>
        )}
        <button onClick={refresh} disabled={busy || !status.connected} style={btnSecondary} title="Reescanear devices">↻</button>
      </div>

      {!status.connected && (
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${VD.border}`, fontFamily: VD.mono, fontSize: 10, color: VD.textDim, lineHeight: 1.6 }}>
          <div style={{ color: VD.text, letterSpacing: 1, marginBottom: 6, fontSize: 11 }}>NO CONECTADO</div>
          {!rgbCfg.openrgbPath && (
            <div style={{ marginBottom: 4 }}>
              · Configura la ruta de <strong>OpenRGB.exe</strong> en el flyout de ajustes (icono ⚙ en pantalla principal → sección RGB).
            </div>
          )}
          <div>· Asegúrate que el server SDK esté activo (puerto {rgbCfg.port}). VirtualDeck arranca OpenRGB en modo <code>--server</code>, sin GUI, así no aparece el diálogo de tamaño de zonas.</div>
          {status.error && (
            <div style={{ marginTop: 6, color: VD.danger }}>Último error: {status.error}</div>
          )}
        </div>
      )}

      {status.connected && uncalibratedCount > 0 && (
        <div style={{
          padding: '10px 16px', borderBottom: `1px solid ${VD.border}`, background: 'rgba(212,162,52,0.08)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontFamily: VD.mono, fontSize: 10, color: VD.warning, letterSpacing: 1 }}>⚠ CALIBRACIÓN PENDIENTE</span>
          <span style={{ fontFamily: VD.mono, fontSize: 10, color: VD.textDim }}>
            {uncalibratedCount} {uncalibratedCount === 1 ? 'zona ARGB' : 'zonas ARGB'} sin tamaño guardado.
          </span>
          <div style={{ flex: 1 }} />
          <button onClick={() => setShowCalibrator(true)} style={{ ...btnPrimary, borderColor: VD.warning, color: VD.warning }}>
            CALIBRAR
          </button>
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* Device list */}
        <div style={{ width: 240, borderRight: `1px solid ${VD.border}`, background: VD.surface, padding: 10, overflowY: 'auto', flexShrink: 0 }}>
          <DotLabel size={9} color={VD.textMuted} spacing={2} style={{ display: 'block', marginBottom: 8 }}>DISPOSITIVOS</DotLabel>
          {devices.length === 0 && (
            <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, padding: '8px 0' }}>
              {status.connected ? 'Ningún dispositivo detectado.' : 'Conecta para ver dispositivos.'}
            </div>
          )}
          {devices.map((d) => (
            <div
              key={d.id}
              onClick={() => setSelectedId(d.id)}
              style={{
                padding: '8px 10px', marginBottom: 4, cursor: 'pointer',
                background: selectedId === d.id ? VD.accentBg : VD.elevated,
                border: `1px solid ${selectedId === d.id ? accent : VD.border}`,
                borderRadius: VD.radius.md,
              }}
            >
              <div style={{ fontFamily: VD.mono, fontSize: 10, color: VD.text, letterSpacing: 0.5 }}>{d.name}</div>
              <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, marginTop: 3, letterSpacing: 1 }}>
                {d.typeLabel.toUpperCase()} · {d.zones.length} ZONA{d.zones.length === 1 ? '' : 'S'} · {d.colors.length} LEDS
              </div>
            </div>
          ))}

          {status.connected && devices.length > 0 && (
            <div style={{ marginTop: 14, paddingTop: 10, borderTop: `1px solid ${VD.border}` }}>
              <DotLabel size={9} color={VD.textMuted} spacing={2} style={{ display: 'block', marginBottom: 8 }}>ACCIONES RÁPIDAS</DotLabel>
              <button onClick={allOff} disabled={busy} style={{ ...btnSecondary, width: '100%', marginBottom: 4 }}>APAGAR TODO</button>
              <button onClick={() => allColor('#ffffff')} disabled={busy} style={{ ...btnSecondary, width: '100%', marginBottom: 4 }}>BLANCO TOTAL</button>
              <button onClick={() => allColor(accent)} disabled={busy} style={{ ...btnSecondary, width: '100%' }}>COLOR ACENTO</button>
            </div>
          )}
        </div>

        {/* Detail */}
        <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
          {!selected && (
            <div style={{ fontFamily: VD.mono, fontSize: 10, color: VD.textMuted, padding: 20 }}>
              Selecciona un dispositivo a la izquierda.
            </div>
          )}
          {selected && (
            <DeviceDetail
              device={selected}
              accent={accent}
              onSetColor={setColor}
              onSetMode={(modeName, color, speed) => setMode(modeName, color, speed)}
              onSetZoneColor={setZoneColor}
              onSetSingleLed={setSingleLedHandler}
            />
          )}
        </div>

        {/* Profiles */}
        <div style={{ width: 240, borderLeft: `1px solid ${VD.border}`, background: VD.surface, padding: 10, overflowY: 'auto', flexShrink: 0 }}>
          <DotLabel size={9} color={VD.textMuted} spacing={2} style={{ display: 'block', marginBottom: 8 }}>PERFILES RGB</DotLabel>
          <SaveProfileBar onSave={saveProfile} accent={accent} disabled={!status.connected} />
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {rgbCfg.profiles.length === 0 && (
              <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, padding: '4px 0' }}>
                Sin perfiles aún.
              </div>
            )}
            {rgbCfg.profiles.map((p) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: VD.elevated, border: `1px solid ${VD.border}`, borderRadius: VD.radius.md, padding: '5px 8px' }}>
                <span style={{ fontFamily: VD.mono, fontSize: 9, color: VD.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                <button onClick={() => applyProfile(p.id)} disabled={!status.connected} style={{ background: 'none', border: 'none', fontFamily: VD.mono, fontSize: 8, color: accent, cursor: 'pointer', padding: '2px 4px', letterSpacing: 0.5 }}>APLICAR</button>
                <button onClick={() => deleteProfile(p.id)} style={{ background: 'none', border: 'none', color: VD.danger, cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: '0 2px' }}>×</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showCalibrator && (
        <CalibratorModal
          devices={devices}
          rgbCfg={rgbCfg}
          accent={accent}
          pendingSizes={pendingSizes}
          onPendingChange={setPendingSizes}
          onSweep={sweepZone}
          onCommit={commitZoneSize}
          onClose={() => setShowCalibrator(false)}
        />
      )}

      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: VD.surface, border: `1px solid ${VD.borderStrong}`,
          borderRadius: VD.radius.md, padding: '8px 14px',
          fontFamily: VD.mono, fontSize: 10, color: VD.text, letterSpacing: 0.5,
          boxShadow: VD.shadow.menu, zIndex: 300,
        }}>{toast}</div>
      )}
    </div>
  );
}

// ── Subcomponentes ──────────────────────────────────────────────────────────
function StatusBadge({ status, accent }: { status: RGBStatus; accent: string }) {
  const dotColor = status.connected ? VD.success : status.serverRunning ? VD.warning : VD.textMuted;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: VD.mono, fontSize: 10, color: VD.textDim, letterSpacing: 1 }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor }} />
      {status.connected ? `CONECTADO · ${status.deviceCount} DEV` :
       status.serverRunning ? 'SERVIDOR ACTIVO' : 'DESCONECTADO'}
    </div>
  );
}

function DeviceDetail({
  device, accent, onSetColor, onSetMode, onSetZoneColor, onSetSingleLed,
}: {
  device: RGBDeviceInfo;
  accent: string;
  onSetColor: (hex: string) => void;
  onSetMode: (modeName: string, color: string, speed?: number) => void;
  onSetZoneColor: (zoneId: number, hex: string) => void;
  onSetSingleLed: (globalIdx: number, hex: string) => void;
}) {
  const activeMode = device.modes.find((m) => m.id === device.activeMode);
  const [color, setColor] = useState(device.colors[0] ?? '#ffffff');
  const [showLedPainter, setShowLedPainter] = useState(false);
  // Optimistic local colors: updated immediately on LED paint without waiting for API refresh.
  const [localColors, setLocalColors] = useState<string[] | null>(null);
  const displayColors = localColors ?? device.colors;
  // Speed slider state — 0..100 user-facing, applied via onSetMode on commit.
  const [speed, setSpeed] = useState(50);
  const hasSpeed = activeMode?.speedMin !== undefined
    && activeMode.speedMax !== undefined
    && activeMode.speedMin !== activeMode.speedMax;

  // Si cambia el device seleccionado, sincroniza el color local con el primer LED.
  useEffect(() => { setColor(device.colors[0] ?? '#ffffff'); setLocalColors(null); setSpeed(50); }, [device.id]);
  // Reset speed when the active mode changes (different speed range).
  useEffect(() => { setSpeed(50); }, [activeMode?.id]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <div style={{ fontFamily: VD.mono, fontSize: 14, color: VD.text, letterSpacing: 1 }}>{device.name}</div>
        <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, marginTop: 4, letterSpacing: 1 }}>
          {device.typeLabel.toUpperCase()} · {device.vendor || '—'}
          {device.description && device.description !== device.name && ` · ${device.description}`}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16 }}>
        <div>
          <DotLabel size={9} color={VD.textMuted} spacing={2} style={{ display: 'block', marginBottom: 6 }}>COLOR</DotLabel>
          <ColorPicker value={color} onChange={(v) => { setColor(v); onSetColor(v); }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <DotLabel size={9} color={VD.textMuted} spacing={2} style={{ display: 'block', marginBottom: 6 }}>MODO</DotLabel>
            <select
              value={activeMode?.name ?? ''}
              onChange={(e) => onSetMode(e.target.value, color)}
              style={selectStyle}
            >
              {device.modes.map((m) => (
                <option key={m.id} value={m.name}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Speed slider — only visible when the active mode reports a speed range.
              Commit on `change` (mouse-up) so we don't flood the SDK while dragging. */}
          {hasSpeed && activeMode && (
            <div>
              <DotLabel size={9} color={VD.textMuted} spacing={2} style={{ display: 'block', marginBottom: 6 }}>
                VELOCIDAD · {speed}%
              </DotLabel>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={speed}
                onChange={(e) => setSpeed(parseInt(e.target.value, 10))}
                onMouseUp={() => onSetMode(activeMode.name, color, speed)}
                onTouchEnd={() => onSetMode(activeMode.name, color, speed)}
                onKeyUp={() => onSetMode(activeMode.name, color, speed)}
                style={{ width: '100%', accentColor: accent }}
              />
            </div>
          )}

          <div>
            <DotLabel size={9} color={VD.textMuted} spacing={2} style={{ display: 'block', marginBottom: 6 }}>ZONAS</DotLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {device.zones.map((z) => {
                const firstColor = displayColors[zoneStartLed(device, z.id)] ?? '#000000';
                return (
                  <div key={z.id} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: VD.elevated, border: `1px solid ${VD.border}`,
                    borderRadius: VD.radius.md, padding: '6px 8px',
                  }}>
                    <input
                      type="color"
                      value={firstColor}
                      onChange={(e) => onSetZoneColor(z.id, e.target.value)}
                      style={{ width: 26, height: 22, padding: 0, border: 'none', cursor: 'pointer', background: 'transparent' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: VD.mono, fontSize: 10, color: VD.text }}>{z.name}</div>
                      <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, letterSpacing: 1 }}>
                        {z.ledCount} LEDS{z.resizable ? ` · ${z.ledsMin}-${z.ledsMax} REDIM.` : ''}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* LED Painter */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <DotLabel size={9} color={VD.textMuted} spacing={2} style={{ display: 'block' }}>PINTAR LEDs INDIVIDUALES</DotLabel>
              <button
                onClick={() => setShowLedPainter((v) => !v)}
                style={{ background: 'none', border: `1px solid ${VD.border}`, borderRadius: VD.radius.sm, fontFamily: VD.mono, fontSize: 8, color: showLedPainter ? accent : VD.textDim, cursor: 'pointer', padding: '2px 8px', letterSpacing: 0.5 }}
              >
                {showLedPainter ? 'OCULTAR' : 'MOSTRAR'}
              </button>
            </div>
            {showLedPainter && (
              <LedPainter
                device={device}
                displayColors={displayColors}
                color={color}
                accent={accent}
                onPaintLed={(globalIdx, hex) => {
                  const next = [...displayColors];
                  next[globalIdx] = hex;
                  setLocalColors(next);
                  onSetSingleLed(globalIdx, hex);
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function LedPainter({ device, displayColors, color, accent, onPaintLed }: {
  device: RGBDeviceInfo;
  displayColors: string[];
  color: string;
  accent: string;
  onPaintLed: (globalIdx: number, hex: string) => void;
}) {
  const totalLeds = device.colors.length;
  if (totalLeds === 0) {
    return (
      <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, marginTop: 6 }}>
        No hay LEDs reportados para este dispositivo.
      </div>
    );
  }

  const activeMode = device.modes.find((m) => m.id === device.activeMode);
  const isPerLed = activeMode && (activeMode.colorMode === 1 || /^(direct|custom)$/i.test(activeMode.name));

  const dotSize = totalLeds > 80 ? 9 : totalLeds > 40 ? 12 : 16;
  const gap = totalLeds > 80 ? 1 : 2;

  return (
    <div style={{ marginTop: 8 }}>
      {!isPerLed && (
        <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.warning, marginBottom: 6, letterSpacing: 0.5 }}>
          ⚠ El modo actual ({activeMode?.name ?? '?'}) no es per-LED. Cambia a Direct o Custom para que los cambios sean visibles.
        </div>
      )}
      <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, marginBottom: 6, letterSpacing: 0.5 }}>
        {totalLeds} LEDs · Clic = pintar con color seleccionado
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap, maxHeight: 200, overflowY: 'auto' }}>
        {device.zones.map((zone) => {
          const start = zoneStartLed(device, zone.id);
          return (
            <React.Fragment key={zone.id}>
              {Array.from({ length: zone.ledCount }, (_, i) => {
                const globalIdx = start + i;
                const ledColor = displayColors[globalIdx] ?? '#000000';
                return (
                  <div
                    key={globalIdx}
                    onClick={() => onPaintLed(globalIdx, color)}
                    title={`${zone.name} LED ${i} (global ${globalIdx})${device.ledNames[globalIdx] ? ' · ' + device.ledNames[globalIdx] : ''}`}
                    style={{
                      width: dotSize, height: dotSize,
                      background: ledColor,
                      border: `1px solid rgba(255,255,255,0.12)`,
                      borderRadius: 2,
                      cursor: 'crosshair',
                      flexShrink: 0,
                    }}
                  />
                );
              })}
              {/* Zone separator */}
              {zone.id !== device.zones[device.zones.length - 1]?.id && (
                <div style={{ width: 1, height: dotSize, background: VD.borderStrong, flexShrink: 0 }} />
              )}
            </React.Fragment>
          );
        })}
      </div>
      <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, marginTop: 4, letterSpacing: 0.5 }}>
        {device.zones.map((z, i) => `${z.name}(${z.ledCount})`).join(' | ')}
      </div>
    </div>
  );
}

function zoneStartLed(device: RGBDeviceInfo, zoneId: number): number {
  let cursor = 0;
  for (const z of device.zones) {
    if (z.id === zoneId) return cursor;
    cursor += z.ledCount;
  }
  return 0;
}

function SaveProfileBar({ onSave, accent, disabled }: { onSave: (name: string) => void; accent: string; disabled?: boolean }) {
  const [name, setName] = useState('');
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) { onSave(name.trim()); setName(''); } }}
        placeholder="Nuevo perfil..."
        disabled={disabled}
        style={{
          flex: 1, background: VD.elevated, border: `1px solid ${VD.border}`,
          padding: '5px 8px', color: VD.text, fontFamily: VD.mono, fontSize: 9,
          outline: 'none', borderRadius: VD.radius.sm,
        }}
      />
      <button
        onClick={() => { if (name.trim()) { onSave(name.trim()); setName(''); } }}
        disabled={disabled}
        style={{
          padding: '5px 10px', background: VD.accentBg, border: `1px solid ${accent}`,
          fontFamily: VD.mono, fontSize: 8, color: accent, cursor: 'pointer',
          borderRadius: VD.radius.sm, letterSpacing: 1,
        }}
      >GUARDAR</button>
    </div>
  );
}

// Modal calibrador
function CalibratorModal({
  devices, rgbCfg, accent, pendingSizes, onPendingChange, onSweep, onCommit, onClose,
}: {
  devices: RGBDeviceInfo[];
  rgbCfg: RGBSettings;
  accent: string;
  pendingSizes: Record<string, Record<string, number>>;
  onPendingChange: (next: Record<string, Record<string, number>>) => void;
  onSweep: (deviceId: number, zoneId: number, maxLeds: number) => Promise<void>;
  onCommit: (deviceName: string, deviceId: number, zoneId: number, zoneName: string, size: number) => Promise<void>;
  onClose: () => void;
}) {
  const targets = devices.flatMap((d) =>
    d.zones.filter((z) => z.resizable).map((z) => ({ device: d, zone: z })),
  );

  const setPending = (devName: string, zoneName: string, size: number) => {
    onPendingChange({
      ...pendingSizes,
      [devName]: { ...(pendingSizes[devName] ?? {}), [zoneName]: size },
    });
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={modalStyle}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: `1px solid ${VD.border}` }}>
          <div style={{ fontFamily: VD.mono, fontSize: 12, color: VD.text, letterSpacing: 2 }}>CALIBRADOR DE ZONAS ARGB</div>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: VD.textDim, cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>
        <div style={{ padding: 14, maxHeight: '70vh', overflowY: 'auto' }}>
          <div style={{ fontFamily: VD.mono, fontSize: 10, color: VD.textDim, lineHeight: 1.6, marginBottom: 14 }}>
            Para cada zona redimensionable: presiona <strong>IDENTIFICAR</strong> para que un LED se encienda en blanco recorriendo toda la cadena. Cuenta cuántos LEDs viste y guarda ese número. Esto sustituye al diálogo de OpenRGB y persiste en la config local.
          </div>

          {targets.length === 0 && (
            <div style={{ fontFamily: VD.mono, fontSize: 10, color: VD.textMuted }}>No hay zonas redimensionables detectadas.</div>
          )}

          {targets.map(({ device, zone }) => {
            const saved = rgbCfg.zoneSizes?.[device.name]?.[zone.name];
            const pending = pendingSizes[device.name]?.[zone.name];
            const value = pending ?? saved ?? zone.ledCount;
            const hint = KNOWN_ZONE_HINTS.find((h) => h.pattern.test(zone.name) || h.pattern.test(device.name));
            return (
              <div key={`${device.id}-${zone.id}`} style={{
                background: VD.elevated, border: `1px solid ${VD.border}`, borderRadius: VD.radius.md,
                padding: 12, marginBottom: 10,
              }}>
                <div style={{ fontFamily: VD.mono, fontSize: 11, color: VD.text }}>{device.name} → {zone.name}</div>
                <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, marginTop: 3, letterSpacing: 1 }}>
                  RANGO {zone.ledsMin}–{zone.ledsMax} · ACTUAL {zone.ledCount}{saved ? ` · GUARDADO ${saved}` : ''}
                </div>
                {hint && (
                  <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.warning, marginTop: 4 }}>
                    ◆ Sugerencia: {hint.note}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
                  <input
                    type="range"
                    min={zone.ledsMin}
                    max={zone.ledsMax}
                    value={value}
                    onChange={(e) => setPending(device.name, zone.name, parseInt(e.target.value, 10))}
                    style={{ flex: 1 }}
                  />
                  <input
                    type="number"
                    min={zone.ledsMin}
                    max={zone.ledsMax}
                    value={value}
                    onChange={(e) => {
                      const n = Math.max(zone.ledsMin, Math.min(zone.ledsMax, parseInt(e.target.value, 10) || zone.ledsMin));
                      setPending(device.name, zone.name, n);
                    }}
                    style={{
                      width: 60, background: VD.bg, border: `1px solid ${VD.border}`,
                      color: VD.text, fontFamily: VD.mono, fontSize: 10, padding: '3px 6px',
                      borderRadius: VD.radius.sm, outline: 'none', textAlign: 'center',
                    }}
                  />
                  <button
                    onClick={() => onSweep(device.id, zone.id, value)}
                    style={{ ...btnSecondary, borderColor: accent, color: accent }}
                  >IDENTIFICAR</button>
                  <button
                    onClick={() => onCommit(device.name, device.id, zone.id, zone.name, value)}
                    style={{ ...btnPrimary, background: accent, color: '#000', borderColor: accent }}
                  >GUARDAR</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Estilos compartidos ─────────────────────────────────────────────────────
const btnPrimary: React.CSSProperties = {
  padding: '6px 12px', fontFamily: VD.mono, fontSize: 9, letterSpacing: 1,
  background: 'transparent', border: `1px solid ${VD.borderStrong}`,
  color: VD.text, cursor: 'pointer', borderRadius: VD.radius.sm,
};
const btnSecondary: React.CSSProperties = {
  padding: '5px 10px', fontFamily: VD.mono, fontSize: 9, letterSpacing: 1,
  background: VD.elevated, border: `1px solid ${VD.border}`,
  color: VD.textDim, cursor: 'pointer', borderRadius: VD.radius.sm,
};
const selectStyle: React.CSSProperties = {
  width: '100%', padding: '5px 8px',
  background: VD.elevated, border: `1px solid ${VD.border}`,
  color: VD.text, fontFamily: VD.mono, fontSize: 10,
  outline: 'none', borderRadius: VD.radius.sm,
};
const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500,
};
const modalStyle: React.CSSProperties = {
  width: 'min(700px, 92vw)', maxHeight: '85vh',
  background: VD.surface, border: `1px solid ${VD.borderStrong}`,
  borderRadius: VD.radius.lg, boxShadow: VD.shadow.modal,
  display: 'flex', flexDirection: 'column', overflow: 'hidden',
};
