import React from 'react';
import { useTheme } from '../../../utils/theme';
import { useT, useFieldText } from '../../../utils/i18n';
import { Field, estiloEntrada } from '../comunes';
import type { PropsFormulario } from './base';

/** Iluminacion: color, modo y perfil. */

export function FormRgbColor(p: PropsFormulario) {
  const VD = useTheme();
  const tf = useFieldText();
  const inputStyle = estiloEntrada(VD);
  const { action, setAction, rgbConnected, rgbDevices } = p;
  return (
    <>
          <>
            {!rgbConnected && (
              <div style={{ fontFamily: VD.mono, fontSize: 10, color: VD.warning, padding: '6px 10px', background: 'rgba(212,162,52,0.08)', border: `1px solid ${VD.warning}`, borderRadius: VD.radius.sm }}>
                {tf('OpenRGB no conectado. Conecta desde la pantalla RGB para listar dispositivos. La acción seguirá funcionando si OpenRGB está activo cuando se ejecute el botón.')}
              </div>
            )}
            <Field label={tf("DISPOSITIVO RGB")}>
              <select
                value={action.rgbDeviceId ?? -1}
                onChange={(e) => setAction((a) => ({ ...a, rgbDeviceId: parseInt(e.target.value, 10) }))}
                style={inputStyle}
              >
                <option value={-1}>{tf('Todos los dispositivos')}</option>
                {rgbDevices.map((d) => (
                  <option key={d.id} value={d.id}>{d.name} ({d.typeLabel})</option>
                ))}
              </select>
            </Field>
          </>
          <Field label={tf("COLOR (HEX)")}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="color"
                value={action.rgbColor ?? '#ffffff'}
                onChange={(e) => setAction((a) => ({ ...a, rgbColor: e.target.value }))}
                style={{ width: 36, height: 28, padding: 2, border: `1px solid ${VD.border}`, background: 'none', cursor: 'pointer', borderRadius: VD.radius.sm }}
              />
              <input
                value={(action.rgbColor ?? '#ffffff').toUpperCase()}
                onChange={(e) => {
                  const v = e.target.value.trim();
                  if (/^#?[0-9a-fA-F]{6}$/.test(v)) setAction((a) => ({ ...a, rgbColor: v.startsWith('#') ? v : `#${v}` }));
                }}
                style={{ ...inputStyle, flex: 1 }}
              />
            </div>
          </Field>
    </>
  );
}

export function FormRgbMode(p: PropsFormulario) {
  const VD = useTheme();
  const tf = useFieldText();
  const inputStyle = estiloEntrada(VD);
  const { action, setAction, rgbConnected, rgbDevices } = p;
  return (
    <>
          <>
            {!rgbConnected && (
              <div style={{ fontFamily: VD.mono, fontSize: 10, color: VD.warning, padding: '6px 10px', background: 'rgba(212,162,52,0.08)', border: `1px solid ${VD.warning}`, borderRadius: VD.radius.sm }}>
                {tf('OpenRGB no conectado. Conecta desde la pantalla RGB para listar dispositivos. La acción seguirá funcionando si OpenRGB está activo cuando se ejecute el botón.')}
              </div>
            )}
            <Field label={tf("DISPOSITIVO RGB")}>
              <select
                value={action.rgbDeviceId ?? -1}
                onChange={(e) => setAction((a) => ({ ...a, rgbDeviceId: parseInt(e.target.value, 10) }))}
                style={inputStyle}
              >
                <option value={-1}>{tf('Todos los dispositivos')}</option>
                {rgbDevices.map((d) => (
                  <option key={d.id} value={d.id}>{d.name} ({d.typeLabel})</option>
                ))}
              </select>
            </Field>
          </>
          <>
            <Field label={tf("MODO / EFECTO")}>
              <input
                value={action.rgbMode ?? ''}
                onChange={(e) => setAction((a) => ({ ...a, rgbMode: e.target.value }))}
                placeholder={"Direct, Static, Breathing, Rainbow, Spectrum Cycle..."}
                list="rgb-modes-list"
                style={inputStyle}
              />
              <datalist id="rgb-modes-list">
                {(() => {
                  const seen = new Set<string>();
                  return rgbDevices.flatMap((d) => d.modes).filter((m) => {
                    if (seen.has(m.name.toLowerCase())) return false;
                    seen.add(m.name.toLowerCase()); return true;
                  }).map((m) => <option key={m.name} value={m.name} />);
                })()}
              </datalist>
            </Field>
            <Field label={tf("COLOR (OPCIONAL — SOLO PARA MODOS QUE LO USAN)")}>
              <input
                type="color"
                value={action.rgbColor ?? '#ffffff'}
                onChange={(e) => setAction((a) => ({ ...a, rgbColor: e.target.value }))}
                style={{ width: 60, height: 28, padding: 2, border: `1px solid ${VD.border}`, background: 'none', cursor: 'pointer', borderRadius: VD.radius.sm }}
              />
            </Field>
            <Field label={tf("BRILLO 0-100 (OPCIONAL)")}>
              <input
                type="number"
                min={0} max={100}
                value={action.rgbBrightness ?? ''}
                onChange={(e) => setAction((a) => ({ ...a, rgbBrightness: e.target.value === '' ? undefined : parseInt(e.target.value, 10) }))}
                style={inputStyle}
              />
            </Field>
          </>
    </>
  );
}

export function FormRgbProfile(p: PropsFormulario) {
  const VD = useTheme();
  const t = useT();
  const tf = useFieldText();
  const inputStyle = estiloEntrada(VD);
  const { action, setAction, rgbProfiles } = p;
  return (
    <>
          <Field label={tf("PERFIL RGB")}>
            {rgbProfiles.length === 0 ? (
              <div style={{ fontFamily: VD.mono, fontSize: 10, color: VD.warning, lineHeight: 1.6 }}>
                {t('ed.noRgbProfiles')}
              </div>
            ) : (
              <select
                value={action.rgbProfileName ?? ''}
                onChange={(e) => setAction((a) => ({ ...a, rgbProfileName: e.target.value }))}
                style={inputStyle}
              >
                <option value="">— Selecciona un perfil —</option>
                {rgbProfiles.map((p) => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            )}
          </Field>
    </>
  );
}

/**
 * Los presets "inteligentes" del RGB.
 *
 * No tenia formulario, y sin el la accion `rgb-preset` era un callejon: se
 * puede elegir como sub-accion (esta en `simpleTypes`) y llega dentro de los
 * botones sembrados de la categoria RGB, pero al abrir el editor no habia con
 * que cambiar el preset — el paso 2 salia en blanco.
 *
 * Los siete ids son los de `SMART_PRESETS`, en `electron/main/rgb.ts`. Si se
 * añade uno alli, hay que añadirlo aqui: es la lista que ve el usuario.
 */
const PRESETS_RGB = ['off', 'gaming', 'cinema', 'work', 'rainbow', 'night-blue', 'alert-red'];

export function FormRgbPreset({ action, setAction }: PropsFormulario) {
  const VD = useTheme();
  const t = useT();
  const tf = useFieldText();
  const inputStyle = estiloEntrada(VD);
  return (
    <Field label={tf('PRESET')}>
      <select
        value={action.rgbPresetId ?? ''}
        onChange={(e) => setAction((a) => ({ ...a, rgbPresetId: e.target.value || undefined }))}
        style={inputStyle}
      >
        <option value="">{tf('— elegir —')}</option>
        {PRESETS_RGB.map((id) => (
          <option key={id} value={id}>{t(`rgb.preset.${id}`)}</option>
        ))}
      </select>
      <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, marginTop: 4, lineHeight: 1.4 }}>
        {tf('Cada preset prueba varios modos hasta dar con uno que el dispositivo soporte.')}
      </div>
    </Field>
  );
}
