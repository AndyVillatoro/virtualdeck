import type { AudioMode, ButtonAction, ButtonConfig, EfectoPulsar } from '../types';

/**
 * Heurística de icono por tipo de salida y aspecto reactivo de audio,
 * compartidos por las cinco superficies (deck, kiosko, barra flotante, mando
 * móvil y tecla LCD del dock).
 *
 * Vive en `src/comun/` porque la usan los dos procesos y tienen que dar el
 * mismo resultado: el renderer (celda, `pintarTecla`, editor) y el proceso
 * principal (`iconosMando`, que no puede importar de `src/utils` ni de
 * `src/components` por la regla `main-no-renderer`). Puro: sin React, DOM,
 * electron ni Node (regla `comun-es-puro`).
 *
 * Los iconos son glifos DOT 8×8 (`DOT_GLYPHS_8X8`), no del catálogo 16×16:
 * la resolución del catálogo es asíncrona y estos resolvedores son síncronos
 * en los tres caminos de pintado.
 */

/** Lo mínimo para identificar un dispositivo: vale el del bridge y el nativo. */
export interface DispositivoAudioLike {
  id: string;
  name: string;
}

/**
 * Normaliza un nombre de dispositivo para comparar: Windows añade sufijos
 * según el puerto («(2- Arctis Nova Pro Wireless)») y el usuario puede
 * escribirlo con otras mayúsculas o espacios al hacerlo a mano.
 */
export function normalizarNombreAudio(s: string | undefined | null): string {
  return (s ?? '').trim().toLowerCase();
}

/**
 * Compara ids de endpoint de Windows sin distinguir mayúsculas ni espacios de
 * más: el id es estable, pero tras reinstalar drivers o reconectar un USB
 * puede volver con otra caja, y un `===` lo daría por distinto para siempre.
 */
export function mismoDispositivoAudio(a: string | undefined | null, b: string | undefined | null): boolean {
  const x = (a ?? '').trim();
  const y = (b ?? '').trim();
  return x !== '' && x.toLowerCase() === y.toLowerCase();
}

/** Icono y rótulo corto que deduce la heurística para una salida. */
export interface HeuristicaAudio {
  /** Glifo DOT 8×8 (`AUDIO_WAVE`, `MONITOR`, `USB_PLUG` o `SPEAKER`). */
  glifo: string;
  /** Rótulo corto para el sublabel (`CASCO`, `MONIT`, `USB`, `ALTAV`). */
  corto: string;
}

/**
 * Auto-asignación de icono por tipo de salida (spec §2.2): si el candidato no
 * trae icono propio, se deduce de su `deviceName`. Solo hay glifos 8×8
 * existentes (no se crea ninguno nuevo): los cascos usan `AUDIO_WAVE`.
 */
export function heuristicaAudioDispositivo(nombre: string | undefined | null): HeuristicaAudio {
  const n = normalizarNombreAudio(nombre);
  if (/auricular|headphone|headset|airpods|buds|arctis|cloud|kraken|cascos|audifono|diadema|earbuds/.test(n)) {
    return { glifo: 'AUDIO_WAVE', corto: 'CASCO' };
  }
  if (/hdmi|displayport|nvidia|amd high definition|tv|monitor|ultragear|odyssey|proyector/.test(n)) {
    return { glifo: 'MONITOR', corto: 'MONIT' };
  }
  if (/usb|dac|scarlett|fifine|elgato|quadcast|soundblaster/.test(n) || /\bwave\b/.test(n)) {
    return { glifo: 'USB_PLUG', corto: 'USB' };
  }
  return { glifo: 'SPEAKER', corto: 'ALTAV' };
}

/**
 * Lo que un botón de audio enseña de la salida activa: icono, colores y
 * sublabel. Los campos del candidato (Fase 1: `icon`, `iconoPuntos`,
 * `fgColor`, `bgColor`, `label`) ganan a la heurística cuando están.
 */
