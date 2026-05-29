import React from 'react';
import { useTheme } from '../utils/theme';
import { useT } from '../utils/i18n';

interface HintProps {
  /** Clave i18n del texto del hint (ej. 'hint.firstButton'). */
  textKey: string;
  /** Identificador estable para recordar que el usuario lo descartó. */
  id: string;
  /** Lista de hints ya descartados (de config.hintsDismissed). */
  dismissed?: string[];
  /** Persiste el descarte de este hint. */
  onDismiss: (id: string) => void;
  /** Posición del callout. Por defecto centrado arriba del contenedor relativo. */
  style?: React.CSSProperties;
  /** Acento opcional (si no, usa el del tema). */
  accent?: string;
}

// Mensaje flotante contextual (6.x del roadmap). Explica para qué sirve un
// control y se descarta para siempre con "Entendido". Complementa el onboarding:
// el tutorial enseña el panorama, los hints aclaran controles puntuales in situ.
export function Hint({ textKey, id, dismissed = [], onDismiss, style, accent }: HintProps) {
  const VD = useTheme();
  const t = useT();
  if (dismissed.includes(id)) return null;
  const ac = accent ?? VD.accent;

  return (
    <div
      style={{
        position: 'absolute', zIndex: 180,
        maxWidth: 260,
        background: VD.surface, border: `1px solid ${ac}`,
        borderRadius: VD.radius.md, boxShadow: VD.shadow.menu,
        padding: '10px 12px',
        display: 'flex', flexDirection: 'column', gap: 8,
        ...style,
      }}
    >
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <span style={{ color: ac, fontSize: 12, lineHeight: 1.4 }}>›</span>
        <span style={{ fontFamily: VD.mono, fontSize: 11, lineHeight: 1.5, color: VD.text, letterSpacing: 0.2 }}>
          {t(textKey)}
        </span>
      </div>
      <button
        onClick={() => onDismiss(id)}
        style={{
          alignSelf: 'flex-end', padding: '3px 10px', cursor: 'pointer',
          background: ac, border: 'none', color: '#fff',
          fontFamily: VD.mono, fontSize: 9, letterSpacing: 1,
          borderRadius: VD.radius.sm, textTransform: 'uppercase',
        }}
      >
        {t('hint.dismiss')}
      </button>
    </div>
  );
}
