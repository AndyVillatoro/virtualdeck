import React, { useEffect, useRef, useState } from 'react';
import { VD, ACCENT_PRESETS } from '../design';
import { useTheme } from '../utils/theme';
import { SOUND_PROFILES, playSound } from '../utils/sound';
import type { Profile, RGBSettings, RGBStatus, SensorsSettings, SensorsStatus, SoundProfileId } from '../types';

interface TitleBarProps {
  showControls?: boolean;
  pageName?: string;
  accent?: string;
  autostart?: boolean;
  soundOnPress?: boolean;
  soundProfile?: SoundProfileId;
  profiles?: Profile[];
  onFullscreen?: () => void;
  onWallpaper?: () => void;
  onRGB?: () => void;
  onConfigExport?: () => void;
  onConfigImport?: () => void;
  onConfigImportFromUrl?: (url: string) => void;
  onAccentChange?: (color: string) => void;
  onAutostartToggle?: () => void;
  onSoundToggle?: () => void;
  onSoundProfileChange?: (id: SoundProfileId) => void;
  onSaveProfile?: (name: string) => void;
  onLoadProfile?: (id: string) => void;
  onDeleteProfile?: (id: string) => void;
  // RGB integration
  rgbStatus?: RGBStatus | null;
  rgbConfig?: RGBSettings;
  onRGBConfigChange?: (next: RGBSettings) => void;
  // Sensors integration (LibreHardwareMonitor)
  sensorsConfig?: SensorsSettings;
  sensorsStatus?: SensorsStatus | null;
  onSensorsConfigChange?: (next: SensorsSettings) => void;
  // 4.x — UI scale + theme
  uiScale?: number;
  onUiScaleChange?: (scale: number) => void;
  theme?: 'dark' | 'light' | 'system';
  onThemeChange?: (theme: 'dark' | 'light' | 'system') => void;
  tileMode?: 'square' | 'fill';
  onTileModeChange?: (mode: 'square' | 'fill') => void;
}