export interface AspectoAudio {
  icon?: string;
  iconoPuntos?: ButtonConfig['iconoPuntos'];
  fgColor?: string;
  bgColor?: string;
  sublabel?: string;
}

/**
 * Selector puro del aspecto reactivo (spec §2.2): qué enseña el botón según
 * la salida que manda ahora mismo (`activeAudioDeviceId`).
 *
 * - `fixed`: el aspecto de su salida cuando es la activa; si no, `null`.
 * - `cycle-list`: el aspecto del candidato activo (con su icono y etiqueta
 *   propios si los trae); si la activa no está en la lista, `null`.
 * - `cycle-all`: necesita el nombre de la activa (el renderer lo saca de
 *   `api.audio.list()`); sin nombre no hay heurística y es `null`.
 */
export function resolverAspectoAudio(
  action: ButtonAction,
  activeAudioDeviceId: string | undefined | null,
  nombreActivo?: string | undefined | null,
): AspectoAudio | null {
  if (action.type !== 'audio-device') return null;
  const modo = action.audioMode ?? 'fixed';
  if (modo === 'cycle-list') {
    const c = (action.audioCandidates ?? []).find((x) => mismoDispositivoAudio(x.deviceId, activeAudioDeviceId));
    if (!c) return null;
    const h = heuristicaAudioDispositivo(c.deviceName);
    return {
      icon: c.icon,
      iconoPuntos: c.iconoPuntos,
      fgColor: c.fgColor,
      bgColor: c.bgColor,
      sublabel: c.label ?? h.corto,
    };
  }
  if (modo === 'cycle-all') {
    if (!activeAudioDeviceId || !nombreActivo) return null;
    const h = heuristicaAudioDispositivo(nombreActivo);
    return { icon: h.glifo, sublabel: h.corto };
  }
  if (!action.deviceId || !mismoDispositivoAudio(action.deviceId, activeAudioDeviceId)) return null;
  const h = heuristicaAudioDispositivo(action.deviceName);
  return { icon: h.glifo, sublabel: h.corto };
}

/**
 * Aplica el aspecto reactivo sin pisar lo explícito del botón: su icono,
 * colores y sublabel propios mandan; el aspecto solo rellena lo que falta.
 * El sublabel del usuario se respeta aunque haya rótulo corto disponible.
 *
 * Además, un botón de ciclo (`cycle-all`/`cycle-list`) sin `efectoPulsar`
 * propio pulsa con `'onda'`: es el único aviso de una sola vez que soportan
 * las cinco superficies (celda, LCD y móvil), y marca la conmutación A → B
 * con el motor existente, sin CPU en reposo.
 */
/**
 * Lo mínimo para recibir el aspecto: el botón del deck y el del móvil.
 */
export interface ReceptorAspecto {
  icon?: string;
  iconoPuntos?: { bits: string; origen: string };
  fgColor?: string;
  bgColor?: string;
  sublabel?: string;
  efectoPulsar?: EfectoPulsar;
  action?: { type: string; audioMode?: AudioMode };
}

function esCicloAudio(boton: ReceptorAspecto): boolean {
  return boton.action?.type === 'audio-device' && (boton.action.audioMode ?? 'fixed') !== 'fixed';
}

export function aplicarAspectoAudio<T extends ReceptorAspecto>(boton: T, aspecto: AspectoAudio | null): T {
  const ciclo = esCicloAudio(boton);
  if (!aspecto) {
    if (ciclo && boton.efectoPulsar === undefined) return { ...boton, efectoPulsar: 'onda' };
    return boton;
  }
  return {
    ...boton,
    icon: boton.icon ?? aspecto.icon,
    iconoPuntos: boton.iconoPuntos ?? aspecto.iconoPuntos,
    fgColor: boton.fgColor ?? aspecto.fgColor,
    bgColor: boton.bgColor ?? aspecto.bgColor,
    sublabel: boton.sublabel?.trim() ? boton.sublabel : (aspecto.sublabel ?? boton.sublabel),
    efectoPulsar: boton.efectoPulsar ?? (ciclo ? 'onda' : undefined),
  };
}
