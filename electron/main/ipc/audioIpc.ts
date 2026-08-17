import { ipcMain } from 'electron';
import { listAudioDevices, setDefaultAudioDevice } from '../audio';
import { hayNucleo } from '../native';
import type { AudioDevice } from '../../../src/types';

/**
 * Caché de la lista de dispositivos de audio.
 *
 * ## Por qué su duración depende del núcleo
 *
 * Esta caché existía por una sola razón: cada consulta lanzaba un
 * `powershell.exe` —entre 150 y 400 ms— y la rejilla pregunta cada 5 s. Treinta
 * segundos de caché escondían ese coste, a cambio de que enchufar unos
 * auriculares tardara medio minuto en notarse.
 *
 * Con el núcleo nativo la consulta tarda unos 2 ms. Mantener 30 segundos ahí
 * sería quedarse con el inconveniente después de haber quitado el motivo.
 *
 * Se conserva una caché **corta** porque varios botones pueden preguntar en el
 * mismo instante y no tiene sentido consultar el sistema una vez por cada uno.
 */
const TTL_NATIVO_MS = 1_000;
const TTL_POWERSHELL_MS = 30_000;

let _cache: { devices: AudioDevice[]; ts: number } | null = null;

function ttl(): number {
  return hayNucleo() ? TTL_NATIVO_MS : TTL_POWERSHELL_MS;
}

export function registerAudioIpc() {
  ipcMain.handle('audio:list', async (_e: any, force = false) => {
    const now = Date.now();
    if (!force && _cache && now - _cache.ts < ttl()) return _cache.devices;
    const devices = await listAudioDevices();
    _cache = { devices, ts: now };
    return devices;
  });

  ipcMain.handle('audio:setDefault', async (_e: any, deviceId: string) => {
    const ok = await setDefaultAudioDevice(deviceId);
    if (ok) _cache = null; // invalidate so next list() sees the new default
    return ok;
  });
}
