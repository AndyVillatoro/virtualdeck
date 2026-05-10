import { spawn, ChildProcess } from 'child_process';
import { Client, utils as orgbUtils } from 'openrgb-sdk';
import type Device from 'openrgb-sdk/dist/device';
import type { Mode, RGBColor } from 'openrgb-sdk/dist/device';

// OpenRGB colorMode constants
const CM_NONE    = 0; // autonomous effect (Spectrum Cycle, Rainbow) — no user color input
const CM_PER_LED = 1; // per-LED control (Direct, Custom) — use updateLeds
const CM_PER_MODE = 2; // per-mode colors (Static, Breathing) — pass via updateMode.colors
const CM_RANDOM  = 3; // random colors — no user input

// ── Tipos espejo de src/types.ts (para que main no dependa del renderer) ───
export interface RGBStatus {
  connected: boolean;
  serverRunning: boolean;
  deviceCount: number;
  host: string;
  port: number;
  error?: string;
}
export interface RGBZoneInfo {
  id: number; name: string; type: number; ledCount: number;
  ledsMin: number; ledsMax: number; resizable: boolean;
}
export interface RGBModeInfo {
  id: number; name: string; flags: number; colorMode: number;
  brightnessMin?: number; brightnessMax?: number;
  speedMin?: number; speedMax?: number;
}
export interface RGBDeviceInfo {
  id: number; name: string; type: number; typeLabel: string;
  vendor?: string; description: string; activeMode: number;
  zones: RGBZoneInfo[]; modes: RGBModeInfo[];
  colors: string[]; ledNames: string[];
}
export interface RGBProfile {
  id: string; name: string;
  devices: Record<string, {
    mode: string; brightness?: number;
    zones: Array<{ zoneId: number; zoneName: string; colors: string[] }>;
  }>;
}

// ── Estado del módulo (singleton, vive en main process) ────────────────────
let client: Client | null = null;
let serverProc: ChildProcess | null = null;
let host = '127.0.0.1';
let port = 6742;
let lastError: string | undefined;
let devicesCache: RGBDeviceInfo[] = [];
let devicesRaw: Device[] = [];   // full Device objects with complete Mode data
let onDeviceListUpdated: (() => void) | null = null;

// Auto-reconnect: when the SDK connection drops unexpectedly, retry every 8s.
// Cleared when the user explicitly calls disconnect().
let shouldAutoReconnect = false;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

function stopReconnect() {
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  shouldAutoReconnect = false;
}

// Tear down a Client so listeners we attached don't fire again on the dead
// instance (which used to leak callbacks each reconnect cycle). EventEmitter
// API on the SDK Client — removeAllListeners is safe even if not all of our
// events are registered.
function teardownClient(c: Client | null) {
  if (!c) return;
  try { (c as any).removeAllListeners?.(); } catch {}
  try { c.disconnect(); } catch {}
}

function attachClientListeners(c: Client) {
  c.on('error', (err: Error) => { lastError = err.message; });
  c.on('disconnect', () => { devicesCache = []; devicesRaw = []; scheduleReconnect(); });
  c.on('deviceListUpdated', () => {
    refreshDevices().then(() => { onDeviceListUpdated?.(); }).catch(() => {});
  });
}

function scheduleReconnect() {
  // Order matters: check the timer first so concurrent calls (e.g. a
  // disconnect event firing while another scheduleReconnect is in-flight)
  // don't queue duplicate timers.
  if (reconnectTimer) return;
  if (!shouldAutoReconnect || client?.isConnected) return;
  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    if (!shouldAutoReconnect || client?.isConnected) return;
    try {
      teardownClient(client);
      client = null;
      const c = new Client('VirtualDeck', port, host);
      attachClientListeners(c);
      await c.connect(3000);
      client = c;
      await refreshDevices();
      onDeviceListUpdated?.();
    } catch {
      scheduleReconnect();
    }
  }, 8000);
}

// ── Helpers ────────────────────────────────────────────────────────────────
function rgbToHex(c: RGBColor): string {
  const t = (n: number) => Math.max(0, Math.min(255, n | 0)).toString(16).padStart(2, '0');
  return `#${t(c.red)}${t(c.green)}${t(c.blue)}`;
}

function hexToRgb(hex: string): RGBColor {
  return orgbUtils.hexColor(hex.replace('#', ''));
}

function deviceTypeLabel(t: number): string {
  const map = orgbUtils.deviceType as Record<string, number>;
  for (const [k, v] of Object.entries(map)) if (v === t) return k;
  return 'unknown';
}

