import React, { useState } from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';

export interface EstadoPluginsTiendaProps {
  onVolver: () => void;
}

/**
 * Estado explicativo que anuncia que la tienda de plugins de Stream Deck
 * está en desarrollo.
 *
 * Estética DOT: useTheme(), rejilla de 4 px, 0 emojis, glifo dot-matrix,
 * registro neutro y honesto sin fechas ni enlaces, solo botón volver.
 */
export function EstadoPluginsTienda({ onVolver }: EstadoPluginsTiendaProps) {
  const VD = useTheme();
  const t = useT();
  const [hoverBoton, setHoverBoton] = useState(false);

  return (
    <div
      style={{
        background: VD.surface,
        border: `1px solid ${VD.border}`,
        borderRadius: VD.radius.md,
        padding: '32px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: 16,
        maxWidth: 560,
        margin: '16px auto',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: VD.radius.sm,
          background: VD.elevated,
          border: `1px solid ${VD.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <DotGlyphIcon glyph="USB_PLUG" size={28} color={VD.accent} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          <span
            style={{
              fontFamily: VD.mono,
              fontSize: 11,
              fontWeight: 600,
              color: VD.text,
              letterSpacing: 1.5,
            }}
          >
            {t('tienda.pluginsTitulo')}
          </span>
          <span
            style={{
              fontFamily: VD.mono,
              fontSize: 7,
              letterSpacing: 0.5,
              padding: '1px 6px',
              borderRadius: VD.radius.sm,
              border: `1px solid ${VD.accent}`,
              color: VD.accent,
              background: VD.accentBg,
              lineHeight: 1.4,
            }}
          >
            {t('tienda.inDevBadge')}
          </span>
        </div>

        <p
          style={{
            margin: 0,
            fontFamily: VD.mono,
            fontSize: 9,
            color: VD.textDim,
            lineHeight: 1.6,
            maxWidth: 440,
          }}
        >
          {t('tienda.pluginsExplicacion')}
        </p>

        <p
          style={{
            margin: 0,
            fontFamily: VD.mono,
            fontSize: 8,
            color: VD.textMuted,
            lineHeight: 1.5,
            maxWidth: 400,
          }}
        >
          {t('tienda.pluginsNota')}
        </p>
      </div>

      <button
        type="button"
        onClick={onVolver}
        onMouseEnter={() => setHoverBoton(true)}
        onMouseLeave={() => setHoverBoton(false)}
        style={{
          padding: '4px 16px',
          minHeight: 28,
          background: hoverBoton ? VD.elevatedHover : VD.elevated,
          border: `1px solid ${hoverBoton ? VD.accent : VD.border}`,
          borderRadius: VD.radius.sm,
          color: hoverBoton ? VD.accent : VD.text,
          fontFamily: VD.mono,
          fontSize: 8,
          letterSpacing: 1,
          cursor: 'pointer',
          outline: 'none',
          transition: 'border-color 0.12s, color 0.12s, background 0.12s',
          whiteSpace: 'nowrap',
        }}
      >
        {t('tienda.pluginsVolver')}
      </button>
    </div>
  );
}
