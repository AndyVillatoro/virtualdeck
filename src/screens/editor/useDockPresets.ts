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

export interface DockControlInfo {
  esDock: boolean;
  controlMeta: {
    control: ControlSuperficie;
    indice: number;
    gesto?: GestoHueco;
  } | null;
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
      return { esDock: false, controlMeta: null, presets: [] };
    }

    const modeloId = page?.superficie?.modelo;
    const disposicion = modeloId ? modelos[modeloId] : null;
    const slot = extraerSlotDeBoton(button.id);

    const controlMeta = disposicion && slot !== null ? controlDeHueco(disposicion, slot) : null;
    const controlTipo = controlMeta?.control;

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
      presets,
      gesto: controlMeta?.gesto,
    };
  }, [button.id, button.page, pages, modelos]);
}
