import React from 'react';
import { useTheme } from '../../utils/theme';
import { ListaDispositivosHardware, type DispositivoItem } from './ListaDispositivosHardware';
import { PanelInspectorControl, type HermanoPerilla } from './PanelInspectorControl';
import type { ButtonConfig } from '../../types';
import type { PresetHueco } from '../../data/presetsDock';
import type { ControlSuperficie } from '../../types/superficies';

interface LateralListaProps {
  abierta: boolean;
  esPequeno: boolean;
  dispositivos: DispositivoItem[];
  selectedSerial: string | null;
  ancho: number;
  anchoVentana: number;
  onSelectSerial: (serial: string) => void;
  onCerrar: () => void;
}

export function LateralLista({
  abierta,
  esPequeno,
  dispositivos,
  selectedSerial,
  ancho,
  anchoVentana,
  onSelectSerial,
  onCerrar,
}: LateralListaProps) {
  const VD = useTheme();
  if (!abierta) return null;

  if (esPequeno) {
    return (
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 20,
          boxShadow: VD.shadow.modal,
          display: 'flex',
        }}
      >
        <ListaDispositivosHardware
          dispositivos={dispositivos}
          selectedSerial={selectedSerial}
          ancho={Math.min(260, anchoVentana - 40)}
          onSelectSerial={onSelectSerial}
          onCerrar={onCerrar}
        />
      </div>
    );
  }

  return (
    <ListaDispositivosHardware
      dispositivos={dispositivos}
      selectedSerial={selectedSerial}
      ancho={ancho}
      onSelectSerial={onSelectSerial}
    />
  );
}

interface LateralInspectorProps {
  abierta: boolean;
  esPequeno: boolean;
  controlMeta: {
    control: ControlSuperficie;
    indice: number;
    gesto?: 'izq' | 'pulsar' | 'der';
  } | null;
  boton?: ButtonConfig;
  disabled: boolean;
  ancho: number;
  anchoVentana: number;
  onEditar: () => void;
  onAplicarPreset?: (huecos: PresetHueco[]) => void;
  onCerrar: () => void;
  hermanosPerilla?: HermanoPerilla[];
  onSelectHueco?: (hueco: number) => void;
}

export function LateralInspector({
  abierta,
  esPequeno,
  controlMeta,
  boton,
  disabled,
  ancho,
  anchoVentana,
  onEditar,
  onAplicarPreset,
  onCerrar,
  hermanosPerilla,
  onSelectHueco,
}: LateralInspectorProps) {
  const VD = useTheme();
  if (!abierta) return null;

  if (esPequeno) {
    return (
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          zIndex: 20,
          boxShadow: VD.shadow.modal,
          display: 'flex',
        }}
      >
        <PanelInspectorControl
          controlMeta={controlMeta}
          boton={boton}
          disabled={disabled}
          ancho={Math.min(290, anchoVentana - 40)}
          onEditar={onEditar}
          onAplicarPreset={onAplicarPreset}
          onCerrar={onCerrar}
          hermanosPerilla={hermanosPerilla}
          onSelectHueco={onSelectHueco}
        />
      </div>
    );
  }

  return (
    <PanelInspectorControl
      controlMeta={controlMeta}
      boton={boton}
      disabled={disabled}
      ancho={ancho}
      onEditar={onEditar}
      onAplicarPreset={onAplicarPreset}
      onCerrar={onCerrar}
      hermanosPerilla={hermanosPerilla}
      onSelectHueco={onSelectHueco}
    />
  );
}

