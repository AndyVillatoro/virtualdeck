import React from 'react';
import { useTheme } from '../../../utils/theme';
import { useT } from '../../../utils/i18n';
import { DotLabel } from '../../../components/DotLabel';
import { DotGlyphIcon } from '../../../components/dot480/DotGlyphIcon';
import type { VentanaCaptura } from '../../../types';

/**
 * Selector compacto de ventanas con miniatura. Sale cuando no hay candidata
 * clara o cuando se pide cambiar de ventana. Solo lista ventanas: la pantalla
 * completa no se ofrece nunca.
 */
export function SelectorVentanas({ ventanas, seleccionada, cargando, onElegir, indicacion }: {
  ventanas: VentanaCaptura[];
  seleccionada: string | null;
  cargando: boolean;
  onElegir: (id: string) => void;
  indicacion?: string | null;
}) {
  const VD = useTheme();
  const t = useT();

  const aviso = indicacion ? (
    <div style={{
      padding: '6px 8px',
      background: VD.overlay,
      border: `1px solid ${VD.border}`,
      borderRadius: VD.radius.md,
      display: 'flex',
      alignItems: 'center',
      gap: 6,
    }}>
      <DotGlyphIcon glyph="APP_WINDOW" size={12} color={VD.textMuted} />
      <span style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textDim, lineHeight: 1.4 }}>
        {indicacion}
      </span>
    </div>
  ) : null;

  if (cargando) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {aviso}
        <DotLabel size={8} color={VD.textMuted} spacing={1}>{t('music.videoLoading')}</DotLabel>
      </div>
    );
  }
  if (ventanas.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {aviso}
        <DotLabel size={8} color={VD.textMuted} spacing={1}>{t('music.videoNone')}</DotLabel>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {aviso}
      <DotLabel size={8} color={VD.textDim} spacing={1}>{t('music.videoPick')}</DotLabel>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {ventanas.map((v) => {
          const activa = v.id === seleccionada;
          const tituloBoton = v.nombre || t('music.videoWindow');
          return (
            <button
              key={v.id}
              type="button"
              title={tituloBoton}
              aria-label={tituloBoton}
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
