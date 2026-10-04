import React from 'react';
import { useTheme } from '../../utils/theme';
import { TeclaLcdHardware } from './TeclaLcdHardware';
import { BotonFisicoHardware } from './BotonFisicoHardware';
import { PerillaRotativaHardware } from './PerillaRotativaHardware';
import type { ButtonConfig } from '../../types';

interface VistaHardwareN3Props {
  botones: ButtonConfig[];
  selectedHueco: number | null;
  brillo: number;
  conectado: boolean;
  onSelectHueco: (hueco: number) => void;
  onEditarBoton: (id: string) => void;
}

export function VistaHardwareN3({
  botones,
  selectedHueco,
  brillo,
  conectado,
  onSelectHueco,
  onEditarBoton,
}: VistaHardwareN3Props) {
  const VD = useTheme();

  const handleEditar = (hueco: number) => {
    const btn = botones[hueco];
    if (btn) onEditarBoton(btn.id);
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: VD.space.lg,
        flex: 1,
      }}
    >
      <div
        style={{
          background: VD.surface,
          border: `2px solid ${VD.borderStrong}`,
          borderRadius: 14,
          padding: `${VD.space['2xl']}px ${VD.space['2xl']}px`,
          boxShadow: VD.shadow.modal,
          display: 'flex',
          gap: VD.space.xl,
          position: 'relative',
          maxWidth: 680,
          width: '100%',
          opacity: conectado ? 1 : 0.7,
          transition: 'opacity 0.2s',
        }}
      >
        {/* Tornillos esquineros industriales */}
        <div style={{ position: 'absolute', top: 8, left: 8, width: 6, height: 6, borderRadius: '50%', background: VD.borderStrong }} />
        <div style={{ position: 'absolute', top: 8, right: 8, width: 6, height: 6, borderRadius: '50%', background: VD.borderStrong }} />
        <div style={{ position: 'absolute', bottom: 8, left: 8, width: 6, height: 6, borderRadius: '50%', background: VD.borderStrong }} />
        <div style={{ position: 'absolute', bottom: 8, right: 8, width: 6, height: 6, borderRadius: '50%', background: VD.borderStrong }} />

        {/* Serigrafía central del chasis */}
        <div
          style={{
            position: 'absolute',
            top: 6,
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: 7.5,
            letterSpacing: 2,
            color: VD.textMuted,
            fontFamily: VD.mono,
            fontWeight: 700,
          }}
        >
          STREAM DOCK N3
        </div>

        {/* Bloque izquierdo: 6 teclas LCD + 3 botones físicos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: VD.space.md, flex: 1 }}>
          {/* Rejilla 3x2 de Teclas LCD (huecos 0..5) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gridTemplateRows: 'repeat(2, 1fr)',
              gap: VD.space.md,
            }}
          >
            {[0, 1, 2, 3, 4, 5].map((hueco) => (
              <TeclaLcdHardware
                key={hueco}
                indice={hueco}
                boton={botones[hueco]}
                seleccionada={selectedHueco === hueco}
                brillo={brillo}
                onSelect={() => onSelectHueco(hueco)}
                onEditar={() => handleEditar(hueco)}
              />
            ))}
          </div>

          {/* Fila de 3 botones mecánicos sin pantalla (huecos 6..8) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: VD.space.md,
              paddingTop: VD.space.xs,
              borderTop: `1px dashed ${VD.border}`,
            }}
          >
            {[0, 1, 2].map((idx) => {
              const hueco = 6 + idx;
              return (
                <BotonFisicoHardware
                  key={hueco}
                  indice={idx}
                  boton={botones[hueco]}
                  seleccionado={selectedHueco === hueco}
                  onSelect={() => onSelectHueco(hueco)}
                  onEditar={() => handleEditar(hueco)}
                />
              );
            })}
          </div>
        </div>

        {/* Bloque derecho: 3 perillas rotativas (huecos 9..17) */}
        <div
          style={{
            width: 144,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: VD.space.md,
            paddingLeft: VD.space.lg,
            borderLeft: `1px solid ${VD.border}`,
          }}
        >
          {[0, 1, 2].map((idx) => {
            const baseHueco = 6 + 3 + idx * 3; // 9, 12, 15
            const hIzq = baseHueco;
            const hPulsar = baseHueco + 1;
            const hDer = baseHueco + 2;

            let subSeleccionada: 'izq' | 'pulsar' | 'der' | null = null;
            if (selectedHueco === hIzq) subSeleccionada = 'izq';
            else if (selectedHueco === hPulsar) subSeleccionada = 'pulsar';
            else if (selectedHueco === hDer) subSeleccionada = 'der';

            const handleSelectGesto = (gesto: 'izq' | 'pulsar' | 'der') => {
              const h = gesto === 'izq' ? hIzq : gesto === 'der' ? hDer : hPulsar;
              onSelectHueco(h);
            };

            const handleEditarGesto = (gesto: 'izq' | 'pulsar' | 'der') => {
              const h = gesto === 'izq' ? hIzq : gesto === 'der' ? hDer : hPulsar;
              handleEditar(h);
            };

            return (
              <PerillaRotativaHardware
                key={baseHueco}
                indice={idx}
                botonIzq={botones[hIzq]}
                botonPulsar={botones[hPulsar]}
                botonDer={botones[hDer]}
                subAccionSeleccionada={subSeleccionada}
                onSelectGesto={handleSelectGesto}
                onEditarGesto={handleEditarGesto}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
