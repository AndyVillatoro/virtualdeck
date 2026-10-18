import { OK, fail, type ActionResult, type Manejador } from './base';
import type { TFunc } from '../i18n';
import type { ButtonAction } from '../../types';
import { mismoDispositivoAudio, normalizarNombreAudio, type DispositivoAudioLike } from '../../comun/audioIcono';

/** Compatibilidad: estas puras viven en `src/comun/audioIcono.ts` (las usan
 * también la tecla LCD y el mando móvil); se re-exportan para no romper a
 * quien las importaba de aquí. */
export { mismoDispositivoAudio, normalizarNombreAudio } from '../../comun/audioIcono';


/**
 * Busca un dispositivo por nombre: primero exacto y, si no hay, por
 * coincidencia parcial —porque Windows le añade sufijos al nombre cuando el
 * dispositivo cambia de puerto—. La regla vivía dentro del manejador y no se
 * podía probar sin ejecutarlo; ahora es pura y la cubre `scripts/probar-audio.ts`.
 */
export function buscarDispositivoPorNombre<T extends DispositivoAudioLike>(
  devices: T[],
  nombre: string | undefined | null,
): T | undefined {
  const aguja = normalizarNombreAudio(nombre);
  if (!aguja) return undefined;
  return devices.find((d) => normalizarNombreAudio(d.name) === aguja)
    ?? devices.find((d) => normalizarNombreAudio(d.name).includes(aguja));
}

/**
 * Orden estable para rotar: por nombre y, en empate, por id. El orden del
 * sistema no vale —depende del arranque— y sin orden fijo el «siguiente»
 * cambiaría solo.
 */
export function ordenarDispositivosAudio<T extends DispositivoAudioLike>(devices: T[]): T[] {
  return [...devices].sort((a, b) =>
    normalizarNombreAudio(a.name).localeCompare(normalizarNombreAudio(b.name))
    || a.id.toLowerCase().localeCompare(b.id.toLowerCase()));
}

/**
 * Quita los excluidos de `cycle-all`. Cada entrada vale como id (sin caja) o
 * como nombre (normalizado, como `buscarDispositivoPorNombre`).
 */
export function sinExcluidosAudio<T extends DispositivoAudioLike>(
  devices: T[],
  excluidos: string[] | undefined,
): T[] {
  const agujas = (excluidos ?? [])
    .map((e) => (e ?? '').trim())
    .filter((e) => e !== '');
  if (agujas.length === 0) return devices;
  const ids = new Set(agujas.map((e) => e.toLowerCase()));
  const nombres = new Set(agujas.map(normalizarNombreAudio));
  return devices.filter((d) =>
    !ids.has(d.id.trim().toLowerCase()) && !nombres.has(normalizarNombreAudio(d.name)));
}

/**
 * El siguiente al actual, con envoltura. Si el actual no está en la lista
 * (cambió fuera del botón o está excluido), se empieza por el primero.
 */
export function siguienteDispositivoAudio<T extends DispositivoAudioLike>(
  candidatos: T[],
  actualId: string | undefined | null,
): T | undefined {
  if (candidatos.length === 0) return undefined;
  const i = candidatos.findIndex((d) => mismoDispositivoAudio(d.id, actualId));
  return candidatos[(i + 1) % candidatos.length];
}

/** La salida que manda ahora mismo, según la lista del sistema. */
export function idPredeterminadoAudio<T extends DispositivoAudioLike & { isDefault?: boolean }>(
  devices: T[],
): string | null {
  return devices.find((d) => d.isDefault)?.id ?? null;
}

/**
 * Los candidatos de `cycle-list` que están conectados ahora, en el orden de
 * la lista del editor. Cada candidato vale por id y, si el id cambió al
 * reconectar un USB, por nombre (la misma regla que el modo fijo).
 */
export function disponiblesDeListaAudio<T extends DispositivoAudioLike>(
  candidatos: Array<{ deviceId: string; deviceName: string }> | undefined,
  devices: T[],
): T[] {
  if (!candidatos || candidatos.length === 0) return [];
  const salida: T[] = [];
  for (const c of candidatos) {
    const porId = devices.find((d) => mismoDispositivoAudio(d.id, c.deviceId));
    const match = porId ?? buscarDispositivoPorNombre(devices, c.deviceName);
    if (match && !salida.some((d) => mismoDispositivoAudio(d.id, match.id))) salida.push(match);
  }
  return salida;
}

