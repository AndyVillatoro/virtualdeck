import React from 'react';
import type { useTheme } from '../../utils/theme';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';
import { describirAccion, describirPulsar } from './describirAccion';
import { etiquetaGestoPerilla } from './textoPanelInspector';
import type { HermanoPerilla } from './tiposPanelInspector';

/** Si el control es una perilla, sus otros dos gestos hermanos y qué hacen. */
export function ListaHermanosPerilla({
  hermanos,
  onSelectHueco,
  vd,
  t,
}: {
  hermanos: HermanoPerilla[];
  onSelectHueco?: (hueco: number) => void;
  vd: ReturnType<typeof useTheme>;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 8.5, color: vd.textMuted, fontFamily: vd.mono, textTransform: 'uppercase', letterSpacing: 1 }}>
        {t('disp.inspector.otrosGestos')}
      </label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: vd.space.xs }}>
        {hermanos.map((h) => {
          const desc = h.gesto === 'pulsar'
            ? describirPulsar(h.boton, t)
            : describirAccion(h.boton?.action, t);
          const etiqueta = etiquetaGestoPerilla(h.gesto, t);
          const tieneAccion = Boolean(h.boton?.action && h.boton.action.type !== 'none');
          return (
            <button
              key={h.gesto}
              type="button"
              onClick={() => onSelectHueco?.(h.hueco)}
              title={desc}
              style={{
                width: '100%',
                background: vd.elevated,
                border: `1px solid ${vd.border}`,
                borderRadius: vd.radius.sm,
                padding: `${vd.space.xs}px ${vd.space.sm}px`,
                display: 'flex',
                alignItems: 'center',
                gap: vd.space.xs,
                textAlign: 'left',
                cursor: onSelectHueco ? 'pointer' : 'default',
                fontFamily: vd.mono,
                fontSize: 9,
                outline: 'none',
                transition: 'background 0.12s, border-color 0.12s',
              }}
            >
              <DotGlyphIcon
                glyph={tieneAccion ? 'CHECK' : 'DOTS'}
                size={10}
                color={tieneAccion ? vd.success : vd.textMuted}
              />
              <span style={{ color: vd.textMuted, flexShrink: 0, fontWeight: 600 }}>
                {etiqueta} ·
              </span>
              <span
                style={{
                  color: tieneAccion ? vd.text : vd.textMuted,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {desc}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}