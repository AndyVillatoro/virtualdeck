// ── Tipos espejo de src/types.ts (para que main no dependa del renderer) ───
export interface RGBStatus {
  connected: boolean;
  serverRunning: boolean;
  deviceCount: number;
  host: string;
  port: number;
  error?: string;
}
interface RGBZoneInfo {
  id: number; name: string; type: number; ledCount: number;
  ledsMin: number; ledsMax: number; resizable: boolean;
}
interface RGBModeInfo {
  id: number; name: string; flags: number; colorMode: number;
  brightnessMin?: number; brightnessMax?: number;
  speedMin?: number; speedMax?: number;
}
export interface RGBDeviceInfo {
  id: number; name: string; type: number; typeLabel: string;
  vendor?: string; description: string; activeMode: number;
  zones: RGBZoneInfo[]; modes: RGBModeInfo[];
  colors: string[]; ledNames: string[]; brightness?: number;
}
export interface RGBProfile {
  id: string; name: string;
  devices: Record<string, {
    mode: string; brightness?: number;
    zones: Array<{ zoneId: number; zoneName: string; colors: string[] }>;
  }>;
}