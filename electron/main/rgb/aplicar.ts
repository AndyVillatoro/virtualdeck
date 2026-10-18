import type Device from 'openrgb-sdk/dist/device';
import type { Mode, RGBColor } from 'openrgb-sdk/dist/device';
import {
  aplicarBrilloYVelocidad, buildModeColors, CM_NONE, CM_PER_LED, CM_PER_MODE, CM_RANDOM,
  hexToRgb, rgbToHex,
} from './color';
import { estado } from './estado';
import { tm } from '../sistema/idioma';
import type { RGBDeviceInfo } from './tipos';

/**
 * Pinta un dispositivo entero de un color.
 *
 * `duradero` cambia **qué modo se elige**, y con ello si el color sobrevive a
 * que VirtualDeck se cierre:
 *
 *   · `Direct` no guarda nada en el dispositivo: es OpenRGB alimentando los LEDs
 *     en vivo. En cuanto el servidor muere —y VirtualDeck lo arranca él mismo y
 *     lo mata al salir— la tira se queda sin quien la mande y se apaga.
 *   · `Static` (y `Custom` en algunos) escribe el color *dentro del modo* del
 *     propio controlador, que lo sigue mostrando sin nadie conectado.
 *
 * Por eso el botón de acción «Color RGB» pide `duradero`: lo que el usuario
 * quiere es dejar las luces de ese color, no mientras la aplicación esté
 * abierta. El pintado en vivo del gestor RGB **no** lo pide, porque ahí se está
 * experimentando LED a LED y Direct es justo lo que hace falta.
 *
 * Devuelve false si no se pudo aplicar. Con `duradero`, si el dispositivo solo
 * ofrece Direct se aplica igual (mejor encender que no hacer nada) pero se
 * apunta en `lastError` que ese no se va a quedar.
 */
function applyLedsToDevice(dev: RGBDeviceInfo, rgb: RGBColor): boolean {
  if (!estado.client) return false;
  const totalLeds = dev.colors.length || dev.zones.reduce((s, z) => s + z.ledCount, 0);
  if (totalLeds <= 0) return false;
  const arr = new Array(totalLeds).fill(null).map(() => ({ ...rgb }));
  estado.client.updateLeds(dev.id, arr);
  dev.colors = arr.map(rgbToHex);
  return true;
}

async function applyModeColor(dev: RGBDeviceInfo, mode: Mode, color: string): Promise<boolean> {
  if (!estado.client) return false;
  const arr = buildModeColors(mode, color);
  await estado.client.updateMode(dev.id, { id: mode.id, colors: arr });
  dev.activeMode = mode.id;
  dev.colors = arr.map(rgbToHex);
  return true;
}

async function applyInActiveMode(
  dev: RGBDeviceInfo,
  rawDev: Device,
  rgb: RGBColor,
  color: string,
  duradero: boolean,
): Promise<boolean | null> {
  const rawActiveMode = rawDev.modes.find((m) => m.id === dev.activeMode);
  if (!rawActiveMode) return null;

  const isPerLed = rawActiveMode.colorMode === CM_PER_LED || /^(direct|custom)$/i.test(rawActiveMode.name);
  const isPerMode = rawActiveMode.colorMode === CM_PER_MODE;
  // Con `duradero`, seguir en Direct es exactamente el fallo que se quiere
  // evitar: hay que salir de ahí aunque ya estemos dentro.
  const seQueda = !duradero || !/^direct$/i.test(rawActiveMode.name);

  // Direct/Custom mode: set LEDs directly without switching modes (preserves mode)
  if (isPerLed && seQueda) {
    if (applyLedsToDevice(dev, rgb)) return true;
  }

  // Static/Breathing/any per-mode effect: update color through the mode (GPU path, preserves effect)
  if (isPerMode) {
    return applyModeColor(dev, rawActiveMode, color);
  }

  return null;
}

async function applyCustomFallbackMode(dev: RGBDeviceInfo, rgb: RGBColor): Promise<boolean> {
  if (!estado.client) return false;
  estado.client.setCustomMode(dev.id);
  await new Promise((r) => setTimeout(r, 60));
  applyLedsToDevice(dev, rgb);
  return true;
}

