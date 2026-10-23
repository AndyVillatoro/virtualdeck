import React from 'react';
import { useTheme } from '../../../../utils/theme';
import { useT, useFieldText } from '../../../../utils/i18n';
import { Field, estiloEntrada } from '../../campos/comunes';
import { DotGlyphIcon } from '../../../../components/dot480/DotGlyphIcon';
import { Chip, Segmentado } from '../../../../components/ui/Chip';
import type { PropsFormulario } from '../base';

/** Las ventanas: dónde se coloca la activa y cuál se trae al frente. */

export function FormWindowSnap(p: PropsFormulario) {
  const VD = useTheme();
  const t = useT();
  const tf = useFieldText();
  const inputStyle = estiloEntrada(VD);
  const { accent, action, setAction } = p;
  return (
    <>
          <>
            <Field label={tf("POSICIÓN / TAMAÑO")}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {([
                  ['top-left', 'ARROW_UP', tf('Cuad. sup-izq')],
                  ['top-half', 'ARROW_UP', tf('Mitad superior')],
                  ['top-right', 'ARROW_UP', tf('Cuad. sup-der')],
                  ['left-half', 'ARROW_LEFT', tf('Mitad izq')],
                  ['center', 'DOTS', tf('Centro 50%')],
                  ['right-half', 'ARROW_RIGHT', tf('Mitad der')],
                  ['bottom-left', 'ARROW_DOWN', tf('Cuad. inf-izq')],
                  ['bottom-half', 'ARROW_DOWN', tf('Mitad inferior')],
                  ['bottom-right', 'ARROW_DOWN', tf('Cuad. inf-der')],
                  ['maximize', 'FULLSCREEN', tf('Maximizar')],
                  ['restore', 'MINIMIZE', tf('Restaurar')],
                ] as [string, string, string][]).map(([val, glyph, lbl]) => (
                  <Chip
                    key={val}
                    activo={action.snapPosition === val}
                    onClick={() => setAction((a) => ({ ...a, snapPosition: val as any }))}
                    accent={accent}
                    style={{ width: '100%', fontSize: 8, padding: '6px 4px' }}
                  >
                    <DotGlyphIcon glyph={glyph} size={8} color={action.snapPosition === val ? accent : VD.textDim} />
                    <span>{lbl}</span>
                  </Chip>
                ))}
              </div>
            </Field>
            <Field label={tf("PROCESO A AJUSTAR (opcional — vacío = ventana activa)")}>
              <input
                value={action.snapProcessName ?? ''}
                onChange={(e) => setAction((a) => ({ ...a, snapProcessName: e.target.value || undefined }))}
                placeholder={"chrome, notepad, code..."}
                style={inputStyle}
              />
              <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, marginTop: 4 }}>
                {t('ed.snapHint')}{' '}{t('ed.snapHint2')}
              </div>
            </Field>
          </>
    </>
  );
}

export function FormWindowCycle(p: PropsFormulario) {
  const VD = useTheme();
  const tf = useFieldText();
  const { accent, action, setAction } = p;
  const dir = action.windowCycle ?? 'next';
  return (
    <>
          <Field label={tf("DIRECCIÓN")}>
            <Segmentado
              repartir
              accent={accent}
              valor={dir}
              onChange={(o) => setAction((a) => ({ ...a, windowCycle: o }))}
              opciones={[
                { valor: 'prev', etiqueta: tf('ANTERIOR') },
                { valor: 'next', etiqueta: tf('SIGUIENTE') },
              ]}
            />
            <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, marginTop: 4 }}>
              {tf('Recorre las ventanas abiertas en orden estable (por programa), no como Alt+Tab.')}
            </div>
          </Field>
    </>
  );
}
