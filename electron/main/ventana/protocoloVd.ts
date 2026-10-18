import { extname, resolve, sep } from 'path';

/**
 * `vd://` — el esquema con el que el renderer pinta las imágenes de fondo.
 *
 * Existe para que la configuración guarde `vd://images/img_1737.png` en vez de
 * una copia entera de la imagen en el JSON. Las direcciones legítimas las
 * escribe siempre el proceso principal, al copiar el fichero elegido o el
 * portapapeles a `%APPDATA%\virtualdeck\images` (ver `ipc/dialogIpc.ts`).
 *
 * El problema es que **el renderer pinta lo que le digan** y lo que le digan
 * puede venir de un perfil importado de la galería, que es contenido de
 * terceros. Con este código:
 *
 * ```ts
 * const path = request.url.slice('vd://'.length);
 * const filePath = join(app.getPath('userData'), decodeURIComponent(path));
 * ```
 *
 * `vd://images/..%2f..%2f..%2fpackage.json` servía cualquier fichero del
 * disco, y no porque el `..` se comiera el parser de URL: los separadores de
 * la especificación son `/` y `\`, así que `%2f` **no** lo es y llega entero;
 * solo se convierte en separador al hacer `decodeURIComponent`, ya demasiado
 * tarde. Medido en Chromium (2026-09-26):
 *
 * | Pido al handler                       | Recibe el handler                  |
 * |---------------------------------------|------------------------------------|
 * | `vd://images/../../secreto.txt`        | `vd://images/secreto.txt` (colapsado) |
 * | `vd://images/..%2f..%2fsecreto.txt`    | `vd://images/..%2f..%2fsecreto.txt` (intacto) |
 * | `vd://images/..\..\secreto.txt`        | `vd://images/secreto.txt`          |
 *
 * El `.png` de la derecha no protege de nada: el contenido se servía con el
 * tipo que Chromium dedujera del fichero, y el traversal no necesita ser una
 * imagen para leer un `.json`.
 *
 * Por eso aquí solo se acepta **un nombre de fichero dentro de `images/`**:
 * nada de carpetas, nada de `..`, nada de rutas absolutas, nada de extensiones
 * que no sean de imagen, y una comprobación final de contención por si algún
 * día se relaja un patrón. Dos capas, y la segunda no depende de la primera.
 */

/** Carpeta de la URL que el proceso principal escribe siempre. */
const PREFIJO = 'images/';

/**
 * Lo que el proceso principal sabe escribir, más los formatos que un
 * portapapeles puede traer en un `data:image/...` (`dialogIpc` acepta cualquier
 * subtipo, y un navegador moderno pega `avif` o `webp` sin preguntar).
 *
 * `svg` entra porque el selector de ficheros lo ofrece. En un `<img>` el SVG no
 * ejecuta script, así que aquí no es un vector; en la página del mando sí lo
 * era, y eso es otro arreglo (ver `servidorLocal.ts`).
 */
const EXTENSIONES = new Set([
  '.png', '.apng', '.jpg', '.jpeg', '.jfif', '.gif', '.webp',
  '.avif', '.bmp', '.ico', '.svg',
]);

/**
 * Caracteres que Windows no admite en un nombre de fichero, y los dos
 * separadores de ruta.
 *
 * `:` cubre también las unidades de disco (`C:`) y los flujos alternativos de
 * NTFS (`fichero.txt::$DATA`). Los espacios y los acentos se permiten: los
 * nombres los pone el usuario.
 */
const PROHIBIDOS = /[/\\:*?"<>|]/;

/**
 * Nombres reservados de Windows, que se saltan la extensión.
 *
 * `CON.png` no es un fichero: es el dispositivo de consola, y `fs` lo abre sin
 * que exista. Pasa los otros filtros —no empieza por punto, no tiene carácter
 * prohibido y su extensión es `.png`—, así que sin esta lista el handler
 * devolvería una imagen para un nombre que en disco es otra cosa. Se comparan en
 * mayúsculas porque Windows no distingue, y se corta en el primer punto porque
 * el nombre del dispositivo es lo que hay antes de la extensión: `NUL.png`,
 * `NUL.jpg` y `nul` son el mismo.
 */
const RESERVADOS = new Set([
  'con', 'prn', 'aux', 'nul',
  'com1', 'com2', 'com3', 'com4', 'com5', 'com6', 'com7', 'com8', 'com9',
  'lpt1', 'lpt2', 'lpt3', 'lpt4', 'lpt5', 'lpt6', 'lpt7', 'lpt8', 'lpt9',
]);

/** C0: incluye el NUL, que en Node lanza al tocar el disco. */
function esNombreValido(nombre: string): boolean {
  // `.` y `..` empiezan por punto, y los ocultos también quedan fuera: aquí no
  // hay nada que ver, y un fichero llamado `.png` no es una imagen.
  if (!nombre || nombre.startsWith('.')) return false;
  if (PROHIBIDOS.test(nombre)) return false;
  if (RESERVADOS.has(nombre.split('.')[0].toLowerCase())) return false;
  for (let i = 0; i < nombre.length; i++) {
    if (nombre.charCodeAt(i) < 0x20) return false;
  }
  return EXTENSIONES.has(extname(nombre).toLowerCase());
}

/**
 * La ruta real que hay que servir, o `null` si esa URL no vale.
 *
 * @param url La URL completa, tal cual la da el handler.
 * @param dirImagenes La carpeta `images` de este usuario.
 *
 * Puro a propósito —no toca `electron` ni el disco— para poder probarlo con
 * `node --experimental-strip-types` sin levantar la aplicación.
 */
export function rutaImagenDesdeUrl(url: string, dirImagenes: string): string | null {
  if (!url.startsWith('vd://')) return null;

  let relativa: string;
  try {
    relativa = decodeURIComponent(url.slice('vd://'.length));
  } catch {
    // `%` suelto o una secuencia UTF-8 rota: no es una dirección nuestra.
    return null;
  }

  if (!relativa.startsWith(PREFIJO)) return null;
  const nombre = relativa.slice(PREFIJO.length);
  if (!esNombreValido(nombre)) return null;

  // Red de seguridad: aunque todo lo anterior pasara, la ruta tiene que
  // seguir dentro de la carpeta. `resolve` con un nombre sin separadores no
  // puede salir, pero es la comprobación que no depende de un regex.
  const base = resolve(dirImagenes);
  const destino = resolve(base, nombre);
  return destino.startsWith(base + sep) ? destino : null;
}
