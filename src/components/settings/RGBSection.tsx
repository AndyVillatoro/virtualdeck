import React, { useState } from 'react';
import { VD } from '../../design';
import type { RGBSettings, RGBStatus } from '../../types';
import { SettingLabel, ToggleRow, inputStyleSettings, miniBtnSettings } from './settingHelpers';

export function RGBSection({
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
              style={inputStyleSettings}
            />
            <button onClick={pickPath} style={miniBtnSettings(accent)}>...</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ flex: 1 }}>
            <SettingLabel>HOST</SettingLabel>
            <input
              value={config.host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="127.0.0.1"
              style={{ ...inputStyleSettings, marginTop: 4 }}
            />
          </div>
          <div style={{ width: 70 }}>
            <SettingLabel>PUERTO</SettingLabel>
            <input
              type="number"
              value={config.port}
              onChange={(e) => setPort(parseInt(e.target.value, 10) || 6742)}
              style={{ ...inputStyleSettings, marginTop: 4 }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={testConnect} disabled={testing} style={miniBtnSettings(accent)}>
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
