import React from 'react';
import { useTheme } from '../../../utils/theme';
import { useFieldText } from '../../../utils/i18n';
import { DotGlyphIcon } from '../../../components/dot480/DotGlyphIcon';
import { estiloEntrada } from '../comunes';

interface CampoTimerTriggerProps {
  value: string;
  onChange: (hora: string) => void;
  accent: string;
}

const PRESETS_HORA = [
  { hora: '08:00', etiqueta: '08:00' },
  { hora: '12:00', etiqueta: '12:00' },
  { hora: '18:00', etiqueta: '18:00' },
  { hora: '22:00', etiqueta: '22:00' },
  { hora: '00:00', etiqueta: '00:00' },
];

export function CampoTimerTrigger({ value, onChange, accent }: CampoTimerTriggerProps) {
  const VD = useTheme();
  const tf = useFieldText();
  const inputStyle = estiloEntrada(VD);

  const handleHoraActual = () => {
    const ahora = new Date();
    const hh = String(ahora.getHours()).padStart(2, '0');
    const mm = String(ahora.getMinutes()).padStart(2, '0');
    onChange(`${hh}:${mm}`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Controles principales: selector de hora nativo, campo de texto, botón hora actual, limpiar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <input
          type="time"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            ...inputStyle,
            width: 110,
            minHeight: 32,
            boxSizing: 'border-box',
            cursor: 'pointer',
          }}
        />

        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="08:00"
          maxLength={5}
          style={{
            ...inputStyle,
            width: 80,
            minHeight: 32,
            boxSizing: 'border-box',
            textAlign: 'center',
          }}
        />

        <button
          type="button"
          onClick={handleHoraActual}
          style={{
            minHeight: 32,
            padding: '4px 10px',
            background: VD.surface,
            border: `1px solid ${VD.border}`,
            borderRadius: VD.radius.sm,
            color: VD.text,
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
          <DotGlyphIcon glyph="TIME" size={9} color={accent} />
          <span>{tf('HORA ACTUAL')}</span>
        </button>

        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            title={tf('DESACTIVAR DISPARO POR HORA')}
            style={{
              minHeight: 32,
              padding: '4px 10px',
              background: 'transparent',
              border: `1px solid ${VD.border}`,
              borderRadius: VD.radius.sm,
              color: VD.danger,
              fontFamily: VD.mono,
              fontSize: 8.5,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              textTransform: 'uppercase',
              boxSizing: 'border-box',
            }}
          >
            <DotGlyphIcon glyph="CLOSE" size={8} color={VD.danger} />
            <span>{tf('DESACTIVAR')}</span>
          </button>
        )}
      </div>

      {/* Fichas de horas sugeridas */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {PRESETS_HORA.map((p) => {
          const activo = value === p.hora;
          return (
            <button
              key={p.hora}
              type="button"
              onClick={() => onChange(p.hora)}
              style={{
                minHeight: 32,
                padding: '4px 10px',
                background: activo ? `${accent}24` : VD.elevated,
                border: `1px solid ${activo ? accent : VD.border}`,
                borderRadius: VD.radius.sm,
                color: activo ? accent : VD.text,
                fontFamily: VD.mono,
                fontSize: 9,
                fontWeight: activo ? 600 : 400,
                cursor: 'pointer',
                boxSizing: 'border-box',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {activo && <DotGlyphIcon glyph="CHECK" size={8} color={accent} />}
              <span>{p.etiqueta}</span>
            </button>
          );
        })}
      </div>

      {/* Nota y línea descriptiva */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted }}>
          {value
            ? `${tf('Se ejecutará automáticamente todos los días a las')} ${value}.`
            : tf('Ejecuta la acción automáticamente a una hora fija del día.')}
        </div>
        <div style={{ fontFamily: VD.mono, fontSize: 7.5, color: VD.textDim }}>
          {tf('Nota: el disparador por hora se ejecuta una vez al día a la hora indicada (HH:MM).')}
        </div>
      </div>
    </div>
  );
}
