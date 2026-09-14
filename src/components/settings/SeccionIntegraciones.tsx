import React, { useEffect, useState } from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { DotGlyphIcon } from '../dot480/DotGlyphIcon';
import type { DiscordStatus, SpotifyDevice } from '../../types';

interface Props {
  spotifyToken?: string;
  onSpotifyTokenChange?: (token: string) => void;
}

function BadgeConexion({ conectado, usuario }: { conectado: boolean; usuario?: string }) {
  const VD = useTheme();
  const t = useT();
  const texto = conectado
    ? `${t('ed.discord.connected')}${usuario ? ` (${usuario})` : ''}`
    : t('ed.discord.notRunning');

  return (
    <span
      style={{
        fontFamily: VD.mono,
        fontSize: 7,
        padding: '2px 6px',
        borderRadius: 2,
        background: conectado ? '#1e382b' : VD.elevated,
        color: conectado ? '#57f287' : VD.textMuted,
        border: `1px solid ${conectado ? '#23a55a' : VD.border}`,
      }}
    >
      {texto}
    </span>
  );
}

function BotonVoz({
  activo,
  etiqueta,
  insignia,
  disabled,
  onClick,
}: {
  activo: boolean;
  etiqueta: string;
  insignia: string;
  disabled: boolean;
  onClick: () => void;
}) {
  const VD = useTheme();
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1,
        fontFamily: VD.mono,
        fontSize: 7,
        padding: '4px 8px',
        background: activo ? '#3b1c1c' : VD.elevated,
        border: `1px solid ${activo ? '#ed4245' : VD.border}`,
        color: activo ? '#ed4245' : VD.text,
        cursor: 'pointer',
        borderRadius: 2,
      }}
    >
      {etiqueta} {activo ? `[${insignia}]` : ''}
    </button>
  );
}

function BloqueDiscord() {
  const VD = useTheme();
  const t = useT();

  const [status, setStatus] = useState<DiscordStatus | null>(null);
  const [testing, setTesting] = useState(false);

  const refrescar = () => {
    window.electronAPI.discord.status().then(setStatus).catch(() => {});
  };

  useEffect(() => {
    refrescar();
    const unsub = window.electronAPI.events.onDiscordVoiceSettingsChanged(() => {
      refrescar();
    });
    return unsub;
  }, []);

  const probarAccion = async (tipo: 'mute' | 'deaf') => {
    setTesting(true);
    try {
      if (tipo === 'mute') await window.electronAPI.discord.toggleMute();
      else await window.electronAPI.discord.toggleDeaf();
      refrescar();
    } finally {
      setTesting(false);
    }
  };

  const isConnected = !!status?.connected;
  const discordUser = status?.user?.globalName || status?.user?.username;

  return (
    <div style={{ background: VD.surface, border: `1px solid ${VD.border}`, borderRadius: 3, padding: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <DotGlyphIcon glyph="AUDIO" size={12} color={isConnected ? '#23a55a' : VD.textMuted} />
          <span style={{ fontFamily: VD.mono, fontSize: 9, fontWeight: 'bold', color: VD.text }}>
            {t('settings.discord.title')}
          </span>
        </div>
        <BadgeConexion conectado={isConnected} usuario={discordUser} />
      </div>

      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
        <BotonVoz
          activo={!!status?.voice?.mute}
          etiqueta={t('ed.discord.toggleMute')}
          insignia="MUTED"
          disabled={testing}
          onClick={() => probarAccion('mute')}
        />
        <BotonVoz
          activo={!!status?.voice?.deaf}
          etiqueta={t('ed.discord.toggleDeaf')}
          insignia="DEAF"
          disabled={testing}
          onClick={() => probarAccion('deaf')}
        />
      </div>
    </div>
  );
}

function BloqueSpotify({ spotifyToken, onSpotifyTokenChange }: Props) {
  const VD = useTheme();
  const t = useT();

  const [devices, setDevices] = useState<SpotifyDevice[]>([]);
  const [testing, setTesting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const probar = async () => {
    if (!spotifyToken) {
      setMsg(t('spotify.tokenRequired'));
      return;
    }
    setTesting(true);
    setMsg(null);
    try {
      const res = await window.electronAPI.spotify.getDevices(spotifyToken);
      if (res.ok && res.devices) {
        setDevices(res.devices);
        if (res.devices.length === 0) setMsg(t('ed.spotify.noDevices'));
      } else {
        setMsg(res.error ?? 'Error');
      }
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div style={{ background: VD.surface, border: `1px solid ${VD.border}`, borderRadius: 3, padding: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <DotGlyphIcon glyph="AUDIO_WAVE" size={12} color="#1db954" />
        <span style={{ fontFamily: VD.mono, fontSize: 9, fontWeight: 'bold', color: VD.text }}>
          {t('settings.spotify.title')}
        </span>
      </div>

      <div style={{ marginBottom: 8 }}>
        <div style={{ fontFamily: VD.mono, fontSize: 7, color: VD.textMuted, marginBottom: 4 }}>
          {t('settings.spotify.token')}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            type="password"
            value={spotifyToken ?? ''}
            onChange={(e) => onSpotifyTokenChange?.(e.target.value.trim())}
            placeholder={t('ed.spotify.tokenPlaceholder')}
            style={{
              flex: 1,
              fontFamily: VD.mono,
              fontSize: 8,
              padding: '4px 8px',
              background: VD.elevated,
              border: `1px solid ${VD.border}`,
              color: VD.text,
              borderRadius: 2,
              outline: 'none',
            }}
          />
          <button
            type="button"
            onClick={probar}
            disabled={testing}
            style={{
              fontFamily: VD.mono,
              fontSize: 7,
              padding: '4px 10px',
              background: VD.elevated,
              border: `1px solid ${VD.border}`,
              color: VD.accent,
              cursor: 'pointer',
              borderRadius: 2,
            }}
          >
            {t('ed.spotify.detectDevices')}
          </button>
        </div>
        <div style={{ fontFamily: VD.mono, fontSize: 7, color: VD.textMuted, marginTop: 4 }}>
          {t('settings.spotify.tokenDesc')}
        </div>
        {msg && (
          <div style={{ fontFamily: VD.mono, fontSize: 7, color: VD.accent, marginTop: 4 }}>
            {msg}
          </div>
        )}
      </div>

      {devices.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
          {devices.map((d) => (
            <div
              key={d.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: VD.elevated,
                border: `1px solid ${d.isActive ? '#1db954' : VD.border}`,
                padding: '3px 6px',
                borderRadius: 2,
                fontFamily: VD.mono,
                fontSize: 7,
              }}
            >
              <span style={{ color: d.isActive ? '#1db954' : VD.text, fontWeight: d.isActive ? 'bold' : 'normal' }}>
                {d.name} ({d.type}) {d.isActive ? '· [ACTIVO]' : ''}
              </span>
              <span style={{ color: VD.textMuted, userSelect: 'all' }}>
                {d.id}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SeccionIntegraciones({ spotifyToken, onSpotifyTokenChange }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <BloqueDiscord />
      <BloqueSpotify spotifyToken={spotifyToken} onSpotifyTokenChange={onSpotifyTokenChange} />
    </div>
  );
}

