import React from 'react';
import { Hint } from '../../components/Hint';

interface AvisosContextualesProps {
  hayBotones: boolean;
  hintsDismissed?: string[];
  onDismissHint?: (id: string) => void;
  accent: string;
}

/**
 * Hints contextuales de la principal (uno a la vez): deck vacío → crear el
 * primer botón; con botones → tip de búsqueda Ctrl+K. Descartables.
 */
export function AvisosContextuales({ hayBotones, hintsDismissed, onDismissHint, accent }: AvisosContextualesProps) {
  if (!onDismissHint) return null;
  if (!hayBotones) {
    return (
      <Hint
        id="firstButton"
        textKey="hint.firstButton"
        dismissed={hintsDismissed}
        onDismiss={onDismissHint}
        accent={accent}
        style={{ top: 12, left: '50%', transform: 'translateX(-50%)' }}
      />
    );
  }
  return (
    <Hint
      id="search"
      textKey="hint.search"
      dismissed={hintsDismissed}
      onDismiss={onDismissHint}
      accent={accent}
      style={{ bottom: 12, left: '50%', transform: 'translateX(-50%)' }}
    />
  );
}
