import React, { lazy, Suspense } from 'react';
import { useTheme } from '../../utils/theme';
import { useT, useFieldText } from '../../utils/i18n';
import { DotLabel } from '../../components/DotLabel';
import { ButtonCell } from '../../components/ButtonCell';
import { BrandIconDisplay } from '../../components/BrandIconDisplay';
import { Glyph57View as Glyph57Inline } from '../../components/Glyph57Editor';
import { BRAND_ICONS_MAP } from '../../data/brandIcons';
import { Field, Btn, SensorPicker, estiloEntrada } from './comunes';
import { CamposDivisa } from './CamposDivisa';
import type { ButtonAction, ButtonConfig, Sensor, TipoWidget } from '../../types';

/**
 * Paso 3 de 3: como se ve el boton y cuando aparece o se dispara solo.
 *
 * Etiqueta, icono (emoji, imagen, marca o glifo dibujado), colores, el widget
 * que muestra datos en vivo, y los disparadores: visible solo si tal app esta
 * activa, dispararse a una hora, o cuando un sensor cruce un umbral.
 *
 * Recibe muchisimos props —uno por cada campo del formulario— porque el estado
 * vive en `EditorB`, que es quien guarda. Ese numero es la señal de que ese
 * estado pide agruparse en un objeto; es un cambio aparte y mas invasivo que
 * este, que solo mueve el JSX de sitio.
 */

interface Props {
  accent: string;
  action: ButtonAction;
  bgColor: string;
  brandIcon: string;
  brandIconAlwaysAnimate: boolean;
  brandIconCustomBitmap: string[] | undefined;
  brandIconCustomColor: string | undefined;
  brandIconCustomPalette: Record<string, string> | undefined;
  setBrandIconCustomPalette: React.Dispatch<React.SetStateAction<Record<string, string> | undefined>>;
  button: ButtonConfig;
  customGlyph57: number[] | undefined;
  deckState: Record<string, string>;
  fgColor: string;
  icon: string;
  imageData: string;
  label: string;
  pickImage: () => void;
  sensorList: Sensor[];
  sensorTriggerCooldown: string;
  sensorTriggerId: string;
  sensorTriggerOp: '>' | '<' | '>=' | '<=' | '==';
  setSensorTriggerOp: React.Dispatch<React.SetStateAction<'>' | '<' | '>=' | '<=' | '=='>>;
  sensorTriggerVal: string;
  sensorWidgetCrit: string;
  sensorWidgetId: string;
  sensorWidgetSuffix: string;
  sensorWidgetWarn: string;
  setBgColor: React.Dispatch<React.SetStateAction<string>>;
  setBrandIcon: React.Dispatch<React.SetStateAction<string>>;
  setBrandIconAlwaysAnimate: React.Dispatch<React.SetStateAction<boolean>>;
  setBrandIconCustomBitmap: React.Dispatch<React.SetStateAction<string[] | undefined>>;
  setBrandIconCustomColor: React.Dispatch<React.SetStateAction<string | undefined>>;
  setCustomGlyph57: React.Dispatch<React.SetStateAction<number[] | undefined>>;
  setFgColor: React.Dispatch<React.SetStateAction<string>>;
  setIcon: React.Dispatch<React.SetStateAction<string>>;
  setImageData: React.Dispatch<React.SetStateAction<string>>;
  setLabel: React.Dispatch<React.SetStateAction<string>>;
  setSensorTriggerCooldown: React.Dispatch<React.SetStateAction<string>>;
  setSensorTriggerId: React.Dispatch<React.SetStateAction<string>>;
  setSensorTriggerVal: React.Dispatch<React.SetStateAction<string>>;
  setSensorWidgetCrit: React.Dispatch<React.SetStateAction<string>>;
  setSensorWidgetId: React.Dispatch<React.SetStateAction<string>>;
  setSensorWidgetSuffix: React.Dispatch<React.SetStateAction<string>>;
  setSensorWidgetWarn: React.Dispatch<React.SetStateAction<string>>;
  setShowBrandEditor: React.Dispatch<React.SetStateAction<boolean>>;
  setShowBrandPicker: React.Dispatch<React.SetStateAction<boolean>>;
  setShowGlyphEditor: React.Dispatch<React.SetStateAction<boolean>>;
  setSublabel: React.Dispatch<React.SetStateAction<string>>;
  setTimerTriggerAt: React.Dispatch<React.SetStateAction<string>>;
  setVarWidgetName: React.Dispatch<React.SetStateAction<string>>;
  setVarWidgetPrefix: React.Dispatch<React.SetStateAction<string>>;
  setVarWidgetSuffix: React.Dispatch<React.SetStateAction<string>>;
  setVisibleIfApp: React.Dispatch<React.SetStateAction<string>>;
  setVisibleIfSensorId: React.Dispatch<React.SetStateAction<string>>;
  setVisibleIfSensorVal: React.Dispatch<React.SetStateAction<string>>;
  setWidget: React.Dispatch<React.SetStateAction<TipoWidget | undefined>>;
  sublabel: string;
  timerTriggerAt: string;
  varWidgetName: string;
  varWidgetPrefix: string;
  varWidgetSuffix: string;
  visibleIfApp: string;
  visibleIfSensorId: string;
  visibleIfSensorOp: '>' | '<' | '>=' | '<=' | '==';
  setVisibleIfSensorOp: React.Dispatch<React.SetStateAction<'>' | '<' | '>=' | '<=' | '=='>>;
  visibleIfSensorVal: string;
  widget: TipoWidget | undefined;
  currencyWidget: ButtonConfig['currencyWidget'];
  setCurrencyWidget: React.Dispatch<React.SetStateAction<ButtonConfig['currencyWidget']>>;
}

