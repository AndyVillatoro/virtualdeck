import { Client } from 'openrgb-sdk';
import { deviceToInfo } from './color';
import { estado } from './estado';
import type { RGBDeviceInfo, RGBStatus } from './tipos';

function stopReconnect() {
  if (estado.reconnectTimer) { clearTimeout(estado.reconnectTimer); estado.reconnectTimer = null; }
  estado.shouldAutoReconnect = false;
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
  c.on('error', (err: Error) => { estado.lastError = err.message; });
  c.on('disconnect', () => { estado.devicesCache = []; estado.devicesRaw = []; scheduleReconnect(); });
  c.on('deviceListUpdated', () => {
    refreshDevices().then(() => { estado.onDeviceListUpdated?.(); }).catch(() => {});
  });
}

function scheduleReconnect() {
  // Order matters: check the timer first so concurrent calls (e.g. a
  // disconnect event firing while another scheduleReconnect is in-flight)
  // don't queue duplicate timers.
  if (estado.reconnectTimer) return;
  if (!estado.shouldAutoReconnect || estado.client?.isConnected) return;
  estado.reconnectTimer = setTimeout(async () => {
    estado.reconnectTimer = null;
    if (!estado.shouldAutoReconnect || estado.client?.isConnected) return;
    try {
      teardownClient(estado.client);
      estado.client = null;
      const c = new Client('VirtualDeck', estado.port, estado.host);
      attachClientListeners(c);
      await c.connect(3000);
      estado.client = c;
      await refreshDevices();
      estado.onDeviceListUpdated?.();
    } catch {
      scheduleReconnect();
    }
  }, 8000);
}

export async function refreshDevices(): Promise<RGBDeviceInfo[]> {
  if (!estado.client || !estado.client.isConnected) return [];
  try {
    const all = await estado.client.getAllControllerData();
    estado.devicesRaw = all;
    estado.devicesCache = all.map(deviceToInfo);
    return estado.devicesCache;
  } catch (e) {
    estado.lastError = (e as Error).message;
    return [];
  }
}

// ── API pública ────────────────────────────────────────────────────────────
export function status(): RGBStatus {
  return {
    connected: !!estado.client?.isConnected,
    serverRunning: !!estado.serverProc && !estado.serverProc.killed,
    deviceCount: estado.devicesCache.length,
    host: estado.host, port: estado.port,
    error: estado.lastError,
  };
}

export async function connect(h?: string, p?: number): Promise<RGBStatus> {
  if (h) estado.host = h;
  if (p) estado.port = p;
  estado.lastError = undefined;
  if (estado.client?.isConnected) {
    await refreshDevices();
    return status();
  }
  try {
    teardownClient(estado.client);
    estado.client = null;
    const c = new Client('VirtualDeck', estado.port, estado.host);
    attachClientListeners(c);
    await c.connect(3000);
    estado.client = c;
    estado.shouldAutoReconnect = true;
    await refreshDevices();
    return status();
  } catch (e) {
    estado.lastError = (e as Error).message;
    estado.client = null;
    return status();
  }
}

export async function disconnect(): Promise<void> {
  stopReconnect();
  teardownClient(estado.client);
  estado.client = null;
  estado.devicesCache = [];
  estado.devicesRaw = [];
}

export function setOnDeviceListUpdated(cb: (() => void) | null) {
  estado.onDeviceListUpdated = cb;
}