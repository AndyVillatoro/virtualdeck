import React from 'react';
import { useTheme } from '../../utils/theme';
import { useFieldText } from '../../utils/i18n';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';
import { Chip } from '../../components/ui/Chip';
import { Btn, estiloEntrada } from './comunes';

const GLIFOS_RAPIDOS = [
  'PLAY', 'PAUSE', 'NEXT', 'PREV', 'MIC', 'SPEAKER', 'AUDIO_WAVE',
  'TERMINAL', 'WEB', 'CODE', 'GEAR', 'CHECK', 'CLOSE', 'BELL',
];

interface SubseccionGlifoEncimaProps {
  glifoEncima: string;
  setGlifoEncima: (g: string) => void;
  accent: string;
}

export function SubseccionGlifoEncima({ glifoEncima, setGlifoEncima, accent }: SubseccionGlifoEncimaProps) {
  const VD = useTheme();
  const tf = useFieldText();
  const inputStyle = estiloEntrada(VD);

  return (
    <div
      style={{
        padding: '8px 10px',
        background: VD.surface,
        borderRadius: VD.radius.sm,
        border: `1px solid ${VD.border}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span
          style={{
            fontFamily: VD.mono,
            fontSize: 9,
            fontWeight: 'bold',
            letterSpacing: 1,
            color: VD.textDim,
          }}
        >
          {tf('GLIFO ENCIMA (OPCIONAL)')}
        </span>
        {glifoEncima && (
          <Btn onClick={() => setGlifoEncima('')} style={{ color: VD.danger }}>
            {tf('Quitar')}
          </Btn>
        )}
      </div>

      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input
          value={glifoEncima}
          onChange={(e) => setGlifoEncima(e.target.value)}
          placeholder={tf('Buscar glifo...')}
          maxLength={16}
          style={{ ...inputStyle, flex: 1, fontFamily: VD.mono, fontSize: 10, padding: '4px 8px' }}
        />
        {glifoEncima && (
          <div
            style={{
              width: 24,
              height: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: VD.elevated,
              border: `1px solid ${VD.border}`,
              borderRadius: VD.radius.sm,
            }}
          >
            <DotGlyphIcon glyph={glifoEncima} size={14} color={accent} showRecessed={false} />
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {GLIFOS_RAPIDOS.map((g) => {
          const isSel = glifoEncima.trim().toUpperCase() === g;
          return (
            <Chip
              key={g}
              activo={isSel}
              onClick={() => setGlifoEncima(g)}
              title={g}
              accent={accent}
              style={{ width: 22, height: 22, minHeight: 22, padding: 0 }}
            >
              <DotGlyphIcon glyph={g} size={11} color={isSel ? accent : VD.textDim} />
            </Chip>
          );
        })}
      </div>
    </div>
  );
}
