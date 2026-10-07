import React from 'react';
import { useTheme } from '../../../utils/theme';
import { useT } from '../../../utils/i18n';
import { DotLabel } from '../../../components/DotLabel';
import type { VentanaCaptura } from '../../../types';

/**
 * Selector compacto de ventanas con miniatura. Sale cuando no hay candidata
 * clara o cuando se pide cambiar de ventana. Solo lista ventanas: la pantalla
 * completa no se ofrece nunca.
 */
export function SelectorVentanas({ ventanas, seleccionada, cargando, onElegir }: {
  ventanas: VentanaCaptura[];
  seleccionada: string | null;
  cargando: boolean;
  onElegir: (id: string) => void;
}) {
  const VD = useTheme();
  const t = useT();

  if (cargando) {
    return <DotLabel size={8} color={VD.textMuted} spacing={1}>{t('music.videoLoading')}</DotLabel>;
  }
  if (ventanas.length === 0) {
    return <DotLabel size={8} color={VD.textMuted} spacing={1}>{t('music.videoNone')}</DotLabel>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <DotLabel size={8} color={VD.textDim} spacing={1}>{t('music.videoPick')}</DotLabel>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {ventanas.map((v) => {
          const activa = v.id === seleccionada;
          return (
            <button
              key={v.id}
              type="button"
              title={v.nombre}
              aria-label={v.nombre}
              aria-pressed={activa}
              onClick={() => onElegir(v.id)}
              style={{
                width: 136, padding: 4, cursor: 'pointer',
                display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'stretch',
                background: VD.elevated,
                border: `1px solid ${activa ? VD.text : VD.border}`,
                borderRadius: VD.radius.md,
              }}
            >
              <div style={{
                width: '100%', height: 76, background: VD.overlay, borderRadius: VD.radius.sm,
                display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
              }}>
                {v.miniatura && (
                  <img
                    src={v.miniatura}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                )}
              </div>
              <span style={{
                fontFamily: VD.mono, fontSize: 9, color: VD.textDim, textAlign: 'left',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {v.nombre}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
