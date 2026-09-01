import { useEffect, useState } from 'react';
import { useFieldText } from '../../utils/i18n';
import type { AudioDevice, RGBDeviceInfo, Sensor } from '../../types';

/**
 * Las tres listas que el editor pide al sistema para poder rellenar sus
 * selectores: salidas de audio, dispositivos RGB y sensores.
 *
 * Las tres son lo mismo —consultar algo de fuera y guardarlo— y las tres
 * estaban sueltas en `EditorB` con su estado y su efecto, entre los cuarenta y
 * tantos `useState` del formulario. Aqui van juntas porque comparten cuando se
 * piden (al cambiar de paso o de tipo de accion) y porque ninguna es parte del
 * boton que se esta editando: si fallan, el editor sigue funcionando.
 */
export interface Catalogos {
  audioDevices: AudioDevice[];
  loadingDevices: boolean;
  audioError: string | null;
  /** Volver a pedir la lista de salidas de audio; el paso 2 ofrece un boton. */
  loadAudioDevices: () => void;
  rgbDevices: RGBDeviceInfo[];
  rgbConnected: boolean;
  sensorList: Sensor[];
}

export function useCatalogos(
  actionType: string,
  step: number,
  /** Lo que se este mirando de sensores: al tocarlo se refresca el catalogo. */
  claveSensores: string,
): Catalogos {
  const tf = useFieldText();
  const api = window.electronAPI;

  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [rgbDevices, setRgbDevices] = useState<RGBDeviceInfo[]>([]);
  const [rgbConnected, setRgbConnected] = useState(false);
  const [sensorList, setSensorList] = useState<Sensor[]>([]);

  const loadAudioDevices = () => {
    if (!api) return;
    setLoadingDevices(true);
    setAudioError(null);
    api.audio.list().then((devs) => {
      setAudioDevices(devs);
      setLoadingDevices(false);
    }).catch(() => {
      setAudioError(tf('No se pudo obtener la lista. Compruebe que el audio esté activo o reinicie la aplicación.'));
      setLoadingDevices(false);
    });
  };

  useEffect(() => {
    if (actionType === 'audio-device' && audioDevices.length === 0 && api) loadAudioDevices();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionType, step]);

  useEffect(() => {
    if (!api) return;
    if (actionType !== 'rgb-color' && actionType !== 'rgb-mode') return;
    api.rgb.status().then((s) => {
      setRgbConnected(s.connected);
      if (s.connected) api.rgb.listDevices().then(setRgbDevices).catch(() => {});
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionType, step]);

  // El catalogo de LHM sale barato (el proceso principal lo cachea 1,5 s), asi
  // que se refresca en cuanto el usuario toca algo de sensores: el selector
  // aparece lleno al llegar al paso 2 y no una recarga despues.
  useEffect(() => {
    if (!api?.sensors) return;
    api.sensors.list().then(setSensorList).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveSensores, step]);

  return { audioDevices, loadingDevices, audioError, loadAudioDevices, rgbDevices, rgbConnected, sensorList };
}
