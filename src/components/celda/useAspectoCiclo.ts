import { useMemo } from 'react';
import { botonConAspectoCiclo } from '../../comun/cicloIcono';
import type { ButtonConfig } from '../../types';

/**
 * El botón `cycle` tal como se pinta con el paso actual.
 *
 * El índice vive en `config.state['__cycle_' + button.id]`, así que basta con
 * recibir `deckState` como prop: no hace falta suscripción, porque el padre ya
 * repinta cuando cambia.
 */
export function useAspectoCiclo(button: ButtonConfig, deckState?: Record<string, string>): ButtonConfig {
  return useMemo(() => botonConAspectoCiclo(button, deckState), [button, deckState]);
}
