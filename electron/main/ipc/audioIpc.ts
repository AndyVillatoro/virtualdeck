import { ipcMain } from 'electron';
import { listAudioDevices, setDefaultAudioDevice } from '../audio';
import type { AudioDevice } from '../../../src/types';

// 30-second TTL cache — avoids spawning a PowerShell process on every 5 s
// MainB polling tick. Cache is invalidated whenever setDefault succeeds.
let _cache: { devices: AudioDevice[]; ts: number } | null = null;
const CACHE_TTL_MS = 30_000;

export function registerAudioIpc() {
  ipcMain.handle('audio:list', async (_e: any, force = false) => {
    const now = Date.now();
    if (!force && _cache && now - _cache.ts < CACHE_TTL_MS) return _cache.devices;
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
