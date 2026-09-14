import type { MacroStep } from './actions';
import type {
  BarGeometry,
  RemoteStatus,
  OrdenRemota,
  FirewallStatus,
  EntradaGaleria,
  ResumenRiesgo,
} from './config';
import type {
  DisplayInfo,
  BackupInfo,
  AudioDevice,
  NowPlaying,
  DiscordStatus,
  DiscordVoiceSettings,
  SpotifyDevice,
  SpotifyPlaybackState,
  TasasDivisa,
  WeatherInfo,
  PlatformInfo,
  RGBStatus,
  RGBDeviceInfo,
  RGBProfile,
  Sensor,
  SensorsStatus,
  SensorCategory,
} from './hardware';

export interface ElectronAPI {
  window: {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
    fullscreen: () => void;
    setAlwaysOnTop: (encima: boolean) => void;
    getActiveApp: () => Promise<{ processName: string | null; windowTitle: string | null }>;
    getDisplays: () => Promise<DisplayInfo[]>;
    moveToDisplay: (displayId: number) => Promise<boolean>;
  };
  bar: {
    open: (g: BarGeometry) => Promise<boolean>;
    close: () => Promise<boolean>;
    isOpen: () => Promise<boolean>;
    apply: (g: BarGeometry) => Promise<boolean>;
    position: () => Promise<{ y: number } | null>;
    fit: (ancho: number, alto: number) => Promise<boolean>;
    maxSlots: (tile: number) => Promise<number>;
    onMoved: (cb: (y: number) => void) => () => void;
    onConfigChanged: (cb: (data: unknown) => void) => () => void;
  };
  config: {
    load: () => Promise<object>;
    damaged: () => Promise<string | null>;
    save: (data: object) => Promise<boolean>;
    export: (data?: object) => Promise<boolean>;
    import: () => Promise<object | null>;
    listBackups: () => Promise<BackupInfo[]>;
    restoreBackup: (filename: string) => Promise<object | null>;
  };
  remote: {
    status: () => Promise<RemoteStatus>;
    newToken: () => Promise<string>;
    pairCode: () => Promise<string>;
    send: (o: OrdenRemota) => Promise<{ ok: boolean; error?: string }>;
    checkFirewall: (port: number) => Promise<FirewallStatus>;
    addFirewallRule: (port: number) => Promise<{ ok: boolean; error?: string }>;
  };
  gallery: {
    manifest: (url: string) => Promise<{ ok: boolean; profiles?: EntradaGaleria[]; error?: string }>;
    profile: (url: string) => Promise<{ ok: boolean; perfil?: unknown; riesgo?: ResumenRiesgo; error?: string }>;
  };
  audio: {
    list: () => Promise<AudioDevice[]>;
    setDefault: (deviceId: string) => Promise<boolean>;
  };
  media: {
    nowPlaying: () => Promise<NowPlaying | null>;
    control: (cmd: 'play-pause' | 'next' | 'prev' | 'stop') => Promise<boolean>;
    shuffle: () => Promise<boolean>;
    repeat: () => Promise<boolean>;
    diagnose: () => Promise<{ ok: boolean; stage: string; stdout: string; stderr: string }>;
  };
  discord: {
    status: () => Promise<DiscordStatus>;
    voiceSettings: () => Promise<DiscordVoiceSettings | null>;
    setVoiceSettings: (settings: { mute?: boolean; deaf?: boolean }) => Promise<{ ok: boolean; error?: string }>;
    toggleMute: () => Promise<{ ok: boolean; muted?: boolean; error?: string }>;
    toggleDeaf: () => Promise<{ ok: boolean; deaf?: boolean; error?: string }>;
  };
  spotify: {
    playUri: (uriOrUrl: string, token?: string, deviceId?: string) => Promise<{ ok: boolean; error?: string }>;
    getDevices: (token?: string) => Promise<{ ok: boolean; devices?: SpotifyDevice[]; error?: string }>;
    transferPlayback: (deviceId: string, token?: string, play?: boolean) => Promise<{ ok: boolean; error?: string }>;
    getPlaybackState: (token?: string) => Promise<{ ok: boolean; state?: SpotifyPlaybackState; error?: string }>;
  };
  currency: {
    rates: (base: string, force?: boolean) => Promise<{ ok: boolean; datos?: TasasDivisa; error?: string }>;
  };
  weather: {
    get: (force?: boolean) => Promise<WeatherInfo | null>;
  };
  launch: {
    app: (path: string, args?: string[]) => Promise<boolean>;
    getBrightness: () => Promise<number | null>;
    getVolume: () => Promise<number | null>;
    url: (url: string) => Promise<boolean>;
    script: (script: string, shell?: string) => Promise<boolean>;
    scriptCapture: (script: string, shell?: string) => Promise<{ success: boolean; output: string }>;
    shortcut: (path: string) => Promise<boolean>;
    mediaKey: (key: string) => Promise<boolean>;
    brightness: (level: number) => Promise<boolean>;
    hotkey: (combo: string) => Promise<boolean>;
    clipboard: (text: string) => Promise<boolean>;
    typeText: (text: string) => Promise<boolean>;
    killProcess: (name: string) => Promise<boolean>;
    isProcessRunning: (name: string) => Promise<boolean>;
    focusWindow: (processName: string) => Promise<boolean>;
    closeWindow: (processName?: string) => Promise<boolean>;
    setVolume: (percent: number) => Promise<boolean>;
    snapWindow: (position: string, processName?: string) => Promise<boolean>;
  };
  dialog: {
    openFile: (opts?: object) => Promise<string | null>;
    openImage: () => Promise<string | null>;
    saveClipboardImage: (dataUrl: string) => Promise<string | null>;
  };
  notify: {
    show: (title: string, body: string) => Promise<boolean>;
  };
  app: {
    getAutostart: () => Promise<boolean>;
    setAutostart: (enabled: boolean) => Promise<void>;
    setZoom: (factor: number) => Promise<void>;
    getZoom: () => Promise<number>;
    getVersion: () => Promise<string>;
    tabletSettings: () => Promise<boolean>;
    platformInfo: () => Promise<PlatformInfo>;
  };
  log: {
    write: (entry: { level: 'error' | 'warn' | 'info'; scope: string; message: string; meta?: unknown }) => Promise<void>;
    readRecent: (maxBytes?: number) => Promise<string>;
    open: () => Promise<void>;
    export: () => Promise<'ok' | 'cancelado' | 'sin-registro'>;
  };
  update: {
    check: () => Promise<{ status: 'checking' | 'available' | 'not-available' | 'disabled' | 'error'; version?: string; error?: string }>;
    quitAndInstall: () => Promise<void>;
    onStatus: (handler: (s: { status: 'available' | 'downloaded' | 'error'; version?: string; error?: string }) => void) => () => void;
  };
  page: {
    export: (pageData: object) => Promise<boolean>;
    import: () => Promise<{ page: object; buttons: object[] } | null>;
  };
  state: {
    activeApps: () => Promise<string[]>;
    snapshot: () => Promise<unknown>;
  };
  rgb: {
    status: () => Promise<RGBStatus>;
    connect: (host?: string, port?: number) => Promise<RGBStatus>;
    disconnect: () => Promise<void>;
    spawnServer: (exePath?: string) => Promise<{ ok: boolean; error?: string }>;
    killServer: () => Promise<void>;
    listDevices: () => Promise<RGBDeviceInfo[]>;
    setDeviceColor: (deviceId: number, color: string, duradero?: boolean) => Promise<boolean>;
    setZoneColors: (deviceId: number, zoneId: number, colors: string[]) => Promise<boolean>;
    setSingleLed: (deviceId: number, ledId: number, color: string) => Promise<boolean>;
    setMode: (deviceId: number, mode: string, color?: string, brightness?: number, speed?: number) => Promise<boolean>;
    resizeZone: (deviceId: number, zoneId: number, size: number) => Promise<boolean>;
    applyProfile: (profile: RGBProfile) => Promise<boolean>;
    smartPreset: (presetId: string) => Promise<boolean>;
    presetList: () => Promise<Array<{ id: string; color: string }>>;
    pickFile: () => Promise<string | null>;
  };
  sensors: {
    list: (force?: boolean) => Promise<Sensor[]>;
    get: (id: string) => Promise<Sensor | null>;
    status: () => Promise<SensorsStatus>;
    configure: (opts: { host?: string; port?: number; enabled?: boolean; categories?: SensorCategory[] }) => Promise<SensorsStatus>;
    probe: () => Promise<{ ok: boolean; count: number; error?: string }>;
    spawnLHM: (customPath?: string, elevated?: boolean) => Promise<{ ok: boolean; error?: string }>;
    killLHM: () => Promise<void>;
    knownPath: () => Promise<string | null>;
    registerUrlAcl: (port?: number) => Promise<{ ok: boolean; error?: string; url: string }>;
  };
  macro: {
    play: (steps: MacroStep[], repeat?: number) => Promise<{ ok: boolean; error?: string }>;
    startRecord: () => Promise<void>;
    stopRecord: () => Promise<MacroStep[]>;
    isRecording: () => Promise<boolean>;
  };
  events: {
    onButtonTrigger: (handler: (buttonId: string) => void) => () => void;
    onNavPage: (handler: (indice: number) => void) => () => void;
    onRGBDevicesChanged: (handler: () => void) => () => void;
    onEstadoSistema: (handler: (data: unknown) => void) => () => void;
    onActiveAppChanged: (handler: (appInfo: { processName: string | null; windowTitle: string | null }) => void) => () => void;
    onDisplaysChanged: (handler: (displays: DisplayInfo[]) => void) => () => void;
    onVolumeChanged?: (handler: (vol: number) => void) => () => void;
    onBrightnessChanged?: (handler: (bri: number) => void) => () => void;
    onDiscordVoiceSettingsChanged?: (handler: (settings: DiscordVoiceSettings) => void) => () => void;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

