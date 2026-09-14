import { OK, fail, interpolate, type Manejador } from './base';
import type { ElectronAPI, ButtonAction } from '../../types';

function getToken(action: ButtonAction): string | undefined {
  if (action.spotifyToken) return action.spotifyToken;
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem('vd-spotify-token') || undefined;
  }
  return undefined;
}

async function ejecutarDiscord(act: string, api: ElectronAPI): Promise<{ ok: boolean; error?: string }> {
  switch (act) {
    case 'toggle-deaf': return api.discord.toggleDeaf();
    case 'mute':        return api.discord.setVoiceSettings({ mute: true });
    case 'unmute':      return api.discord.setVoiceSettings({ mute: false });
    case 'deaf':        return api.discord.setVoiceSettings({ deaf: true });
    case 'undeaf':      return api.discord.setVoiceSettings({ deaf: false });
    default:            return api.discord.toggleMute();
  }
}

async function ejecutarSpotifyPlay(
  action: ButtonAction,
  api: ElectronAPI,
  state: Record<string, string> | undefined,
  t: (k: string) => string,
) {
  const uri = interpolate(action.spotifyUri, state);
  if (!uri) return fail(t('act.err.spotifyNoUri'));
  const res = await api.spotify.playUri(uri, getToken(action), action.spotifyDeviceId);
  return res.ok ? OK : fail(res.error ?? t('act.err.spotify'));
}

async function ejecutarSpotifyTransfer(
  action: ButtonAction,
  api: ElectronAPI,
  state: Record<string, string> | undefined,
  t: (k: string) => string,
) {
  const deviceId = interpolate(action.spotifyDeviceId, state);
  if (!deviceId) return fail(t('act.err.spotifyNoDevice'));
  const res = await api.spotify.transferPlayback(deviceId, getToken(action));
  return res.ok ? OK : fail(res.error ?? t('act.err.spotify'));
}

/** Integraciones nativas de terceros: Discord y Spotify. */
export const TERCEROS: Record<string, Manejador> = {
  'discord': async ({ action, api, t }) => {
    const act = action.discordAction ?? 'toggle-mute';
    const res = await ejecutarDiscord(act, api);
    return res.ok ? OK : fail(res.error ?? t('act.err.discord'));
  },

  'spotify': async ({ action, api, state, t }) => {
    const act = action.spotifyAction ?? 'play-uri';

    if (act === 'play-uri') {
      return ejecutarSpotifyPlay(action, api, state, t);
    }
    if (act === 'transfer-playback') {
      return ejecutarSpotifyTransfer(action, api, state, t);
    }
    if (act === 'toggle-shuffle') {
      const ok = await api.media.shuffle();
      return ok ? OK : fail(t('act.err.shuffle'));
    }
    if (act === 'toggle-repeat') {
      const ok = await api.media.repeat();
      return ok ? OK : fail(t('act.err.repeat'));
    }

    return OK;
  },
};
