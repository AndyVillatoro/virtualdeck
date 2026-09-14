import React, { useEffect, useState } from 'react';
import { useTheme } from '../../../utils/theme';
import { useT } from '../../../utils/i18n';
import { Field, estiloEntrada } from '../comunes';
import type { PropsFormulario } from './base';
import type { DiscordStatus, SpotifyDevice } from '../../../types';

export function FormDiscord(p: PropsFormulario) {
  const VD = useTheme();
  const t = useT();
  const inputStyle = estiloEntrada(VD);
  const { action, setAction } = p;
  const currentAction = action.discordAction ?? 'toggle-mute';

  const [status, setStatus] = useState<DiscordStatus | null>(null);

  useEffect(() => {
    let mounted = true;
    window.electronAPI.discord.status().then((s) => {
      if (mounted) setStatus(s);
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  const isConnected = !!status?.connected;
  const username = status?.user?.globalName || status?.user?.username;

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 8px',
          background: VD.surface,
          border: `1px solid ${VD.border}`,
          borderRadius: 2,
          marginBottom: 8,
          fontFamily: VD.mono,
          fontSize: 8,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: isConnected ? '#23a55a' : VD.textMuted,
            display: 'inline-block',
          }}
        />
        <span style={{ color: isConnected ? VD.text : VD.textMuted, fontWeight: isConnected ? 'bold' : 'normal' }}>
          {isConnected ? `${t('ed.discord.connected')}${username ? ` · @${username}` : ''}` : t('ed.discord.notRunning')}
        </span>
      </div>

      <Field label={t('ed.discord.action')}>
        <select
          value={currentAction}
          onChange={(e) =>
            setAction((a) => ({
              ...a,
              discordAction: e.target.value as 'toggle-mute' | 'toggle-deaf' | 'mute' | 'unmute' | 'deaf' | 'undeaf',
            }))
          }
          style={inputStyle}
        >
          <option value="toggle-mute">{t('ed.discord.toggleMute')}</option>
          <option value="toggle-deaf">{t('ed.discord.toggleDeaf')}</option>
          <option value="mute">{t('ed.discord.mute')}</option>
          <option value="unmute">{t('ed.discord.unmute')}</option>
          <option value="deaf">{t('ed.discord.deaf')}</option>
          <option value="undeaf">{t('ed.discord.undeaf')}</option>
        </select>
      </Field>

      <div
        style={{
          fontFamily: VD.mono,
          fontSize: 8,
          color: VD.textMuted,
          lineHeight: 1.6,
          borderLeft: `2px solid ${VD.border}`,
          paddingLeft: 8,
          marginTop: 4,
        }}
      >
        {t('ed.discord.help')}
      </div>
    </>
  );
}

export function FormSpotify(p: PropsFormulario) {
  const VD = useTheme();
  const t = useT();
  const inputStyle = estiloEntrada(VD);
  const { action, setAction } = p;
  const currentAction = action.spotifyAction ?? 'play-uri';

  const [devices, setDevices] = useState<SpotifyDevice[]>([]);
  const [buscando, setBuscando] = useState(false);

  const presets = [
    { label: 'TOP GLOBAL', uri: 'spotify:playlist:37i9dQZEVXbMDoHDwVN2tF' },
    { label: 'LO-FI BEATS', uri: 'spotify:playlist:37i9dQZF1DXdLEN7aqioXM' },
    { label: 'DISCOVER', uri: 'spotify:playlist:37i9dQZEVXcQ9COmYvdajy' },
    { label: 'ROCK CLASSICS', uri: 'spotify:playlist:37i9dQZF1DWXRqgorJj26U' },
    { label: 'ELECTRONIC', uri: 'spotify:playlist:37i9dQZF1DX4dyzvuaRJ0n' },
  ];

  const buscarDispositivos = async () => {
    if (!action.spotifyToken) return;
    setBuscando(true);
    try {
      const res = await window.electronAPI.spotify.getDevices(action.spotifyToken);
      if (res.ok && res.devices) {
        setDevices(res.devices);
      }
    } catch {
      // Ignorar errores de red
    } finally {
      setBuscando(false);
    }
  };

  return (
    <>
      <Field label={t('ed.spotify.action')}>
        <select
          value={currentAction}
          onChange={(e) =>
            setAction((a) => ({
              ...a,
              spotifyAction: e.target.value as 'play-uri' | 'transfer-playback' | 'toggle-shuffle' | 'toggle-repeat',
            }))
          }
          style={inputStyle}
        >
          <option value="play-uri">{t('ed.spotify.playUri')}</option>
          <option value="transfer-playback">{t('ed.spotify.transfer')}</option>
          <option value="toggle-shuffle">{t('ed.spotify.shuffle')}</option>
          <option value="toggle-repeat">{t('ed.spotify.repeat')}</option>
        </select>
      </Field>

      {currentAction === 'play-uri' && (
        <>
          <Field label={t('ed.spotify.uri')}>
            <input
              value={action.spotifyUri ?? ''}
              onChange={(e) => {
                let val = e.target.value.trim();
                if (val.includes('open.spotify.com')) {
                  try {
                    const parsed = new URL(val);
                    const parts = parsed.pathname.split('/').filter(Boolean).filter((x) => !x.startsWith('intl-'));
                    if (parts.length >= 2) val = `spotify:${parts[0]}:${parts[1]}`;
                  } catch { /* noop */ }
                }
                setAction((a) => ({ ...a, spotifyUri: val }));
              }}
              placeholder="spotify:playlist:37i9dQZF1DXcBWIGoYBM5M"
              style={inputStyle}
            />
          </Field>

          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 2 }}>
            {presets.map((pre) => (
              <button
                key={pre.label}
                type="button"
                onClick={() => setAction((a) => ({ ...a, spotifyUri: pre.uri }))}
                style={{
                  fontFamily: VD.mono,
                  fontSize: 7,
                  padding: '2px 6px',
                  background: action.spotifyUri === pre.uri ? VD.elevated : VD.surface,
                  border: `1px solid ${action.spotifyUri === pre.uri ? VD.accent : VD.border}`,
                  color: action.spotifyUri === pre.uri ? VD.accent : VD.textMuted,
                  cursor: 'pointer',
                  borderRadius: 2,
                }}
              >
                {pre.label}
              </button>
            ))}
          </div>

          <Field label={t('ed.spotify.token')}>
            <input
              value={action.spotifyToken ?? ''}
              onChange={(e) => setAction((a) => ({ ...a, spotifyToken: e.target.value.trim() }))}
              placeholder={t('ed.spotify.tokenPlaceholder')}
              style={inputStyle}
            />
          </Field>

          <div
            style={{
              fontFamily: VD.mono,
              fontSize: 8,
              color: VD.textMuted,
              lineHeight: 1.6,
              borderLeft: `2px solid ${VD.border}`,
              paddingLeft: 8,
              marginTop: 6,
            }}
          >
            {t('ed.spotify.help')}
          </div>
        </>
      )}

      {currentAction === 'transfer-playback' && (
        <>
          <Field label={t('ed.spotify.token')}>
            <div style={{ display: 'flex', gap: 4 }}>
              <input
                value={action.spotifyToken ?? ''}
                onChange={(e) => setAction((a) => ({ ...a, spotifyToken: e.target.value.trim() }))}
                placeholder={t('ed.spotify.tokenPlaceholder')}
                style={{ ...inputStyle, flex: 1 }}
              />
              <button
                type="button"
                onClick={buscarDispositivos}
                disabled={!action.spotifyToken || buscando}
                style={{
                  fontFamily: VD.mono,
                  fontSize: 8,
                  padding: '2px 8px',
                  background: VD.surface,
                  border: `1px solid ${VD.border}`,
                  color: action.spotifyToken ? VD.accent : VD.textMuted,
                  cursor: action.spotifyToken ? 'pointer' : 'default',
                  borderRadius: 2,
                }}
              >
                {t('ed.spotify.detectDevices')}
              </button>
            </div>
          </Field>

          {devices.length > 0 && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
              {devices.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setAction((a) => ({ ...a, spotifyDeviceId: d.id }))}
                  style={{
                    fontFamily: VD.mono,
                    fontSize: 7,
                    padding: '2px 6px',
                    background: action.spotifyDeviceId === d.id ? VD.elevated : VD.surface,
                    border: `1px solid ${action.spotifyDeviceId === d.id ? VD.accent : VD.border}`,
                    color: action.spotifyDeviceId === d.id ? VD.accent : VD.text,
                    cursor: 'pointer',
                    borderRadius: 2,
                  }}
                >
                  {d.name} ({d.type})
                </button>
              ))}
            </div>
          )}

          <Field label={t('ed.spotify.deviceId')}>
            <input
              value={action.spotifyDeviceId ?? ''}
              onChange={(e) => setAction((a) => ({ ...a, spotifyDeviceId: e.target.value }))}
              placeholder={t('ed.spotify.devicePlaceholder')}
              style={inputStyle}
            />
          </Field>
        </>
      )}
    </>
  );
}
