import { refreshDevices } from './conexion';
import { estado } from './estado';
import { tm } from '../sistema/idioma';
import type { RGBDeviceInfo } from './tipos';

export async function listDevices(): Promise<RGBDeviceInfo[]> {
  if (!estado.client?.isConnected) return [];
  return refreshDevices();
}

/**
 * Reescaneo de verdad: pedir al servidor que detecte hardware de nuevo.
 *
 * Releer la lista (`listDevices`) no encuentra nada conectado después de
 * arrancar el servidor —OpenRGB detecta al inicio y luego sirve lo que vio—,
 * así que el botón de reescanear no traía nunca nada nuevo. `requestRescan`
 * sí dispara la detección en el servidor; como es asíncrona, se espera a que
 * cambie la cuenta (o al tope) y se relee todo, zonas y LEDs incluidos.
 */
export async function rescanDevices(): Promise<{ count: number; error?: string }> {
  if (!estado.client?.isConnected) return { count: 0, error: tm('rgb.sinConexion') };
  try {
    let antes = estado.devicesCache.length;
    try { antes = await estado.client.getControllerCount(); } catch {}
    estado.client.requestRescan();
    const TOPE = 8000;
    const PASO = 500;
    for (let ms = 0; ms < TOPE; ms += PASO) {
      await new Promise((r) => setTimeout(r, PASO));
      if (!estado.client?.isConnected) break;
      try {
        if ((await estado.client.getControllerCount()) !== antes) break;
      } catch { break; }
    }
    const lista = await refreshDevices();
    return { count: lista.length };
  } catch (e) {
    return { count: estado.devicesCache.length, error: (e as Error).message };
  }
}

export async function resizeZone(deviceId: number, zoneId: number, size: number): Promise<boolean> {
  if (!estado.client?.isConnected) return false;
  try {
    estado.client.resizeZone(deviceId, zoneId, size);
    await refreshDevices();
    return true;
  } catch (e) {
    estado.lastError = (e as Error).message;
    return false;
  }
}