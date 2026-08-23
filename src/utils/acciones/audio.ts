import { OK, fail, type Manejador } from './base';

/** Salida de audio y volumen. */
export const AUDIO: Record<string, Manejador> = {
  'audio-device': async ({ action, api, t }) => {
    if (!action.deviceId && !action.deviceName) return fail(t('act.err.noDevice'));
    let deviceId = action.deviceId;
    // Sin id guardado se busca por nombre: primero exacto, luego por
    // coincidencia parcial, porque Windows le añade sufijos al nombre del
    // dispositivo cuando cambia de puerto.
    if (!deviceId && action.deviceName) {
      const devices = await api.audio.list();
      const match = devices.find((d) => d.name.toLowerCase() === action.deviceName!.toLowerCase())
        ?? devices.find((d) => d.name.toLowerCase().includes(action.deviceName!.toLowerCase()));
      if (!match) return fail(t('act.err.deviceNotFound', { name: action.deviceName ?? '' }));
      deviceId = match.id;
    }
    const ok = await api.audio.setDefault(deviceId!);
    return ok ? OK : fail(t('act.err.switchAudio', { name: action.deviceName ?? deviceId }));
  },

  'volume-set': async ({ action, api, t }) => {
    if (action.volumePercent === undefined) return fail(t('act.err.noVolume'));
    const ok = await api.launch.setVolume(action.volumePercent);
    return ok ? OK : fail(t('act.err.volume'));
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
    if (actual === null || actual === undefined) {
      return fail(t(brillo ? 'act.err.noReadBrightness' : 'act.err.noReadVolume'));
    }
    const nuevo = Math.min(100, Math.max(0, Math.round(actual + delta)));
    const ok = brillo ? await api.launch.brightness(nuevo) : await api.launch.setVolume(nuevo);
    return ok ? OK : fail(t(brillo ? 'act.err.brightness' : 'act.err.volume'));
  },
};

// Volumen relativo y mute siguen por SendKeys — no hay equivalente en SMTC.
for (const tipo of ['volume-up', 'volume-down', 'mute']) {
  AUDIO[tipo] = async ({ action, api, t }) => {
    const ok = await api.launch.mediaKey(action.type);
    return ok ? OK : fail(t('act.err.mediaKey', { tipo: action.type }));
  };
}
