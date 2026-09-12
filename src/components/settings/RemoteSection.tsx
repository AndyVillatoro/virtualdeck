import React, { useCallback, useEffect, useState } from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import type { RemoteSettings, RemoteStatus, FirewallStatus } from '../../types';
import { SettingLabel, ToggleRow, estiloEntradaAjustes, estiloBotonMiniAjustes } from './settingHelpers';

/**
 * El servidor local (1.4): mandar sobre el deck por HTTP.
 *
 * Todo aquí se dice tal cual es. Abrir un puerto es una decisión del usuario y
 * lo que se puede hacer con él es ejecutar cualquier acción del deck, scripts
 * incluidos; el aviso de la red local no se maquilla porque **no hay cifrado**:
 * es HTTP plano, y quien esté en esa red con el token puede pulsar botones.
 */
function FilaFirewall({
  firewall, port, accent, abriendoFirewall, mensajeFirewall, onAbrir,
}: {
  firewall: FirewallStatus;
  port: number;
  accent: string;
  abriendoFirewall: boolean;
  mensajeFirewall: string | null;
  onAbrir: () => void;
}) {
  const VD = useTheme();
  const t = useT();
  const miniBtn = (c: string) => estiloBotonMiniAjustes(VD, c);

  return (
    <div style={{
      background: VD.elevated, border: `1px solid ${VD.border}`,
      borderRadius: VD.radius.md, padding: '8px 10px',
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: firewall.permitido ? VD.success : VD.warning,
          }} />
          <span style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textDim, letterSpacing: 0.5 }}>
            {t(firewall.permitido ? 'set.remoteFirewallOk' : 'set.remoteFirewallWarn', { port })}
          </span>
        </div>
        {!firewall.permitido && (
          <button
            onClick={onAbrir}
            disabled={abriendoFirewall}
            style={miniBtn(accent)}
          >
            {t(abriendoFirewall ? 'set.remoteFirewallOpening' : 'set.remoteFirewallBtn')}
          </button>
        )}
      </div>
      {mensajeFirewall && (
        <div style={{ fontFamily: VD.mono, fontSize: 8, color: mensajeFirewall.includes('creada') || mensajeFirewall.includes('created') ? VD.success : VD.danger }}>
          {mensajeFirewall}
        </div>
      )}
    </div>
  );
}

function TarjetaConexionMovil({
  urlPrincipal,
  urlMdns,
  copiadoUrl,
  onCopiarUrl,
  codigo,
  caduca,
  ahora,
  onGenerarCodigo,
  corriendo,
  firewall,
  port,
  accent,
  abriendoFirewall,
  mensajeFirewall,
  onAbrirFirewall,
}: {
  urlPrincipal: string;
  urlMdns: string | null;
  copiadoUrl: boolean;
  onCopiarUrl: () => void;
  codigo: string | null;
  caduca: number;
  ahora: number;
  onGenerarCodigo: () => void;
  corriendo: boolean;
  firewall: FirewallStatus | null;
  port: number;
  accent: string;
  abriendoFirewall: boolean;
  mensajeFirewall: string | null;
  onAbrirFirewall: () => void;
}) {
  const VD = useTheme();
  const t = useT();
  const miniBtn = (c: string) => estiloBotonMiniAjustes(VD, c);

  return (
    <div style={{
      background: VD.elevated, border: `1px solid ${VD.border}`,
      borderRadius: VD.radius.md, padding: '12px 14px',
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      {/* Paso 1: Dirección web */}
      <div>
        <div style={{ fontFamily: VD.mono, fontSize: 8, color: accent, fontWeight: 700, letterSpacing: 0.5 }}>
          {t('set.remoteStep1')}
        </div>
        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: VD.mono, fontSize: 13, fontWeight: 700, color: VD.text, userSelect: 'text' }}>
            {urlPrincipal}
          </span>
          <button onClick={onCopiarUrl} style={miniBtn(accent)}>
            {copiadoUrl ? '✓' : t('set.remoteCopyUrl')}
          </button>
        </div>
        {urlMdns && (
          <div style={{ marginTop: 4, fontFamily: VD.mono, fontSize: 7, color: VD.textDim }}>
            {t('set.remoteMdns', { url: urlMdns })}
          </div>
        )}
        <div style={{ marginTop: 4, fontFamily: VD.mono, fontSize: 7, color: VD.textMuted }}>
          {t('set.remoteWifiHint')}
        </div>
      </div>

      {/* Paso 2: Código de vinculación */}
      <div style={{ borderTop: `1px solid ${VD.border}`, paddingTop: 10 }}>
        <div style={{ fontFamily: VD.mono, fontSize: 8, color: accent, fontWeight: 700, letterSpacing: 0.5 }}>
          {t('set.remoteStep2')}
        </div>
        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={onGenerarCodigo}
            disabled={!corriendo}
            style={miniBtn(accent)}
          >
            {t('set.remotePair')}
          </button>
          {codigo && (
            <span style={{ fontFamily: VD.mono, fontSize: 18, fontWeight: 700, letterSpacing: 6, color: accent, userSelect: 'text' }}>
              {codigo}
            </span>
          )}
        </div>
        {codigo && (
          <div style={{ marginTop: 4, fontFamily: VD.mono, fontSize: 7, color: VD.textMuted }}>
            {t('set.remotePairCodeHint', { min: Math.max(0, Math.ceil((caduca - ahora) / 60000)) })}
          </div>
        )}
      </div>

      {/* Firewall de Windows */}
      {firewall?.soportado && (
        <FilaFirewall
          firewall={firewall}
          port={port}
          accent={accent}
          abriendoFirewall={abriendoFirewall}
          mensajeFirewall={mensajeFirewall}
          onAbrir={onAbrirFirewall}
        />
      )}
    </div>
  );
}

