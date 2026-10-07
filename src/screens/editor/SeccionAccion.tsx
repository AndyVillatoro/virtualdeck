import React from 'react';
import { useTheme } from '../../utils/theme';
import { useFieldText } from '../../utils/i18n';
import { DotLabel } from '../../components/DotLabel';
import { SelectorTipoAccion } from './SelectorTipoAccion';
import { FORMULARIOS, type PropsFormulario } from './formularios';
import { FormMediaPlayPause } from './formularios/sistema';
import type { ActionType } from '../../types';

interface SeccionAccionProps extends PropsFormulario {
  accent: string;
  /** Tipos que no se ofrecen (p. ej. `folder` en un control sin pantalla). */
  excluir?: ActionType[];
}

export function SeccionAccion(props: SeccionAccionProps) {
  const { action, setAction, accent, excluir } = props;
  const VD = useTheme();
  const tf = useFieldText();

  const Formulario = FORMULARIOS[action.type] ?? FormMediaPlayPause;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Selector de tipos de acción */}
      <div>
        <DotLabel size={9} color={VD.textMuted} spacing={2} style={{ display: 'block', marginBottom: 8 }}>
          {tf('TIPO DE ACCIÓN')}
        </DotLabel>
        <SelectorTipoAccion
          seleccionado={action.type}
          onElegir={(type) => setAction({ type })}
          accent={accent}
          excluir={excluir}
        />
      </div>

      <div style={{ height: 1, background: VD.border }} />

      {/* Formulario específico de la acción seleccionada */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Formulario {...props} />
      </div>
    </div>
  );
}
