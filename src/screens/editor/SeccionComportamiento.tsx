import React from 'react';
import { useTheme } from '../../utils/theme';
import { useT, useFieldText } from '../../utils/i18n';
import { DotLabel } from '../../components/DotLabel';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';
import { Field, SensorPicker, ToggleOffActionPicker, estiloEntrada } from './comunes';
import type { ButtonAction, Sensor } from '../../types';

interface SeccionComportamientoProps {
  accent: string;
  action: ButtonAction;
  isToggle: boolean;
  setIsToggle: (v: boolean) => void;
  actionToggleOff: ButtonAction;
  setActionToggleOff: React.Dispatch<React.SetStateAction<ButtonAction>>;
  longPressAction: ButtonAction;
  setLongPressAction: React.Dispatch<React.SetStateAction<ButtonAction>>;
  radioGroup: string;
  setRadioGroup: (s: string) => void;
  fijo: boolean;
  setFijo: (v: boolean) => void;
  pinned: boolean;
  setPinned: (v: boolean) => void;
  globalHotkey: string;
  setGlobalHotkey: (s: string) => void;
  inTrayMenu: boolean;
  setInTrayMenu: (v: boolean) => void;
  timerTriggerAt: string;
  setTimerTriggerAt: (s: string) => void;
  visibleIfApp: string;
  setVisibleIfApp: (s: string) => void;
  visibleIfSensorId: string;
  setVisibleIfSensorId: (s: string) => void;
  visibleIfSensorOp: '>' | '<' | '>=' | '<=' | '==';
  setVisibleIfSensorOp: React.Dispatch<React.SetStateAction<'>' | '<' | '>=' | '<=' | '=='>>;
  visibleIfSensorVal: string;
  setVisibleIfSensorVal: (s: string) => void;
  sensorTriggerId: string;
  setSensorTriggerId: (s: string) => void;
  sensorTriggerOp: '>' | '<' | '>=' | '<=' | '==';
  setSensorTriggerOp: React.Dispatch<React.SetStateAction<'>' | '<' | '>=' | '<=' | '=='>>;
  sensorTriggerVal: string;
  setSensorTriggerVal: (s: string) => void;
  sensorTriggerCooldown: string;
  setSensorTriggerCooldown: (s: string) => void;
  sensorList: Sensor[];
}

