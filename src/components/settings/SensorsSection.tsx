import React, { useState } from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import type { SensorsSettings, SensorsStatus, SensorCategory } from '../../types';
import { SettingLabel, ToggleRow, estiloEntradaAjustes, estiloBotonMiniAjustes } from './settingHelpers';

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
  const t = useT();
  const VD = useTheme();
  const inputStyleSettings = estiloEntradaAjustes(VD);
  const miniBtnSettings = (c: string) => estiloBotonMiniAjustes(VD, c);
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
      if (!r.ok) { setTestResult(t('sensors.lhmFailed', { error: r.error ?? t('sensors.unknown') })); return; }
      // LHM's web server can take 3–8 s on cold start. Retry up to 12 times.
      await api.sensors.configure({ host: config.host, port: config.port, enabled: true });
      let probe = await api.sensors.probe();
      for (let i = 0; i < 12 && !probe.ok; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        probe = await api.sensors.probe();
      }
      setTestResult(probe.ok
        ? t('sensors.okCount', { n: probe.count })
        : t('sensors.noWebServer', { error: probe.error ?? '?' }));
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
        ? t('sensors.aclOk', { url: r.url ?? '' })
        : t('sensors.aclFailed', { error: r.error ?? '?' }));
    } finally { setRegisteringAcl(false); }
  };

  const probe = async () => {
    if (!api?.sensors) return;
    setTesting(true); setTestResult(null);
    try {
      await api.sensors.configure({ host: config.host, port: config.port, enabled: true });
      const r = await api.sensors.probe();
      setTestResult(r.ok
        ? t('sensors.okCount', { n: r.count })
        : t('rgb.connectFailed', { error: r.error ?? t('sensors.noReply') }));
    } finally { setTesting(false); }
  };

  return (
    <div>
      <SettingLabel>{t('set.sensors')}</SettingLabel>
      <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <ToggleRow label={t('set.enabled')} value={config.enabled} accent={accent} onClick={setEnabled} />
        <ToggleRow label={t('set.sensorWidget')} value={config.showWidget ?? true} accent={accent} onClick={() => onChange({ ...config, showWidget: !(config.showWidget ?? true) })} />
        <ToggleRow label={t('set.lhmStart')} value={!!config.spawnOnStart} accent={accent} onClick={setSpawn} />
        <ToggleRow label={t('set.lhmAdmin')} value={!!config.spawnElevated} accent={accent} onClick={() => onChange({ ...config, spawnElevated: !config.spawnElevated })} />

        <div>
          <SettingLabel>{t('set.lhmPath')}</SettingLabel>
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
            <SettingLabel>{t('ui.port')}</SettingLabel>
            <input
              type="number"
              value={config.port}
              onChange={(e) => setPort(parseInt(e.target.value, 10) || 8085)}
              style={{ ...inputStyleSettings, marginTop: 4 }}
            />
          </div>
        </div>

        <div>
          <SettingLabel>{t('set.categories')}</SettingLabel>
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
            {t(spawning ? 'sensors.lhmStarting' : status?.bundledRunning ? 'sensors.lhmRunning' : 'sensors.lhmStart')}
          </button>
          {status?.bundledRunning && (
            <button onClick={stopLHM} style={{ ...miniBtnSettings(accent), color: VD.danger, borderColor: VD.danger }}>
              {t('sensors.lhmStop')}
            </button>
          )}
          <button onClick={probe} disabled={testing} style={miniBtnSettings(accent)}>
            {t(testing ? 'sensors.testing' : 'sensors.test')}
          </button>
          <button
            onClick={registerAcl}
            disabled={registeringAcl}
            title={t('set.urlAcl')}
            style={miniBtnSettings(accent)}
          >
            {t(registeringAcl ? 'sensors.registering' : 'sensors.registerAcl')}
          </button>
        </div>
        <div style={{ fontFamily: VD.mono, fontSize: 9, minHeight: 14, color: testResult?.startsWith('OK') ? VD.success : testResult ? VD.danger : VD.textMuted }}>
          {testResult ?? (status?.connected
            ? t('sensors.connectedCount', { n: status.count })
            : t(status?.enabled ? 'sensors.enabledNoConn' : 'sensors.disabledDot'))}
        </div>
        <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, lineHeight: 1.5 }}>
          {t('sensors.adminHint')}
        </div>
      </div>
    </div>
  );
}
