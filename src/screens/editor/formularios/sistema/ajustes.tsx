import React from 'react';
import { useTheme } from '../../../../utils/theme';
import { textoSobre } from '../../../../design';
import { useFieldText } from '../../../../utils/i18n';
import { Field } from '../../campos/comunes';
import { DotGlyphIcon } from '../../../../components/dot480/DotGlyphIcon';
import { Segmentado } from '../../../../components/ui/Chip';
import type { PropsFormulario } from '../base';

/** Los ajustes por pasos: brillo y volumen, y su versión en slider táctil. */

/**
 * Subir o bajar brillo o volumen, en vez de fijarlos.
 *
 * Con dos botones —uno +10 y otro -10— se tiene el par de flechas de toda la
 * vida. Y con la rueda del raton encima de la celda sirve uno solo: hacia
 * arriba suma, hacia abajo resta.
 */
export function FormAdjust(p: PropsFormulario) {
  const VD = useTheme();
  const tf = useFieldText();
  const { accent, action, setAction } = p;
  const objetivo = action.adjustTarget ?? 'brightness';
  const delta = action.adjustDelta ?? 10;
  return (
    <>
      <Field label={tf("QUÉ SE AJUSTA")}>
        <Segmentado
          repartir
          accent={accent}
          valor={objetivo}
          onChange={(o) => setAction((a) => ({ ...a, adjustTarget: o }))}
          opciones={[
            { valor: 'brightness', etiqueta: tf('BRILLO') },
            { valor: 'volume', etiqueta: tf('VOLUMEN') },
          ]}
        />
      </Field>

      {/* Opción rápida: Convertir en Slider Táctil Continuo */}
      <div style={{
        padding: '10px 12px',
        background: p.widget === 'slider' ? VD.accentBg : VD.elevated,
        border: `1px solid ${p.widget === 'slider' ? accent : VD.border}`,
        borderRadius: VD.radius.md,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <DotGlyphIcon glyph="DOTS" size={8} color={p.widget === 'slider' ? accent : VD.textDim} />
            <span style={{ fontFamily: VD.mono, fontSize: 9, letterSpacing: 1, color: VD.text, fontWeight: 600 }}>
              {tf('CONTROL TÁCTIL CONTINUO (SLIDER)')}
            </span>
          </div>
          {p.widget === 'slider' && (
            <span style={{ fontFamily: VD.mono, fontSize: 8, color: accent, letterSpacing: 0.5, border: `1px solid ${accent}`, padding: '1px 5px', borderRadius: VD.radius.sm }}>
              {tf('ACTIVO')}
            </span>
          )}
        </div>
        <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, lineHeight: 1.4 }}>
          {tf('Convierte esta celda en un slider táctil interactivo en tiempo real para deslizar con dedo o ratón.')}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {p.widget !== 'slider' ? (
            <button
              type="button"
              onClick={() => {
                p.setWidget?.('slider');
                p.setSliderWidget?.((prev) => ({
                  target: objetivo === 'volume' ? 'volume' : 'brightness',
                  min: 0,
                  max: 100,
                  step: objetivo === 'volume' ? 2 : 5,
                  orientation: prev?.orientation ?? 'horizontal',
                  showValue: prev?.showValue ?? true,
                }));
                p.setStep?.(2);
              }}
              style={{
                flex: 1, padding: '7px 0', cursor: 'pointer', borderRadius: VD.radius.sm,
                background: accent, border: 'none',
                color: textoSobre(accent), fontFamily: VD.mono, fontSize: 9, fontWeight: 700, letterSpacing: 1,
              }}
            >
              {tf('ACTIVAR SLIDER TÁCTIL (IR A ESTILO)')}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => p.setStep?.(2)}
                style={{
                  flex: 1, padding: '6px 0', cursor: 'pointer', borderRadius: VD.radius.sm,
                  background: VD.accentBg, border: `1px solid ${accent}`,
                  color: accent, fontFamily: VD.mono, fontSize: 9, letterSpacing: 1,
                }}
              >
                {tf('CONFIGURAR EN PASO DE ESTILO')}
              </button>
              <button
                type="button"
                onClick={() => p.setWidget?.(undefined)}
                style={{
                  padding: '6px 10px', cursor: 'pointer', borderRadius: VD.radius.sm,
                  background: 'transparent', border: `1px solid ${VD.border}`,
                  color: VD.textDim, fontFamily: VD.mono, fontSize: 9,
                }}
              >
                {tf('DESACTIVAR')}
              </button>
            </>
          )}
        </div>
      </div>

      <Field label={tf("CUÁNTO CAMBIA CADA PULSACIÓN")}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input
            type="range" min={-50} max={50} step={5} value={delta}
            onChange={(e) => setAction((a) => ({ ...a, adjustDelta: parseInt(e.target.value, 10) }))}
            style={{ flex: 1, accentColor: accent }}
          />
          <span style={{ fontFamily: VD.mono, fontSize: 14, color: VD.text, minWidth: 48, textAlign: 'right' }}>
            {delta > 0 ? '+' : ''}{delta}%
          </span>
        </div>
        <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, marginTop: 6, lineHeight: 1.4 }}>
          {tf('Con la rueda del ratón encima del botón también funciona: arriba suma, abajo resta. Un valor negativo hace que la pulsación baje.')}
        </div>
      </Field>
    </>
  );
}

export function FormBrightness(p: PropsFormulario) {
  const VD = useTheme();
  const tf = useFieldText();
  const { accent, action, setAction } = p;
  return (
    <>
          <Field label={tf("NIVEL DE BRILLO")}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input type="range" min={0} max={100} step={5} value={action.brightnessLevel ?? 70} onChange={(e) => setAction((a) => ({ ...a, brightnessLevel: parseInt(e.target.value) }))} style={{ flex: 1, accentColor: accent }} />
              <span style={{ fontFamily: VD.mono, fontSize: 14, color: VD.text, minWidth: 40, textAlign: 'right' }}>{action.brightnessLevel ?? 70}%</span>
            </div>
            <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, marginTop: 6 }}>{tf('Controla el brillo del monitor principal mediante WMI.')}</div>
            {p.widget !== 'slider' && (
              <button
                type="button"
                onClick={() => {
                  setAction({ type: 'adjust', adjustTarget: 'brightness', adjustDelta: 0 });
                  p.setWidget?.('slider');
                  p.setSliderWidget?.(prev => ({
                    target: 'brightness',
                    min: 0,
                    max: 100,
                    step: 5,
                    orientation: prev?.orientation ?? 'horizontal',
                    showValue: prev?.showValue ?? true,
                  }));
                  p.setStep?.(2);
                }}
                style={{
                  marginTop: 10, width: '100%', padding: '6px 8px', cursor: 'pointer', borderRadius: VD.radius.sm,
                  background: VD.accentBg, border: `1px solid ${accent}`,
                  color: accent, fontFamily: VD.mono, fontSize: 8, letterSpacing: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <DotGlyphIcon glyph="DOTS" size={6} color={accent} />
                <span>{tf('¿PREFIERES UN SLIDER TÁCTIL CONTINUO? ACTIVAR AQUÍ')}</span>
              </button>
            )}
          </Field>
    </>
  );
}
