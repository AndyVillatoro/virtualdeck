import { utils as orgbUtils } from 'openrgb-sdk';
import type Device from 'openrgb-sdk/dist/device';
import type { Mode, RGBColor } from 'openrgb-sdk/dist/device';
import type { RGBDeviceInfo } from './tipos';

// OpenRGB colorMode constants
export const CM_NONE    = 0; // autonomous effect (Spectrum Cycle, Rainbow) — no user color input
export const CM_PER_LED = 1; // per-LED control (Direct, Custom) — use updateLeds
export const CM_PER_MODE = 2; // per-mode colors (Static, Breathing) — pass via updateMode.colors
export const CM_RANDOM  = 3; // random colors — no user input

// ── Helpers ────────────────────────────────────────────────────────────────
export function rgbToHex(c: RGBColor): string {
  const t = (n: number) => Math.max(0, Math.min(255, n | 0)).toString(16).padStart(2, '0');
  return `#${t(c.red)}${t(c.green)}${t(c.blue)}`;
}

export function hexToRgb(hex: string): RGBColor {
  return orgbUtils.hexColor(hex.replace('#', ''));
}

function deviceTypeLabel(t: number): string {
  const map = orgbUtils.deviceType as Record<string, number>;
  for (const [k, v] of Object.entries(map)) if (v === t) return k;
  return 'unknown';
}

export function deviceToInfo(d: Device): RGBDeviceInfo {
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
    brightness: brilloDelModoActivo(d),
  };
}

/**
 * El brillo del modo activo, en 0–100.
 *
 * Cada modo tiene su propio rango (`brightnessMin`..`brightnessMax`), distinto
 * entre dispositivos, así que el valor crudo no significa nada fuera de su
 * modo. Se normaliza aquí porque es lo que espera `applyProfile` al restaurarlo,
 * y así el perfil guardado no depende del rango del aparato que lo grabó.
 *
 * Devuelve `undefined` si el modo no admite brillo, que no es lo mismo que cero.
 */
function brilloDelModoActivo(d: Device): number | undefined {
  const m = d.modes.find((x) => x.id === d.activeMode);
  if (!m || m.brightness === undefined) return undefined;
  const min = m.brightnessMin ?? 0;
  const max = m.brightnessMax ?? 0;
  if (max <= min) return undefined;
  return Math.round(((m.brightness - min) / (max - min)) * 100);
}

// Build a correctly-sized RGBColor[] for a mode, all set to the given hex color.
export function buildModeColors(rawMode: Mode, hex: string): RGBColor[] {
  const rgb = hexToRgb(hex);
  const count = Math.max(1, rawMode.colors.length);
  return new Array(count).fill(null).map(() => ({ ...rgb }));
}

/**
 * Traduce brillo y velocidad de 0..100 al rango que declare el modo.
 *
 * Estaba solo dentro de `setDeviceMode`, y los presets no lo usaban: por eso
 * todos salian a la velocidad y el brillo que trajera el modo de fabrica.
 * Compartirlo es lo que permite que dos presets con el mismo modo se
 * distingan —una respiracion lenta y tenue no es la misma que una rapida y a
 * tope— sin motor de animacion ninguno.
 *
 * Lo importante y lo que no se puede perder de vista: **en OpenRGB el valor de
 * velocidad va al reves**, `speedMin` es el extremo mas rapido. Por eso se
 * invierte, para que aqui 100 signifique rapido.
 */
export function aplicarBrilloYVelocidad(
  update: Record<string, unknown>,
  rawMode: { brightnessMin?: number; brightnessMax?: number; speedMin?: number; speedMax?: number },
  brillo?: number,
  velocidad?: number,
): void {
  const { brightnessMin: bMin, brightnessMax: bMax, speedMin: sMin, speedMax: sMax } = rawMode;
  if (brillo !== undefined && bMin !== undefined && bMax !== undefined) {
    update.brightness = Math.round(bMin + ((bMax - bMin) * Math.max(0, Math.min(100, brillo)) / 100));
  }
  if (velocidad !== undefined && sMin !== undefined && sMax !== undefined && sMax !== sMin) {
    update.speed = Math.round(sMax - ((sMax - sMin) * Math.max(0, Math.min(100, velocidad)) / 100));
  }
}