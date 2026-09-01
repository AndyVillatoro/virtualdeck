import React, { useCallback, useEffect, useState } from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import type { RemoteSettings } from '../../types';
import { SettingLabel, ToggleRow, estiloEntradaAjustes, estiloBotonMiniAjustes } from './settingHelpers';

/**
 * El servidor local (1.4): mandar sobre el deck por HTTP.
 *
 * Todo aquí se dice tal cual es. Abrir un puerto es una decisión del usuario y
 * lo que se puede hacer con él es ejecutar cualquier acción del deck, scripts
 * incluidos; el aviso de la red local no se maquilla porque **no hay cifrado**:
 * es HTTP plano, y quien esté en esa red con el token puede pulsar botones.
 */
export function RemoteSection({
  accent, config, onChange,
}: {
  accent: string;
  config: RemoteSettings;
  onChange: (next: RemoteSettings) => void;
}) {
  const VD = useTheme();
  const t = useT();
  const inputStyleSettings = estiloEntradaAjustes(VD);
  const miniBtn = (c: string) => estiloBotonMiniAjustes(VD, c);
  const api = window.electronAPI;

  const [estado, setEstado] = useState<{ corriendo: boolean; port: number; lan: string[] } | null>(null);
  const [verToken, setVerToken] = useState(false);

  // El estado real, no el que se pidió: si el puerto está ocupado el servidor
  // no arranca, y sin esto los ajustes seguirían diciendo «activado».
  const refrescar = useCallback(() => {
    api?.remote?.status().then(setEstado).catch(() => {});
  }, [api]);
  useEffect(() => {
    refrescar();
    const id = window.setInterval(refrescar, 3000);
    return () => window.clearInterval(id);
  }, [refrescar]);

  /** Activar por primera vez acuña el token: sin él el servidor no arranca. */
  const alternar = async () => {
    const enabled = !config.enabled;
    const token = config.token || (enabled ? (await api?.remote?.newToken()) ?? '' : '');
    onChange({ ...config, enabled, token });
  };

  const regenerar = async () => {
    const token = await api?.remote?.newToken();
    if (token) onChange({ ...config, token });
  };

  const base = `http://127.0.0.1:${config.port}`;
  const ejemplo = `curl -H "X-VD-Token: ${verToken ? config.token : '•'.repeat(8)}" ${base}/api/buttons`;

  return (
    <div>
      <SettingLabel>{t('set.remote')}</SettingLabel>
      <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <ToggleRow label={t('set.enabled')} value={config.enabled} accent={accent} onClick={alternar} />

        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ width: 80 }}>
            <SettingLabel>{t('ui.port')}</SettingLabel>
            <input
              type="number"
              value={config.port}
              onChange={(e) => onChange({ ...config, port: parseInt(e.target.value, 10) || 8787 })}
              style={{ ...inputStyleSettings, marginTop: 4 }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <SettingLabel>{t('set.remoteToken')}</SettingLabel>
            <input
              readOnly
              value={verToken ? config.token : '•'.repeat(Math.min(32, config.token.length))}
              onClick={() => setVerToken((v) => !v)}
              title={t('set.remoteTokenHint')}
              style={{ ...inputStyleSettings, marginTop: 4, cursor: 'pointer' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button onClick={regenerar} style={miniBtn(accent)}>{t('set.remoteNewToken')}</button>
          <button
            onClick={() => navigator.clipboard.writeText(config.token).catch(() => {})}
            disabled={!config.token}
            style={miniBtn(accent)}
          >{t('set.remoteCopyToken')}</button>
        </div>

        <ToggleRow
          label={t('set.remoteLan')}
          value={config.allowLan}
          accent={accent}
          onClick={() => onChange({ ...config, allowLan: !config.allowLan })}
        />
        {config.allowLan && (
          <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.warning, lineHeight: 1.5 }}>
            {t('set.remoteLanWarn')}
          </div>
        )}

        <div style={{
          fontFamily: VD.mono, fontSize: 8, color: estado?.corriendo ? VD.success : VD.textMuted,
          lineHeight: 1.5,
        }}>
          {estado?.corriendo
            ? t('set.remoteListening', { url: estado.lan.length ? `${estado.lan[0]}:${estado.port}` : `127.0.0.1:${estado.port}` })
            : t('set.remoteStopped')}
        </div>
        <div style={{
          fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, lineHeight: 1.5,
          wordBreak: 'break-all', userSelect: 'text',
        }}>
          {ejemplo}
        </div>
        <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, lineHeight: 1.5 }}>
          {t('set.remoteHint')}
        </div>
      </div>
    </div>
  );
}
