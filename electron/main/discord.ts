import net from 'node:net';
import crypto from 'node:crypto';
import { BrowserWindow } from 'electron';
import { tm } from './idioma';
import { isProcessRunning, sendHotkey } from './launcher';

export interface DiscordVoiceSettings {
  mute: boolean;
  deaf: boolean;
}

export interface DiscordUser {
  id: string;
  username: string;
  globalName?: string;
}

export interface DiscordStatus {
  connected: boolean;
  authenticated?: boolean;
  voice?: DiscordVoiceSettings;
  user?: DiscordUser;
  error?: string;
}

// Client ID oficial de Discord StreamKit Overlay: reconocido por el cliente de escritorio
const DEFAULT_CLIENT_ID = '207646673902501888';
const OP_HANDSHAKE = 0;
const OP_FRAME = 1;
const OP_CLOSE = 2;
const OP_PING = 3;
const OP_PONG = 4;

let socket: net.Socket | null = null;
let currentSettings: DiscordVoiceSettings = { mute: false, deaf: false };
let currentUser: DiscordUser | null = null;
let connected = false;
let authenticated = false;
let connectingPromise: Promise<boolean> | null = null;
const pendingRequests = new Map<string, { resolve: (data: unknown) => void; reject: (err: Error) => void }>();

function encodePacket(opcode: number, payload: unknown): Buffer {
  const jsonStr = JSON.stringify(payload);
  const jsonBuf = Buffer.from(jsonStr, 'utf8');
  const header = Buffer.alloc(8);
  header.writeInt32LE(opcode, 0);
  header.writeInt32LE(jsonBuf.length, 4);
  return Buffer.concat([header, jsonBuf]);
}

function broadcastVoiceSettings(settings: DiscordVoiceSettings) {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('discord:voiceSettingsChanged', settings);
    }
  }
}

function resolvePendingRequest(nonce: string, evt?: string, data?: unknown) {
  const p = pendingRequests.get(nonce);
  if (!p) return;
  pendingRequests.delete(nonce);
  if (evt === 'ERROR') {
    const errData = data as { code?: number; message?: string };
    p.reject(new Error(errData?.message || tm('discord.error')));
  } else {
    p.resolve(data);
  }
}

function handleReadyDispatch(data?: unknown) {
  const payload = data as { user?: { id: string; username: string; global_name?: string } };
  if (payload?.user) {
    currentUser = {
      id: payload.user.id,
      username: payload.user.username,
      globalName: payload.user.global_name,
    };
  }
}

function handleVoiceDispatch(data?: unknown) {
  const payload = data as { mute?: boolean; deaf?: boolean };
  if (typeof payload?.mute === 'boolean' || typeof payload?.deaf === 'boolean') {
    currentSettings = {
      mute: payload.mute ?? currentSettings.mute,
      deaf: payload.deaf ?? currentSettings.deaf,
    };
    broadcastVoiceSettings(currentSettings);
  }
}

function handleIncomingFrame(payload: { cmd?: string; evt?: string; data?: unknown; nonce?: string }) {
  if (payload.nonce) {
    resolvePendingRequest(payload.nonce, payload.evt, payload.data);
  }

  if (payload.cmd === 'DISPATCH') {
    if (payload.evt === 'READY') {
      handleReadyDispatch(payload.data);
    } else if (payload.evt === 'VOICE_SETTINGS_UPDATE') {
      handleVoiceDispatch(payload.data);
    }
  }
}

function processBuffer(buf: Buffer): { remaining: Buffer; packets: Array<{ opcode: number; data: unknown }> } {
  const packets: Array<{ opcode: number; data: unknown }> = [];
  let offset = 0;

  while (offset + 8 <= buf.length) {
    const opcode = buf.readInt32LE(offset);
    const length = buf.readInt32LE(offset + 4);
    if (offset + 8 + length > buf.length) break;

    const body = buf.subarray(offset + 8, offset + 8 + length);
    offset += 8 + length;

    try {
      const data = JSON.parse(body.toString('utf8'));
      packets.push({ opcode, data });
    } catch {
      // Ignorar json inválido
    }
  }

  return { remaining: buf.subarray(offset), packets };
}

