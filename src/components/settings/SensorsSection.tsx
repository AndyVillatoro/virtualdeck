import React, { useState } from 'react';
import { VD } from '../../design';
import type { SensorsSettings, SensorsStatus, SensorCategory } from '../../types';
import { SettingLabel, ToggleRow, inputStyleSettings, miniBtnSettings } from './settingHelpers';

const SENSOR_CATEGORIES: Array<{ id: SensorCategory; label: string }> = [
  { id: 'cpu', label: 'CPU' },
  { id: 'gpu', label: 'GPU' },
  { id: 'mainboard', label: 'MAINBOARD' },
  { id: 'memory', label: 'RAM' },
  { id: 'storage', label: 'SSD/HDD' },
  { id: 'other', label: 'OTROS' },
];

export function SensorsSection({
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
  const [registeringAcl, setRegisteringAcl] = useState(false);

  const enabledCats = new Set(config.categories ?? ['cpu', 'gpu', 'mainboard', 'memory', 'storage']);
  const setEnabled = () => onChange({ ...config, enabled: !config.enabled });
  const setHost = (host: string) => onChange({ ...config, host });
  const setPort = (port: number) => onChange({ ...config, port });
  const setSpawn = () => onChange({ ...config, spawnOnStart: !config.spawnOnStart });
  const toggleCategory = (cat: SensorCategory) => {
    const next = new Set(enabledCats);
    if (next.has(cat)) next.delete(cat); else next.add(cat);
    onChange({ ...config, categories: Array.from(next) as SensorCategory[] });
  };

  const startLHM = async () => {
    if (!api?.sensors) return;
    setSpawning(true); setTestResult(null);
    try {
      const r = await api.sensors.spawnLHM(config.lhmPath?.trim() || undefined, !!config.spawnElevated);
      if (!r.ok) { setTestResult(`Falló al iniciar LHM: ${r.error ?? 'desconocido'}`); return; }
      // LHM's web server can take 3–8 s on cold start. Retry up to 12 times.
      await api.sensors.configure({ host: config.host, port: config.port, enabled: true });
      let probe = await api.sensors.probe();
      for (let i = 0; i < 12 && !probe.ok; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        probe = await api.sensors.probe();
      }
      setTestResult(probe.ok
        ? `OK · ${probe.count} sensores`
        : `Web server no responde tras 12s: ${probe.error ?? '?'}. Intentá ejecutar VirtualDeck como administrador.`);
    } finally { setSpawning(false); }
  };

  const stopLHM = async () => {
    if (!api?.sensors) return;
    await api.sensors.killLHM();
    setTestResult(null);
  };

  const registerAcl = async () => {
    if (!api?.sensors) return;
    setRegisteringAcl(true); setTestResult(null);
    try {
      const r = await api.sensors.registerUrlAcl(config.port);
      setTestResult(r.ok
        ? `URL ACL registrado: ${r.url} — LHM ya no necesita admin.`
        : `Falló registro URL ACL: ${r.error ?? '?'}`);
    } finally { setRegisteringAcl(false); }
  };

  const probe = async () => {
    if (!api?.sensors) return;
    setTesting(true); setTestResult(null);
    try {
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
            style={{ ...inputStyleSettings, marginTop: 4 }}
          />
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
              onChange={(e) => setPort(parseInt(e.target.value, 10) || 8085)}
              style={{ ...inputStyleSettings, marginTop: 4 }}
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
          <button onClick={startLHM} disabled={spawning || status?.bundledRunning} style={miniBtnSettings(accent)}>
            {spawning ? 'INICIANDO...' : status?.bundledRunning ? 'LHM ACTIVO' : 'INICIAR LHM'}
          </button>
          {status?.bundledRunning && (
            <button onClick={stopLHM} style={{ ...miniBtnSettings(accent), color: VD.danger, borderColor: VD.danger }}>
              DETENER LHM
            </button>
          )}
          <button onClick={probe} disabled={testing} style={miniBtnSettings(accent)}>
            {testing ? 'PROBANDO...' : 'PROBAR'}
          </button>
          <button
            onClick={registerAcl}
            disabled={registeringAcl}
            title="Registra una reserva URL ACL en Windows (1 sola UAC). Después LHM puede correr sin admin."
            style={miniBtnSettings(accent)}
          >
            {registeringAcl ? 'REGISTRANDO...' : 'REGISTRAR URL ACL'}
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
