import type { ButtonConfig, ModoPerilla } from '../../types';
import type { ControlSuperficie } from '../../types/superficies';
import type { PresetHueco } from '../../data/presetsDock';
import type { PerfilDock } from '../../data/perfilesDock';

export interface HermanoPerilla {
  gesto: 'izq' | 'pulsar' | 'der';
  hueco: number;
  boton?: ButtonConfig;
}

export interface PanelInspectorControlProps {
  controlMeta: {
    control: ControlSuperficie;
    indice: number;
    gesto?: 'izq' | 'pulsar' | 'der';
  } | null;
  boton?: ButtonConfig;
  disabled?: boolean;
  onEditar: () => void;
  /** Con un control elegido, sus huecos (preset de control). Sin control, un perfil de página (roadmap 62). */
  onAplicarPreset?: (entrada: PresetHueco[] | PerfilDock) => void;
  ancho?: number;
  onCerrar?: () => void;
  hermanosPerilla?: HermanoPerilla[];
  onSelectHueco?: (hueco: number) => void;
  /** Los tres botones de la perilla elegida (T-HW-19), si lo es. */
  perilla?: { izq?: ButtonConfig; pulsar?: ButtonConfig; der?: ButtonConfig } | null;
  /** Modo activo en memoria, para enseñarlo en el inspector. */
  modoActivo?: number | null;
  onFijarModos?: (modos: ModoPerilla[]) => void;
}

export type ControlMeta = NonNullable<PanelInspectorControlProps['controlMeta']>;