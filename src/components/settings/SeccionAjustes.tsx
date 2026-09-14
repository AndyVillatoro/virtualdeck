import React, { useState } from 'react';
import { useTheme } from '../../utils/theme';
import { DotGlyphIcon } from '../dot480/DotGlyphIcon';

interface SeccionAjustesProps {
  titulo: string;
  glyph?: string;
  accent: string;
  defaultAbierto?: boolean;
  abierto?: boolean;
  onToggle?: () => void;
  badge?: string;
  children: React.ReactNode;
}

/**
 * Apartado colapsable estilo acordeón para el panel de ajustes (DOT / 480).
 * Permite mantener la ventana de ajustes compacta y visualmente jerárquica.
 */
export function SeccionAjustes({
  titulo,
  glyph = 'DOTS',
  accent,
  defaultAbierto = false,
  abierto: abiertoProp,
  onToggle: onToggleProp,
  badge,
  children,
}: SeccionAjustesProps) {
  const VD = useTheme();
  const [abiertoLocal, setAbiertoLocal] = useState(defaultAbierto);
  const esControlado = typeof abiertoProp === 'boolean';
  const estaAbierto = esControlado ? abiertoProp : abiertoLocal;

  const toggle = () => {
    if (onToggleProp) {
      onToggleProp();
    } else {
      setAbiertoLocal((prev) => !prev);
    }
  };

  return (
    <div
      style={{
        border: `1px solid ${estaAbierto ? VD.borderStrong : VD.border}`,
        borderRadius: VD.radius.md,
        overflow: 'hidden',
        background: estaAbierto ? VD.elevated : 'transparent',
        transition: 'border-color 0.15s, background 0.15s',
      }}
    >
      <button
        type="button"
        onClick={toggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '7px 10px',
          background: estaAbierto ? VD.overlay : VD.elevated,
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          color: estaAbierto ? accent : VD.text,
          fontFamily: VD.mono,
          fontSize: 9,
          letterSpacing: 1,
          userSelect: 'none',
        }}
      >
        <DotGlyphIcon glyph={glyph} size={8} color={estaAbierto ? accent : VD.textMuted} />
        <span style={{ flex: 1, fontWeight: estaAbierto ? 600 : 400 }}>{titulo}</span>
        {badge && (
          <span
            style={{
              fontSize: 7,
              padding: '1px 5px',
              borderRadius: VD.radius.sm,
              background: VD.accentBg,
              color: accent,
              letterSpacing: 0.5,
            }}
          >
            {badge}
          </span>
        )}
        <DotGlyphIcon
          glyph={estaAbierto ? 'SUBTRACT' : 'ADD'}
          size={7}
          color={estaAbierto ? accent : VD.textMuted}
        />
      </button>

      {estaAbierto && (
        <div
          style={{
            padding: '10px 10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            borderTop: `1px solid ${VD.border}`,
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

