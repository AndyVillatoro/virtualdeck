/**
 * Selectores de color y de glifo de un cuadrante de la subdivisión 2×2
 * (roadmap 121b).
 *
 * Salieron tal cual de `secciones/EditorSubdivision2x2.tsx`, que se quedó con
 * el ensamblaje. Reciben `VD`, `t` y `tf` por props en vez de llamar a los
 * hooks: así el editor sigue siendo el único que los llama y no cambia nada.
 */
import React, { useState, useMemo } from 'react';
import { useTheme } from '../../../../utils/theme';
import { textoSobre } from '../../../../design';
import { DotLabel } from '../../../../components/DotLabel';
import { DotGlyphIcon, ALL_DOT_GLYPHS } from '../../../../components/dot480/DotGlyphIcon';

export function QuadColorPicker({
  label,
  value,
  swatches,
  onChange,
  VD,
  tf,
}: {
  label: string;
  value?: string;
  swatches: string[];
  onChange: (color?: string) => void;
  VD: ReturnType<typeof useTheme>;
  tf: (s: string) => string;
}) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <DotLabel size={9} color={VD.textMuted} spacing={2}>{label}</DotLabel>
        {value && (
          <button
            onClick={() => onChange(undefined)}
            style={{
              background: 'transparent',
              border: 'none',
              color: VD.textDim,
              fontFamily: VD.mono,
              fontSize: 8,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            {tf('RESTABLECER')}
          </button>
        )}
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        {swatches.map((c) => {
          const isSelected = value === c;
          return (
            <button
              key={c}
              onClick={() => onChange(c)}
              style={{
                width: 20,
                height: 20,
                borderRadius: VD.radius.sm,
                background: c,
                border: isSelected ? `2px solid ${textoSobre(c)}` : `1px solid ${VD.border}`,
                cursor: 'pointer',
                padding: 0,
                boxShadow: isSelected ? '0 0 6px rgba(255,255,255,0.4)' : undefined,
              }}
              title={c}
            />
          );
        })}
        <input
          type="text"
          value={value || ''}
          placeholder="#HEX"
          maxLength={9}
          onChange={(e) => onChange(e.target.value || undefined)}
          style={{
            width: 70,
            height: 20,
            padding: '2px 6px',
            fontFamily: VD.mono,
            fontSize: 9,
            background: VD.surface,
            border: `1px solid ${VD.border}`,
            color: VD.text,
            borderRadius: VD.radius.sm,
            boxSizing: 'border-box',
          }}
        />
      </div>
    </div>
  );
}

export function QuadGlyphPicker({
  selectedGlyph,
  onSelect,
  onAbrirCatalogo,
  accent,
  VD,
  t,
  tf,
}: {
  selectedGlyph: string;
  onSelect: (g: string) => void;
  onAbrirCatalogo?: () => void;
  accent: string;
  VD: ReturnType<typeof useTheme>;
  t: (k: string) => string;
  tf: (s: string) => string;
}) {
  const [filtro, setFiltro] = useState('');

  const glyphsFiltrados = useMemo(() => {
    if (!filtro.trim()) return ALL_DOT_GLYPHS;
    const q = filtro.toUpperCase().trim();
    return ALL_DOT_GLYPHS.filter((g) => g.includes(q));
  }, [filtro]);

  const estiloEnlace: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    color: VD.textDim,
    fontFamily: VD.mono,
    fontSize: 8,
    cursor: 'pointer',
    padding: 0,
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <DotLabel size={9} color={VD.textMuted} spacing={2}>{t('ed.split.icon')}</DotLabel>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {onAbrirCatalogo && (
            <button onClick={onAbrirCatalogo} style={{ ...estiloEnlace, color: accent }}>
              {tf('CATÁLOGO')}
            </button>
          )}
          <button onClick={() => onSelect('')} style={estiloEnlace}>
            {t('ed.split.noIcon')}
          </button>
        </div>
      </div>

      <input
        type="text"
        placeholder={tf('Buscar icono...')}
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
        style={{
          width: '100%',
          marginTop: 6,
          marginBottom: 6,
          padding: '4px 8px',
          background: VD.surface,
          border: `1px solid ${VD.border}`,
          color: VD.text,
          fontFamily: VD.mono,
          fontSize: 10,
          borderRadius: VD.radius.sm,
          boxSizing: 'border-box',
        }}
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(28px, 1fr))',
          gap: 4,
          maxHeight: 100,
          overflowY: 'auto',
          padding: 6,
          background: VD.elevated,
          borderRadius: VD.radius.sm,
          border: `1px solid ${VD.border}`,
        }}
      >
        {glyphsFiltrados.map((g) => {
          const isSelected = selectedGlyph === g;
          return (
            <button
              key={g}
              onClick={() => onSelect(g)}
              style={{
                height: 28,
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isSelected ? `${accent}33` : VD.surface,
                border: isSelected ? `1px solid ${accent}` : `1px solid ${VD.border}`,
                borderRadius: VD.radius.sm,
                cursor: 'pointer',
              }}
              title={g}
            >
              <DotGlyphIcon glyph={g} size={13} color={isSelected ? accent : VD.text} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
