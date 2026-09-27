/**
 * Qué direcciones puede abrir la aplicación con un botón.
 *
 * `shell.openExternal` **no es un visor de enlaces**: se lo entrega al sistema y
 * lo abre con el programa que el usuario tenga asociado a ese esquema. Por eso
 * un `file:` no es "abrir un fichero" sino "ejecutar lo que el sistema tenga
 * asociado a `.exe`/`.bat`/`.vbs`", y un `ldap:`, `search-ms:` o `ms-msdt:` son
 * vector de ejecución en Windows sin tocar ni una macro.
 *
 * Aquí la entrada es un campo de texto de un botón, o sea que puede venir de un
 * perfil importado de la galería —contenido de terceros— y también de una
 * variable interpolada. Sin esta lista, instalar un perfil que trae
 * `{"type":"web","url":"file:///C:/…/evil.exe"}` es instalar una instalación.
 *
 * **Solo `http:`, `https:` y `mailto:`**, más el único esquema propio que usa
 * la aplicación para algo (`ms-screenclip:`, el recorte de pantalla de Windows,
 * que es un `shell.openExternal` y no tiene otro camino). Se queda `http:` a
 * propósito: un botón que abre el panel del router o el mando de la red local
 * es un uso normal, y abrir una dirección en el navegador del usuario no da
 * acceso a la respuesta —eso sí lo haría un `fetch` desde el proceso principal,
 * que es otro problema y no este—.
 *
 * Puro a propósito, sin `electron` ni `shell`, para poder probarlo con
 * `node --experimental-strip-types` sin abrir nada.
 */

/** Lo que la aplicación abre de verdad, con la app asociada. */
const ESQUEMAS_PERMITIDOS = new Set(['http:', 'https:', 'mailto:', 'ms-screenclip:']);

/**
 * La dirección si se puede abrir, o `null` si no.
 *
 * El esquema sale de `URL`, que normaliza a minúsculas: `MS-SCREENC:` y
 * `ms-screenclip:` son lo mismo. `file:` y `C:\…` ni siquiera llegan a
 * compararse: `new URL()` los parsea con esquema `file:`, que no está en la
 * lista.
 */
export function urlAbrible(entrada: unknown): string | null {
  if (typeof entrada !== 'string') return null;
  const texto = entrada.trim();
  // Cortísimo: ni `http://x` ni `spotify:track:1` necesitan 2000 caracteres, y
  // un kilobyte de URL en un IPC es un kilobyte de URL en un log.
  if (!texto || texto.length > 2000) return null;

  let u: URL;
  try {
    u = new URL(texto);
  } catch {
    // Sin esquema no hay nada que decidir: `www.ejemplo.com` no es una URL y
    // `openExternal` no lo entiende. Que el usuario escriba el `https://`.
    return null;
  }
  if (!ESQUEMAS_PERMITIDOS.has(u.protocol)) return null;
  return u.href;
}
