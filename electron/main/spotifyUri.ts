/**
 * Traduce un enlace de Spotify a su URI, y solo si es de Spotify.
 *
 * Vive aparte de `spotify.ts` por la misma razón que `macroScript.ts`: la
 * lógica es pura y se puede **probar sin abrir Spotify**. `spotify.ts` importa
 * `shell` de electron, así que con la función dentro no había forma de importarla
 * desde un test —y probar una copia no es probar nada.
 */

/** Formas que puede tener un URI de Spotify en la barra de direcciones. */
const TIPOS = ['track', 'playlist', 'album', 'artist', 'show', 'episode', 'search', 'user', 'collection'];

/** `spotify:<tipo>:<algo>`, y solo con un tipo que existe. */
const ESQUEMA_SPOTIFY = /^spotify:([a-z]+):(.+)$/i;

/** Solo `*.spotify.com` de verdad, no un `evil-spotify.com`. */
function dominioDeSpotify(host: string): boolean {
  const h = host.toLowerCase();
  return h === 'spotify.com' || h.endsWith('.spotify.com');
}

/**
 * A un `spotify:` que se puede abrir, o `null`.
 *
 * Un `spotify:` que no encaja tampoco vale: `playUri` lo pasa a
 * `openExternal`, y el sistema lo abriría con lo que tenga asociado al esquema.
 */
function uriValida(uri: string): string | null {
  const m = ESQUEMA_SPOTIFY.exec(uri.trim());
  if (!m) return null;
  return TIPOS.includes(m[1].toLowerCase()) ? uri.trim() : null;
}

/**
 * Normaliza cualquier enlace o URI de Spotify a formato URI estándar
 * (`spotify:tipo:id`). Soporta tracks, playlists, álbumes, artistas, episodios,
 * podcasts y búsquedas.
 *
 * **Devuelve `null` para todo lo que no sea de Spotify**, y antes devolvía la
 * entrada tal cual. Eso parecía inofensivo hasta que `playUri` la pasaba a
 * `shell.openExternal`: un campo `spotifyUri` con `file:///C:/.../evil.exe` —o
 * con `ms-msdt:`, o con cualquier otra cosa— acababa en el programa que el
 * sistema tenga asociado a ese esquema. Un segundo sumidero de `openExternal`
 * sin lista, y este **alcanzable sin token** (la rama de la Web API es
 * opcional).
 *
 * Ahora la lista es explícita: o es un `spotify:` de verdad, o es una dirección
 * de `*.spotify.com` que se traduce a ese `spotify:`. El dominio se compara
 * exacto por etiquetas —`evil-spotify.com` y `spotify.com.evil.tld` no pasan— y
 * lo que sale vuelve a pasar por la misma comprobación, que es la que protege
 * del `openExternal`.
 */
export function normalizeSpotifyUri(input: string): string | null {
  const trimmed = (input ?? '').trim();
  if (!trimmed) return null;

  if (/^spotify:/i.test(trimmed)) return uriValida(trimmed);

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    // No es una URL: no hay nada que traducir, y no se devuelve tal cual.
    return null;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
  if (!dominioDeSpotify(parsed.hostname)) return null;

  // Omitir prefijos de internacionalización como /intl-es/, /intl-en/, etc.
  const meaningfulParts = parsed.pathname.split('/').filter(Boolean).filter((p) => !p.startsWith('intl-'));

  if (meaningfulParts.length >= 2) {
    const tipo = meaningfulParts[0].toLowerCase();
    const id = meaningfulParts[1].split('?')[0]; // Limpiar cualquier querystring
    return uriValida(`spotify:${tipo}:${id}`);
  }
  if (meaningfulParts.length === 1 && meaningfulParts[0] === 'search') {
    const query = parsed.searchParams.get('q') || '';
    if (query) return uriValida(`spotify:search:${encodeURIComponent(query)}`);
  }
  return null;
}
