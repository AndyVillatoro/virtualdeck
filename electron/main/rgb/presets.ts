import { setDeviceColor } from './aplicar';
import { aplicarBrilloYVelocidad, buildModeColors, CM_NONE, CM_RANDOM } from './color';
import { estado } from './estado';

// ── Presets inteligentes ───────────────────────────────────────────────────
// Each preset lists mode name substrings to try (in priority order) and a color.
// Works device-agnostically: picks the first matching mode per device.
interface SmartPresetDef {
  color: string;      // primary color ('#rrggbb'). '' = skip color (for autonomous effects)
  tryModes: string[]; // mode name substrings, tried in order (case-insensitive)
  /** 0..100 sobre el rango que declare el modo. Sin valor, el de fabrica. */
  brillo?: number;
  /** 0..100, donde 100 es rapido. Sin valor, el de fabrica. */
  velocidad?: number;
}

/**
 * Los presets que ofrece el boton de «preset RGB».
 *
 * Todos se apoyan en modos que el propio dispositivo ya sabe hacer: aqui no
 * hay motor de animacion, VirtualDeck no manda fotogramas. Lo que distingue a
 * uno de otro es el color, la lista de modos que se intentan y —desde ahora—
 * el brillo y la velocidad, que es lo que permite que dos presets sobre el
 * mismo modo «breathing» se sientan distintos.
 *
 * `tryModes` va de lo especifico a lo generico y **acaba siempre en algo que
 * cualquier dispositivo tiene** (`static` o `direct`): si la placa no sabe
 * hacer olas, al menos se queda del color que toca en vez de no hacer nada.
 *
 * Si se añade uno aqui hay que añadirlo tambien a `src/data/rgbPresets.ts` y
 * ponerle nombre en los dos diccionarios; `scripts/check-acciones.mjs` cruza
 * las dos listas y falla si se separan.
 */
const SMART_PRESETS: Record<string, SmartPresetDef> = {
  off:          { color: '#000000', tryModes: ['off', 'black', 'static', 'direct', 'custom'] },
  gaming:       { color: '#ff1800', tryModes: ['breathing', 'breath', 'pulse', 'blink', 'static'], brillo: 100, velocidad: 75 },
  cinema:       { color: '#200400', tryModes: ['static', 'direct', 'custom', 'breathing'], brillo: 25 },
  work:         { color: '#ffffff', tryModes: ['static', 'direct', 'custom'], brillo: 100 },
  rainbow:      { color: '',        tryModes: ['spectrum cycle', 'rainbow wave', 'rainbow', 'spectrum', 'cycle'], velocidad: 50 },
  'night-blue': { color: '#000880', tryModes: ['breathing', 'breath', 'pulse', 'static'], brillo: 35, velocidad: 25 },
  'alert-red':  { color: '#ff0000', tryModes: ['flicker', 'flash', 'blink', 'breathing', 'static'], brillo: 100, velocidad: 100 },

  // — Para trabajar y leer —
  reading:      { color: '#ff9d3c', tryModes: ['static', 'direct', 'custom'], brillo: 55 },
  focus:        { color: '#cfe6ff', tryModes: ['static', 'direct', 'custom'], brillo: 90 },
  dim:          { color: '#ffffff', tryModes: ['static', 'direct', 'custom'], brillo: 10 },

  // — Ambiente —
  sunset:       { color: '#ff5c1a', tryModes: ['breathing', 'breath', 'pulse', 'static'], brillo: 60, velocidad: 15 },
  ocean:        { color: '#00a0c8', tryModes: ['breathing', 'breath', 'wave', 'static'], brillo: 55, velocidad: 20 },
  forest:       { color: '#1fa04a', tryModes: ['breathing', 'breath', 'pulse', 'static'], brillo: 50, velocidad: 20 },
  candle:       { color: '#ff8a2a', tryModes: ['flicker', 'breathing', 'breath', 'static'], brillo: 40, velocidad: 35 },
  violet:       { color: '#8a2be2', tryModes: ['breathing', 'breath', 'pulse', 'static'], brillo: 65, velocidad: 30 },

  // — Con movimiento propio del dispositivo —
  party:        { color: '',        tryModes: ['spectrum cycle', 'rainbow wave', 'rainbow', 'spectrum', 'cycle'], brillo: 100, velocidad: 100 },
  wave:         { color: '#00d0ff', tryModes: ['wave', 'rainbow wave', 'spectrum cycle', 'breathing', 'static'], brillo: 80, velocidad: 45 },
  strobe:       { color: '#ffffff', tryModes: ['flashing', 'flash', 'blink', 'strobe', 'flicker', 'breathing'], brillo: 100, velocidad: 100 },
};

/**
 * Los presets disponibles, con el color con el que pintan.
 *
 * Se lee de `SMART_PRESETS`, que es la lista de verdad. La pantalla podria
 * llevar su propia copia de los colores, pero entonces habria dos y se
 * separarian: `src/data/rgbPresets.ts` ya guarda solo los ids, y hay un
 * guardian que comprueba que esa lista y esta no se desalineen.
 */
export function listaPresets(): Array<{ id: string; color: string }> {
  return Object.entries(SMART_PRESETS).map(([id, p]) => ({ id, color: p.color }));
}

export async function applySmartPreset(presetId: string): Promise<boolean> {
  if (!estado.client?.isConnected) return false;
  const preset = SMART_PRESETS[presetId];
  if (!preset) return false;

  let success = true;
  let alguno = false;

  for (const rawDev of estado.devicesRaw) {
    const devInfo = estado.devicesCache.find((d) => d.id === rawDev.deviceId);
    if (!devInfo) continue;
    alguno = true;

    try {
      let applied = false;

      for (const modeSubstr of preset.tryModes) {
        const rawMode = rawDev.modes.find((m) => m.name.toLowerCase().includes(modeSubstr.toLowerCase()));
        if (!rawMode) continue;

        const update: any = { id: rawMode.id };

        if (preset.color && rawMode.colorMode !== CM_NONE && rawMode.colorMode !== CM_RANDOM) {
          update.colors = buildModeColors(rawMode, preset.color);
        }
        aplicarBrilloYVelocidad(update, rawMode, preset.brillo, preset.velocidad);

        await estado.client.updateMode(rawDev.deviceId, update);
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

  return success && alguno;
}