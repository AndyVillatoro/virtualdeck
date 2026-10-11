import type Device from 'openrgb-sdk/dist/device';
import { hexToRgb } from './color';
import { estado } from './estado';
import type { RGBDeviceInfo, RGBProfile } from './tipos';

async function applyDeviceProfileMode(
  rawDev: Device,
  devInfo: RGBDeviceInfo,
  state: { mode: string; brightness?: number },
): Promise<boolean> {
  if (!estado.client) return false;
  const rawMode = rawDev.modes.find((x) => x.name.toLowerCase() === state.mode.toLowerCase());
  if (!rawMode) return true;

  const update: any = { id: rawMode.id };
  if (state.brightness !== undefined && rawMode.brightnessMin !== undefined && rawMode.brightnessMax !== undefined) {
    const range = rawMode.brightnessMax - rawMode.brightnessMin;
    update.brightness = Math.round(rawMode.brightnessMin + (range * Math.max(0, Math.min(100, state.brightness)) / 100));
  }
  try {
    await estado.client.updateMode(rawDev.deviceId, update);
    devInfo.activeMode = rawMode.id;
    return true;
  } catch {
    return false;
  }
}

function applyDeviceProfileZones(
  deviceId: number,
  zones: Array<{ zoneId: number; colors: string[] }>,
): boolean {
  if (!estado.client) return false;
  let ok = true;
  for (const z of zones) {
    try {
      const arr = z.colors.map(hexToRgb);
      if (arr.length > 0) estado.client.updateZoneLeds(deviceId, z.zoneId, arr);
    } catch {
      ok = false;
    }
  }
  return ok;
}

export async function applyProfile(profile: RGBProfile): Promise<boolean> {
  if (!estado.client?.isConnected) return false;
  try {
    let okAll = true;
    // Un perfil guarda los dispositivos **por nombre**. Si se cambio el equipo,
    // se renombro una placa o simplemente no hay nada conectado, el bucle se
    // saltaba todo y devolvia `true`: el boton de perfil decia que se aplico.
    let alguno = false;
    for (const rawDev of estado.devicesRaw) {
      const devInfo = estado.devicesCache.find((d) => d.id === rawDev.deviceId);
      const state = profile.devices[rawDev.name];
      if (!state || !devInfo) continue;
      alguno = true;

      const modeOk = await applyDeviceProfileMode(rawDev, devInfo, state);
      if (!modeOk) okAll = false;

      const zonesOk = applyDeviceProfileZones(rawDev.deviceId, state.zones);
      if (!zonesOk) okAll = false;
    }
    return okAll && alguno;
  } catch (e) {
    estado.lastError = (e as Error).message;
    return false;
  }
}