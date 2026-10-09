import { desktopCapturer } from 'electron';
import type { PistaCaptura, ResultadoVentanas, VentanaCaptura } from '../../src/types';

/**
 * Lista de ventanas que se pueden mostrar dentro del panel de música.
 *
 * Solo `window`, nunca `screen`: la pantalla completa no se ofrece. La miniatura
 * es pequeña a propósito: sirve para reconocer la ventana a ojo, no para verla.
 *
 * La candidata es la ventana cuyo título contiene el de la pista que suena (o
 * cuyo nombre contiene la fuente SMTC, p. ej. `Spotify.exe` o `MSEdge`). Sin
 * ninguna coincidencia devuelve `null` y la pantalla enseña el selector.
 */

const MINIATURA = { width: 160, height: 90 } as const;

/** Nombres de proceso que no aparecen tal cual en el título de su ventana. */
const ALIAS_FUENTE: Record<string, string> = {
  msedge: 'edge',
  chrome: 'chrome',
};

function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** `Spotify.exe` → `spotify`; `MSEdge` → `edge` (por alias). */
function fuenteComoBusqueda(fuente: string): string {
  const base = normalizarTexto(fuente.replace(/\.exe$/i, '').split('!').pop() ?? '');
  return ALIAS_FUENTE[base.replace(/\s/g, '')] ?? base;
}

/** Cuántas pistas apuntan a esta ventana. 0 = no tiene nada que ver. */
function puntuarVentana(nombre: string, pista: PistaCaptura): number {
  const ventana = normalizarTexto(nombre);
  if (!ventana) return 0;
  let puntos = 0;
  const titulo = normalizarTexto(pista.titulo);
  if (titulo.length >= 3 && ventana.includes(titulo)) puntos += 4;
  const fuente = fuenteComoBusqueda(pista.fuente);
  if (fuente && ventana.includes(fuente)) puntos += 2;
  return puntos;
}

/** La de más puntos; a igualdad, la primera de la lista. `null` si nada encaja. */
function elegirCandidata(ventanas: VentanaCaptura[], pista: PistaCaptura): string | null {
  let mejor: { id: string; puntos: number } | null = null;
  for (const v of ventanas) {
    const puntos = puntuarVentana(v.nombre, pista);
    if (puntos > 0 && (!mejor || puntos > mejor.puntos)) mejor = { id: v.id, puntos };
  }
  return mejor?.id ?? null;
}

/**
 * Ventanas capturables. `nombrePropio` es el título de la propia VirtualDeck:
 * capturarse a sí misma sería un bucle de espejos, así que se omite.
 */
export async function listarVentanasCaptura(
  nombrePropio: string,
  pista: PistaCaptura,
): Promise<ResultadoVentanas> {
  const fuentes = await desktopCapturer.getSources({ types: ['window'], thumbnailSize: MINIATURA });
  const ventanas: VentanaCaptura[] = fuentes
    .filter((f) => f.name.trim() !== '' && f.name !== nombrePropio)
    .map((f) => ({
      id: f.id,
      nombre: f.name,
      miniatura: f.thumbnail.isEmpty() ? '' : f.thumbnail.toDataURL(),
    }));
  return { ventanas, candidata: elegirCandidata(ventanas, pista) };
}