function SeccionAvanzadaRemota({
  config,
  onChange,
  accent,
  verToken,
  onToggleVerToken,
  onRegenerarToken,
  estado,
  ipPrincipal,
}: {
  config: RemoteSettings;
  onChange: (next: RemoteSettings) => void;
  accent: string;
  verToken: boolean;
  onToggleVerToken: () => void;
  onRegenerarToken: () => void;
  estado: RemoteStatus | null;
  ipPrincipal: string;
}) {
  const VD = useTheme();
  const t = useT();
  const inputStyleSettings = estiloEntradaAjustes(VD);
  const miniBtn = (c: string) => estiloBotonMiniAjustes(VD, c);
  const [abierto, setAbierto] = useState(false);

  const base = `http://127.0.0.1:${config.port}`;
  const ejemplo = `curl -H "X-VD-Token: ${verToken ? config.token : '•'.repeat(8)}" ${base}/api/buttons`;

  return (
    <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <button
        onClick={() => setAbierto((v) => !v)}
        style={{
          background: 'transparent', border: 'none', color: VD.textDim,
          fontFamily: VD.mono, fontSize: 8, letterSpacing: 0.5,
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          padding: '4px 0',
        }}
      >
        <span>{abierto ? '▼' : '▶'}</span>
        <span>{t('set.remoteAdvanced')}</span>
      </button>

      {abierto && (
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 8,
          paddingLeft: 8, borderLeft: `2px solid ${VD.border}`,
        }}>
          <ToggleRow
            label={t('set.remoteLocalOnly')}
            value={!config.allowLan}
            accent={accent}
            onClick={() => onChange({ ...config, allowLan: !config.allowLan })}
          />
          {config.allowLan && (
            <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.warning, lineHeight: 1.5 }}>
              {t('set.remoteLanWarn')}
            </div>
          )}

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
                onClick={onToggleVerToken}
                title={t('set.remoteTokenHint')}
                style={{ ...inputStyleSettings, marginTop: 4, cursor: 'pointer' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button onClick={onRegenerarToken} style={miniBtn(accent)}>{t('set.remoteNewToken')}</button>
            <button
              onClick={() => navigator.clipboard.writeText(config.token).catch(() => {})}
              disabled={!config.token}
              style={miniBtn(accent)}
            >{t('set.remoteCopyToken')}</button>
          </div>

          <div style={{
            fontFamily: VD.mono, fontSize: 8, color: estado?.corriendo ? VD.success : VD.textMuted,
            lineHeight: 1.5,
          }}>
            {estado?.corriendo
              ? t('set.remoteListening', { url: config.allowLan && estado.lan.length ? `${ipPrincipal}:${estado.port}` : `127.0.0.1:${estado.port}` })
              : t('set.remoteStopped')}
          </div>

          {config.allowLan && (estado?.lan?.length ?? 0) > 1 && (
            <div style={{ fontFamily: VD.mono, fontSize: 7, color: VD.textMuted, letterSpacing: 0.5 }}>
              IPs: {estado?.lan.join(' · ')}
            </div>
          )}

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
      )}
    </div>
  );
}

