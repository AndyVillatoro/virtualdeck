import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { VDTokens } from '../design';
import { useTheme } from '../utils/theme';
import { useT } from '../utils/i18n';
import {
  StatusBadge, DeviceDetail, SaveProfileBar, CalibratorModal, PresetsRapidos,
  estiloBotonPrimario, estiloBotonSecundario,
} from './rgb/piezas';
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


interface RGBManagerBProps {
  config: DeckConfig;
  onConfigChange: (next: DeckConfig) => void;
  onBack: () => void;
}

export function RGBManagerB({ config, onConfigChange, onBack }: RGBManagerBProps) {
  const VD = useTheme();
  const t = useT();
  const btnPrimary = estiloBotonPrimario(VD);
  const btnSecondary = estiloBotonSecundario(VD);
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
        showToast(s.error ? t('rgb.connFailed', { err: s.error }) : t('rgb.connFailedNoServer'));
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
      for (const d of devices) await api.rgb.setDeviceColor(d.id, '#000000', true);
      await refresh();
    } finally { setBusy(false); }
  };

  const allColor = async (hex: string) => {
    if (!api) return;
    setBusy(true);
    try {
      for (const d of devices) await api.rgb.setDeviceColor(d.id, hex, true);
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
        // El brillo tambien: `RGBDeviceState` lo declara y `applyProfile` lo
        // restaura, pero **nadie lo estaba guardando**, asi que siempre llegaba
        // undefined. Se notaba aplicando un preset que baja el brillo y
        // guardandolo como perfil: al volver a aplicarlo, el brillo no volvia.
        brightness: d.brightness,
        zones,
      };
    }
    return { id: `rgb_${Date.now()}`, name, devices: devs };
  };

  /**
   * Aplicar un preset desde el gestor.
   *
   * Tras aplicarlo se recargan los dispositivos: un preset cambia el modo, el
   * color y a veces el brillo, y sin recargar el panel seguiria enseñando el
   * estado de antes — y un perfil guardado justo despues capturaria eso.
   */
  const aplicarPreset = async (id: string) => {
    const api = window.electronAPI;
    if (!api) return;
    const ok = await api.rgb.smartPreset(id);
    if (!ok) { showToast(t('act.err.rgbPreset', { id })); return; }
    await refresh();
  };

  const saveProfile = (name: string) => {
    const prof = captureCurrentAsProfile(name);
    persistRGB((prev) => ({ ...prev, profiles: [...prev.profiles, prof] }));
    showToast(t('rgb.profileSaved', { nombre: name }));
  };

  const applyProfile = async (id: string) => {
    if (!api) return;
    const prof = rgbCfg.profiles.find((p) => p.id === id);
    if (!prof) return;
    setBusy(true);
    try {
      const ok = await api.rgb.applyProfile(prof);
      if (!ok) showToast(t('rgb.profilePartial'));
      await refresh();
    } finally { setBusy(false); }
  };

  const deleteProfile = (id: string) => {
    persistRGB((prev) => ({
      ...prev,
      profiles: prev.profiles.filter((p) => p.id !== id),
      // Si el que se borra era el de arranque, hay que soltar la referencia:
      // si no, al arrancar se busca un perfil que ya no existe.
      startupProfileId: prev.startupProfileId === id ? undefined : prev.startupProfileId,
    }));
  };

  /** Marca (o desmarca) el perfil que se aplica solo al abrir VirtualDeck. */
  const toggleStartupProfile = (id: string) => {
    persistRGB((prev) => ({
      ...prev,
      startupProfileId: prev.startupProfileId === id ? undefined : id,
    }));
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
    if (!ok) { showToast(t('rgb.resizeFailed')); return; }
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
        <button onClick={onBack} style={btnSecondary}>{t('ui.back')}</button>
        <div style={{ flex: 1 }} />
        <StatusBadge status={status} />
        {status.connected ? (
          <button onClick={handleDisconnect} disabled={busy} style={btnSecondary}>{t('rgb.disconnect')}</button>
        ) : (
          <button onClick={handleConnect} disabled={busy} style={{ ...btnPrimary, borderColor: accent, color: accent }}>{t('rgb.connect')}</button>
        )}
        <button onClick={refresh} disabled={busy || !status.connected} style={btnSecondary} title={t('rgb.rescan')}>↻</button>
      </div>

      {!status.connected && (
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${VD.border}`, fontFamily: VD.mono, fontSize: 10, color: VD.textDim, lineHeight: 1.6 }}>
          <div style={{ color: VD.text, letterSpacing: 1, marginBottom: 6, fontSize: 11 }}>{t('rgb.notConnected')}</div>
          {!rgbCfg.openrgbPath && (
            <div style={{ marginBottom: 4 }}>
              {t('rgb.setPath')}
            </div>
          )}
          <div>{t('rgb.serverHint', { port: rgbCfg.port })}</div>
          {status.error && (
            <div style={{ marginTop: 6, color: VD.danger }}>{t('rgb.lastError', { err: status.error })}</div>
          )}
        </div>
      )}

      {status.connected && uncalibratedCount > 0 && (
        <div style={{
          padding: '10px 16px', borderBottom: `1px solid ${VD.border}`, background: 'rgba(212,162,52,0.08)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontFamily: VD.mono, fontSize: 10, color: VD.warning, letterSpacing: 1 }}>{t('rgb.calibPending')}</span>
          <span style={{ fontFamily: VD.mono, fontSize: 10, color: VD.textDim }}>
            {t('rgb.uncalibrated', { n: uncalibratedCount })}
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
          <DotLabel size={9} color={VD.textMuted} spacing={2} style={{ display: 'block', marginBottom: 8 }}>{t('rgb.devices')}</DotLabel>
          {devices.length === 0 && (
            <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, padding: '8px 0' }}>
              {status.connected ? t('rgb.noDevices') : t('rgb.connectToSee')}
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
              <DotLabel size={9} color={VD.textMuted} spacing={2} style={{ display: 'block', marginBottom: 8 }}>{t('rgb.quickActions')}</DotLabel>
              <button onClick={allOff} disabled={busy} style={{ ...btnSecondary, width: '100%', marginBottom: 4 }}>{t('rgb.allOff')}</button>
              <button onClick={() => allColor('#ffffff')} disabled={busy} style={{ ...btnSecondary, width: '100%', marginBottom: 4 }}>{t('rgb.allWhite')}</button>
              <button onClick={() => allColor(accent)} disabled={busy} style={{ ...btnSecondary, width: '100%' }}>{t('rgb.accentColor')}</button>
            </div>
          )}
        </div>

        {/* Detail */}
        <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
          {!selected && (
            <div style={{ fontFamily: VD.mono, fontSize: 10, color: VD.textMuted, padding: 20 }}>
              {t('rgb.pickDevice')}
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
          <PresetsRapidos accent={accent} activo={status.connected} onAplicar={aplicarPreset} />

          <DotLabel size={9} color={VD.textMuted} spacing={2} style={{ display: 'block', marginBottom: 8 }}>{t('rgb.profiles')}</DotLabel>
          <SaveProfileBar onSave={saveProfile} accent={accent} disabled={!status.connected} />
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {rgbCfg.profiles.length > 0 && (
              <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, lineHeight: 1.5, marginBottom: 4 }}>
                {t('rgb.startupHint')}
              </div>
            )}
            {rgbCfg.profiles.length === 0 && (
              <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, padding: '4px 0' }}>
                {t('rgb.noProfiles')}
              </div>
            )}
            {rgbCfg.profiles.map((p) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: VD.elevated, border: `1px solid ${VD.border}`, borderRadius: VD.radius.md, padding: '5px 8px' }}>
                <span style={{ fontFamily: VD.mono, fontSize: 9, color: VD.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                <button
                  onClick={() => toggleStartupProfile(p.id)}
                  title={t(rgbCfg.startupProfileId === p.id ? 'rgb.startupOn' : 'rgb.startupOff')}
                  style={{ background: 'none', border: 'none', fontSize: 11, lineHeight: 1, cursor: 'pointer', padding: '0 2px', color: rgbCfg.startupProfileId === p.id ? accent : VD.textMuted }}
                >{rgbCfg.startupProfileId === p.id ? '◉' : '○'}</button>
                <button onClick={() => applyProfile(p.id)} disabled={!status.connected} style={{ background: 'none', border: 'none', fontFamily: VD.mono, fontSize: 8, color: accent, cursor: 'pointer', padding: '2px 4px', letterSpacing: 0.5 }}>{t('rgb.apply')}</button>
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
