import type { ButtonAction, ButtonConfig } from '../../types';
import type { PresetHueco } from '../../data/presetsDock';

/**
 * Arrastre estilo Stream Deck para acciones de plugins instalados.
 *
 * El catálogo lateral de plugins (`CatalogoPluginsArrastrable`) codifica la
 * acción arrastrada con el prefijo `vd-plugin:` en `text/plain` (y en su propio
 * tipo MIME) para que tanto las celdas de la rejilla principal (`ButtonCell`)
 * como los controles físicos del diagrama de dock (`VistaHardware`: teclas LCD,
 * botones físicos, perillas y tiras táctiles) acepten soltar el plugin
 * directamente sobre el botón o gesto deseado, sin desplegables ni botón «Aplicar».
 */

export const PREFIJO_ARRASTRE_PLUGIN = 'vd-plugin:';
export const MIME_ARRASTRE_PLUGIN = 'application/x-virtualdeck-plugin';

export interface CargaArrastrePlugin {
  pluginUuid: string;
  accionUuid: string;
  nombre: string;
  esEncoder?: boolean;
}

export function codificarArrastrePlugin(carga: CargaArrastrePlugin): string {
  return `${PREFIJO_ARRASTRE_PLUGIN}${JSON.stringify({
    pluginUuid: carga.pluginUuid,
    accionUuid: carga.accionUuid,
    nombre: carga.nombre,
    ...(carga.esEncoder ? { esEncoder: true } : {}),
  })}`;
}

export function decodificarArrastrePlugin(texto: string | null | undefined): CargaArrastrePlugin | null {
  if (!texto || !texto.startsWith(PREFIJO_ARRASTRE_PLUGIN)) return null;
  try {
    const raw = JSON.parse(texto.slice(PREFIJO_ARRASTRE_PLUGIN.length)) as Record<string, unknown>;
    const pluginUuid = typeof raw?.pluginUuid === 'string' ? raw.pluginUuid.trim() : '';
    const accionUuid = typeof raw?.accionUuid === 'string' ? raw.accionUuid.trim() : '';
    const nombre = typeof raw?.nombre === 'string' ? raw.nombre : '';
    if (!pluginUuid || !accionUuid) return null;
    return {
      pluginUuid,
      accionUuid,
      nombre,
      ...(raw?.esEncoder === true ? { esEncoder: true } : {}),
    };
  } catch {
    return null;
  }
}

/** Aplica una acción de plugin arrastrada sobre un `ButtonConfig` de la rejilla principal. */
export function aplicarPluginABoton(boton: ButtonConfig, carga: CargaArrastrePlugin): ButtonConfig {
  return {
    id: boton.id,
    page: boton.page,
    label: carga.nombre,
    icon: '',
    action: {
      type: 'plugin',
      plugin: {
        pluginUuid: carga.pluginUuid,
        accionUuid: carga.accionUuid,
      },
    },
    ...(boton.fijo ? { fijo: true } : {}),
  };
}

function extrasHueco(boton: ButtonConfig): Partial<PresetHueco> {
  return {
    ...(boton.isToggle ? { isToggle: true } : {}),
    ...(boton.actionToggleOff ? { actionToggleOff: boton.actionToggleOff } : {}),
    ...(boton.fijo ? { fijo: true } : {}),
    ...(boton.modosPerilla ? { modosPerilla: boton.modosPerilla } : {}),
    ...(boton.iconoPuntos ? { iconoCatalogo: boton.iconoPuntos.origen } : {}),
  };
}

/** Convierte un botón existente en `PresetHueco` sin cambios (para conservar hermanos de perilla/tira). */
export function botonAHueco(boton: ButtonConfig | undefined): PresetHueco {
  const vacia: ButtonAction = { type: 'none' };
  return {
    label: boton?.label ?? '',
    icon: boton?.icon ?? '',
    bgColor: boton?.bgColor,
    fgColor: boton?.fgColor,
    action: boton?.action ?? vacia,
    ...(boton ? extrasHueco(boton) : {}),
  };
}

/** Construye el `PresetHueco` de una acción de plugin arrastrada sobre un hueco del dock. */
export function cargaAHuecoPlugin(botonPrevio: ButtonConfig | undefined, carga: CargaArrastrePlugin): PresetHueco {
  return {
    label: carga.nombre,
    icon: '',
    bgColor: undefined,
    fgColor: undefined,
    action: {
      type: 'plugin',
      plugin: {
        pluginUuid: carga.pluginUuid,
        accionUuid: carga.accionUuid,
      },
    },
    ...(botonPrevio?.fijo ? { fijo: true } : {}),
    ...(botonPrevio?.modosPerilla ? { modosPerilla: botonPrevio.modosPerilla } : {}),
  };
}

/**
 * Construye la lista de `PresetHueco` para un control físico del dock (1 hueco en
 * tecla/botón, 2 en tira táctil, 3 en perilla) al soltar un plugin sobre uno de
 * sus huecos (o sobre el eje central de una perilla cuando la acción es `Encoder`).
 */
export function construirHuecosSoltarPlugin(
  botonesControl: (ButtonConfig | undefined)[],
  indiceHueco: number,
  carga: CargaArrastrePlugin,
  aplicarATodaLaPerilla = false,
): PresetHueco[] {
  return botonesControl.map((b, i) => {
    if (aplicarATodaLaPerilla || i === indiceHueco) {
      return cargaAHuecoPlugin(b, carga);
    }
    return botonAHueco(b);
  });
}