function deviceToInfo(d: Device): RGBDeviceInfo {
  return {
    id: d.deviceId,
    name: d.name,
    type: d.type,
    typeLabel: deviceTypeLabel(d.type),
    vendor: d.vendor,
    description: d.description,
    activeMode: d.activeMode,
    zones: d.zones.map((z) => ({
      id: z.id, name: z.name, type: z.type,
      ledCount: z.ledsCount, ledsMin: z.ledsMin, ledsMax: z.ledsMax,
      resizable: !!z.resizable || z.ledsMin !== z.ledsMax,
    })),
    modes: d.modes.map((m) => ({
      id: m.id, name: m.name, flags: m.flags, colorMode: m.colorMode,
      brightnessMin: m.brightnessMin, brightnessMax: m.brightnessMax,
      speedMin: (m as any).speedMin, speedMax: (m as any).speedMax,
    })),
    colors: d.colors.map(rgbToHex),
    ledNames: d.leds.map((l) => l.name),
  };
}

// Build a correctly-sized RGBColor[] for a mode, all set to the given hex color.
function buildModeColors(rawMode: Mode, hex: string): RGBColor[] {
  const rgb = hexToRgb(hex);
  const count = Math.max(1, rawMode.colors.length);
  return new Array(count).fill(null).map(() => ({ ...rgb }));
}

async function refreshDevices(): Promise<RGBDeviceInfo[]> {
  if (!client || !client.isConnected) return [];
  try {
    const all = await client.getAllControllerData();
    devicesRaw = all;
    devicesCache = all.map(deviceToInfo);
    return devicesCache;
  } catch (e) {
    lastError = (e as Error).message;
    return [];
  }
}

// ── API pública ────────────────────────────────────────────────────────────
export function status(): RGBStatus {
  return {
    connected: !!client?.isConnected,
    serverRunning: !!serverProc && !serverProc.killed,
    deviceCount: devicesCache.length,
    host, port,
    error: lastError,
  };
}

export async function connect(h?: string, p?: number): Promise<RGBStatus> {
  if (h) host = h;
  if (p) port = p;
  lastError = undefined;
  if (client?.isConnected) {
    await refreshDevices();
    return status();
  }
  try {
    teardownClient(client);
    client = null;
    const c = new Client('VirtualDeck', port, host);
    attachClientListeners(c);
    await c.connect(3000);
    client = c;
    shouldAutoReconnect = true;
    await refreshDevices();
    return status();
  } catch (e) {
    lastError = (e as Error).message;
    client = null;
    return status();
  }
}

export async function disconnect(): Promise<void> {
  stopReconnect();
  teardownClient(client);
  client = null;
  devicesCache = [];
  devicesRaw = [];
}

