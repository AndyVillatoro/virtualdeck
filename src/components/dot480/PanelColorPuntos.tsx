import React from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { DotGlyphIcon } from './DotGlyphIcon';
import { SelectorColor } from './SelectorColor';
import { mismoHex as hexEq } from './matricesPuntos';

interface PanelColorPuntosProps {
  activo: string;
  alCambiarActivo: (hex: string) => void;
  primario: string;
  alFijarPrimario: () => void;
  esPrimario: boolean;
  colorOriginal?: string;
  paletaBase: Record<string, string>;
  usados: string[];
  borrando: boolean;
  alCambiarBorrando: (b: boolean) => void;
  alLimpiar: () => void;
}

/** Los diez comunes del editor de marca original. */
const COMUNES = [
  '#ffffff',
  '#000000',
  '#ff3b3b',
  '#ff7f00',
  '#ffcc00',
  '#3bff6e',
  '#3bc8ff',
  '#4a8ef0',
  '#cc44ff',
  '#ff44a8',
];

/**
 * EditorPuntos — color activo, primario, muestras y borrador de la pestaña 17×17.
 * Las muestras son: color original del icono, paleta incorporada (solo lectura),
 * comunes, y los hex que ya usa el dibujo.
 */
export function PanelColorPuntos({
  activo,
  alCambiarActivo,
  primario,
  alFijarPrimario,
  esPrimario,
  colorOriginal,
  paletaBase,
  usados,
  borrando,
  alCambiarBorrando,
  alLimpiar,
}: PanelColorPuntosProps) {
  const VD = useTheme();
  const t = useT();
  const tam = 22;

  function muestra(hex: string, clave: string, titulo: string) {
    const selected = hexEq(activo, hex);
    return (
      <button
        key={clave}
        type="button"
        onClick={() => alCambiarActivo(hex)}
        title={titulo}
        style={{
          width: tam,
          height: tam,
          borderRadius: VD.radius.md,
          background: hex,
          border: `2px solid ${selected ? VD.text : VD.border}`,
          cursor: 'pointer',
          padding: 0,
        }}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <span
          style={{
            display: 'block',
            marginBottom: 8,
            fontFamily: VD.mono,
            fontSize: 8,
            letterSpacing: 2,
            color: VD.textMuted,
          }}
        >
          {t('puntos.colorActivo')}
        </span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: VD.radius.md,
              background: activo,
              border: `1px solid ${VD.borderStrong}`,
              flexShrink: 0,
            }}
          />
          <input
            value={activo}
            onChange={(e) => alCambiarActivo(e.target.value)}
            placeholder="#8a8a8a"
            maxLength={7}
            style={{
              background: VD.elevated,
              border: `1px solid ${VD.border}`,
              color: VD.text,
              fontFamily: VD.mono,
              fontSize: 11,
              padding: '5px 10px',
              outline: 'none',
              borderRadius: VD.radius.sm,
              flex: 1,
            }}
          />
          <button
            type="button"
            onClick={alFijarPrimario}
            title={t('puntos.primarioAyuda')}
            style={{
              padding: '5px 8px',
              border: `1px solid ${esPrimario ? primario : VD.border}`,
              background: esPrimario ? VD.accentBg : 'transparent',
              color: esPrimario ? primario : VD.textDim,
              fontFamily: VD.mono,
              fontSize: 9,
              letterSpacing: 1,
              cursor: 'pointer',
              borderRadius: VD.radius.sm,
            }}
          >
            {t('puntos.primario')}
          </button>
        </div>
        <SelectorColor value={activo} onChange={alCambiarActivo} />
      </div>

      <div>
        <span
          style={{
            display: 'block',
            marginBottom: 8,
            fontFamily: VD.mono,
            fontSize: 8,
            letterSpacing: 2,
            color: VD.textMuted,
          }}
        >
          {t('puntos.paleta')}
        </span>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {colorOriginal && muestra(colorOriginal, 'orig', t('puntos.original', { hex: colorOriginal }))}
          {Object.entries(paletaBase).map(([letra, hex]) =>
            muestra(hex, `base-${letra}`, t('puntos.base', { letra, hex })),
          )}
          {COMUNES.map((hex) => muestra(hex, hex, hex))}
        </div>
      </div>

      {usados.length > 0 && (
        <div>
          <span
            style={{
              display: 'block',
              marginBottom: 8,
              fontFamily: VD.mono,
              fontSize: 8,
              letterSpacing: 2,
              color: VD.textMuted,
            }}
          >
            {t('puntos.enUso', { n: String(usados.length) })}
          </span>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {usados.map((hex) => muestra(hex, `uso-${hex}`, hex))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => alCambiarBorrando(!borrando)}
          style={{
            padding: '5px 10px',
            border: `1px solid ${borrando ? activo : VD.border}`,
            background: borrando ? VD.accentBg : 'transparent',
            color: borrando ? activo : VD.textDim,
            fontFamily: VD.mono,
            fontSize: 9,
            letterSpacing: 1,
            cursor: 'pointer',
            borderRadius: VD.radius.sm,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <DotGlyphIcon glyph={borrando ? 'CHECK' : 'DOTS'} size={7} color={borrando ? activo : VD.textDim} />
          <span>{t('puntos.borrador')}</span>
        </button>
        <button
          type="button"
          onClick={alLimpiar}
          style={{
            padding: '5px 10px',
            border: `1px solid ${VD.border}`,
            background: 'transparent',
            color: VD.textDim,
            fontFamily: VD.mono,
            fontSize: 9,
            letterSpacing: 1,
            cursor: 'pointer',
            borderRadius: VD.radius.sm,
          }}
        >
          {t('ui.clear')}
        </button>
      </div>
    </div>
  );
}
