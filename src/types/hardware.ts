export interface RGBSettings {
  enabled: boolean;
  openrgbPath?: string;
  host: string;
  port: number;
  autoConnect: boolean;
  spawnOnStart: boolean;
  startupProfileId?: string;
  profiles: RGBProfile[];
  zoneSizes?: Record<string, Record<string, number>>;
}

export interface RGBProfile {
  id: string;
  name: string;
  devices: Record<string, RGBDeviceState>;
}

export interface RGBDeviceState {
  mode: string;
  brightness?: number;
  zones: Array<{ zoneId: number; zoneName: string; colors: string[] }>;
}

export interface RGBZoneInfo {
  id: number;
  name: string;
  type: number;
  ledCount: number;
  ledsMin: number;
  ledsMax: number;
  resizable: boolean;
}

export interface RGBModeInfo {
  id: number;
  name: string;
  flags: number;
  colorMode: number;
  brightnessMin?: number;
  brightnessMax?: number;
  speedMin?: number;
  speedMax?: number;
}

export interface RGBDeviceInfo {
  id: number;
  name: string;
  type: number;
  typeLabel: string;
  vendor?: string;
  description: string;
  activeMode: number;
  zones: RGBZoneInfo[];
  modes: RGBModeInfo[];
  colors: string[];
  ledNames: string[];
  brightness?: number;
}

export interface RGBStatus {
  connected: boolean;
  serverRunning: boolean;
  deviceCount: number;
  host: string;
  port: number;
  error?: string;
}

export interface AudioDevice {
  id: string;
  name: string;
  isDefault: boolean;
}

export interface BackupInfo {
  filename: string;
  timestamp: number;
  sizeBytes: number;
}

export interface WeatherInfo {
  temp: number;
  code: number;
  city: string;
  country: string;
}

export interface DiscordVoiceSettings {
  mute: boolean;
  deaf: boolean;
}

export interface DiscordStatus {
  connected: boolean;
  authenticated?: boolean;
  voice?: DiscordVoiceSettings;
  user?: { id: string; username: string; globalName?: string };
  error?: string;
}

export interface SpotifyDevice {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  volumePercent: number;
}

export interface SpotifyPlaybackState {
  isPlaying: boolean;
  trackName?: string;
  artistName?: string;
  albumName?: string;
  albumArtUrl?: string;
  progressMs?: number;
  durationMs?: number;
  device?: SpotifyDevice;
  shuffleState?: boolean;
  repeatState?: 'off' | 'track' | 'context';
}

export interface NowPlaying {
  controls?: { next: boolean; prev: boolean; shuffle: boolean; repeat: boolean };
  title: string;
  artist: string;
  status: 'Playing' | 'Paused' | 'Stopped' | 'Unknown';
  source: string;
  thumbnail?: string;
}

export type SensorKind =
  | 'Temperature' | 'Fan' | 'Voltage' | 'Load' | 'Clock' | 'Power'
  | 'Data' | 'Throughput' | 'Level' | 'SmallData' | 'Other';

export type SensorCategory = 'cpu' | 'gpu' | 'mainboard' | 'memory' | 'storage' | 'other';

export interface Sensor {
  id: string;
  name: string;
  hardware: string;
  category: SensorCategory;
  kind: SensorKind;
  value: number;
  unit: string;
  min?: number;
  max?: number;
}

export interface SensorsSettings {
  enabled: boolean;
  host: string;
  port: number;
  categories?: SensorCategory[];
  spawnOnStart?: boolean;
  spawnElevated?: boolean;
  lhmPath?: string;
  showWidget?: boolean;
}

export interface SensorsStatus {
  enabled: boolean;
  connected: boolean;
  host: string;
  port: number;
  count: number;
  error?: string;
  lastFetchAt?: number;
  bundledRunning: boolean;
}

export interface DisplayInfo {
  id: number;
  name: string;
  bounds: { x: number; y: number; width: number; height: number };
  workArea: { x: number; y: number; width: number; height: number };
  scaleFactor: number;
  isPrimary: boolean;
  isCurrent: boolean;
  frequency?: number;
  rotation: number;
  touchSupport?: 'available' | 'unavailable' | 'unknown';
  internal?: boolean;
}

export interface PlatformInfo {
  appVersion: string;
  electron: string;
  chrome: string;
  os: string;
  locale: string;
}

export interface TasasDivisa {
  base: string;
  rates: Record<string, number>;
  actualizado: string;
  caducaEn: number;
}

