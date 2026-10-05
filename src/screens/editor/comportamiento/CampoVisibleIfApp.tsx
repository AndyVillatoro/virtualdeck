import React from 'react';
import { useTheme } from '../../../utils/theme';
import { useFieldText } from '../../../utils/i18n';
import { SelectorApp } from '../../../components/SelectorApp';
import { DotGlyphIcon } from '../../../components/dot480/DotGlyphIcon';

interface CampoVisibleIfAppProps {
  value: string;
  onChange: (app: string) => void;
  accent: string;
}

export function CampoVisibleIfApp({ value, onChange }: CampoVisibleIfAppProps) {
  const VD = useTheme();
  const tf = useFieldText();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <SelectorApp valor={value} onElegir={onChange} />

      {value && (
        <div>
          <button
            type="button"
            onClick={() => onChange('')}
            style={{
              minHeight: 32,
              padding: '4px 10px',
              background: 'transparent',
              border: `1px solid ${VD.border}`,
              borderRadius: VD.radius.sm,
              color: VD.textDim,
              fontFamily: VD.mono,
              fontSize: 8.5,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              textTransform: 'uppercase',
              boxSizing: 'border-box',
            }}
          >
            <DotGlyphIcon glyph="CLOSE" size={8} color={VD.textDim} />
            <span>{tf('MOSTRAR SIEMPRE (SIN FILTRO DE APP)')}</span>
          </button>
        </div>
      )}

      {/* Línea descriptiva */}
      <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted }}>
        {value
          ? `${tf('El botón solo será visible cuando la aplicación esté en primer plano:')} ${value}.`
          : tf('El botón se muestra siempre en su página. Seleccione una aplicación para condicionar su visibilidad.')}
      </div>
    </div>
  );
}