export function RemoteSection({
  accent, config, onChange,
}: {
  accent: string;
  config: RemoteSettings;
  onChange: (next: RemoteSettings) => void;
}) {
  const t = useT();
  const api = window.electronAPI;

  const [estado, setEstado] = useState<RemoteStatus | null>(null);
  const [verToken, setVerToken] = useState(false);
  const [codigo, setCodigo] = useState<string | null>(null);
  const [caduca, setCaduca] = useState(0);
  const [ahora, setAhora] = useState(Date.now());
  const [copiadoUrl, setCopiadoUrl] = useState(false);
  const [firewall, setFirewall] = useState<FirewallStatus | null>(null);
  const [abriendoFirewall, setAbriendoFirewall] = useState(false);
  const [mensajeFirewall, setMensajeFirewall] = useState<string | null>(null);

  const comprobarFw = useCallback(() => {
    if (!config.allowLan || !api?.remote?.checkFirewall) return;
    api.remote.checkFirewall(config.port).then(setFirewall).catch(() => {});
  }, [api, config.allowLan, config.port]);

  useEffect(() => {
    comprobarFw();
  }, [comprobarFw]);

  const abrirFirewall = async () => {
    if (!api?.remote?.addFirewallRule) return;
    setAbriendoFirewall(true);
    setMensajeFirewall(null);
    try {
      const res = await api.remote.addFirewallRule(config.port);
      if (res.ok) {
        setMensajeFirewall(t('set.remoteFirewallDone'));
        comprobarFw();
      } else {
        setMensajeFirewall(t('set.remoteFirewallFailed', { error: res.error ?? '?' }));
      }
    } finally {
      setAbriendoFirewall(false);
    }
  };

  const refrescar = useCallback(() => {
    api?.remote?.status().then(setEstado).catch(() => {});
  }, [api]);

  useEffect(() => {
    refrescar();
    const id = window.setInterval(refrescar, 3000);
    return () => window.clearInterval(id);
  }, [refrescar]);

  useEffect(() => {
    if (!codigo) return;
    const id = window.setInterval(() => {
      setAhora(Date.now());
      if (Date.now() > caduca) setCodigo(null);
    }, 1000);
    return () => window.clearInterval(id);
  }, [codigo, caduca]);

  const alternar = async () => {
    const enabled = !config.enabled;
    const token = config.token || (enabled ? (await api?.remote?.newToken()) ?? '' : '');
    // Al activar el mando móvil, permitir red local por defecto para que el teléfono conecte directamente
    const allowLan = enabled ? (config.allowLan ?? true) : config.allowLan;
    onChange({ ...config, enabled, token, allowLan });
  };

  const regenerar = async () => {
    const token = await api?.remote?.newToken();
    if (token) onChange({ ...config, token });
  };

  const ipPrincipal = estado?.ipPrincipal ?? estado?.lan?.[0] ?? '127.0.0.1';
  const urlPrincipal = config.allowLan ? `http://${ipPrincipal}:${config.port}` : `http://127.0.0.1:${config.port}`;
  const urlMdns = config.allowLan && estado?.hostname ? `http://${estado.hostname.toLowerCase()}.local:${config.port}` : null;

  return (
    <div>
      <SettingLabel>{t('set.remote')}</SettingLabel>
      <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <ToggleRow label={t('set.enabled')} value={config.enabled} accent={accent} onClick={alternar} />

        {config.enabled && (
          <TarjetaConexionMovil
            urlPrincipal={urlPrincipal}
            urlMdns={urlMdns}
            copiadoUrl={copiadoUrl}
            onCopiarUrl={() => {
              navigator.clipboard.writeText(urlPrincipal).catch(() => {});
              setCopiadoUrl(true);
              setTimeout(() => setCopiadoUrl(false), 2000);
            }}
            codigo={codigo}
            caduca={caduca}
            ahora={ahora}
            onGenerarCodigo={async () => {
              const c = await api?.remote?.pairCode();
              if (c) { setCodigo(c); setCaduca(Date.now() + 5 * 60 * 1000); }
            }}
            corriendo={!!estado?.corriendo}
            firewall={firewall}
            port={config.port}
            accent={accent}
            abriendoFirewall={abriendoFirewall}
            mensajeFirewall={mensajeFirewall}
            onAbrirFirewall={abrirFirewall}
          />
        )}

        {config.enabled && (
          <SeccionAvanzadaRemota
            config={config}
            onChange={onChange}
            accent={accent}
            verToken={verToken}
            onToggleVerToken={() => setVerToken((v) => !v)}
            onRegenerarToken={regenerar}
            estado={estado}
            ipPrincipal={ipPrincipal}
          />
        )}
      </div>
    </div>
  );
}
