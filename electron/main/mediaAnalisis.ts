import type { NowPlaying } from './mediaTipos';

export interface Parsed {
  title: string;
  artist: string;
  source: string;
  status: NowPlaying['status'];
}

export function parseWindowTitle(proc: string, raw: string): Parsed | null {
  const procLower = proc.toLowerCase();
  // Normalize unicode whitespace variants (NBSP, ZWSP, etc.) that Edge/Chrome
  // sometimes inject between "Microsoft" and "Edge".
  let title = raw.replace(/[\u00a0\u200b\ufeff]|\u200c|\u200d/g, ' ');
  // Browser suffixes — handle multilingual variants:
  //   English: "and N more page(s)"   Spanish: "y N página(s) más"
  //   Portuguese: "e mais N página(s)"   plus optional "Profile: Browser" tail.
  const browser = '(?:Mozilla Firefox|Google Chrome|Microsoft\\s*Edge|Brave|Opera|Vivaldi)';
  const more = '(?:and \\d+ more pages?|y \\d+ p[áa]ginas? m[áa]s|e mais \\d+ p[áa]ginas?)';
  // 1) Strip "Profile: Browser" or "Browser" entirely.
  title = title.replace(new RegExp(`\\s+[—\\-]\\s+(?:[^-—:]+:\\s*)?${browser}\\s*$`, 'i'), '');
  // 2) Strip "and N more pages - Browser" or i18n equivalents.
  title = title.replace(new RegExp(`\\s+${more}.*$`, 'i'), '');

  let m = title.match(/^(.+?)\s+-\s+YouTube Music$/);
  if (m) {
    const left = m[1];
    const dashIdx = left.lastIndexOf(' - ');
    if (dashIdx > 0) {
      return { title: left.slice(0, dashIdx).trim(), artist: left.slice(dashIdx + 3).trim(), source: 'YouTube Music', status: 'Playing' };
    }
    return { title: left.trim(), artist: '', source: 'YouTube Music', status: 'Playing' };
  }
  m = title.match(/^(.+?)\s+-\s+YouTube$/);
  if (m) return { title: m[1].trim(), artist: '', source: 'YouTube', status: 'Playing' };

  m = title.match(/^Spotify\s+[-·–]\s+(.+?)\s+[·•]\s+(.+)$/);
  if (m) return { title: m[1].trim(), artist: m[2].trim(), source: 'Spotify', status: 'Playing' };
  m = title.match(/^(.+?)\s+[•·]\s+(.+?)\s+[-—–]\s+Spotify$/);
  if (m) return { title: m[1].trim(), artist: m[2].trim(), source: 'Spotify', status: 'Playing' };
  if (procLower === 'spotify' && title && title !== 'Spotify' && title !== 'Spotify Premium' && title !== 'Spotify Free') {
    const dashIdx = title.lastIndexOf(' - ');
    if (dashIdx > 0) {
      return { title: title.slice(0, dashIdx).trim(), artist: title.slice(dashIdx + 3).trim(), source: 'Spotify', status: 'Playing' };
    }
    return { title, artist: '', source: 'Spotify', status: 'Playing' };
  }

  m = title.match(/^(.+?)\s+-\s+(.+?)\s+on SoundCloud/i);
  if (m) return { title: m[2].trim(), artist: m[1].trim(), source: 'SoundCloud', status: 'Playing' };

  m = title.match(/^(.+?)\s+-\s+VLC media player$/i);
  if (m) return { title: m[1].trim(), artist: '', source: 'VLC', status: 'Playing' };

  return null;
}

/** Los cuatro `True/False` que dice SMTC sobre lo que la sesion admite. */
export function parsearControles(caps: string | undefined): NowPlaying['controls'] {
  // Si el script es de una version anterior no viene el campo, y entonces se
  // deja sin definir: eso significa «no se sabe», que no es «no se puede».
  if (!caps) return undefined;
  const p = caps.split('/');
  const si = (i: number) => p[i]?.trim() === 'True';
  return { next: si(0), prev: si(1), shuffle: si(2), repeat: si(3) };
}

export const ESTADOS: NowPlaying['status'][] = ['Playing', 'Paused', 'Stopped', 'Unknown'];

/** `True`/`False` de SMTC para el aleatorio activo. Otro valor = no se sabe. */
export function parsearAleatorio(valor: string | undefined): boolean | undefined {
  if (valor?.trim() === 'True') return true;
  if (valor?.trim() === 'False') return false;
  return undefined;
}

/** 0 = ninguna, 1 = pista, 2 = lista. Otro valor (incluido -1) = no se sabe. */
export function parsearRepeticion(valor: string | undefined): NowPlaying['autoRepeatMode'] {
  const n = valor?.trim();
  if (n === '0') return 'none';
  if (n === '1') return 'track';
  if (n === '2') return 'list';
  return undefined;
}
