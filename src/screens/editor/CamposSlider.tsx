import React from 'react';
import { useTheme } from '../../utils/theme';
import { useFieldText } from '../../utils/i18n';
import { estiloEntrada } from './comunes';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';
import type { SliderWidgetConfig } from '../../types';

interface Props {
  accent: string;
  valor: SliderWidgetConfig | undefined;
  onChange: React.Dispatch<React.SetStateAction<SliderWidgetConfig | undefined>>;
  deckState: Record<string, string>;
}

export function CamposSlider({ accent, valor, onChange, deckState }: Props) {
  const VD = useTheme();
  const tf = useFieldText();
  const inputStyle = estiloEntrada(VD);

  const target = valor?.target ?? 'volume';
  const orientation = valor?.orientation ?? 'horizontal';
  const varName = valor?.varName ?? '';
  const min = valor?.min ?? 0;
  const max = valor?.max ?? 100;
  const step = valor?.step ?? (target === 'variable' ? 1 : 5);
  const showValue = valor?.showValue !== false;
  const label = valor?.label ?? '';

  const poner = (parte: Partial<SliderWidgetConfig>) => {
    onChange((prev) => ({
      target,
      orientation,
      varName,
      min,
      max,
      step,
      showValue,
      label,
      ...prev,
      ...parte,
    }));
  };

  return (
    <div style={{
      marginTop: 8, padding: 10, background: VD.elevated,
      border: `1px solid ${VD.border}`, borderRadius: VD.radius.md,
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      {/* Selector de Objetivo (Target) */}
      <div>
        <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, marginBottom: 4, letterSpacing: 0.5 }}>
          {tf("CONTROL OBJETIVO")}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['volume', 'brightness', 'variable'] as const).map((t) => {
            const isSel = target === t;
            const glyph = t === 'brightness' ? 'SUN' : t === 'variable' ? 'CODE' : 'VOLUME';
            const txt = t === 'brightness' ? tf('BRILLO') : t === 'variable' ? tf('VARIABLE') : tf('VOLUMEN');
            return (
              <button
                key={t}
                type="button"
                onClick={() => poner({ target: t, step: t === 'variable' ? 1 : 5 })}
                style={{
                  flex: 1, padding: '5px 8px', borderRadius: VD.radius.sm,
                  background: isSel ? VD.accentBg : VD.surface,
                  border: `1px solid ${isSel ? accent : VD.border}`,
                  color: isSel ? accent : VD.textDim,
                  fontFamily: VD.mono, fontSize: 8, letterSpacing: 0.5,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                }}
              >
                <DotGlyphIcon glyph={glyph} size={8} color={isSel ? accent : VD.textDim} />
                <span>{txt}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selector de Orientación */}
      <div>
        <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, marginBottom: 4, letterSpacing: 0.5 }}>
          {tf("ORIENTACIÓN DE LA BARRA")}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['horizontal', 'vertical'] as const).map((o) => {
            const isSel = orientation === o;
            const txt = o === 'vertical' ? tf('VERTICAL (FADER)') : tf('HORIZONTAL');
            return (
              <button
                key={o}
                type="button"
                onClick={() => poner({ orientation: o })}
                style={{
                  flex: 1, padding: '5px 8px', borderRadius: VD.radius.sm,
                  background: isSel ? VD.accentBg : VD.surface,
                  border: `1px solid ${isSel ? accent : VD.border}`,
                  color: isSel ? accent : VD.textDim,
                  fontFamily: VD.mono, fontSize: 8, letterSpacing: 0.5,
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                <span>{txt}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Configuración específica de Variable */}
      {target === 'variable' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, letterSpacing: 0.5 }}>
            {tf("NOMBRE DE VARIABLE DE ESTADO")}
          </div>
          <input
            value={varName}
            onChange={(e) => poner({ varName: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') })}
            placeholder={tf("Nombre de variable (ej. zoom, cam_speed)")}
            list="vd-slider-vars"
            style={inputStyle}
          />
          <datalist id="vd-slider-vars">
            {Object.keys(deckState).map((k) => <option key={k} value={k} />)}
          </datalist>

          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: VD.mono, fontSize: 7, color: VD.textMuted, marginBottom: 2 }}>MIN</div>
              <input
                type="number"
                value={min}
                onChange={(e) => poner({ min: parseFloat(e.target.value) || 0 })}
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: VD.mono, fontSize: 7, color: VD.textMuted, marginBottom: 2 }}>MAX</div>
              <input
                type="number"
                value={max}
                onChange={(e) => poner({ max: parseFloat(e.target.value) || 100 })}
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: VD.mono, fontSize: 7, color: VD.textMuted, marginBottom: 2 }}>{tf("PASO")}</div>
              <input
                type="number"
                value={step}
                onChange={(e) => poner({ step: Math.max(0.1, parseFloat(e.target.value) || 1) })}
                style={inputStyle}
              />
            </div>
          </div>
        </div>
      )}

      {/* Etiqueta y Opciones */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          value={label}
          onChange={(e) => poner({ label: e.target.value })}
          placeholder={tf("Etiqueta técnica (ej. VOL, MASTER, BRILLO)")}
          style={{ ...inputStyle, flex: 1 }}
        />
        <label style={{
          display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
          fontFamily: VD.mono, fontSize: 8, color: VD.textDim, userSelect: 'none',
        }}>
          <input
            type="checkbox"
            checked={showValue}
            onChange={(e) => poner({ showValue: e.target.checked })}
            style={{ accentColor: accent, cursor: 'pointer' }}
          />
          <span>{tf("VER VALOR %")}</span>
        </label>
      </div>

      <div style={{ fontFamily: VD.mono, fontSize: 7, color: VD.textMuted, lineHeight: 1.4 }}>
        {tf("Desliza continuamente con el dedo en pantallas táctiles o ratón. Rueda del ratón ajusta el valor por pasos.")}
      </div>
    </div>
  );
}
