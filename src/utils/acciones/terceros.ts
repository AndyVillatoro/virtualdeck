import { OK, fail, interpolate, type Manejador } from './base';
import { MEDIA } from './media';
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
/**
 * Busca un manejador en el mapa de media y se queja si no está.
 *
 * `MEDIA` es `Record<string, Manejador>` y el proyecto va con `strict: false`,
 * así que un `MEDIA['media-shufle']` con un typo **no lo ve TypeScript** y
 * revienta en pantalla con «is not a function», en el momento de pulsar el
 * botón y sin decir qué clave faltaba. Con este paso, el fallo sale al cargar el
 * módulo y con el nombre dentro.
 */
function manejadorMedia(tipo: string): Manejador {
  const h = MEDIA[tipo];
  if (!h) throw new Error(`MEDIA['${tipo}'] no existe en acciones/media.ts`);
  return h;
}

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
    // Shuffle y repeat de Spotify **son** los de media (mismo `api.media.*` por
    // debajo), así que se delegan en vez de reescribirse. Antes estaban
    // duplicados aquí y esta copia se olvidaba de `refrescarNowPlayingGlobal()`:
    // usar el shuffle desde un botón de Spotify dejaba el panel de música
    // enseñando el estado anterior hasta el siguiente sondeo. Delegar deja una
    // sola definición de "qué es dar la vuelta al shuffle", que es lo que
    // evita que vuelvan a separarse.
    if (act === 'toggle-shuffle') return manejadorMedia('media-shuffle')({ action, api, state, t });
    if (act === 'toggle-repeat') return manejadorMedia('media-repeat')({ action, api, state, t });

    return OK;
  },
};
