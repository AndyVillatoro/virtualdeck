import React from 'react';
import { useTheme } from '../../utils/theme';
import { useT, useFieldText } from '../../utils/i18n';
import { DotLabel } from '../../components/DotLabel';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';
import { ACTION_TYPES } from './actionData';
import { FORMULARIOS, type PropsFormulario } from './formularios';
import { FormMediaPlayPause } from './formularios/sistema';

interface SeccionAccionProps extends PropsFormulario {
  accent: string;
}

export function SeccionAccion(props: SeccionAccionProps) {
  const { action, setAction, accent } = props;
  const VD = useTheme();
  const t = useT();
  const tf = useFieldText();

  const Formulario = FORMULARIOS[action.type] ?? FormMediaPlayPause;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Selector de tipos de acción */}
      <div>
        <DotLabel size={9} color={VD.textMuted} spacing={2} style={{ display: 'block', marginBottom: 8 }}>
          {tf('TIPO DE ACCIÓN')}
        </DotLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          {ACTION_TYPES.map((at) => {
            const active = action.type === at.type;
            return (
              <div
                key={at.type}
                onClick={() => setAction({ type: at.type })}
                style={{
                  background: active ? VD.accentBg : VD.elevated,
                  border: `1px solid ${active ? accent : VD.border}`,
                  borderRadius: VD.radius.lg,
                  padding: '8px 10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'border-color 0.12s, background 0.12s',
                }}
              >
                <DotGlyphIcon glyph={at.glyph} size={16} color={active ? accent : VD.textMuted} showRecessed />
                <div style={{ overflow: 'hidden' }}>
                  <div
                    style={{
                      fontFamily: VD.mono,
                      fontSize: 8.5,
                      color: active ? VD.text : VD.textDim,
                      letterSpacing: 0.5,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {t(at.label)}
                  </div>
                  <div
                    style={{
                      fontFamily: VD.mono,
                      fontSize: 7.5,
                      color: VD.textMuted,
                      marginTop: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {t(at.desc)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ height: 1, background: VD.border }} />

      {/* Formulario específico de la acción seleccionada */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Formulario {...props} />
      </div>
    </div>
  );
}
