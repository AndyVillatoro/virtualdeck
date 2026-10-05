import React, { useState } from 'react';
import { useTheme } from '../../../utils/theme';
import { useFieldText } from '../../../utils/i18n';
import { DotGlyphIcon } from '../../../components/dot480/DotGlyphIcon';
import { estiloEntrada } from '../comunes';

interface CampoRadioGroupProps {
  value: string;
  onChange: (grupo: string) => void;
  gruposExistentes: string[];
  accent: string;
}

export function CampoRadioGroup({
  value,
  onChange,
  gruposExistentes,
  accent,
}: CampoRadioGroupProps) {
  const VD = useTheme();
  const tf = useFieldText();
  const inputStyle = estiloEntrada(VD);
  const [creandoNuevo, setCreandoNuevo] = useState(false);

  const gruposUnicos = Array.from(new Set(gruposExistentes)).filter(Boolean);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Lista de grupos existentes como fichas */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => {
            onChange('');
            setCreandoNuevo(false);
          }}
          style={{
            minHeight: 32,
            padding: '4px 10px',
            background: !value ? `${accent}24` : VD.surface,
            border: `1px solid ${!value ? accent : VD.border}`,
            borderRadius: VD.radius.sm,
            color: !value ? accent : VD.textDim,
            fontFamily: VD.mono,
            fontSize: 8.5,
            fontWeight: !value ? 600 : 400,
            cursor: 'pointer',
            boxSizing: 'border-box',
          }}
        >
          {tf('SIN GRUPO')}
        </button>

        {gruposUnicos.map((grupo) => {
          const activo = value === grupo;
          return (
            <button
              key={grupo}
              type="button"
              onClick={() => {
                onChange(grupo);
                setCreandoNuevo(false);
              }}
              style={{
                minHeight: 32,
                padding: '4px 10px',
                background: activo ? `${accent}24` : VD.elevated,
                border: `1px solid ${activo ? accent : VD.border}`,
                borderRadius: VD.radius.sm,
                color: activo ? accent : VD.text,
                fontFamily: VD.mono,
                fontSize: 8.5,
                fontWeight: activo ? 600 : 400,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                boxSizing: 'border-box',
              }}
            >
              {activo && <DotGlyphIcon glyph="CHECK" size={8} color={accent} />}
              <span>{grupo}</span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setCreandoNuevo(true)}
          style={{
            minHeight: 32,
            padding: '4px 10px',
            background: creandoNuevo ? VD.accentBg : VD.surface,
            border: `1px dashed ${creandoNuevo ? accent : VD.borderStrong}`,
            borderRadius: VD.radius.sm,
            color: creandoNuevo ? accent : VD.text,
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
          <DotGlyphIcon glyph="ADD" size={8} color={creandoNuevo ? accent : VD.textDim} />
          <span>{tf('NUEVO GRUPO')}</span>
        </button>
      </div>

      {/* Campo de texto libre para nuevo grupo o personalizar */}
      {(creandoNuevo || (value && !gruposUnicos.includes(value))) && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            autoFocus={creandoNuevo}
            value={value}
            onChange={(e) => onChange(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
            placeholder={tf("Nombre del nuevo grupo (ej. modo_audio)")}
            style={{ ...inputStyle, minHeight: 32, flex: 1, boxSizing: 'border-box' }}
          />
        </div>
      )}

      {/* Línea descriptiva */}
      <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted }}>
        {value
          ? `${tf('Solo un botón de este grupo puede estar encendido a la vez.')} (${tf('Grupo activo:')} ${value})`
          : tf('Permite agrupar varios botones toggle para que sean mutuamente exclusivos (solo uno activo a la vez).')}
      </div>
    </div>
  );
}