export function PasoEstilo({ accent, action, bgColor, brandIcon, brandIconAlwaysAnimate, brandIconCustomBitmap, brandIconCustomColor, brandIconCustomPalette, setBrandIconCustomPalette, button, customGlyph57, deckState, fgColor, icon, imageData, label, pickImage, sensorList, sensorTriggerCooldown, sensorTriggerId, sensorTriggerOp, setSensorTriggerOp, sensorTriggerVal, sensorWidgetCrit, sensorWidgetId, sensorWidgetSuffix, sensorWidgetWarn, setBgColor, setBrandIcon, setBrandIconAlwaysAnimate, setBrandIconCustomBitmap, setBrandIconCustomColor, setCustomGlyph57, setFgColor, setIcon, setImageData, setLabel, setSensorTriggerCooldown, setSensorTriggerId, setSensorTriggerVal, setSensorWidgetCrit, setSensorWidgetId, setSensorWidgetSuffix, setSensorWidgetWarn, setShowBrandEditor, setShowBrandPicker, setShowGlyphEditor, setSublabel, setTimerTriggerAt, setVarWidgetName, setVarWidgetPrefix, setVarWidgetSuffix, setVisibleIfApp, setVisibleIfSensorId, setVisibleIfSensorVal, setWidget, sublabel, timerTriggerAt, varWidgetName, varWidgetPrefix, varWidgetSuffix, visibleIfApp, visibleIfSensorId, visibleIfSensorOp, setVisibleIfSensorOp, visibleIfSensorVal, widget, currencyWidget, setCurrencyWidget }: Props) {
  const VD = useTheme();
  const t = useT();
  const tf = useFieldText();
  const inputStyle = estiloEntrada(VD);

  return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Field label={tf("ETIQUETA DEL BOTÓN")}>
                <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={tf("Mi Botón")} maxLength={20} style={inputStyle} />
              </Field>
              <Field label={tf("SUB-ETIQUETA (OPCIONAL)")}>
                <input value={sublabel} onChange={(e) => setSublabel(e.target.value)} placeholder={tf("Descripción corta")} maxLength={30} style={inputStyle} />
              </Field>
              <Field label={tf("ICONO (EMOJI O SÍMBOLO — VACÍO = ÍCONO DEL TIPO)")}>
                <input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder={"▶ ◉ 🎵 💻 🌐 ★"} maxLength={4} style={{ ...inputStyle, fontSize: 20 }} />
              </Field>
              <Field label={tf("IMAGEN PERSONALIZADA (PNG / JPG / GIF)")}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Btn onClick={pickImage}>{tf('Elegir imagen')}</Btn>
                  {imageData && (
                    <>
                      <img src={imageData} alt="" style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: VD.radius.md, border: `1px solid ${VD.border}` }} />
                      <Btn onClick={() => setImageData('')} style={{ color: VD.danger }}>{tf('Quitar')}</Btn>
                    </>
                  )}
                </div>
              </Field>

              <Field label={tf("ICONO DE MARCA ANIMADO (DOT-MATRIX)")}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  {brandIcon ? (
                    <>
                      <div style={{ position: 'relative', width: 36, height: 36, borderRadius: VD.radius.lg, border: `1px solid ${VD.border}`, overflow: 'hidden', background: VD.elevated }}>
                        <BrandIconDisplay
                          iconKey={brandIcon}
                          customBitmap={brandIconCustomBitmap}
                          customColor={brandIconCustomColor}
                          customPalette={brandIconCustomPalette}
                          animated={false}
                          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
                        />
                      </div>
                      <span style={{ fontFamily: VD.mono, fontSize: 10, color: VD.text }}>
                        {BRAND_ICONS_MAP[brandIcon]?.label ?? brandIcon}
                        {brandIconCustomBitmap && <span style={{ color: accent, marginLeft: 6 }}>✎</span>}
                      </span>
                      <Btn onClick={() => setShowBrandPicker(true)}>{tf('Cambiar')}</Btn>
                      <Btn onClick={() => setShowBrandEditor(true)}>{tf('Editar puntos')}</Btn>
                      {brandIconCustomBitmap && (
                        <Btn onClick={() => { setBrandIconCustomBitmap(undefined); setBrandIconCustomColor(undefined); setBrandIconCustomPalette(undefined); }}>
                          {tf('Restaurar')}
                        </Btn>
                      )}
                      <Btn onClick={() => { setBrandIcon(''); setBrandIconCustomBitmap(undefined); setBrandIconCustomColor(undefined); setBrandIconCustomPalette(undefined); }} style={{ color: VD.danger }}>{tf('Quitar')}</Btn>
                    </>
                  ) : (
                    <Btn onClick={() => setShowBrandPicker(true)}>{tf('Elegir icono de marca')}</Btn>
                  )}
                </div>
                {brandIcon && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={brandIconAlwaysAnimate}
                      onChange={e => setBrandIconAlwaysAnimate(e.target.checked)}
                      style={{ accentColor: accent }}
                    />
                    <span style={{ fontFamily: VD.mono, fontSize: 9, letterSpacing: 1, color: VD.textDim }}>
                      {tf('ANIMACIÓN SIEMPRE ACTIVA — si está desactivado, anima solo cuando el botón está encendido (toggle ON)')}
                    </span>
                  </label>
                )}
                <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, marginTop: 6 }}>
                  {tf('68 iconos · Fondo transparente · Superpone al color de fondo del botón')}
                </div>
              </Field>

              {/* 2.1 — Glifo 5×7 personal del usuario */}
              <Field label={tf("GLIFO PERSONAL 5×7 (DOT-MATRIX)")}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  {customGlyph57 && customGlyph57.length === 7 && customGlyph57.some((r) => r > 0) ? (
                    <>
                      <div style={{
                        width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderRadius: VD.radius.md, border: `1px solid ${VD.border}`, background: VD.elevated,
                      }}>
                        <Glyph57Inline rows={customGlyph57} color={fgColor || VD.text} />
                      </div>
                      <Btn onClick={() => setShowGlyphEditor(true)}>{tf('Editar')}</Btn>
                      <Btn onClick={() => setCustomGlyph57(undefined)} style={{ color: VD.danger }}>{tf('Quitar')}</Btn>
                    </>
                  ) : (
                    <Btn onClick={() => setShowGlyphEditor(true)}>{tf('Dibujar glifo')}</Btn>
                  )}
                </div>
                <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, marginTop: 6 }}>
                  {tf('5×7 puntos hechos a mano. Coherente con la firma del producto.')}
                </div>
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label={tf("COLOR DE FONDO")}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="color" value={bgColor || '#222222'} onChange={(e) => setBgColor(e.target.value)} style={{ width: 36, height: 28, border: `1px solid ${VD.border}`, background: 'none', cursor: 'pointer', padding: 2 }} />
                    <input value={bgColor} onChange={(e) => setBgColor(e.target.value)} placeholder={"#222222"} style={{ ...inputStyle, flex: 1 }} />
                    {bgColor && <Btn onClick={() => setBgColor('')}>✕</Btn>}
                  </div>
                </Field>
                <Field label={tf("COLOR DE TEXTO / ÍCONO")}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="color" value={fgColor || '#dcdcdc'} onChange={(e) => setFgColor(e.target.value)} style={{ width: 36, height: 28, border: `1px solid ${VD.border}`, background: 'none', cursor: 'pointer', padding: 2 }} />
                    <input value={fgColor} onChange={(e) => setFgColor(e.target.value)} placeholder={"#dcdcdc"} style={{ ...inputStyle, flex: 1 }} />
                    {fgColor && <Btn onClick={() => setFgColor('')}>✕</Btn>}
                  </div>
                </Field>
              </div>

              <div style={{ height: 1, background: VD.border }} />

              {/* Widget — live data display on the button cell */}
              <Field label={tf("WIDGET (MUESTRA DATOS EN EL BOTÓN)")}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {([undefined, 'clock', 'weather', 'now-playing', 'sensor', 'variable', 'currency'] as const).map((w) => {
                    // now-playing on an audio-device button hides the device
                    // name in favor of the playing track — useless combo, so
                    // we lock it out here instead of silently dropping the
                    // widget at render time (was the old behavior).
                    const conflicts = w === 'now-playing' && action.type === 'audio-device';
                    return (
                      <button
                        key={w ?? 'none'}
                        onClick={() => { if (!conflicts) setWidget(w); }}
                        disabled={conflicts}
                        title={conflicts ? tf('Incompatible con acción de Audio: el widget oculta el nombre del dispositivo.') : undefined}
                        style={{
                          flex: '1 1 60px', padding: '5px 0', cursor: conflicts ? 'not-allowed' : 'pointer', borderRadius: VD.radius.sm,
                          background: widget === w ? VD.accentBg : VD.elevated,
                          border: `1px solid ${widget === w ? accent : VD.border}`,
                          fontFamily: VD.mono, fontSize: 8, letterSpacing: 0.5,
                          color: widget === w ? accent : VD.textDim,
                          opacity: conflicts ? 0.4 : 1,
                        }}
                      >
                        {w === undefined ? tf('NINGUNO') : w === 'clock' ? tf('RELOJ') : w === 'weather' ? tf('CLIMA') : w === 'now-playing' ? tf('MÚSICA') : w === 'sensor' ? 'SENSOR' : w === 'currency' ? tf('DIVISA') : 'VARIABLE'}
                      </button>
                    );
                  })}
                </div>
                <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, marginTop: 4 }}>
                  {tf('Sustituye el ícono/etiqueta con datos en vivo. El botón sigue siendo ejecutable.')}
                </div>
                {widget === 'currency' && (
                  <CamposDivisa
                    accent={accent}
                    valor={currencyWidget}
                    onChange={setCurrencyWidget}
                  />
                )}
                {widget === 'sensor' && (
                  <div style={{ marginTop: 8, padding: 10, background: VD.elevated, border: `1px solid ${VD.border}`, borderRadius: VD.radius.md, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <SensorPicker
                      sensors={sensorList}
                      value={sensorWidgetId}
                      onChange={setSensorWidgetId}
                      accent={accent}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        value={sensorWidgetSuffix}
                        onChange={(e) => setSensorWidgetSuffix(e.target.value)}
                        placeholder={tf("Etiqueta (ej. CPU)")}
                        style={{ ...inputStyle, flex: 1 }}
                      />
                      <input
                        value={sensorWidgetWarn}
                        onChange={(e) => setSensorWidgetWarn(e.target.value)}
                        placeholder={"Warn ≥"}
                        style={{ ...inputStyle, width: 80 }}
                      />
                      <input
                        value={sensorWidgetCrit}
                        onChange={(e) => setSensorWidgetCrit(e.target.value)}
                        placeholder={"Crit ≥"}
                        style={{ ...inputStyle, width: 80 }}
                      />
                    </div>
                    <div style={{ fontFamily: VD.mono, fontSize: 7, color: VD.textMuted }}>
                      {t('ed.thresholdHint')}
                    </div>
                  </div>
                )}
                {widget === 'variable' && (
                  <div style={{ marginTop: 8, padding: 10, background: VD.elevated, border: `1px solid ${VD.border}`, borderRadius: VD.radius.md, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input
                      value={varWidgetName}
                      onChange={(e) => setVarWidgetName(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                      placeholder={tf("Nombre de variable (ej. tomas)")}
                      list="vd-known-vars"
                      style={{ ...inputStyle }}
                    />
                    <datalist id="vd-known-vars">
                      {Object.keys(deckState).map((k) => <option key={k} value={k} />)}
                    </datalist>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        value={varWidgetPrefix}
                        onChange={(e) => setVarWidgetPrefix(e.target.value)}
                        placeholder={tf("Prefijo (ej. 🎬 )")}
                        style={{ ...inputStyle, flex: 1 }}
                      />
                      <input
                        value={varWidgetSuffix}
                        onChange={(e) => setVarWidgetSuffix(e.target.value)}
                        placeholder={tf("Etiqueta debajo")}
                        style={{ ...inputStyle, flex: 1 }}
                      />
                    </div>
                    <div style={{ fontFamily: VD.mono, fontSize: 7, color: VD.textMuted }}>
                      {tf('Muestra el valor en vivo de una variable. Combínalo con acciones "Incrementar variable" / "Asignar variable" para hacer contadores. Las variables sin valor se muestran como 0.')}
                    </div>
                  </div>
                )}
              </Field>

              {/* Visibility condition */}
              <Field label={tf("VISIBLE SOLO SI ESTA APP ESTÁ ACTIVA (opcional)")}>
                <input
                  value={visibleIfApp}
                  onChange={(e) => setVisibleIfApp(e.target.value)}
                  placeholder={"spotify, chrome, obs64 ..."}
                  style={inputStyle}
                />
                <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, marginTop: 4 }}>
                  {tf('Nombre del proceso sin .exe. Vacío = siempre visible.')}
                </div>
              </Field>

              {/* Scheduled trigger */}
              <Field label={tf("DISPARAR AUTOMÁTICAMENTE A LA HORA (HH:MM)")}>
                <input
                  value={timerTriggerAt}
                  onChange={(e) => setTimerTriggerAt(e.target.value)}
                  placeholder={"08:00"}
                  maxLength={5}
                  style={inputStyle}
                />
                <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, marginTop: 4 }}>
                  {tf('Formato 24h. Solo se dispara cuando la página del botón está activa.')}
                </div>
              </Field>

              {/* Visibility by sensor */}
              <Field label={tf("VISIBLE SOLO SI SENSOR (opcional)")}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <SensorPicker
                    sensors={sensorList}
                    value={visibleIfSensorId}
                    onChange={setVisibleIfSensorId}
                    accent={accent}
                    allowEmpty
                  />
                  {visibleIfSensorId && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <select
                        value={visibleIfSensorOp}
                        onChange={(e) => setVisibleIfSensorOp(e.target.value as any)}
                        style={{ ...inputStyle, width: 70 }}
                      >
                        <option value=">">{'>'}</option>
                        <option value="<">{'<'}</option>
                        <option value=">=">{'≥'}</option>
                        <option value="<=">{'≤'}</option>
                        <option value="==">{'='}</option>
                      </select>
                      <input
                        value={visibleIfSensorVal}
                        onChange={(e) => setVisibleIfSensorVal(e.target.value)}
                        placeholder={tf("Valor (ej. 80)")}
                        style={{ ...inputStyle, flex: 1 }}
                      />
                    </div>
                  )}
                </div>
                <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, marginTop: 4 }}>
                  {tf('Aparece cuando el sensor cumple la condición. Combinable con app de arriba.')}
                </div>
              </Field>

              {/* Sensor-triggered automatic execution */}
              <Field label={tf("DISPARAR CUANDO SENSOR (opcional)")}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <SensorPicker
                    sensors={sensorList}
                    value={sensorTriggerId}
                    onChange={setSensorTriggerId}
                    accent={accent}
                    allowEmpty
                  />
                  {sensorTriggerId && (
                    <>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <select
                          value={sensorTriggerOp}
                          onChange={(e) => setSensorTriggerOp(e.target.value as any)}
                          style={{ ...inputStyle, width: 70 }}
                        >
                          <option value=">">{'>'}</option>
                          <option value="<">{'<'}</option>
                          <option value=">=">{'≥'}</option>
                          <option value="<=">{'≤'}</option>
                          <option value="==">{'='}</option>
                        </select>
                        <input
                          value={sensorTriggerVal}
                          onChange={(e) => setSensorTriggerVal(e.target.value)}
                          placeholder={tf("Valor (ej. 85)")}
                          style={{ ...inputStyle, flex: 1 }}
                        />
                        <input
                          value={sensorTriggerCooldown}
                          onChange={(e) => setSensorTriggerCooldown(e.target.value)}
                          placeholder={"Cooldown s"}
                          style={{ ...inputStyle, width: 100 }}
                        />
                      </div>
                    </>
                  )}
                </div>
                <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, marginTop: 4 }}>
                  {tf('Ejecuta la acción cuando se cumple la condición. Cooldown evita que se redispare cada poll (default 60s).')}
                </div>
              </Field>
            </div>
  );
}
