import { spawn, ChildProcess } from 'child_process';
import { Client, utils as orgbUtils } from 'openrgb-sdk';
import type Device from 'openrgb-sdk/dist/device';
import type { RGBColor } from 'openrgb-sdk/dist/device';

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
  id: number; name: string; flags: number;
  brightnessMin?: number; brightnessMax?: number;
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
let onDeviceListUpdated: (() => void) | null = null;

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
      id: m.id, name: m.name, flags: m.flags,
      brightnessMin: m.brightnessMin, brightnessMax: m.brightnessMax,
    })),
    colors: d.colors.map(rgbToHex),
    ledNames: d.leds.map((l) => l.name),
  };
}

async function refreshDevices(): Promise<RGBDeviceInfo[]> {
  if (!client || !client.isConnected) return [];
  try {
    const all = await client.getAllControllerData();
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
  // Reusar cliente conectado.
  if (client?.isConnected) {
    await refreshDevices();
    return status();
  }
  try {
    if (client) { try { client.disconnect(); } catch {} client = null; }
    const c = new Client('VirtualDeck', port, host);
    c.on('error', (err: Error) => { lastError = err.message; });
    c.on('disconnect', () => { devicesCache = []; });
    c.on('deviceListUpdated', () => {
      refreshDevices().then(() => { onDeviceListUpdated?.(); }).catch(() => {});
    });
    // openrgb-sdk timeout en ms; default 1000.
    await c.connect(3000);
    client = c;
    await refreshDevices();
    return status();
  } catch (e) {
    lastError = (e as Error).message;
    client = null;
    return status();
  }
}

export async function disconnect(): Promise<void> {
  try { client?.disconnect(); } catch {}
  client = null;
  devicesCache = [];
}

export async function spawnServer(exePath?: string): Promise<{ ok: boolean; error?: string }> {
  if (serverProc && !serverProc.killed) return { ok: true };
  if (!exePath) return { ok: false, error: 'Falta la ruta a OpenRGB.exe' };
  try {
    // --server: solo TCP server, sin GUI (evita el diálogo de tamaño de zonas).
    // --noautoconnect: no escanea hardware automáticamente al cargar — lo hacemos por SDK.
    // --server-port: por consistencia con la config nuestra.
    const args = ['--server', '--server-port', String(port)];
    const child = spawn(exePath, args, {
      detached: false,
      stdio: 'ignore',
      windowsHide: true,
    });
    child.on('exit', () => { if (serverProc === child) serverProc = null; });
    child.on('error', (err) => { lastError = `OpenRGB spawn: ${err.message}`; });
    serverProc = child;
    // Pequeño delay para que el server bind del socket TCP suceda antes del primer connect.
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
      // -1 = todos
      for (const d of devicesCache) await setDeviceColor(d.id, color);
      return true;
    }
    const dev = devicesCache.find((d) => d.id === deviceId);
    if (!dev) return false;
    // Cambiar a Direct/Custom mode si existe — sino, se queda en el modo actual.
    const direct = dev.modes.find((m) => /^direct$/i.test(m.name));
    if (direct && dev.activeMode !== direct.id) {
      try { await client.updateMode(deviceId, direct.id); } catch {}
    } else {
      try { client.setCustomMode(deviceId); } catch {}
    }
    const rgb = hexToRgb(color);
    const totalLeds = dev.colors.length || dev.zones.reduce((s, z) => s + z.ledCount, 0);
    if (totalLeds <= 0) return false;
    const arr: RGBColor[] = new Array(totalLeds).fill(0).map(() => ({ ...rgb }));
    client.updateLeds(deviceId, arr);
    // Actualizar cache local optimistamente (refresh real llega en deviceListUpdated).
    dev.colors = arr.map(rgbToHex);
    return true;
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
  deviceId: number, mode: string, color?: string, brightness?: number,
): Promise<boolean> {
  if (!client?.isConnected) return false;
  try {
    if (deviceId < 0) {
      for (const d of devicesCache) await setMode(d.id, mode, color, brightness);
      return true;
    }
    const dev = devicesCache.find((d) => d.id === deviceId);
    if (!dev) return false;
    const m = dev.modes.find((x) => x.name.toLowerCase() === mode.toLowerCase());
    if (!m) return false;
    const update: any = { id: m.id };
    if (color) update.colors = [hexToRgb(color)];
    if (brightness !== undefined && m.brightnessMin !== undefined && m.brightnessMax !== undefined) {
      const range = m.brightnessMax - m.brightnessMin;
      update.brightness = Math.round(m.brightnessMin + (range * Math.max(0, Math.min(100, brightness)) / 100));
    }
    await client.updateMode(deviceId, update);
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
    // El resize puede invalidar la cache (ledCount cambia). Refrescar.
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
    for (const dev of devicesCache) {
      const state = profile.devices[dev.name];
      if (!state) continue;
      const m = dev.modes.find((x) => x.name.toLowerCase() === state.mode.toLowerCase());
      if (m) {
        const update: any = { id: m.id };
        if (state.brightness !== undefined && m.brightnessMin !== undefined && m.brightnessMax !== undefined) {
          const range = m.brightnessMax - m.brightnessMin;
          update.brightness = Math.round(
            m.brightnessMin + (range * Math.max(0, Math.min(100, state.brightness)) / 100),
          );
        }
        try { await client.updateMode(dev.id, update); } catch { okAll = false; }
      }
      // Aplicar colores por zona (solo si el modo lo soporta — Direct/Static etc).
      for (const z of state.zones) {
        try {
          const arr = z.colors.map(hexToRgb);
          if (arr.length > 0) client.updateZoneLeds(dev.id, z.zoneId, arr);
        } catch { okAll = false; }
      }
    }
    return okAll;
  } catch (e) {
    lastError = (e as Error).message;
    return false;
  }
}

export function setOnDeviceListUpdated(cb: (() => void) | null) {
  onDeviceListUpdated = cb;
}