/** Fija la salida y devuelve su nombre para el aviso de la tecla (T-HW-21). */
async function fijarAudio(
  api: { audio: { setDefault: (id: string) => Promise<boolean> } },
  t: TFunc,
  id: string,
  nombre: string,
): Promise<ActionResult> {
  const ok = await api.audio.setDefault(id);
  return ok
    ? { ok: true, detalle: { texto: nombre } }
    : fail(t('act.err.switchAudio', { name: nombre }));
}

type ApiAudioLista = {
  audio: {
    list: () => Promise<Array<DispositivoAudioLike & { isDefault?: boolean }>>;
    setDefault: (id: string) => Promise<boolean>;
  };
};

/**
 * D-069 — turno para rotar.
 *
 * Dos pulsaciones casi simultáneas leían la misma salida actual y fijaban el
 * mismo «siguiente», así que la rotación saltaba un dispositivo. Las
 * rotaciones (`cycle-all`, `cycle-list`) se encadenan: cada una espera a la
 * anterior y lee el estado tras ella. La cola es solo para ciclos —el resto
 * de acciones de audio no espera— y nunca se rompe: el turno solo se
 * resuelve, jamás se rechaza.
 */
let turnoCiclo: Promise<void> = Promise.resolve();

/**
 * Switch de audio (T-AUD-03, Fase 1): rota a la siguiente salida.
 *
 * - `cycle-all`: todas las salidas activas en orden estable, sin excluidas.
 * - `cycle-list`: la lista del editor en su orden, sin desconectadas.
 */
async function ciclarAudio(
  action: ButtonAction,
  api: ApiAudioLista,
  t: TFunc,
  modo: 'cycle-all' | 'cycle-list',
): Promise<ActionResult> {
  const anterior = turnoCiclo;
  let soltar: () => void = () => {};
  turnoCiclo = new Promise<void>((res) => { soltar = res; });
  await anterior;
  try {
    const devices = await api.audio.list();
    const actual = idPredeterminadoAudio(devices);
    const candidatos = modo === 'cycle-all'
      ? sinExcluidosAudio(ordenarDispositivosAudio(devices), action.excludedDeviceIds)
      : disponiblesDeListaAudio(action.audioCandidates, devices);
    if (candidatos.length === 0) {
      if (modo === 'cycle-all') return fail(t('act.err.audioSinSalidas'));
      return fail(t('act.err.audioListaVacia'));
    }
    if (candidatos.length === 1) {
      if (modo === 'cycle-all') return fail(t('act.err.audioUnaSola', { name: candidatos[0].name }));
      return fail(t('act.err.audioListaCorta', { name: candidatos[0].name }));
    }
    const siguiente = siguienteDispositivoAudio(candidatos, actual);
    if (!siguiente) return fail(t('act.err.audioSinSalidas'));
    // Con `await`: el `return` a secas liberaría el turno en el `finally`
    // antes de que `setDefault` terminara, y la siguiente rotación volvería a
    // leer la salida vieja.
    const resuelto = await fijarAudio(api, t, siguiente.id, siguiente.name);
    return resuelto;
  } finally {
    soltar();
  }
}