export function SeccionComportamiento({
  accent,
  action,
  isToggle,
  setIsToggle,
  actionToggleOff,
  setActionToggleOff,
  longPressAction,
  setLongPressAction,
  radioGroup,
  setRadioGroup,
  fijo,
  setFijo,
  pinned,
  setPinned,
  globalHotkey,
  setGlobalHotkey,
  inTrayMenu,
  setInTrayMenu,
  timerTriggerAt,
  setTimerTriggerAt,
  visibleIfApp,
  setVisibleIfApp,
  visibleIfSensorId,
  setVisibleIfSensorId,
  visibleIfSensorOp,
  setVisibleIfSensorOp,
  visibleIfSensorVal,
  setVisibleIfSensorVal,
  sensorTriggerId,
  setSensorTriggerId,
  sensorTriggerOp,
  setSensorTriggerOp,
  sensorTriggerVal,
  setSensorTriggerVal,
  sensorTriggerCooldown,
  setSensorTriggerCooldown,
  sensorList,
}: SeccionComportamientoProps) {
  const VD = useTheme();
  const t = useT();
  const tf = useFieldText();
  const inputStyle = estiloEntrada(VD);

  const esAccionValida = action.type !== 'none' && action.type !== 'folder';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* 1. Modo Toggle (dos estados) */}
      {esAccionValida && (
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: isToggle ? 10 : 0 }}>
            <input
              type="checkbox"
              checked={isToggle}
              onChange={(e) => setIsToggle(e.target.checked)}
              style={{ accentColor: accent }}
            />
            <span style={{ fontFamily: VD.mono, fontSize: 9, letterSpacing: 1, color: VD.textDim }}>
              {tf('MODO TOGGLE — el botón alterna entre activado / desactivado')}
            </span>
          </label>
          {isToggle && (
            <div style={{ marginLeft: 22, marginTop: 8 }}>
              <DotLabel size={9} color={VD.textMuted} spacing={2} style={{ display: 'block', marginBottom: 6 }}>
                {tf('ACCIÓN AL DESACTIVAR (opcional — si vacío, repite la misma acción)')}
              </DotLabel>
              <ToggleOffActionPicker
                action={actionToggleOff}
                onChange={setActionToggleOff}
                accent={accent}
              />

              {/* Grupo Radio */}
              <div style={{ marginTop: 12 }}>
                <Field label={tf("GRUPO RADIO (toggles mutuamente exclusivos)")}>
                  <input
                    value={radioGroup}
                    onChange={(e) => setRadioGroup(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                    placeholder={tf("ej: modo_audio, perfil_rgb...")}
                    style={inputStyle}
                  />
                  <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, marginTop: 4 }}>
                    {t('ed.radioHint')}
                  </div>
                </Field>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. Mantener pulsado */}
      {esAccionValida && (
        <div style={{ borderTop: `1px solid ${VD.border}`, paddingTop: 12 }}>
          <DotLabel size={9} color={VD.textMuted} spacing={2} style={{ display: 'block', marginBottom: 6 }}>
            {tf('ACCIÓN AL MANTENER PULSADO (~500 MS)')}
          </DotLabel>
          <ToggleOffActionPicker
            action={longPressAction}
            onChange={setLongPressAction}
            accent={accent}
          />
        </div>
      )}

      {/* 3. Persistencia en páginas */}
      <div style={{ borderTop: `1px solid ${VD.border}`, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {action.type !== 'none' && (
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={fijo}
                onChange={(e) => setFijo(e.target.checked)}
                style={{ accentColor: accent }}
              />
              <span style={{ fontFamily: VD.mono, fontSize: 9, letterSpacing: 1, color: VD.textDim }}>
                {tf('FIJO EN TODAS LAS PÁGINAS')}
              </span>
            </label>
            <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, marginTop: 4 }}>
              {tf('Vive en su página y se ve en el mismo hueco en las demás páginas de su grupo: el deck, o el mismo dock.')}
            </div>
          </div>
        )}

        <Field label={tf("BOTÓN ANCLADO GLOBAL")}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              cursor: 'pointer',
              background: pinned ? `${accent}18` : VD.elevated,
              padding: '7px 10px',
              borderRadius: VD.radius.sm,
              border: `1px solid ${pinned ? accent : VD.border}`,
              transition: 'all 0.15s ease',
            }}
          >
            <input
              type="checkbox"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
              style={{ accentColor: accent, cursor: 'pointer' }}
            />
            <DotGlyphIcon glyph="PIN" size={10} color={pinned ? accent : VD.textMuted} />
            <span
              style={{
                fontFamily: VD.mono,
                fontSize: 9,
                letterSpacing: 1,
                color: pinned ? VD.text : VD.textDim,
                textTransform: 'uppercase',
                userSelect: 'none',
              }}
            >
              {tf('ANCLAR EN TODAS LAS PÁGINAS')}
            </span>
          </label>
        </Field>
      </div>

      {/* 4. Disparadores y condiciones externas */}
      {action.type !== 'none' && (
        <div style={{ borderTop: `1px solid ${VD.border}`, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <DotLabel size={9} color={VD.textMuted} spacing={2} style={{ display: 'block' }}>
            {t('ed.triggers')}
          </DotLabel>

          {/* Hotkey global */}
          <Field label={tf("HOTKEY GLOBAL DEL SO (ej. Ctrl+Alt+1)")}>
            <input
              value={globalHotkey}
              onChange={(e) => setGlobalHotkey(e.target.value)}
              placeholder={tf("vacío = sin atajo global")}
              style={inputStyle}
            />
          </Field>

          {/* Menú bandeja */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={inTrayMenu}
              onChange={(e) => setInTrayMenu(e.target.checked)}
              style={{ accentColor: accent }}
            />
            <span style={{ fontFamily: VD.mono, fontSize: 9, letterSpacing: 1, color: VD.textDim }}>
              {tf('MOSTRAR EN EL MENÚ DE LA BANDEJA (acción rápida)')}
            </span>
          </label>

          {/* Visibilidad por app */}
          <Field label={tf("VISIBLE SOLO SI ESTA APP ESTÁ ACTIVA (opcional)")}>
            <input
              value={visibleIfApp}
              onChange={(e) => setVisibleIfApp(e.target.value)}
              placeholder={"spotify, chrome, obs64 ..."}
              style={inputStyle}
            />
          </Field>

          {/* Disparo programado por hora */}
          <Field label={tf("DISPARAR AUTOMÁTICAMENTE A LA HORA (HH:MM)")}>
            <input
              value={timerTriggerAt}
              onChange={(e) => setTimerTriggerAt(e.target.value)}
              placeholder={"08:00"}
              maxLength={5}
              style={inputStyle}
            />
          </Field>

          {/* Visibilidad por sensor */}
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
          </Field>

          {/* Disparo cuando sensor */}
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
                    style={{ ...inputStyle, width: 90 }}
                  />
                </div>
              )}
            </div>
          </Field>
        </div>
      )}
    </div>
  );
}
