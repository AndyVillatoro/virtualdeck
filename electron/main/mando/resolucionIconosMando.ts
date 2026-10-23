/**
 * La resolución del icono de un botón para el mando móvil: catálogo 16×16 →
 * glifo por nombre (con los alias de la tabla vieja) → glifo del tipo de
 * acción, y el mapeo de las imágenes propias a la ruta que sirve el servidor.
 *
 * Vive aparte de `iconosMando.ts` porque ese archivo se ocupa del aspecto del
 * botón (audio, ciclo, interruptor, marca) y este de los puntos: son dos
 * responsabilidades y juntas pasaban el tope de líneas. Módulo puro, sin
 * Electron ni Node: se puede probar con esbuild + node.
 */
import { DOT_GLYPHS_8X8, resolveDotGlyph } from '../../../src/components/dot480/dotGlyphsCatalog';
import { GLIFO_POR_TIPO_ACCION } from '../../../src/components/dot480/glifosPorTipoAccion';
import { matrizDePuntos16 } from '../../../src/components/dot480/puntos16';

/** Un icono ya resuelto a puntos: lado 8 (DOT 8×8) o 16 (catálogo). */
export interface IconoPuntosMando {
  lado: 8 | 16;
  /** Una fila por número: bit 7 (8×8) o bit 15 (16×16) = izquierda. */
  filas: number[];
}

/** Lo que el servidor manda por botón: puntos siempre, texto solo si `icon` no es glifo. */
interface IconoResueltoMando {
  puntos: IconoPuntosMando;
  /**
   * `icon` cuando no resuelve a ningún glifo (texto corto tipo «AB» o texto
   * largo): la página lo dibuja como texto, como la celda, en vez de los
   * puntos del tipo de acción.
   */
  iconTexto?: string;
}

/**
 * Los 5 alias de la tabla vieja (`G8`/`ALIAS` en `paginaMando.ts`) que
 * `resolveDotGlyph` no cubre. Se resuelven **por nombre** contra el catálogo
 * compartido: aquí no hay filas copiadas, solo los nombres que faltaban para
 * no cambiar lo que el móvil ya dibujaba. El quinto (el que la tabla vieja
 * mandaba a MINIMIZE) se construye por códigos para no depender de cómo lo
 * enseñe el editor.
 */
const ALIAS_EXTRA: Record<string, string> = {
  VOLUME: 'SPEAKER',
  '📊': 'CPU',
  '◷': 'CLOCK',
  '⛶': 'FULLSCREEN',
};
ALIAS_EXTRA[String.fromCharCode(0xd83d, 0xddd7)] = 'MINIMIZE';

/** Filas 8×8 de un nombre ya resuelto, o `null` si no existe. */
function filas8(nombre: string | null | undefined): number[] | null {
  if (!nombre) return null;
  const filas = DOT_GLYPHS_8X8[nombre];
  return filas ? [...filas] : null;
}

/** El icono del catálogo 16×16 copiado en el botón, como filas de 16 bits. */
function filasDeCatalogo(bits: string | undefined): number[] | null {
  if (!bits) return null;
  const matriz = matrizDePuntos16(bits);
  if (!matriz) return null;
  return matriz.map((fila) =>
    fila.reduce((n, encendido, x) => n | (encendido ? 1 << (15 - x) : 0), 0));
}

/** Glifo por nombre (`icon` o `dotGlyph` de un sub-botón), con los alias extra. */
function filasDeNombre(icon: string | undefined, dotGlyph: string | undefined): number[] | null {
  if (icon) {
    const directo = filas8(resolveDotGlyph(icon));
    if (directo) return directo;
    const recortado = icon.trim();
    const extra = ALIAS_EXTRA[recortado.toUpperCase()] ?? ALIAS_EXTRA[recortado];
    if (extra) {
      const porAlias = filas8(extra);
      if (porAlias) return porAlias;
    }
  }
  return filas8(dotGlyph);
}

/** Último recurso, como la celda: el glifo del tipo de acción. */
function filasDeAccion(tipo: string | undefined): number[] {
  const nombre = (GLIFO_POR_TIPO_ACCION as Record<string, string>)[tipo ?? ''] ?? 'DOTS';
  return [...(DOT_GLYPHS_8X8[nombre] ?? DOT_GLYPHS_8X8.DOTS)];
}

/**
 * Resuelve el icono de un botón en el mismo orden que la celda
 * (`ContenidoCentral`): catálogo 16×16 → glifo por nombre → tipo de acción.
 * El fondo (imagen/marca) y el 5×7 los sigue decidiendo la página, que ya
 * los recibe aparte.
 */
export function resolverIconoMando(fuente: {
  iconoPuntos?: { bits: string; origen: string };
  icon?: string;
  dotGlyph?: string;
  actionType?: string;
}): IconoResueltoMando {
  const catalogo = filasDeCatalogo(fuente.iconoPuntos?.bits);
  if (catalogo) return { puntos: { lado: 16, filas: catalogo } };
  const nombrado = filasDeNombre(fuente.icon, fuente.dotGlyph);
  if (nombrado) return { puntos: { lado: 8, filas: nombrado } };
  const puntos = { lado: 8 as const, filas: filasDeAccion(fuente.actionType) };
  const texto = fuente.icon?.trim();
  return texto ? { puntos, iconTexto: texto } : { puntos };
}

/** `vd://images/…` → ruta servida por `/media/images/`. */
export function mapearImagen(imageData: string | undefined): string | undefined {
  if (!imageData) return undefined;
  if (imageData.startsWith('vd://images/')) {
    return `/media/images/${encodeURIComponent(imageData.slice('vd://images/'.length))}`;
  }
  if (imageData.startsWith('vd://')) {
    const resto = imageData.slice('vd://'.length).replace(/^images[/\\]/, '');
    return `/media/images/${encodeURIComponent(resto)}`;
  }
  return imageData;
}