export function TitleBar({
  showControls = true,
  pageName = '',
  accent,
  autostart = false,
  soundOnPress = true,
  soundProfile = 'click',
  profiles = [],
  onFullscreen,
  onWallpaper,
  onRGB,
  onConfigExport,
  onConfigImport,
  onConfigImportFromUrl,
  onAccentChange,
  onAutostartToggle,
  onSoundToggle,
  onSoundProfileChange,
  onSaveProfile,
  onLoadProfile,
  onDeleteProfile,
  rgbStatus,
  rgbConfig,
  onRGBConfigChange,
  sensorsConfig,
  sensorsStatus,
  onSensorsConfigChange,
  uiScale = 1,
  onUiScaleChange,
  theme = 'dark',
  onThemeChange,
  tileMode = 'square',
  onTileModeChange,
}: TitleBarProps) {
  const VD = useTheme();
  const effectiveAccent = accent ?? VD.accent;
  const [showSettings, setShowSettings] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [galleryUrl, setGalleryUrl] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showSettings) return;
    const close = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowSettings(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [showSettings]);

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <div
        style={{
          height: 36, display: 'flex', alignItems: 'center',
          padding: '0 14px', gap: 10,
          borderBottom: `1px solid ${VD.border}`,
          fontFamily: VD.mono, fontSize: 11, color: VD.textDim,
          background: VD.surface,
          WebkitAppRegion: 'drag',
        } as React.CSSProperties}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: effectiveAccent }} />
          <span style={{ color: VD.text, letterSpacing: 2, fontSize: 10 }}>VIRTUALDECK</span>
        </div>
        {pageName && (
          <>
            <div style={{ width: 1, height: 14, background: VD.border }} />
            <span style={{ fontSize: 10, letterSpacing: 1, color: VD.textMuted }}>{pageName}</span>
          </>
        )}
        <div style={{ flex: 1 }} />

        {showControls && (
          <div style={{ display: 'flex', gap: 4, WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            {onConfigExport && (
              <button onClick={onConfigExport} style={btnStyle} title="Exportar configuración">↗ EXP</button>
            )}
            {onConfigImport && (
              <button onClick={onConfigImport} style={btnStyle} title="Importar configuración">↙ IMP</button>
            )}
            {onWallpaper && (
              <button onClick={onWallpaper} style={btnStyle}>FONDO</button>
            )}
            {onRGB && (
              <button onClick={onRGB} title="Gestor RGB" style={{ ...btnStyle, borderColor: rgbStatus?.connected ? VD.success : VD.border }}>
                <span style={{ marginRight: 4, color: rgbStatus?.connected ? VD.success : VD.textMuted }}>●</span>RGB
              </button>
            )}
            <button
              onClick={() => setShowSettings(v => !v)}
              title="Configuración"
              style={{ ...iconBtnStyle, color: showSettings ? effectiveAccent : VD.textDim }}
            >
              ⚙
            </button>
            {onFullscreen && (
              <button onClick={onFullscreen} title="Modo pantalla completa" style={iconBtnStyle}>⤢</button>
            )}
            <button onClick={() => window.electronAPI?.window.minimize()} title="Minimizar" style={iconBtnStyle}>—</button>
            <button onClick={() => window.electronAPI?.window.close()} title="Cerrar (minimiza a bandeja)" style={{ ...iconBtnStyle, color: VD.danger }}>×</button>
          </div>
        )}
      </div>

      {/* Settings flyout */}
      {showSettings && (
        <div
          ref={panelRef}
          style={{
            position: 'absolute', top: '100%', right: 0, zIndex: 200,
            background: VD.surface, border: `1px solid ${VD.borderStrong}`,
            borderRadius: `0 0 ${VD.radius.lg}px ${VD.radius.lg}px`, padding: 16, width: 260,
            boxShadow: VD.shadow.menu,
            display: 'flex', flexDirection: 'column', gap: 14,
            // Cap height so the panel never spills past the viewport bottom and
            // scroll for the rest. Required since RGB + Sensors + Profiles can
            // exceed window height on small screens.
            maxHeight: 'calc(100vh - 50px)',
            overflowY: 'auto',
          }}
        >
          {/* Accent color */}
          <div>
            <SettingLabel>COLOR DE ACENTO</SettingLabel>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
              <input
                type="color"
                value={effectiveAccent}
                onChange={(e) => onAccentChange?.(e.target.value)}
                style={{ width: 36, height: 28, border: `1px solid ${VD.border}`, cursor: 'pointer', padding: 2, background: 'none', borderRadius: VD.radius.sm }}
              />
              <span style={{ fontFamily: VD.mono, fontSize: 10, color: VD.textDim }}>{effectiveAccent}</span>
              <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
                {ACCENT_PRESETS.map(c => (
                  <div key={c} onClick={() => onAccentChange?.(c)} style={{ width: 14, height: 14, borderRadius: '50%', background: c, cursor: 'pointer', border: c === effectiveAccent ? `2px solid ${VD.text}` : '2px solid transparent' }} />
                ))}
              </div>
            </div>
          </div>

          {/* UI Scale */}
          {onUiScaleChange && (
            <div>
              <SettingLabel>ESCALA DE INTERFAZ</SettingLabel>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
                <button
                  onClick={() => onUiScaleChange(Math.max(0.75, uiScale - 0.25))}
                  style={{ width: 28, height: 28, background: VD.elevated, border: `1px solid ${VD.border}`, color: VD.text, cursor: 'pointer', borderRadius: VD.radius.sm, fontFamily: VD.mono, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >−</button>
                <span style={{ fontFamily: VD.mono, fontSize: 11, color: VD.text, flex: 1, textAlign: 'center', letterSpacing: 1 }}>
                  {Math.round(uiScale * 100)}%
                </span>
                <button
                  onClick={() => onUiScaleChange(Math.min(1.75, uiScale + 0.25))}
                  style={{ width: 28, height: 28, background: VD.elevated, border: `1px solid ${VD.border}`, color: VD.text, cursor: 'pointer', borderRadius: VD.radius.sm, fontFamily: VD.mono, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >+</button>
                {uiScale !== 1 && (
                  <button
                    onClick={() => onUiScaleChange(1)}
                    style={{ padding: '0 8px', height: 28, background: 'none', border: `1px solid ${VD.border}`, color: VD.textMuted, cursor: 'pointer', borderRadius: VD.radius.sm, fontFamily: VD.mono, fontSize: 8, letterSpacing: 1 }}
                  >RESET</button>
                )}
              </div>
              <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, marginTop: 4 }}>Rango: 75% – 175%</div>
            </div>
          )}

          {/* Tile mode — square keeps StreamDeck aesthetic, fill maximizes cell size */}
          {onTileModeChange && (
            <div>
              <SettingLabel>FORMA DE LAS CELDAS</SettingLabel>
              <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                {(['square', 'fill'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => onTileModeChange(m)}
                    style={{
                      flex: 1, padding: '6px 0', cursor: 'pointer', borderRadius: VD.radius.sm,
                      background: tileMode === m ? VD.accentBg : VD.elevated,
                      border: `1px solid ${tileMode === m ? effectiveAccent : VD.border}`,
                      color: tileMode === m ? effectiveAccent : VD.textDim,
                      fontFamily: VD.mono, fontSize: 9, letterSpacing: 1,
                    }}
                  >{m === 'square' ? 'CUADRADAS' : 'LLENAR ÁREA'}</button>
                ))}
              </div>
              <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, marginTop: 4, lineHeight: 1.4 }}>
                {tileMode === 'square'
                  ? 'Celdas siempre cuadradas; deja margen si la ventana no es proporcional a la grilla.'
                  : 'Celdas ocupan toda el área; pueden volverse ligeramente rectangulares.'}
              </div>
            </div>
          )}

          {/* Theme */}
          {onThemeChange && (
            <div>
              <SettingLabel>TEMA</SettingLabel>
              <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                {(['dark', 'light', 'system'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => onThemeChange(t)}
                    style={{
                      flex: 1, padding: '5px 0', cursor: 'pointer', borderRadius: VD.radius.sm,
                      background: theme === t ? VD.accentBg : VD.elevated,
                      border: `1px solid ${theme === t ? effectiveAccent : VD.border}`,
                      fontFamily: VD.mono, fontSize: 8, letterSpacing: 1,
                      color: theme === t ? effectiveAccent : VD.textDim,
                    }}
                  >
                    {t === 'dark' ? 'OSCURO' : t === 'light' ? 'CLARO' : 'SISTEMA'}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ height: 1, background: VD.border }} />

          <ToggleRow label="INICIAR CON WINDOWS" value={autostart} accent={effectiveAccent} onClick={onAutostartToggle} />
          <ToggleRow label="SONIDO AL PRESIONAR" value={soundOnPress} accent={effectiveAccent} onClick={onSoundToggle} />

          {soundOnPress && (
            <div>
              <SettingLabel>TIMBRE</SettingLabel>
              <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                {SOUND_PROFILES.map((p) => {
                  const isActive = p.id === soundProfile;
                  return (
                    <button
                      key={p.id}
                      onClick={() => { onSoundProfileChange?.(p.id); playSound(p.id); }}
                      style={{
                        flex: '1 1 calc(50% - 2px)', padding: '5px 6px',
                        fontFamily: VD.mono, fontSize: 8, letterSpacing: 0.5,
                        background: isActive ? VD.accentBg : VD.elevated,
                        border: `1px solid ${isActive ? effectiveAccent : VD.border}`,
                        color: isActive ? effectiveAccent : VD.textDim,
                        cursor: 'pointer', borderRadius: VD.radius.sm,
                      }}
                    >
                      {p.label.toUpperCase()}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ height: 1, background: VD.border }} />

          {/* 6.1 — Importar perfil desde URL */}
          {onConfigImportFromUrl && (
            <div>
              <SettingLabel>IMPORTAR DESDE URL</SettingLabel>
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <input
                  value={galleryUrl}
                  onChange={(e) => setGalleryUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && galleryUrl.trim()) {
                      onConfigImportFromUrl(galleryUrl.trim());
                      setGalleryUrl('');
                    }
                  }}
                  placeholder="https://...perfil.json"
                  style={{
                    flex: 1, background: VD.elevated, border: `1px solid ${VD.border}`,
                    padding: '5px 8px', color: VD.text, fontFamily: VD.mono, fontSize: 9,
                    outline: 'none', borderRadius: VD.radius.sm,
                  }}
                />
                <button
                  onClick={() => { if (galleryUrl.trim()) { onConfigImportFromUrl(galleryUrl.trim()); setGalleryUrl(''); } }}
                  style={{
                    padding: '5px 10px', background: VD.accentBg, border: `1px solid ${effectiveAccent}`,
                    fontFamily: VD.mono, fontSize: 8, color: effectiveAccent, cursor: 'pointer', borderRadius: VD.radius.sm, letterSpacing: 1,
                  }}
                >IMPORTAR</button>
              </div>
            </div>
          )}

          {onRGBConfigChange && rgbConfig && (
            <>
              <div style={{ height: 1, background: VD.border }} />
              <RGBSection
                accent={effectiveAccent}
                config={rgbConfig}
                status={rgbStatus ?? null}
                onChange={onRGBConfigChange}
              />
            </>
          )}

          {onSensorsConfigChange && sensorsConfig && (
            <>
              <div style={{ height: 1, background: VD.border }} />
              <SensorsSection
                accent={effectiveAccent}
                config={sensorsConfig}
                status={sensorsStatus ?? null}
                onChange={onSensorsConfigChange}
              />
            </>
          )}

          <div style={{ height: 1, background: VD.border }} />

          {/* Profiles */}
          <div>
            <SettingLabel>PERFILES</SettingLabel>
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <input
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newProfileName.trim()) {
                    onSaveProfile?.(newProfileName.trim());
                    setNewProfileName('');
                  }
                }}
                placeholder="Nombre del perfil..."
                style={{
                  flex: 1, background: VD.elevated, border: `1px solid ${VD.border}`,
                  padding: '5px 8px', color: VD.text, fontFamily: VD.mono, fontSize: 9,
                  outline: 'none', borderRadius: VD.radius.sm,
                }}
              />
              <button
                onClick={() => { if (newProfileName.trim()) { onSaveProfile?.(newProfileName.trim()); setNewProfileName(''); } }}
                style={{
                  padding: '5px 10px', background: VD.accentBg, border: `1px solid ${effectiveAccent}`,
                  fontFamily: VD.mono, fontSize: 8, color: effectiveAccent, cursor: 'pointer', borderRadius: VD.radius.sm, letterSpacing: 1,
                }}
              >
                GUARDAR
              </button>
            </div>
            {profiles.length > 0 && (
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 130, overflowY: 'auto' }}>
                {profiles.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: VD.elevated, border: `1px solid ${VD.border}`, borderRadius: VD.radius.md, padding: '5px 8px' }}>
                    <span style={{ fontFamily: VD.mono, fontSize: 9, color: VD.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                    <button onClick={() => { onLoadProfile?.(p.id); setShowSettings(false); }} style={{ background: 'none', border: 'none', fontFamily: VD.mono, fontSize: 8, color: effectiveAccent, cursor: 'pointer', padding: '2px 4px', letterSpacing: 0.5 }}>CARGAR</button>
                    <button onClick={() => onDeleteProfile?.(p.id)} style={{ background: 'none', border: 'none', color: VD.danger, cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: '0 2px' }}>×</button>
                  </div>
                ))}
              </div>
            )}
            {profiles.length === 0 && (
              <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, marginTop: 6 }}>
                Sin perfiles guardados.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RGBSection({
  accent, config, status, onChange,
}: {
  accent: string;
  config: RGBSettings;
  status: RGBStatus | null;
  onChange: (next: RGBSettings) => void;
}) {
  const api = window.electronAPI;
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const setEnabled = () => onChange({ ...config, enabled: !config.enabled });
  const setSpawn = () => onChange({ ...config, spawnOnStart: !config.spawnOnStart });
  const setAuto = () => onChange({ ...config, autoConnect: !config.autoConnect });
  const setHost = (host: string) => onChange({ ...config, host });
  const setPort = (port: number) => onChange({ ...config, port });

  const pickPath = async () => {
    const path = await api?.rgb.pickFile();
    if (path) onChange({ ...config, openrgbPath: path });
  };

  const testConnect = async () => {
    if (!api) return;
    setTesting(true); setTestResult(null);
    try {
      if (config.spawnOnStart && config.openrgbPath && !status?.serverRunning) {
        const r = await api.rgb.spawnServer(config.openrgbPath);
        if (!r.ok) { setTestResult(`Spawn falló: ${r.error}`); return; }
      }
      const s = await api.rgb.connect(config.host, config.port);
      setTestResult(s.connected ? `OK · ${s.deviceCount} dispositivos` : `Falló: ${s.error ?? 'sin server'}`);
    } finally { setTesting(false); }
  };

  return (
    <div>
      <SettingLabel>RGB (OPENRGB)</SettingLabel>
      <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <ToggleRow label="HABILITADO" value={config.enabled} accent={accent} onClick={setEnabled} />
        <ToggleRow label="LANZAR OPENRGB AL ARRANCAR" value={config.spawnOnStart} accent={accent} onClick={setSpawn} />
        <ToggleRow label="AUTOCONECTAR" value={config.autoConnect} accent={accent} onClick={setAuto} />

        <div>
          <SettingLabel>RUTA OPENRGB.EXE</SettingLabel>
          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
            <input
              value={config.openrgbPath ?? ''}
              onChange={(e) => onChange({ ...config, openrgbPath: e.target.value })}
              placeholder="C:\\Program Files\\OpenRGB\\OpenRGB.exe"
              style={inputStyleRGB}
            />
            <button onClick={pickPath} style={miniBtnRGB(accent)}>...</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ flex: 1 }}>
            <SettingLabel>HOST</SettingLabel>
            <input
              value={config.host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="127.0.0.1"
              style={{ ...inputStyleRGB, marginTop: 4 }}
            />
          </div>
          <div style={{ width: 70 }}>
            <SettingLabel>PUERTO</SettingLabel>
            <input
              type="number"
              value={config.port}
              onChange={(e) => setPort(parseInt(e.target.value, 10) || 6742)}
              style={{ ...inputStyleRGB, marginTop: 4 }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={testConnect} disabled={testing} style={miniBtnRGB(accent)}>
            {testing ? 'PROBANDO...' : 'PROBAR CONEXIÓN'}
          </button>
          {testResult && (
            <span style={{ fontFamily: VD.mono, fontSize: 9, color: testResult.startsWith('OK') ? VD.success : VD.danger }}>
              {testResult}
            </span>
          )}
          {!testResult && status && (
            <span style={{ fontFamily: VD.mono, fontSize: 9, color: status.connected ? VD.success : VD.textMuted }}>
              {status.connected ? `● ${status.deviceCount} dev` : '○ desconectado'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

const inputStyleRGB: React.CSSProperties = {
  flex: 1, width: '100%', boxSizing: 'border-box',
  background: VD.elevated, border: `1px solid ${VD.border}`,
  padding: '5px 8px', color: VD.text, fontFamily: VD.mono, fontSize: 9,
  outline: 'none', borderRadius: VD.radius.sm,
};
const miniBtnRGB = (accent: string): React.CSSProperties => ({
  padding: '5px 10px', background: VD.accentBg, border: `1px solid ${accent}`,
  fontFamily: VD.mono, fontSize: 8, color: accent, cursor: 'pointer',
  borderRadius: VD.radius.sm, letterSpacing: 1,
});

const SENSOR_CATEGORIES: Array<{ id: import('../types').SensorCategory; label: string }> = [
  { id: 'cpu', label: 'CPU' },
  { id: 'gpu', label: 'GPU' },
  { id: 'mainboard', label: 'MAINBOARD' },
  { id: 'memory', label: 'RAM' },
  { id: 'storage', label: 'SSD/HDD' },
  { id: 'other', label: 'OTROS' },
];

function SensorsSection({
  accent, config, status, onChange,
}: {
  accent: string;
  config: SensorsSettings;
  status: SensorsStatus | null;
  onChange: (next: SensorsSettings) => void;
}) {
  const api = window.electronAPI;
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [spawning, setSpawning] = useState(false);

  const enabledCats = new Set(config.categories ?? ['cpu', 'gpu', 'mainboard', 'memory', 'storage']);
  const setEnabled = () => onChange({ ...config, enabled: !config.enabled });
  const setHost = (host: string) => onChange({ ...config, host });
  const setPort = (port: number) => onChange({ ...config, port });
  const setSpawn = () => onChange({ ...config, spawnOnStart: !config.spawnOnStart });
  const toggleCategory = (cat: import('../types').SensorCategory) => {
    const next = new Set(enabledCats);
    if (next.has(cat)) next.delete(cat); else next.add(cat);
    onChange({ ...config, categories: Array.from(next) as import('../types').SensorCategory[] });
  };

  const startLHM = async () => {
    if (!api?.sensors) return;
    setSpawning(true); setTestResult(null);
    try {
      const r = await api.sensors.spawnLHM(config.lhmPath?.trim() || undefined, !!config.spawnElevated);
      if (!r.ok) { setTestResult(`Falló al iniciar LHM: ${r.error ?? 'desconocido'}`); return; }
      // LHM's web server can take 3–8 s on a cold start (loads sensor drivers,
      // reads config, binds HttpListener). Retry up to 12 times across ~12 s.
      await api.sensors.configure({ host: config.host, port: config.port, enabled: true });
      let probe = await api.sensors.probe();
      for (let i = 0; i < 12 && !probe.ok; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        probe = await api.sensors.probe();
      }
      if (probe.ok) {
        setTestResult(`OK · ${probe.count} sensores`);
      } else {
        setTestResult(`Web server no responde tras 12s: ${probe.error ?? '?'}. Intentá ejecutar VirtualDeck como administrador.`);
      }
    } finally { setSpawning(false); }
  };

  const stopLHM = async () => {
    if (!api?.sensors) return;
    await api.sensors.killLHM();
    setTestResult(null);
  };

  const probe = async () => {
    if (!api?.sensors) return;
    setTesting(true); setTestResult(null);
    try {
      // Push current settings before probing so the test matches what the
      // user sees in the inputs (not the value persisted from a previous save).
      await api.sensors.configure({ host: config.host, port: config.port, enabled: true });
      const r = await api.sensors.probe();
      setTestResult(r.ok ? `OK · ${r.count} sensores` : `Falló: ${r.error ?? 'sin respuesta'}`);
    } finally { setTesting(false); }
  };

  return (
    <div>
      <SettingLabel>SENSORES (LIBRE HARDWARE MONITOR)</SettingLabel>
      <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <ToggleRow label="HABILITADO" value={config.enabled} accent={accent} onClick={setEnabled} />
        <ToggleRow label="MOSTRAR WIDGET DE SENSORES" value={config.showWidget ?? true} accent={accent} onClick={() => onChange({ ...config, showWidget: !(config.showWidget ?? true) })} />
        <ToggleRow label="INICIAR LHM CON VIRTUALDECK" value={!!config.spawnOnStart} accent={accent} onClick={setSpawn} />
        <ToggleRow label="INICIAR LHM COMO ADMINISTRADOR (UAC)" value={!!config.spawnElevated} accent={accent} onClick={() => onChange({ ...config, spawnElevated: !config.spawnElevated })} />

        <div>
          <SettingLabel>RUTA LHM (vacío = bundled)</SettingLabel>
          <input
            value={config.lhmPath ?? ''}
            onChange={(e) => onChange({ ...config, lhmPath: e.target.value })}
            placeholder="C:\\…\\LibreHardwareMonitor.exe"
            style={{ ...inputStyleRGB, marginTop: 4 }}
          />
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ flex: 1 }}>
            <SettingLabel>HOST</SettingLabel>
            <input
              value={config.host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="127.0.0.1"
              style={{ ...inputStyleRGB, marginTop: 4 }}
            />
          </div>
          <div style={{ width: 70 }}>
            <SettingLabel>PUERTO</SettingLabel>
            <input
              type="number"
              value={config.port}
              onChange={(e) => setPort(parseInt(e.target.value, 10) || 8085)}
              style={{ ...inputStyleRGB, marginTop: 4 }}
            />
          </div>
        </div>

        <div>
          <SettingLabel>CATEGORÍAS VISIBLES</SettingLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
            {SENSOR_CATEGORIES.map((c) => {
              const on = enabledCats.has(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => toggleCategory(c.id)}
                  style={{
                    padding: '3px 8px',
                    background: on ? VD.accentBg : VD.elevated,
                    border: `1px solid ${on ? accent : VD.border}`,
                    color: on ? accent : VD.textMuted,
                    fontFamily: VD.mono, fontSize: 8, letterSpacing: 1,
                    cursor: 'pointer', borderRadius: VD.radius.sm,
                  }}
                >{c.label}</button>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <button onClick={startLHM} disabled={spawning || status?.bundledRunning} style={miniBtnRGB(accent)}>
            {spawning ? 'INICIANDO...' : status?.bundledRunning ? 'LHM ACTIVO' : 'INICIAR LHM'}
          </button>
          {status?.bundledRunning && (
            <button onClick={stopLHM} style={{ ...miniBtnRGB(accent), color: VD.danger, borderColor: VD.danger }}>
              DETENER LHM
            </button>
          )}
          <button onClick={probe} disabled={testing} style={miniBtnRGB(accent)}>
            {testing ? 'PROBANDO...' : 'PROBAR'}
          </button>
        </div>
        <div style={{ fontFamily: VD.mono, fontSize: 9, minHeight: 14, color: testResult?.startsWith('OK') ? VD.success : testResult ? VD.danger : VD.textMuted }}>
          {testResult ?? (status?.connected ? `● ${status.count} sensores conectado` : status?.enabled ? '○ habilitado · sin conexión' : '○ deshabilitado')}
        </div>

        <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, lineHeight: 1.5 }}>
          LHM viene <strong>bundled</strong> en VirtualDeck. Sensores como CPU/SMBus requieren admin — si faltan datos, lanzá VirtualDeck como administrador.
        </div>
      </div>
    </div>
  );
}

function ToggleRow({ label, value, accent, onClick }: { label: string; value: boolean; accent: string; onClick?: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <SettingLabel>{label}</SettingLabel>
      <div
        onClick={onClick}
        style={{
          width: 36, height: 20, borderRadius: 10, cursor: 'pointer',
          background: value ? accent : VD.elevated,
          border: `1px solid ${value ? accent : VD.border}`,
          position: 'relative', transition: 'background 0.2s', flexShrink: 0,
        }}
      >
        <div style={{
          position: 'absolute', top: 2, left: value ? 17 : 2,
          width: 14, height: 14, borderRadius: '50%', background: VD.text,
          transition: 'left 0.2s',
        }} />
      </div>
    </div>
  );
}

function SettingLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: VD.mono, fontSize: 8, letterSpacing: 2, color: VD.textMuted }}>{children}</div>
  );
}

const btnStyle: React.CSSProperties = {
  height: 22, padding: '0 8px',
  display: 'flex', alignItems: 'center',
  fontSize: 9, letterSpacing: 1, color: VD.textDim,
  background: 'transparent', border: `1px solid ${VD.border}`,
  borderRadius: VD.radius.sm, cursor: 'pointer',
};

const iconBtnStyle: React.CSSProperties = {
  width: 22, height: 22,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 14, color: VD.textDim,
  background: 'transparent', border: 'none', borderRadius: VD.radius.sm, cursor: 'pointer',
};