function attachSocketHandlers(s: net.Socket) {
  let inBuf = Buffer.alloc(0);

  s.on('data', (chunk) => {
    inBuf = Buffer.concat([inBuf, chunk]);
    const { remaining, packets } = processBuffer(inBuf);
    inBuf = Buffer.from(remaining);

    for (const pkt of packets) {
      if (pkt.opcode === OP_FRAME) {
        handleIncomingFrame(pkt.data as { cmd?: string; evt?: string; data?: unknown; nonce?: string });
      } else if (pkt.opcode === OP_PING) {
        s.write(encodePacket(OP_PONG, pkt.data));
      } else if (pkt.opcode === OP_CLOSE) {
        disconnect();
      }
    }
  });

  s.on('error', () => {
    disconnect();
  });

  s.on('close', () => {
    disconnect();
  });
}

function tryConnectPipe(pipeIndex: number): Promise<net.Socket | null> {
  return new Promise((resolve) => {
    const pipePath = `\\\\.\\pipe\\discord-ipc-${pipeIndex}`;
    const client = net.connect(pipePath, () => {
      client.removeAllListeners('error');
      client.setTimeout(0);
      resolve(client);
    });

    client.once('error', () => {
      client.destroy();
      resolve(null);
    });

    client.setTimeout(250, () => {
      client.destroy();
      resolve(null);
    });
  });
}

async function scanAndConnectPipes(): Promise<net.Socket | null> {
  // Comprobación ultrarrápida previa de proceso para no congelar la UI si Discord está cerrado
  const running = await isProcessRunning('Discord');
  if (!running) return null;

  // Escaneo concurrente de pipes prioritarios 0..3 (Discord usa casi exclusivamente 0 o 1)
  const batch1 = await Promise.all([0, 1, 2, 3].map(tryConnectPipe));
  const found1 = batch1.find((s): s is net.Socket => s !== null);
  if (found1) {
    for (const s of batch1) {
      if (s && s !== found1) s.destroy();
    }
    return found1;
  }

  // Si no se encontró en el lote prioritario, probar 4..9 concurrentemente
  const batch2 = await Promise.all([4, 5, 6, 7, 8, 9].map(tryConnectPipe));
  const found2 = batch2.find((s): s is net.Socket => s !== null);
  if (found2) {
    for (const s of batch2) {
      if (s && s !== found2) s.destroy();
    }
    return found2;
  }

  return null;
}

export function disconnect() {
  if (socket) {
    try { socket.destroy(); } catch { /* noop */ }
    socket = null;
  }
  connected = false;
  authenticated = false;
  currentUser = null;
  connectingPromise = null;
  for (const [, p] of pendingRequests) {
    p.reject(new Error(tm('discord.disconnected')));
  }
  pendingRequests.clear();
}

export async function ensureConnected(clientId = DEFAULT_CLIENT_ID): Promise<boolean> {
  if (connected && socket && !socket.destroyed) return true;
  if (connectingPromise) return connectingPromise;

  connectingPromise = (async () => {
    try {
      const s = await scanAndConnectPipes();
      if (!s) {
        connected = false;
        return false;
      }

      socket = s;
      attachSocketHandlers(s);

      // Enviar handshake inicial con Client ID oficial de StreamKit
      const handshake = encodePacket(OP_HANDSHAKE, { v: 1, client_id: clientId });
      s.write(handshake);

      // Esperar brevemente para validar que el socket no sea cerrado por Discord
      await new Promise((r) => setTimeout(r, 150));
      if (!socket || socket.destroyed) {
        disconnect();
        return false;
      }

      connected = true;

      // Intentar suscribirse a cambios de ajustes de voz
      try {
        const nonce = crypto.randomUUID();
        const subscribePacket = encodePacket(OP_FRAME, {
          cmd: 'SUBSCRIBE',
          evt: 'VOICE_SETTINGS_UPDATE',
          args: {},
          nonce,
        });
        s.write(subscribePacket);
        await refreshVoiceSettings();
      } catch {
        // Puede requerir autorización previa
      }

      return true;
    } catch {
      disconnect();
      return false;
    } finally {
      connectingPromise = null;
    }
  })();

  return connectingPromise;
}

function sendCommand(cmd: string, args: Record<string, unknown> = {}): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (!socket || !connected) {
      return reject(new Error(tm('discord.notRunning')));
    }

    const nonce = crypto.randomUUID();
    const packet = encodePacket(OP_FRAME, { cmd, args, nonce });

    const timeout = setTimeout(() => {
      pendingRequests.delete(nonce);
      reject(new Error(tm('discord.timeout')));
    }, 3000);

    pendingRequests.set(nonce, {
      resolve: (data) => {
        clearTimeout(timeout);
        resolve(data);
      },
      reject: (err) => {
        clearTimeout(timeout);
        reject(err);
      },
    });

    socket.write(packet);
  });
}

