import type { DisposicionSuperficie } from '../types/superficies';
import { PRESETS_BOTON, PRESETS_PERILLA, type PresetHueco } from './presetsDock';

/**
 * Perfiles completos para un dock (roadmap 62): rellenan **todos** los controles
 * de una página de una vez, en un solo paso de deshacer.
 *
 * Reutilizan por id los presets de `presetsDock.ts`, sin texto propio: una tecla
 * o un botón toma el hueco de un preset de `PRESETS_BOTON` o de un hueco de
 * `PRESETS_PERILLA`, y una perilla va entera por id de `PRESETS_PERILLA`.
 *
 * El reparto es por tipo de control, no por posición fija: `huecosDePerfil`
 * sigue el orden de `controles` del modelo. Así un perfil cuadra con cualquier
 * modelo de 6 teclas, 3 botones y 3 perillas (el N3), y con ningún otro.
 */

/**
 * Un hueco de tecla o botón, siempre por referencia a un preset que ya existe
 * (sin texto propio, así no hay nada que traducir ni copiar):
 * - `string`: id de `PRESETS_BOTON` (su único hueco);
 * - `{ perilla, indice }`: un hueco de `PRESETS_PERILLA` (0 izq, 1 pulsar, 2 der).
 */
export type FuenteHueco = string | { perilla: string; indice: 0 | 1 | 2 };

export interface PerfilDock {
  id: string;
  /** Clave i18n del nombre (esEditor / enEditor). */
  nombre: string;
  /** Clave i18n de la descripción corta (esEditor / enEditor). */
  descripcion: string;
  icon: string;
  /** Las teclas con pantalla (`key`), en el orden del modelo. */
  teclas: FuenteHueco[];
  /** Los botones sin pantalla (`button`), en el orden del modelo. */
  botones: FuenteHueco[];
  /** Ids de `PRESETS_PERILLA`, en el orden de las perillas del modelo. */
  perillas: string[];
}

/** Huecos de la perilla de reproducción (anterior, play/pausa, siguiente) y de la de volumen de app. */
const REPRODUCCION_ANTERIOR = { perilla: 'media-player', indice: 0 } as const;
const REPRODUCCION_PLAY = { perilla: 'media-player', indice: 1 } as const;
const REPRODUCCION_SIGUIENTE = { perilla: 'media-player', indice: 2 } as const;
const VOLUMEN_APP_MUTE = { perilla: 'app-volume', indice: 1 } as const;

export const PERFILES_DOCK: PerfilDock[] = [
  {
    id: 'multimedia',
    nombre: 'preset.dock.profile.multimedia',
    descripcion: 'preset.dock.profile.multimedia.desc',
    icon: 'SPEAKER',
    perillas: ['master-volume', 'media-player', 'screen-brightness'],
    teclas: ['button-system-mute', REPRODUCCION_PLAY, REPRODUCCION_SIGUIENTE, REPRODUCCION_ANTERIOR, VOLUMEN_APP_MUTE, 'button-screen-snip'],
    botones: ['button-cycle-page', 'button-show-desktop', 'button-next-window'],
  },
  {
    id: 'streaming',
    nombre: 'preset.dock.profile.streaming',
    descripcion: 'preset.dock.profile.streaming.desc',
    icon: 'MIC',
    perillas: ['discord-volume', 'app-volume', 'universal-zoom'],
    teclas: ['button-discord-mute', 'button-discord-deaf', 'button-system-mute', 'button-screen-snip', 'button-multitask', 'button-prev-window'],
    botones: ['button-cycle-page', 'button-show-desktop', 'button-lock-pc'],
  },
  {
    id: 'productividad',
    nombre: 'preset.dock.profile.productividad',
    descripcion: 'preset.dock.profile.productividad.desc',
    icon: 'MONITOR',
    perillas: ['browser-tabs', 'history-undo-redo', 'virtual-desktops'],
    teclas: ['button-clipboard-history', 'button-multitask', 'button-prev-window', 'button-next-window', 'button-screen-snip', 'button-show-desktop'],
    botones: ['button-cycle-page', 'button-prev-page', 'button-next-page'],
  },
];

function huecoDeFuente(fuente: FuenteHueco): PresetHueco | undefined {
  if (typeof fuente === 'string') return PRESETS_BOTON.find((p) => p.id === fuente)?.huecos[0];
  return PRESETS_PERILLA.find((p) => p.id === fuente.perilla)?.huecos[fuente.indice];
}

function huecosDePerilla(id: string): PresetHueco[] | undefined {
  const preset = PRESETS_PERILLA.find((p) => p.id === id);
  return preset && preset.huecos.length === 3 ? preset.huecos : undefined;
}

/**
 * Los huecos de una página entera para un modelo, en su orden (el de `controles`).
 * Devuelve `null` si el modelo no tiene exactamente las teclas, botones y perillas
 * del perfil, si hay un id que no existe o si sobra algo: nunca rellena a medias.
 */
export function huecosDePerfil(perfil: PerfilDock, disposicion: DisposicionSuperficie): PresetHueco[] | null {
  const teclas = [...perfil.teclas];
  const botones = [...perfil.botones];
  const perillas = [...perfil.perillas];
  const salida: PresetHueco[] = [];

  for (const control of disposicion.controles) {
    if (control.tipo === 'key' || control.tipo === 'button') {
      const fuente = (control.tipo === 'key' ? teclas : botones).shift();
      const hueco = fuente === undefined ? undefined : huecoDeFuente(fuente);
      if (!hueco) return null;
      salida.push(hueco);
    } else if (control.tipo === 'knob') {
      const id = perillas.shift();
      const huecos = id === undefined ? undefined : huecosDePerilla(id);
      if (!huecos) return null;
      salida.push(...huecos);
    } else {
      return null;
    }
  }

  return teclas.length + botones.length + perillas.length === 0 ? salida : null;
}
