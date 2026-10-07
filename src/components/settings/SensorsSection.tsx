import React, { useEffect, useState } from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import type { SensorsSettings, SensorsStatus, SensorCategory } from '../../types';
import { SENSORES_POR_DEFECTO } from '../../types';
import { SettingLabel, ToggleRow, estiloEntradaAjustes, estiloBotonMiniAjustes } from './settingHelpers';
import { LINKS } from '../../data/links';
import { DotGlyphIcon } from '../dot480/DotGlyphIcon';
import { Chip } from '../ui/Chip';

// Cuatro de las seis son siglas iguales en los dos idiomas; la sexta no, y
// estaba escrita en espanol: con la aplicacion en ingles salia «OTROS» entre
// CPU, GPU y RAM. Ahora la etiqueta sale del diccionario cuando hay clave.
const SENSOR_CATEGORIES: Array<{ id: SensorCategory; label?: string; clave?: string }> = [
  { id: 'cpu', label: 'CPU' },
  { id: 'gpu', label: 'GPU' },
  { id: 'mainboard', label: 'MAINBOARD' },
  { id: 'memory', label: 'RAM' },
  { id: 'storage', label: 'SSD/HDD' },
  { id: 'other', clave: 'sensors.catOther' },
];

const CAT_GLYPH: Record<SensorCategory, string> = {
  cpu: 'CPU',
  gpu: 'GPU',
  mainboard: 'GEAR',
  memory: 'RAM',
  storage: 'STORAGE',
  other: 'DOTS',
};

/** Ruta del ejecutable de LHM + avisos (falta o detectada en ruta habitual). */
function CampoRutaLHM({ accent, config, rutaDetectada, onChange }: {
  accent: string;
  config: SensorsSettings;
  rutaDetectada: string | null;
  onChange: (next: SensorsSettings) => void;
}) {
  const t = useT();
  const VD = useTheme();
  const inputStyleSettings = estiloEntradaAjustes(VD);
  const sinRuta = !config.lhmPath?.trim();
  return (
    <div>
      <SettingLabel>{t('set.lhmPath')}</SettingLabel>
      <input
        value={config.lhmPath ?? ''}
        onChange={(e) => onChange({ ...config, lhmPath: e.target.value })}
        placeholder="C:\\…\\LibreHardwareMonitor.exe"
        style={{ ...inputStyleSettings, marginTop: 4 }}
      />
      {/* VirtualDeck ya no empaqueta LHM. Sin estas dos frases, quien no lo
          tenga solo ve que los sensores «no funcionan»: el servidor web de
          LHM viene apagado de fábrica y no hay forma de adivinarlo. */}
      {sinRuta && !rutaDetectada && (
        <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, lineHeight: 1.5, marginTop: 5 }}>
          {t('sensors.lhmMissing')}{' '}
          <a
            href={LINKS.lhm}
            onClick={(e) => { e.preventDefault(); window.electronAPI?.launch.url(LINKS.lhm); }}
            style={{ color: accent, cursor: 'pointer' }}
          >{t('sensors.lhmDownload')}</a>
        </div>
      )}
      {rutaDetectada && sinRuta && (
        <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, lineHeight: 1.5, marginTop: 5 }}>
          {t('sensors.lhmFound', { ruta: rutaDetectada })}
        </div>
      )}
    </div>
  );
}

/** Host + puerto del servidor web de LHM. */
function CamposHostPuerto({ config, onChange }: {
  config: SensorsSettings;
  onChange: (next: SensorsSettings) => void;
}) {
  const t = useT();
  const VD = useTheme();
  const inputStyleSettings = estiloEntradaAjustes(VD);
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <div style={{ flex: 1 }}>
        <SettingLabel>HOST</SettingLabel>
        <input
          value={config.host}
          onChange={(e) => onChange({ ...config, host: e.target.value })}
          placeholder={SENSORES_POR_DEFECTO.host}
          style={{ ...inputStyleSettings, marginTop: 4 }}
        />
        {config.host?.trim() === '0.0.0.0' && (
          <div style={{ fontFamily: VD.mono, fontSize: 7, color: VD.warning, marginTop: 3, lineHeight: 1.3 }}>
            {t('sensors.hostHint0000')}
          </div>
        )}
      </div>
      <div style={{ width: 70 }}>
        <SettingLabel>{t('ui.port')}</SettingLabel>
        <input
          type="number"
          value={config.port}
          onChange={(e) => onChange({ ...config, port: parseInt(e.target.value, 10) || SENSORES_POR_DEFECTO.port })}
          style={{ ...inputStyleSettings, marginTop: 4 }}
        />
      </div>
    </div>
  );
}

