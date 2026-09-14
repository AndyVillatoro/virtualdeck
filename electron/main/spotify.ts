import { shell } from 'electron';
import { tm } from './idioma';

export interface SpotifyDevice {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  volumePercent: number;
}

export interface SpotifyPlaybackState {
  isPlaying: boolean;
  trackName?: string;
  artistName?: string;
  albumName?: string;
  albumArtUrl?: string;
  progressMs?: number;
  durationMs?: number;
  device?: SpotifyDevice;
  shuffleState?: boolean;
  repeatState?: 'off' | 'track' | 'context';
}

/**
 * Normaliza cualquier enlace o URI de Spotify a formato URI estándar (spotify:tipo:id).
 * Soporta tracks, playlists, álbumes, artistas, episodios, podcasts y búsquedas.
 */
export function normalizeSpotifyUri(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('spotify:')) return trimmed;

  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname.includes('spotify.com')) {
      const parts = parsed.pathname.split('/').filter(Boolean);
      // Omitir prefijos de internacionalización como /intl-es/, /intl-en/, etc.
      const meaningfulParts = parts.filter((p) => !p.startsWith('intl-'));

      if (meaningfulParts.length >= 2) {
        const tipo = meaningfulParts[0];
        const id = meaningfulParts[1].split('?')[0]; // Limpiar cualquier querystring
        return `spotify:${tipo}:${id}`;
      } else if (meaningfulParts.length === 1 && meaningfulParts[0] === 'search') {
        const query = parsed.searchParams.get('q') || '';
        if (query) return `spotify:search:${encodeURIComponent(query)}`;
      }
    }
  } catch {
    // Si no es URL estándar de navegador, se mantiene tal cual
  }

  return trimmed;
}

/**
 * Reproduce un URI o enlace de Spotify.
 * Si se proporciona un token de la Web API, inicia la reproducción directamente en segundo plano
 * en el dispositivo activo o indicado. Si no hay token o la API falla, recurre de forma transparente
 * a la aplicación de escritorio mediante el protocolo local registrado.
 */
export async function playUri(
  uriOrUrl: string,
  token?: string,
  deviceId?: string,
): Promise<{ ok: boolean; error?: string }> {
  const uri = normalizeSpotifyUri(uriOrUrl);
  if (!uri) {
    return { ok: false, error: tm('spotify.noUri') };
  }

  // 1. Si hay token disponible, intentar control directo vía Spotify Web API
  if (token) {
    try {
      const isContext =
        uri.startsWith('spotify:playlist:') ||
        uri.startsWith('spotify:album:') ||
        uri.startsWith('spotify:artist:') ||
        uri.startsWith('spotify:show:');

      const body = isContext ? { context_uri: uri } : { uris: [uri] };
      const endpoint = deviceId
        ? `https://api.spotify.com/v1/me/player/play?device_id=${encodeURIComponent(deviceId)}`
        : 'https://api.spotify.com/v1/me/player/play';

      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (res.ok || res.status === 204) {
        return { ok: true };
      }
    } catch {
      // Si la API falla (ej. sin conexión a internet), continuamos al fallback de escritorio
    }
  }

  // 2. Fallback al protocolo de escritorio de Spotify
  try {
    await shell.openExternal(uri);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/**
 * Consulta la lista de dispositivos de reproducción activos vía Spotify Web API.
 */
export async function getDevices(token?: string): Promise<{ ok: boolean; devices?: SpotifyDevice[]; error?: string }> {
  if (!token) {
    return { ok: false, error: tm('spotify.tokenRequired') };
  }

  try {
    const res = await fetch('https://api.spotify.com/v1/me/player/devices', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      return { ok: false, error: `Error ${res.status}: ${res.statusText}` };
    }

    const data = (await res.json()) as {
      devices?: Array<{ id: string; name: string; type: string; is_active: boolean; volume_percent: number }>;
    };

    const devices: SpotifyDevice[] = (data.devices ?? []).map((d) => ({
      id: d.id,
      name: d.name,
      type: d.type,
      isActive: d.is_active,
      volumePercent: d.volume_percent,
    }));

    return { ok: true, devices };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/**
 * Transfiere la reproducción activa al dispositivo indicado vía Spotify Web API.
 */
export async function transferPlayback(
  deviceId: string,
  token?: string,
  play = true,
): Promise<{ ok: boolean; error?: string }> {
  if (!token) {
    return { ok: false, error: tm('spotify.tokenRequired') };
  }

  try {
    const res = await fetch('https://api.spotify.com/v1/me/player', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ device_ids: [deviceId], play }),
    });

    if (!res.ok && res.status !== 204) {
      return { ok: false, error: `Error ${res.status}: ${res.statusText}` };
    }

    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/**
 * Consulta el estado actual de reproducción (canción, artista, carátula, progreso).
 */
export async function getPlaybackState(
  token?: string,
): Promise<{ ok: boolean; state?: SpotifyPlaybackState; error?: string }> {
  if (!token) {
    return { ok: false, error: tm('spotify.tokenRequired') };
  }

  try {
    const res = await fetch('https://api.spotify.com/v1/me/player', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 204) {
      return { ok: true, state: { isPlaying: false } };
    }

    if (!res.ok) {
      return { ok: false, error: `Error ${res.status}: ${res.statusText}` };
    }

    const data = (await res.json()) as {
      is_playing?: boolean;
      progress_ms?: number;
      shuffle_state?: boolean;
      repeat_state?: 'off' | 'track' | 'context';
      item?: {
        name?: string;
        duration_ms?: number;
        artists?: Array<{ name: string }>;
        album?: { name: string; images?: Array<{ url: string }> };
      };
      device?: { id: string; name: string; type: string; is_active: boolean; volume_percent: number };
    };

    const state: SpotifyPlaybackState = {
      isPlaying: !!data.is_playing,
      progressMs: data.progress_ms,
      durationMs: data.item?.duration_ms,
      trackName: data.item?.name,
      artistName: data.item?.artists?.map((a) => a.name).join(', '),
      albumName: data.item?.album?.name,
      albumArtUrl: data.item?.album?.images?.[0]?.url,
      shuffleState: data.shuffle_state,
      repeatState: data.repeat_state,
      device: data.device
        ? {
            id: data.device.id,
            name: data.device.name,
            type: data.device.type,
            isActive: data.device.is_active,
            volumePercent: data.device.volume_percent,
          }
        : undefined,
    };

    return { ok: true, state };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
