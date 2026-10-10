/**
 * Tipos para la extensión compañera del navegador (virtualdeck-companion).
 * Ítem 114 del Roadmap: captura de vídeo de pestaña y metadatos sin oclusión.
 */

export interface CompanionMetadata {
  tipo: 'meta';
  tabId?: number;
  titulo: string;
  artista: string;
  album?: string;
  posicionMs: number;
  duracionMs: number;
  reproduciendo: boolean;
  volumen: number;
  silenciado: boolean;
  caratulaUrl?: string;
  tieneVideo: boolean;
  fuente?: string;
}

export interface CompanionFrame {
  ancho: number;
  alto: number;
  timestamp: number;
  payload: string;
}

/**
 * Por qué el servidor no está escuchando, cuando no lo está.
 *
 * Sin esto el fallo se quedaba en el registro del proceso principal: la
 * interfaz decía «esperando conexión» indefinidamente, que es exactamente lo
 * que pasó cuando otro programa tenía el puerto. Son códigos, no texto: quien
 * los enseña es la pantalla, que los traduce.
 */
export type CompanionFallo = 'puerto-ocupado' | 'puerto-invalido';

export interface CompanionStatus {
  activo: boolean;
  conectado: boolean;
  puerto: number;
  token: string;
  metadata: CompanionMetadata | null;
  fps: number;
  /** Último fallo al arrancar o al cambiar de puerto; `null` si no hay. */
  fallo: CompanionFallo | null;
}

export interface CompanionSettings {
  enabled: boolean;
  port: number;
  token: string;
}

export const COMPANION_POR_DEFECTO: CompanionSettings = {
  enabled: true,
  port: 48201,
  token: '',
};

/** Puerto más bajo que se acepta: por debajo son privileged en Windows. */
const COMPANION_PUERTO_MIN = 1024;
const COMPANION_PUERTO_MAX = 65535;

export function puertoCompanionValido(puerto: number): boolean {
  return Number.isInteger(puerto) && puerto >= COMPANION_PUERTO_MIN && puerto <= COMPANION_PUERTO_MAX;
}

export type CompanionCommand =
  | { comando: 'play' }
  | { comando: 'pause' }
  | { comando: 'playPause' }
  | { comando: 'next' }
  | { comando: 'previous' }
  | { comando: 'seek'; posicionMs: number }
  | { comando: 'volumen'; nivel: number };

export interface ApiCompanion {
  getStatus: () => Promise<CompanionStatus>;
  getPairingCode: () => Promise<string>;
  sendCommand: (cmd: CompanionCommand) => Promise<boolean>;
  /** Enciende o apaga el servidor local; el ajuste queda guardado. */
  setEnabled: (enabled: boolean) => Promise<boolean>;
  regenerateToken: () => Promise<string>;
  setPort: (puerto: number) => Promise<boolean>;
  onStatus: (handler: (status: CompanionStatus) => void) => () => void;
  onFrame: (handler: (frame: CompanionFrame) => void) => () => void;
  onMetadata: (handler: (meta: CompanionMetadata) => void) => () => void;
}