async function switchAndApplyColor(
  dev: RGBDeviceInfo,
  rawDev: Device,
  rgb: RGBColor,
  color: string,
  duradero: boolean,
): Promise<boolean> {
  if (!estado.client) return false;
  // Need to switch to a color-capable mode.
  // Orden normal: Direct (per-LED, instantáneo) > Static > Custom > setCustomMode.
  // Con `duradero` se invierte: primero los que el dispositivo se queda.
  const directMode  = rawDev.modes.find((m) => /^direct$/i.test(m.name));
  const staticMode  = rawDev.modes.find((m) => /^static$/i.test(m.name));
  const customMode  = rawDev.modes.find((m) => /^custom$/i.test(m.name));

  if (duradero && (staticMode || customMode)) {
    const modo = (staticMode ?? customMode)!;
    return applyModeColor(dev, modo, color);
  }
  if (duradero && directMode) {
    estado.lastError = `${dev.name}: ${tm('rgb.onlyDirect')}`;
  }

  if (directMode) {
    if (dev.activeMode !== directMode.id) {
      await estado.client.updateMode(dev.id, { id: directMode.id });
      dev.activeMode = directMode.id;
    }
    return applyLedsToDevice(dev, rgb);
  }
  if (staticMode) {
    return applyModeColor(dev, staticMode, color);
  }
  if (customMode) {
    return applyModeColor(dev, customMode, color);
  }

  return applyCustomFallbackMode(dev, rgb);
}

async function setAllDevicesColor(color: string, duradero: boolean): Promise<boolean> {
  let alguno = false;
  for (const d of estado.devicesCache) {
    if (await setDeviceColor(d.id, color, duradero)) alguno = true;
  }
  return alguno;
}

export async function setDeviceColor(
  deviceId: number, color: string, duradero = false,
): Promise<boolean> {
  if (!estado.client?.isConnected) return false;
  try {
    if (deviceId < 0) {
      // Se tiraba el resultado de cada uno y se devolvia `true` a secas: sin
      // ningun dispositivo detectado —OpenRGB sin administrador no ve casi
      // nada— el boton decia que habia pintado. Basta con que uno lo acepte;
      // que a otro le falte el modo no es un error que valga la pena enseñar.
      return setAllDevicesColor(color, duradero);
    }
    const dev = estado.devicesCache.find((d) => d.id === deviceId);
    const rawDev = estado.devicesRaw.find((d) => d.deviceId === deviceId);
    if (!dev || !rawDev) return false;

    const rgb = hexToRgb(color);
    const appliedActive = await applyInActiveMode(dev, rawDev, rgb, color, duradero);
    if (appliedActive !== null) return appliedActive;

    return await switchAndApplyColor(dev, rawDev, rgb, color, duradero);
  } catch (e) {
    estado.lastError = (e as Error).message;
    return false;
  }
}

export async function setZoneColors(deviceId: number, zoneId: number, colors: string[]): Promise<boolean> {
  if (!estado.client?.isConnected) return false;
  try {
    const arr = colors.map(hexToRgb);
    estado.client.updateZoneLeds(deviceId, zoneId, arr);
    return true;
  } catch (e) {
    estado.lastError = (e as Error).message;
    return false;
  }
}

export async function setSingleLed(deviceId: number, ledId: number, color: string): Promise<boolean> {
  if (!estado.client?.isConnected) return false;
  try {
    estado.client.updateSingleLed(deviceId, ledId, hexToRgb(color));
    return true;
  } catch (e) {
    estado.lastError = (e as Error).message;
    return false;
  }
}

export async function setMode(
  deviceId: number, mode: string, color?: string, brightness?: number, speed?: number,
): Promise<boolean> {
  if (!estado.client?.isConnected) return false;
  try {
    if (deviceId < 0) {
      let alguno = false;
      for (const d of estado.devicesCache) if (await setMode(d.id, mode, color, brightness, speed)) alguno = true;
      return alguno;
    }
    const dev = estado.devicesCache.find((d) => d.id === deviceId);
    const rawDev = estado.devicesRaw.find((d) => d.deviceId === deviceId);
    if (!dev || !rawDev) return false;

    const rawMode = rawDev.modes.find((x) => x.name.toLowerCase() === mode.toLowerCase());
    if (!rawMode) return false;

    const update: any = { id: rawMode.id };

    // Only include colors when the mode actually accepts user color input
    if (color && rawMode.colorMode !== CM_NONE && rawMode.colorMode !== CM_RANDOM) {
      update.colors = buildModeColors(rawMode, color);
    }

    aplicarBrilloYVelocidad(update, rawMode, brightness, speed);

    await estado.client.updateMode(deviceId, update);
    dev.activeMode = rawMode.id;
    return true;
  } catch (e) {
    estado.lastError = (e as Error).message;
    return false;
  }
}