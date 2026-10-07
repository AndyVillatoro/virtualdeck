import React, { useState } from 'react';
import { useTheme } from '../../../utils/theme';
import { useFieldText } from '../../../utils/i18n';
import { DotGlyphIcon, ALL_DOT_GLYPHS } from '../../../components/dot480/DotGlyphIcon';
import { Btn, estiloEntrada } from '../comunes';

const GLIFOS_RAPIDOS = [
  'PLAY', 'PAUSE', 'NEXT', 'PREV', 'MIC', 'SPEAKER', 'AUDIO_WAVE',
  'TERMINAL', 'WEB', 'CODE', 'GEAR', 'CHECK', 'CLOSE', 'BELL',
  'TRASH', 'CLOCK', 'FOLDER', 'SPARKLE', 'DOTS', 'ARROW_UP', 'ARROW_DOWN',
  'CPU', 'GPU', 'FAN', 'BOLT', 'RAM', 'STORAGE', 'LOCK', 'HEART',
  'WARN', 'BOOK', 'BUG', 'GRADUATION', 'WEATHER_THERMO', 'WEATHER_SUN',
  'WEATHER_RAIN', 'BATTERY', 'VOLUME_MUTE',
];

export interface FilaGlifosRapidosProps {
  icon: string;
  setIcon: (val: string) => void;
  accent: string;
  setIconoPuntos?: (val?: { bits: string; origen: string }) => void;
}

/** La fila de glifos 8×8 de siempre: entrada, buscador y rejilla rápida. */
export function FilaGlifosRapidos({
  icon,
  setIcon,
  accent,
  setIconoPuntos,
}: FilaGlifosRapidosProps) {
  const VD = useTheme();
  const tf = useFieldText();
  const inputStyle = estiloEntrada(VD);
  const [busqueda, setBusqueda] = useState('');

  const q = busqueda.trim().toUpperCase();
  const glifosMostrados = q ? ALL_DOT_GLYPHS.filter((g) => g.includes(q)) : GLIFOS_RAPIDOS;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ height: 1, background: VD.border, margin: '2px 0' }} />

      <span style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textDim, letterSpacing: 0.8 }}>
        {tf('GLIFOS RÁPIDOS 8×8')}
      </span>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          value={icon}
          onChange={(e) => {
            setIcon(e.target.value);
            if (e.target.value) setIconoPuntos?.(undefined);
          }}
          placeholder="PLAY, GEAR, MIC, WEB, CODE..."
          maxLength={16}
          style={{ ...inputStyle, flex: 1, fontFamily: VD.mono, fontSize: 11 }}
        />
        {icon && (
          <div
            style={{
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: VD.elevated,
              border: `1px solid ${VD.border}`,
              borderRadius: VD.radius.sm,
            }}
          >
            <DotGlyphIcon glyph={icon} size={16} color={accent} showRecessed />
          </div>
        )}
        {icon && (
          <Btn onClick={() => setIcon('')} style={{ color: VD.danger }}>
            {tf('Quitar')}
          </Btn>
        )}
      </div>

      <input
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder={tf('Buscar glifo...')}
        style={{ ...inputStyle, fontFamily: VD.mono, fontSize: 10, padding: '4px 8px' }}
      />

      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', maxHeight: 116, overflowY: 'auto' }}>
        {glifosMostrados.map((g) => {
          const isSel = icon.trim().toUpperCase() === g;
          return (
            <button
              key={g}
              type="button"
              onClick={() => {
                setIcon(g);
                setIconoPuntos?.(undefined);
              }}
              title={g}
              style={{
                width: 28,
                height: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isSel ? VD.accentBg : VD.elevated,
                border: `1px solid ${isSel ? accent : VD.border}`,
                borderRadius: VD.radius.sm,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              <DotGlyphIcon glyph={g} size={14} color={isSel ? accent : VD.textDim} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
