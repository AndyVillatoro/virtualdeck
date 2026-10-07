import { useEffect, useMemo, useState } from 'react';
import type { ButtonConfig, PageConfig } from '../../types';
import type { DisposicionSuperficie, ControlSuperficie } from '../../types/superficies';
import { controlDeHueco } from '../../utils/superficies/disposicion';
import {
  PRESETS_PERILLA,
  PRESETS_BOTON,
  PRESETS_TIRA,
  type PresetDock,
  type PresetHueco,
} from '../../data/presetsDock';

export type GestoHueco = 'izq' | 'pulsar' | 'der';

/**
 * El control físico que el editor está editando, resuelto una sola vez.
 *
 * `null` = no es una página de dock, o el modelo todavía no ha llegado (o no
 * existe): sin tipo de control no se pueden ofrecer opciones dependientes, así
 * que no se enseñan ni se esconden (roadmap 92). `tipo` usa el vocabulario
 * físico de `ControlSuperficie` y no etiquetas en español: son datos, no
 * interfaz, y la auditoría de i18n no tiene por qué traducirlos.
 */
export interface ContextoDock {
  tipo: ControlSuperficie;
  gesto?: GestoHueco;
  conPantalla: boolean;
}

const CON_PANTALLA: Record<ControlSuperficie, boolean> = {
  key: true,
  button: false,
  knob: false,
  swipe: false,
};

export interface DockControlInfo {
  esDock: boolean;
  controlMeta: {
    control: ControlSuperficie;
    indice: number;
    gesto?: GestoHueco;
  } | null;
  /** El control resuelto, o `null` si no se puede saber. */
  contexto: ContextoDock | null;
  presets: PresetDock[];
  gesto?: GestoHueco;
}

/** Extrae el número de hueco/slot de un botón según su ID. */
export function extraerSlotDeBoton(buttonId: string): number | null {
  const mUnderscore = buttonId.match(/_(\d+)(?:-\d+)?$/);
  if (mUnderscore) return parseInt(mUnderscore[1], 10);
  const mDash = buttonId.match(/^[^-]+-(\d+)(?:-\d+)?$/);
  if (mDash) return parseInt(mDash[1], 10);
  const mAny = buttonId.match(/(\d+)$/);
  if (mAny) return parseInt(mAny[1], 10);
  return null;
}

/** Obtiene el hueco adecuado de un PresetDock según el gesto del control físico. */
export function obtenerHuecoDePreset(
  preset: PresetDock,
  gesto?: 'izq' | 'pulsar' | 'der',
): PresetHueco {
  if (preset.huecos.length <= 1) return preset.huecos[0];
  if (gesto === 'der') return preset.huecos[preset.huecos.length - 1];
  if (gesto === 'pulsar' && preset.huecos.length >= 3) return preset.huecos[1];
  return preset.huecos[0];
}

/** Hook que detecta si el botón es de un dock físico y calcula los presets correspondientes. */
export function useDockPresets(
  button: ButtonConfig,
  pages: PageConfig[] = [],
): DockControlInfo {
  const [modelos, setModelos] = useState<Record<string, DisposicionSuperficie>>({});
  const api = window.electronAPI;

  useEffect(() => {
    if (api?.superficies?.modelos) {
      api.superficies.modelos().then(setModelos).catch(() => {});
    }
  }, [api]);

  return useMemo(() => {
    const page = pages[button.page];
    const esDock = Boolean(page?.superficie);
    if (!esDock) {
      return { esDock: false, controlMeta: null, contexto: null, presets: [] };
    }

    const modeloId = page?.superficie?.modelo;
    const disposicion = modeloId ? modelos[modeloId] : null;
    const slot = extraerSlotDeBoton(button.id);

    const controlMeta = disposicion && slot !== null ? controlDeHueco(disposicion, slot) : null;
    const controlTipo = controlMeta?.control;
    const contexto: ContextoDock | null = controlMeta
      ? { tipo: controlMeta.control, gesto: controlMeta.gesto, conPantalla: CON_PANTALLA[controlMeta.control] }
      : null;

    let presets: PresetDock[];
    if (controlTipo === 'knob') {
      presets = PRESETS_PERILLA;
    } else if (controlTipo === 'swipe') {
      presets = PRESETS_TIRA;
    } else {
      presets = PRESETS_BOTON;
    }

    return {
      esDock: true,
      controlMeta,
      contexto,
      presets,
      gesto: controlMeta?.gesto,
    };
  }, [button.id, button.page, pages, modelos]);
}
