import React from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { Hint } from '../Hint';
import { estilo_iconBtnStyle } from './estilos';

export interface BotonAjustesConHintProps {
  ruedaRef: React.RefObject<HTMLButtonElement>;
  showSettings: boolean;
  onToggle: () => void;
  effectiveAccent: string;
  hintsDismissed?: string[];
  onDismissHint?: (id: string) => void;
  compact?: boolean;
}

export function BotonAjustesConHint({
  ruedaRef,
  showSettings,
  onToggle,
  effectiveAccent,
  hintsDismissed,
  onDismissHint,
  compact = false,
}: BotonAjustesConHintProps) {
  const VD = useTheme();
  const t = useT();
  const iconBtnStyle = estilo_iconBtnStyle(VD, compact);

  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        ref={ruedaRef}
        onClick={onToggle}
        title={t('tip.settings')}
        style={{ ...iconBtnStyle, color: showSettings ? effectiveAccent : VD.textDim }}
      >
        ⚙
      </button>
      {onDismissHint && !showSettings && (
        <Hint
          id="settings"
          textKey="hint.settings"
          dismissed={hintsDismissed}
          onDismiss={onDismissHint}
          accent={effectiveAccent}
          style={{ top: '100%', right: 0, marginTop: 8 }}
        />
      )}
    </span>
  );
}