export async function refreshVoiceSettings(): Promise<DiscordVoiceSettings | null> {
  try {
    const data = (await sendCommand('GET_VOICE_SETTINGS')) as { mute?: boolean; deaf?: boolean };
    if (data && typeof data.mute === 'boolean') {
      authenticated = true;
      currentSettings = {
        mute: data.mute,
        deaf: !!data.deaf,
      };
      broadcastVoiceSettings(currentSettings);
      return currentSettings;
    }
  } catch {
    // Si falla el comando (ej. 4006 no autenticado), se mantiene en false
    authenticated = false;
  }
  return currentSettings;
}

export async function getStatus(): Promise<DiscordStatus> {
  const isOk = await ensureConnected();
  if (!isOk) {
    return { connected: false, error: tm('discord.notRunning') };
  }
  return {
    connected: true,
    authenticated,
    user: currentUser ?? undefined,
    voice: currentSettings,
  };
}

export async function getVoiceSettings(): Promise<DiscordVoiceSettings | null> {
  const isOk = await ensureConnected();
  if (!isOk) return null;
  return refreshVoiceSettings();
}

export async function setVoiceSettings(
  opts: { mute?: boolean; deaf?: boolean },
  allowFallback = true,
): Promise<{ ok: boolean; error?: string; viaHotkey?: boolean }> {
  const isOk = await ensureConnected();
  if (!isOk) {
    if (allowFallback) {
      const running = await isProcessRunning('Discord');
      if (running) {
        if (opts.mute !== undefined) await sendHotkey('ctrl+shift+m');
        if (opts.deaf !== undefined) await sendHotkey('ctrl+shift+d');
        return { ok: true, viaHotkey: true };
      }
    }
    return { ok: false, error: tm('discord.notRunning') };
  }

  try {
    const res = (await sendCommand('SET_VOICE_SETTINGS', opts)) as { mute?: boolean; deaf?: boolean };
    if (res) {
      authenticated = true;
      currentSettings = {
        mute: res.mute ?? currentSettings.mute,
        deaf: res.deaf ?? currentSettings.deaf,
      };
      broadcastVoiceSettings(currentSettings);
    }
    return { ok: true };
  } catch (e) {
    // Fallback elegante: si RPC no tiene permiso pero Discord está abierto, usar el atajo global
    if (allowFallback) {
      const running = await isProcessRunning('Discord');
      if (running) {
        if (opts.mute !== undefined) await sendHotkey('ctrl+shift+m');
        if (opts.deaf !== undefined) await sendHotkey('ctrl+shift+d');
        return { ok: true, viaHotkey: true };
      }
    }
    return { ok: false, error: (e as Error).message };
  }
}

export async function toggleMute(allowFallback = true): Promise<{ ok: boolean; muted?: boolean; error?: string; viaHotkey?: boolean }> {
  const isOk = await ensureConnected();
  if (!isOk) {
    if (allowFallback) {
      const running = await isProcessRunning('Discord');
      if (running) {
        const sent = await sendHotkey('ctrl+shift+m');
        if (sent) return { ok: true, viaHotkey: true };
      }
    }
    return { ok: false, error: tm('discord.notRunning') };
  }

  const targetMute = !currentSettings.mute;
  const res = await setVoiceSettings({ mute: targetMute }, allowFallback);
  if (!res.ok) return res;
  return { ok: true, muted: targetMute, viaHotkey: res.viaHotkey };
}

export async function toggleDeaf(allowFallback = true): Promise<{ ok: boolean; deaf?: boolean; error?: string; viaHotkey?: boolean }> {
  const isOk = await ensureConnected();
  if (!isOk) {
    if (allowFallback) {
      const running = await isProcessRunning('Discord');
      if (running) {
        const sent = await sendHotkey('ctrl+shift+d');
        if (sent) return { ok: true, viaHotkey: true };
      }
    }
    return { ok: false, error: tm('discord.notRunning') };
  }

  const targetDeaf = !currentSettings.deaf;
  const res = await setVoiceSettings({ deaf: targetDeaf }, allowFallback);
  if (!res.ok) return res;
  return { ok: true, deaf: targetDeaf, viaHotkey: res.viaHotkey };
}
