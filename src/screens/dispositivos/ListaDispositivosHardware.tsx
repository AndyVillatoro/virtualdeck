import React from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import type { InfoSuperficie } from '../../types/superficies';

export interface DispositivoItem extends InfoSuperficie {
  paginaNombre?: string;
}

interface ListaDispositivosHardwareProps {
  dispositivos: DispositivoItem[];
  selectedSerial: string | null;
  onSelectSerial: (serial: string) => void;
}

export function ListaDispositivosHardware({
  dispositivos,
  selectedSerial,
  onSelectSerial,
}: ListaDispositivosHardwareProps) {
  const VD = useTheme();
  const t = useT();

  return (
    <aside
      style={{
        width: 250,
        background: VD.surface,
        borderRight: `1px solid ${VD.border}`,
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        height: '100%',
      }}
    >
      <div
        style={{
          padding: VD.space.md,
          borderBottom: `1px solid ${VD.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontSize: 9,
            color: VD.textMuted,
            letterSpacing: 1.5,
            fontFamily: VD.mono,
            textTransform: 'uppercase',
          }}
        >
          {t('disp.detectados')}
        </span>
        <span
          style={{
            fontSize: 9,
            color: VD.textDim,
            fontFamily: VD.mono,
          }}
        >
          {dispositivos.length}
        </span>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: VD.space.sm,
          display: 'flex',
          flexDirection: 'column',
          gap: VD.space.xs,
        }}
      >
        {dispositivos.length === 0 ? (
          <div
            style={{
              padding: VD.space.lg,
              textAlign: 'center',
              color: VD.textMuted,
              fontFamily: VD.mono,
              fontSize: 9.5,
              lineHeight: 1.5,
            }}
          >
            {t('disp.sinDispositivos')}
          </div>
        ) : (
          dispositivos.map((d) => {
            const activo = d.serial === selectedSerial;
            return (
              <div
                key={d.serial}
                onClick={() => onSelectSerial(d.serial)}
                style={{
                  padding: VD.space.sm + 2,
                  background: activo ? VD.accentBg : VD.elevated,
                  border: `1px solid ${activo ? VD.accent : VD.border}`,
                  borderRadius: VD.radius.md,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 3,
                  transition: 'all 0.15s ease',
                  opacity: d.conectado ? 1 : 0.65,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: VD.text,
                      fontFamily: VD.mono,
                    }}
                  >
                    {d.nombre}
                  </span>

                  <span
                    style={{
                      fontSize: 8,
                      padding: '2px 5px',
                      borderRadius: VD.radius.sm,
                      fontFamily: VD.mono,
                      letterSpacing: 0.5,
                      textTransform: 'uppercase',
                      background: d.conectado ? `${VD.success}22` : `${VD.textMuted}22`,
                      color: d.conectado ? VD.success : VD.textMuted,
                      border: `1px solid ${d.conectado ? `${VD.success}55` : `${VD.textMuted}55`}`,
                    }}
                  >
                    {d.conectado ? t('disp.conectado') : t('disp.desconectado')}
                  </span>
                </div>

                <div
                  style={{
                    fontSize: 8.5,
                    color: VD.textDim,
                    fontFamily: VD.mono,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                  }}
                >
                  <span>{`${t('disp.serial')}: ${d.serial}`}</span>
                  {d.paginaNombre && (
                    <span style={{ color: VD.accent }}>
                      {`${t('disp.pagina')}: ${d.paginaNombre}`}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
