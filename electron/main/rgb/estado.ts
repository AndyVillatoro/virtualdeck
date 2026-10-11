import type { ChildProcess } from 'child_process';
import type { Client } from 'openrgb-sdk';
import type Device from 'openrgb-sdk/dist/device';
import type { RGBDeviceInfo } from './tipos';

/**
 * Estado del cliente OpenRGB (singleton, vive en main process).
 *
 * Antes vivía en `rgb.ts` entero; al partirlo por módulos, este es el **único**
 * sitio donde se guarda. Todo lo demás (conexión, servidor, dispositivos,
 * colores, perfiles y presets) lee y escribe aquí, de modo que no puede haber
 * dos copias del mismo `client` ni dos colas de reconexión.
 *
 * Auto-reconnect: cuando la conexión del SDK se cae sola, se reintenta cada 8 s.
 * Se limpia cuando el usuario desconecta a mano (`disconnect`).
 */
export const estado = {
  client: null as Client | null,
  serverProc: null as ChildProcess | null,
  host: '127.0.0.1',
  port: 6742,
  lastError: undefined as string | undefined,
  devicesCache: [] as RGBDeviceInfo[],
  devicesRaw: [] as Device[],   // full Device objects with complete Mode data
  onDeviceListUpdated: null as (() => void) | null,
  shouldAutoReconnect: false,
  reconnectTimer: null as ReturnType<typeof setTimeout> | null,
};