/** Salida de audio y volumen. */
export const AUDIO: Record<string, Manejador> = {
  'audio-device': async ({ action, api, t }) => {
    const modo = action.audioMode ?? 'fixed';
    if (modo === 'cycle-all' || modo === 'cycle-list') return ciclarAudio(action, api, t, modo);
    if (!action.deviceId && !action.deviceName) return fail(t('act.err.noDevice'));
    // Con id guardado (lo normal: el editor guarda id + nombre) se intenta tal
    // cual. Si falla y hay nombre de respaldo, se reintenta por nombre: el id
    // de algunos USB cambia al reconectarlos (ver `find_audio_device_by_name`
    // en el núcleo) y antes eso dejaba el botón muerto sin decir por qué.
    if (action.deviceId) {
      if (await api.audio.setDefault(action.deviceId)) {
        return { ok: true, detalle: { texto: action.deviceName ?? action.deviceId } };
      }
      if (action.deviceName) {
        const devices = await api.audio.list();
        const match = buscarDispositivoPorNombre(devices, action.deviceName);
        if (match && !mismoDispositivoAudio(match.id, action.deviceId)) {
          if (await api.audio.setDefault(match.id)) {
            return { ok: true, detalle: { texto: match.name } };
          }
        }
      }
      return fail(t('act.err.switchAudio', { name: action.deviceName ?? action.deviceId }));
    }
    // Sin id (config vieja o nombre escrito a mano): por nombre.
    const devices = await api.audio.list();
    const match = buscarDispositivoPorNombre(devices, action.deviceName);
    if (!match) return fail(t('act.err.deviceNotFound', { name: action.deviceName ?? '' }));
    return fijarAudio(api, t, match.id, match.name);
  },

  'volume-set': async ({ action, api, t }) => {
    if (action.volumePercent === undefined) return fail(t('act.err.noVolume'));
    const ok = await api.launch.setVolume(action.volumePercent);
    return ok
      ? { ok: true, detalle: { etiqueta: t('disp.aviso.vol'), valor: action.volumePercent } }
      : fail(t('act.err.volume'));
  },

  /**
   * Volumen de una app concreta (lo que enseña el Mezclador de volumen).
   *
   * El error del núcleo se devuelve **tal cual**: ya es legible
   * (`"spotify" no tiene sonido abierto`) y traducirlo lo rompería. Solo se
   * usa la clave genérica cuando el puente no trae ningún texto.
   */
  'app-volume': async ({ action, api, t }) => {
    const proceso = (action.appVolumeTarget ?? '').trim();
    const modo = action.appVolumeMode ?? 'adjust';
    const quien = proceso.toUpperCase();
    if (modo === 'mute') {
      const r = await api.audio.toggleAppMute(proceso);
      return r.ok ? OK : fail(r.error || t('act.err.appVolume'));
    }
    if (modo === 'set') {
      if (action.appVolumeLevel === undefined) return fail(t('act.err.noVolume'));
      const r = await api.audio.setAppVolume(proceso, action.appVolumeLevel);
      return r.ok
        ? { ok: true, detalle: { etiqueta: quien, valor: action.appVolumeLevel } }
        : fail(r.error || t('act.err.appVolume'));
    }
    const delta = action.appVolumeDelta ?? 0;
    if (!delta) return fail(t('act.err.noDelta'));
    const r = await api.audio.adjustAppVolume(proceso, delta);
    // El nivel que devuelve el proceso principal es el que se enseña: es el
    // único sitio que lo sabe después del ajuste.
    if (r.ok && r.nivel !== undefined) {
      return { ok: true, detalle: { etiqueta: quien, valor: r.nivel } };
    }
    return r.ok ? OK : fail(r.error || t('act.err.appVolume'));
  },

  /**
   * Subir o bajar, en vez de fijar un valor.
   *
   * Es la diferencia entre «brillo al 70%» y «diez por ciento mas de lo que
   * haya». Para lo segundo hay que **leer** primero, y por eso hacia falta
   * exponer `getBrightness`/`getVolume`: el nucleo nativo ya sabia leerlos,
   * pero solo habia camino para escribir.
   *
   * Si el equipo no sabe decir el valor actual —una torre con el monitor por
   * HDMI no expone el brillo— se dice, en vez de fijar un numero inventado.
   */
  'adjust': async ({ action, api, t }) => {
    const delta = action.adjustDelta ?? 0;
    if (!delta) return fail(t('act.err.noDelta'));
    const brillo = action.adjustTarget !== 'volume';
    const actual = brillo ? await api.launch.getBrightness() : await api.launch.getVolume();
    // Resiliencia: si el monitor soporta control pero falla al leer (muy común en
    // DDC/CI con VCP de solo escritura o drivers modernos), usamos 50% de punto de partida
    // en lugar de bloquear la acción con error de lectura.
    const base = actual ?? (brillo ? 50 : null);
    if (base === null) {
      return fail(t(brillo ? 'act.err.noReadBrightness' : 'act.err.noReadVolume'));
    }
    const nuevo = Math.min(100, Math.max(0, Math.round(base + delta)));
    const ok = brillo ? await api.launch.brightness(nuevo) : await api.launch.setVolume(nuevo);
    return ok
      ? { ok: true, detalle: { etiqueta: t(brillo ? 'disp.aviso.brillo' : 'disp.aviso.vol'), valor: nuevo } }
      : fail(t(brillo ? 'act.err.brightness' : 'act.err.volume'));
  },
};

// Volumen relativo y mute siguen por SendKeys — no hay equivalente en SMTC.
for (const tipo of ['volume-up', 'volume-down', 'mute']) {
  AUDIO[tipo] = async ({ action, api, t }) => {
    const ok = await api.launch.mediaKey(action.type);
    return ok ? OK : fail(t('act.err.mediaKey', { tipo: action.type }));
  };
}