export async function spawnServer(exePath?: string): Promise<{ ok: boolean; error?: string }> {
  if (serverProc && !serverProc.killed) return { ok: true };
  if (!exePath) return { ok: false, error: 'Falta la ruta a OpenRGB.exe' };
  try {
    const args = ['--server', '--server-port', String(port)];
    const child = spawn(exePath, args, { detached: false, stdio: 'ignore', windowsHide: true });
    child.on('exit', () => { if (serverProc === child) serverProc = null; });
    child.on('error', (err) => { lastError = `OpenRGB spawn: ${err.message}`; });
    serverProc = child;
    await new Promise((r) => setTimeout(r, 1200));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function killServer(): Promise<void> {
  await disconnect();
  if (serverProc && !serverProc.killed) {
    try { serverProc.kill(); } catch {}
  }
  serverProc = null;
}

export async function listDevices(): Promise<RGBDeviceInfo[]> {
  if (!client?.isConnected) return [];
  return refreshDevices();
}

export async function setDeviceColor(deviceId: number, color: string): Promise<boolean> {
  if (!client?.isConnected) return false;
  try {
    if (deviceId < 0) {
      for (const d of devicesCache) await setDeviceColor(d.id, color);
      return true;
    }
    const dev = devicesCache.find((d) => d.id === deviceId);
    const rawDev = devicesRaw.find((d) => d.deviceId === deviceId);
    if (!dev || !rawDev) return false;

    const rgb = hexToRgb(color);
    const rawActiveMode = rawDev.modes.find((m) => m.id === dev.activeMode);

    if (rawActiveMode) {
      const isPerLed = rawActiveMode.colorMode === CM_PER_LED || /^(direct|custom)$/i.test(rawActiveMode.name);
      const isPerMode = rawActiveMode.colorMode === CM_PER_MODE;

      // Direct/Custom mode: set LEDs directly without switching modes (preserves mode)
      if (isPerLed) {
        const totalLeds = dev.colors.length || dev.zones.reduce((s, z) => s + z.ledCount, 0);
        if (totalLeds > 0) {
          const arr = new Array(totalLeds).fill(null).map(() => ({ ...rgb }));
          client.updateLeds(deviceId, arr);
          dev.colors = arr.map(rgbToHex);
          return true;
        }
      }

      // Static/Breathing/any per-mode effect: update color through the mode (GPU path, preserves effect)
      if (isPerMode) {
        const arr = buildModeColors(rawActiveMode, color);
        await client.updateMode(deviceId, { id: rawActiveMode.id, colors: arr });
        dev.colors = arr.map(rgbToHex);
        return true;
      }

      // colorMode NONE or RANDOM — can't set color in current mode, fall through to mode switch
    }

    // Need to switch to a color-capable mode.
    // Priority: Direct (per-LED) > Static (per-mode, GPU style) > Custom > setCustomMode
    const directMode  = rawDev.modes.find((m) => /^direct$/i.test(m.name));
    const staticMode  = rawDev.modes.find((m) => /^static$/i.test(m.name));
    const customMode  = rawDev.modes.find((m) => /^custom$/i.test(m.name));

    if (directMode) {
      if (dev.activeMode !== directMode.id) {
        await client.updateMode(deviceId, { id: directMode.id });
        dev.activeMode = directMode.id;
      }
      const totalLeds = dev.colors.length || dev.zones.reduce((s, z) => s + z.ledCount, 0);
      if (totalLeds > 0) {
        const arr = new Array(totalLeds).fill(null).map(() => ({ ...rgb }));
        client.updateLeds(deviceId, arr);
        dev.colors = arr.map(rgbToHex);
        return true;
      }
    } else if (staticMode) {
      // GPU-style (Zotac, ASUS, etc.): color passed inside updateMode, not via updateLeds
      const arr = buildModeColors(staticMode, color);
      await client.updateMode(deviceId, { id: staticMode.id, colors: arr });
      dev.activeMode = staticMode.id;
      dev.colors = arr.map(rgbToHex);
      return true;
    } else if (customMode) {
      const arr = buildModeColors(customMode, color);
      await client.updateMode(deviceId, { id: customMode.id, colors: arr });
      dev.activeMode = customMode.id;
      dev.colors = arr.map(rgbToHex);
      return true;
    } else {
      client.setCustomMode(deviceId);
      await new Promise((r) => setTimeout(r, 60));
      const totalLeds = dev.colors.length || dev.zones.reduce((s, z) => s + z.ledCount, 0);
      if (totalLeds > 0) {
        const arr = new Array(totalLeds).fill(null).map(() => ({ ...rgb }));
        client.updateLeds(deviceId, arr);
        dev.colors = arr.map(rgbToHex);
      }
      return true;
    }

    return false;
  } catch (e) {
    lastError = (e as Error).message;
    return false;
  }
}

export async function setZoneColors(deviceId: number, zoneId: number, colors: string[]): Promise<boolean> {
  if (!client?.isConnected) return false;
  try {
    const arr = colors.map(hexToRgb);
    client.updateZoneLeds(deviceId, zoneId, arr);
    return true;
  } catch (e) {
    lastError = (e as Error).message;
    return false;
  }
}

export async function setSingleLed(deviceId: number, ledId: number, color: string): Promise<boolean> {
  if (!client?.isConnected) return false;
  try {
    client.updateSingleLed(deviceId, ledId, hexToRgb(color));
    return true;
  } catch (e) {
    lastError = (e as Error).message;
    return false;
  }
}

export async function setMode(
  deviceId: number, mode: string, color?: string, brightness?: number, speed?: number,
): Promise<boolean> {
  if (!client?.isConnected) return false;
  try {
    if (deviceId < 0) {
      for (const d of devicesCache) await setMode(d.id, mode, color, brightness, speed);
      return true;
    }
    const dev = devicesCache.find((d) => d.id === deviceId);
    const rawDev = devicesRaw.find((d) => d.deviceId === deviceId);
    if (!dev || !rawDev) return false;

    const rawMode = rawDev.modes.find((x) => x.name.toLowerCase() === mode.toLowerCase());
    if (!rawMode) return false;

    const update: any = { id: rawMode.id };

    // Only include colors when the mode actually accepts user color input
    if (color && rawMode.colorMode !== CM_NONE && rawMode.colorMode !== CM_RANDOM) {
      update.colors = buildModeColors(rawMode, color);
    }

    if (brightness !== undefined && rawMode.brightnessMin !== undefined && rawMode.brightnessMax !== undefined) {
      const range = rawMode.brightnessMax - rawMode.brightnessMin;
      update.brightness = Math.round(rawMode.brightnessMin + (range * Math.max(0, Math.min(100, brightness)) / 100));
    }

    // Speed: 0..100 user-facing, mapped onto the mode's [speedMin, speedMax].
    // Note: in OpenRGB the protocol value runs *backwards* — speedMin is the
    // FASTEST end and speedMax the slowest. Invert so 100 = fastest.
    const sMin = (rawMode as any).speedMin;
    const sMax = (rawMode as any).speedMax;
    if (speed !== undefined && sMin !== undefined && sMax !== undefined && sMax !== sMin) {
      const pct = Math.max(0, Math.min(100, speed));
      update.speed = Math.round(sMax - ((sMax - sMin) * pct / 100));
    }

    await client.updateMode(deviceId, update);
    dev.activeMode = rawMode.id;
    return true;
  } catch (e) {
    lastError = (e as Error).message;
    return false;
  }
}

export async function resizeZone(deviceId: number, zoneId: number, size: number): Promise<boolean> {
  if (!client?.isConnected) return false;
  try {
    client.resizeZone(deviceId, zoneId, size);
    await refreshDevices();
    return true;
  } catch (e) {
    lastError = (e as Error).message;
    return false;
  }
}

export async function applyProfile(profile: RGBProfile): Promise<boolean> {
  if (!client?.isConnected) return false;
  try {
    let okAll = true;
    for (const rawDev of devicesRaw) {
      const devInfo = devicesCache.find((d) => d.id === rawDev.deviceId);
      const state = profile.devices[rawDev.name];
      if (!state || !devInfo) continue;

      const rawMode = rawDev.modes.find((x) => x.name.toLowerCase() === state.mode.toLowerCase());
      if (rawMode) {
        const update: any = { id: rawMode.id };
        if (state.brightness !== undefined && rawMode.brightnessMin !== undefined && rawMode.brightnessMax !== undefined) {
          const range = rawMode.brightnessMax - rawMode.brightnessMin;
          update.brightness = Math.round(rawMode.brightnessMin + (range * Math.max(0, Math.min(100, state.brightness)) / 100));
        }
        try {
          await client.updateMode(rawDev.deviceId, update);
          devInfo.activeMode = rawMode.id;
        } catch { okAll = false; }
      }

      // Apply zone colors (only meaningful for per-LED modes)
      for (const z of state.zones) {
        try {
          const arr = z.colors.map(hexToRgb);
          if (arr.length > 0) client.updateZoneLeds(rawDev.deviceId, z.zoneId, arr);
        } catch { okAll = false; }
      }
    }
    return okAll;
  } catch (e) {
    lastError = (e as Error).message;
    return false;
  }
}

// ── Presets inteligentes ───────────────────────────────────────────────────
// Each preset lists mode name substrings to try (in priority order) and a color.
// Works device-agnostically: picks the first matching mode per device.
interface SmartPresetDef {
  color: string;      // primary color ('#rrggbb'). '' = skip color (for autonomous effects)
  tryModes: string[]; // mode name substrings, tried in order (case-insensitive)
}

const SMART_PRESETS: Record<string, SmartPresetDef> = {
  off:          { color: '#000000', tryModes: ['off', 'black', 'static', 'direct', 'custom'] },
  gaming:       { color: '#ff1800', tryModes: ['breathing', 'breath', 'pulse', 'blink', 'static'] },
  cinema:       { color: '#200400', tryModes: ['static', 'direct', 'custom', 'breathing'] },
  work:         { color: '#ffffff', tryModes: ['static', 'direct', 'custom'] },
  rainbow:      { color: '',        tryModes: ['spectrum cycle', 'rainbow wave', 'rainbow', 'spectrum', 'cycle'] },
  'night-blue': { color: '#000880', tryModes: ['breathing', 'breath', 'pulse', 'static'] },
  'alert-red':  { color: '#ff0000', tryModes: ['flicker', 'flash', 'blink', 'breathing', 'static'] },
};

export async function applySmartPreset(presetId: string): Promise<boolean> {
  if (!client?.isConnected) return false;
  const preset = SMART_PRESETS[presetId];
  if (!preset) return false;

  let success = true;

  for (const rawDev of devicesRaw) {
    const devInfo = devicesCache.find((d) => d.id === rawDev.deviceId);
    if (!devInfo) continue;

    try {
      let applied = false;

      for (const modeSubstr of preset.tryModes) {
        const rawMode = rawDev.modes.find((m) => m.name.toLowerCase().includes(modeSubstr.toLowerCase()));
        if (!rawMode) continue;

        const update: any = { id: rawMode.id };

        if (preset.color && rawMode.colorMode !== CM_NONE && rawMode.colorMode !== CM_RANDOM) {
          update.colors = buildModeColors(rawMode, preset.color);
        }

        await client.updateMode(rawDev.deviceId, update);
        devInfo.activeMode = rawMode.id;
        applied = true;
        break;
      }

      // If no matching effect mode found but we have a color, use setDeviceColor as fallback
      if (!applied && preset.color) {
        const ok = await setDeviceColor(rawDev.deviceId, preset.color);
        if (!ok) success = false;
      } else if (!applied) {
        success = false;
      }
    } catch { success = false; }
  }

  return success;
}

export function setOnDeviceListUpdated(cb: (() => void) | null) {
  onDeviceListUpdated = cb;
}
