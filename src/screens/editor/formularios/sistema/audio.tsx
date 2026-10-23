import React from 'react';
import { useTheme } from '../../../../utils/theme';
import { useT, useFieldText } from '../../../../utils/i18n';
import { Field, Btn, estiloEntrada } from '../../campos/comunes';
import { DotGlyphIcon } from '../../../../components/dot480/DotGlyphIcon';
import type { PropsFormulario } from '../base';
import { SeccionModoAudio } from '../audioCiclo';

/** El audio: el dispositivo de salida que se elige y el nivel que se fija. */

export function FormAudioDevice(p: PropsFormulario) {
  const VD = useTheme();
  const tf = useFieldText();
  const inputStyle = estiloEntrada(VD);
  const { accent, action, setAction, audioDevices, audioError, label, setLabel, loadAudioDevices, loadingDevices } = p;
  // En ciclo el destino fijo no se usa: solo se enseña en modo FIJA.
  const modoFijo = (action.audioMode ?? 'fixed') === 'fixed';
  return (
    <>
          <SeccionModoAudio {...p} />
          {modoFijo && (
          <Field label={tf("DISPOSITIVO DE AUDIO")}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              {action.deviceName && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: VD.mono, fontSize: 10, color: accent, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                  <DotGlyphIcon glyph="CHECK" size={8} color={accent} />
                  <span>{action.deviceName}</span>
                </span>
              )}
              {!action.deviceName && <span />}
              <Btn onClick={loadAudioDevices} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <DotGlyphIcon glyph="DOTS" size={6} />
                <span>{loadingDevices ? '...' : tf('RECARGAR')}</span>
              </Btn>
            </div>
            {loadingDevices && <div style={{ fontFamily: VD.mono, fontSize: 11, color: VD.textDim, padding: '4px 0 8px' }}>{tf('Cargando dispositivos...')}</div>}
            {!loadingDevices && audioError && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: VD.mono, fontSize: 10, color: VD.danger, marginBottom: 6 }}>
                  <DotGlyphIcon glyph="WARN" size={8} color={VD.danger} />
                  <span>{audioError}</span>
                </div>
                <Btn onClick={loadAudioDevices} style={{ marginBottom: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <DotGlyphIcon glyph="DOTS" size={6} />
                  <span>{tf('REINTENTAR')}</span>
                </Btn>
                <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, marginBottom: 6 }}>
                  {tf('O introduzca el nombre exacto del dispositivo (tal como aparece en Configuración → Sonido):')}
                </div>
                <input
                  value={action.deviceName || ''}
                  onChange={(e) => setAction((a) => ({ ...a, deviceId: undefined, deviceName: e.target.value }))}
                  placeholder={tf("Ej: Auriculares (Realtek HD Audio)")}
                  style={inputStyle}
                />
              </div>
            )}
            {!loadingDevices && !audioError && audioDevices.length === 0 && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontFamily: VD.mono, fontSize: 10, color: VD.danger, marginBottom: 8 }}>
                  {tf('No se detectaron dispositivos automáticamente.')}
                </div>
                <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, marginBottom: 6 }}>
                  {tf('Introduzca el nombre exacto del dispositivo (tal como aparece en Configuración → Sonido):')}
                </div>
                <input
                  value={action.deviceName || ''}
                  onChange={(e) => setAction((a) => ({ ...a, deviceId: undefined, deviceName: e.target.value }))}
                  placeholder={tf("Ej: Auriculares (Realtek HD Audio)")}
                  style={inputStyle}
                />
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {audioDevices.map((dev) => (
                <div
                  key={dev.id}
                  onClick={() => {
                    setAction((a) => ({ ...a, deviceId: dev.id, deviceName: dev.name }));
                    if (!label) setLabel(dev.name);
                  }}
                  style={{
                    background: action.deviceId === dev.id ? VD.accentBg : VD.elevated,
                    border: `1px solid ${action.deviceId === dev.id ? accent : VD.border}`,
                    borderRadius: VD.radius.md, padding: '10px 12px',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontFamily: VD.mono, fontSize: 11, color: VD.text }}>{dev.name}</span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {dev.isDefault && <span style={{ fontFamily: VD.mono, fontSize: 9, color: VD.success, letterSpacing: 1 }}>{tf('PREDETERMINADO')}</span>}
                    {action.deviceId === dev.id && (
                      <span style={{ fontFamily: VD.mono, fontSize: 9, color: accent, letterSpacing: 1, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <DotGlyphIcon glyph="CHECK" size={7} color={accent} />
                        {tf('SELECCIONADO')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Field>
          )}
    </>
  );
}

export function FormVolumeSet(p: PropsFormulario) {
  const VD = useTheme();
  const t = useT();
  const tf = useFieldText();
  const { accent, action, setAction } = p;
  return (
    <>
          <Field label={tf("NIVEL DE VOLUMEN")}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input
                type="range" min={0} max={100} step={5}
                value={action.volumePercent ?? 50}
                onChange={(e) => setAction((a) => ({ ...a, volumePercent: parseInt(e.target.value) }))}
                style={{ flex: 1, accentColor: accent }}
              />
              <span style={{ fontFamily: VD.mono, fontSize: 14, color: VD.text, minWidth: 40, textAlign: 'right' }}>
                {action.volumePercent ?? 50}%
              </span>
            </div>
            <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, marginTop: 6 }}>
              {t('ed.volumeHint')}
            </div>
            {p.widget !== 'slider' && (
              <button
                type="button"
                onClick={() => {
                  setAction({ type: 'adjust', adjustTarget: 'volume', adjustDelta: 0 });
                  p.setWidget?.('slider');
                  p.setSliderWidget?.(prev => ({
                    target: 'volume',
                    min: 0,
                    max: 100,
                    step: 2,
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
