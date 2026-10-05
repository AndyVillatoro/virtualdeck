import { nucleo, type SesionAudioApp } from './native';
import { tm } from './idioma';

/**
 * Volumen de una app concreta (roadmap 63, parte TypeScript).
 *
 * Son envoltorios finos sobre el núcleo nativo (`crates/vd-core/src/audio/sesiones.rs`):
 * las tres operaciones **lanzan un error legible** cuando la app no tiene sonido
 * abierto (p. ej. `"spotify" no tiene sonido abierto`), y ese texto es lo que hay
 * que enseñar al usuario. Por eso no van por `intentarNativo`, que captura el
 * error y devuelve `undefined`: aquí se conserva el mensaje tal cual.
 *
 * Sin núcleo —o con uno viejo sin estas funciones— no hay respaldo en
 * PowerShell: enumerar sesiones por proceso exige recorrer `ISimpleAudioVolume`
 * por dispositivo, y eso no se hace con un `SendKeys`. Se devuelve un error
 * claro en el idioma de la aplicación.
 */

export type { SesionAudioApp };

type ResultadoNivel = { ok: true; nivel: number } | { ok: false; error: string };
type ResultadoSilencio = { ok: true; silenciada: boolean } | { ok: false; error: string };

function sinNucleo(): string {
  return tm('audio.sinNucleo');
}

function mensaje(e: unknown): string {
  const texto = e instanceof Error ? e.message : String(e ?? '');
  return texto.trim() || sinNucleo();
}

/** Apps con sonido abierto, una por proceso. Vacía sin núcleo: no hay respaldo. */
export function listarSesionesAudio(): SesionAudioApp[] {
  const n = nucleo();
  if (!n || typeof n.audioSessions !== 'function') return [];
  try {
    return n.audioSessions();
  } catch (err) {
    console.error('[volumenApp] audioSessions falló:', (err as Error).message);
    return [];
  }
}

/** Sube o baja el volumen de una app desde donde esté. Vacío = la de primer plano. */
export function ajustarVolumenApp(proceso: string, delta: number): ResultadoNivel {
  const n = nucleo();
  if (!n || typeof n.adjustAppVolume !== 'function') return { ok: false, error: sinNucleo() };
  try {
    return { ok: true, nivel: n.adjustAppVolume(proceso ?? '', Math.round(delta)) };
  } catch (e) {
    return { ok: false, error: mensaje(e) };
  }
}

/** Fija el volumen de una app (0-100). Vacío = la de primer plano. */
export function fijarVolumenApp(proceso: string, nivel: number): ResultadoNivel {
  const n = nucleo();
  if (!n || typeof n.setAppVolume !== 'function') return { ok: false, error: sinNucleo() };
  try {
    return { ok: true, nivel: n.setAppVolume(proceso ?? '', Math.round(nivel)) };
  } catch (e) {
    return { ok: false, error: mensaje(e) };
  }
}

/** Alterna el silencio de una app. Vacío = la de primer plano. */
export function alternarSilencioApp(proceso: string): ResultadoSilencio {
  const n = nucleo();
  if (!n || typeof n.toggleAppMute !== 'function') return { ok: false, error: sinNucleo() };
  try {
    return { ok: true, silenciada: n.toggleAppMute(proceso ?? '') };
  } catch (e) {
    return { ok: false, error: mensaje(e) };
  }
}
