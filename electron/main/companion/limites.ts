import type { CompanionMetadata } from '../../../src/types';

/**
 * Topes del servidor de la extensión compañera.
 *
 * El servidor escucha en el bucle local y lo alcanza **cualquier proceso de este
 * equipo**, no solo el navegador: sin límites, un cliente que se cuelgue o que
 * mande de más se come la memoria y el hilo principal —que es el que dibuja el
 * deck— antes de que nadie note nada. Aquí viven los topes y la limpieza de lo
 * que llega por el WebSocket, que es la única puerta que no lleva tipo.
 */

/** Tope del payload JPEG de un fotograma (4 MB). */
export const MAX_PAYLOAD_FRAME = 4 * 1024 * 1024;
/** Mensajes `meta` admitidos por segundo y socket (~20). */
export const MAX_META_POR_SEGUNDO = 20;
/** Lado máximo de un fotograma (uint16 en la cabecera, pero acotado por si acaso). */
const LADO_MAX_FRAME = 4096;
/** Tope de los textos de metadatos, para no guardarlos enteros en memoria. */
const MAX_TEXTO_META = 400;

function texto(v: unknown, tope = MAX_TEXTO_META): string {
  return typeof v === 'string' ? v.slice(0, tope) : '';
}

function numero(v: unknown, porDefecto = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : porDefecto;
}

function acotado(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/**
 * Los metadatos vienen de una extensión: son **datos**, no código, pero sí
 * llegan a una lista de reproducción y a un `<img>`. Se limpian campo a campo
 * —el tipo es el que decide— en vez de fiarse del `JSON.parse`.
 */
export function validarMetadatos(bruto: unknown): CompanionMetadata | null {
  if (typeof bruto !== 'object' || bruto === null || Array.isArray(bruto)) return null;
  const b = bruto as Record<string, unknown>;
  return {
    tipo: 'meta',
    tabId: typeof b.tabId === 'number' ? b.tabId : undefined,
    titulo: texto(b.titulo),
    artista: texto(b.artista),
    album: texto(b.album),
    posicionMs: Math.max(0, Math.round(numero(b.posicionMs))),
    duracionMs: Math.max(0, Math.round(numero(b.duracionMs))),
    reproduciendo: b.reproduciendo === true,
    volumen: acotado(numero(b.volumen, 1), 0, 1),
    silenciado: b.silenciado === true,
    caratulaUrl: texto(b.caratulaUrl, 512),
    tieneVideo: b.tieneVideo === true,
    fuente: texto(b.fuente, 32),
  };
}

/** ¿Cabe el fotograma en los topes? Si no, se descarta entero. */
export function cabeFrame(ancho: number, alto: number, payloadLen: number): boolean {
  if (ancho <= 0 || alto <= 0 || ancho > LADO_MAX_FRAME || alto > LADO_MAX_FRAME) return false;
  return payloadLen > 0 && payloadLen <= MAX_PAYLOAD_FRAME;
}

/**
 * Ventana deslizante de `porSegundo` eventos. Con `meta` llegando cada 250 ms
 * son cinco por segundo de verdad: el tope solo salta cuando el cliente se
 * descontrola, y entonces lo que se descarta son mensajes, no fotogramas.
 */
export function crearLimitador(porSegundo: number): () => boolean {
  let marcas: number[] = [];
  return () => {
    const ahora = Date.now();
    marcas = marcas.filter((t) => ahora - t < 1000);
    if (marcas.length >= porSegundo) return false;
    marcas.push(ahora);
    return true;
  };
}