/** Botones de arrancar/detener/probar LHM + registro del ACL de la URL. */
function FilaBotonesLHM({ accent, status, spawning, testing, registeringAcl, onStart, onStop, onProbe, onAcl }: {
  accent: string;
  status: SensorsStatus | null;
  spawning: boolean;
  testing: boolean;
  registeringAcl: boolean;
  onStart: () => void;
  onStop: () => void;
  onProbe: () => void;
  onAcl: () => void;
}) {
  const t = useT();
  const VD = useTheme();
  const miniBtnSettings = (c: string) => estiloBotonMiniAjustes(VD, c);
  const enMarcha = status?.bundledRunning === true;
  const etiquetaArranque = spawning
    ? 'sensors.lhmStarting'
    : enMarcha ? 'sensors.lhmRunning' : 'sensors.lhmStart';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <button onClick={onStart} disabled={spawning || enMarcha} style={miniBtnSettings(accent)}>
        {t(etiquetaArranque)}
      </button>
      {enMarcha && (
        <button onClick={onStop} style={{ ...miniBtnSettings(accent), color: VD.danger, borderColor: VD.danger }}>
          {t('sensors.lhmStop')}
        </button>
      )}
      <button onClick={onProbe} disabled={testing} style={miniBtnSettings(accent)}>
        {t(testing ? 'sensors.testing' : 'sensors.test')}
      </button>
      <button
        onClick={onAcl}
        disabled={registeringAcl}
        title={t('set.urlAcl')}
        style={miniBtnSettings(accent)}
      >
        {t(registeringAcl ? 'sensors.registering' : 'sensors.registerAcl')}
      </button>
    </div>
  );
}

/** Línea de resultado de la última prueba (o estado de conexión si no hay). */
function LineaEstadoLHM({ testResult, status }: {
  testResult: string | null;
  status: SensorsStatus | null;
}) {
  const t = useT();
  const VD = useTheme();
  const esOk = testResult?.startsWith('OK') === true;
  const texto = testResult ?? (status?.connected
    ? t('sensors.connectedCount', { n: status.count })
    : t(status?.enabled ? 'sensors.enabledNoConn' : 'sensors.disabledDot'));
  return (
    <div style={{ fontFamily: VD.mono, fontSize: 9, minHeight: 14, color: esOk ? VD.success : testResult ? VD.danger : VD.textMuted }}>
      {texto}
    </div>
  );
}

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
  const api = window.electronAPI;
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [spawning, setSpawning] = useState(false);
  // Si LHM esta instalado en una ruta habitual, se dice y no hace falta que
  // el usuario la escriba. Se consulta una vez, al abrir los ajustes.
  const [rutaDetectada, setRutaDetectada] = useState<string | null>(null);
  useEffect(() => {
    let vivo = true;
    window.electronAPI?.sensors.knownPath().then((r) => { if (vivo) setRutaDetectada(r); }).catch(() => {});
    return () => { vivo = false; };
  }, []);
  const [registeringAcl, setRegisteringAcl] = useState(false);

  const enabledCats = new Set(config.categories ?? ['cpu', 'gpu', 'mainboard', 'memory', 'storage']);
  const setEnabled = () => onChange({ ...config, enabled: !config.enabled });
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

        <CampoRutaLHM accent={accent} config={config} rutaDetectada={rutaDetectada} onChange={onChange} />

        <CamposHostPuerto config={config} onChange={onChange} />

        <div>
          <SettingLabel>{t('set.categories')}</SettingLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
            {SENSOR_CATEGORIES.map((c) => {
              const on = enabledCats.has(c.id);
              return (
                <Chip
                  key={c.id}
                  activo={on}
                  onClick={() => toggleCategory(c.id)}
                  accent={accent}
                >
                  <DotGlyphIcon glyph={CAT_GLYPH[c.id]} size={9} color={on ? accent : VD.textMuted} showRecessed />
                  {c.label ?? t(c.clave!)}
                </Chip>
              );
            })}
          </div>
        </div>

        <FilaBotonesLHM
          accent={accent}
          status={status}
          spawning={spawning}
          testing={testing}
          registeringAcl={registeringAcl}
          onStart={startLHM}
          onStop={stopLHM}
          onProbe={probe}
          onAcl={registerAcl}
        />
        <LineaEstadoLHM testResult={testResult} status={status} />
        <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, lineHeight: 1.5 }}>
          {t('sensors.adminHint')}
        </div>
      </div>
    </div>
  );
}
