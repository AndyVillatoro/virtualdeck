import React from 'react';
import { useTheme } from '../../utils/theme';
import { useT, useFieldText } from '../../utils/i18n';
import { DotLabel } from '../../components/DotLabel';
import { Field, ToggleOffActionPicker } from './comunes';
import { CampoGlobalHotkey } from './comportamiento/CampoGlobalHotkey';
import { CampoVisibleIfApp } from './comportamiento/CampoVisibleIfApp';
import { CampoSensorCondicion } from './comportamiento/CampoSensorCondicion';
import { CampoTimerTrigger } from './comportamiento/CampoTimerTrigger';
import { CampoRadioGroup } from './comportamiento/CampoRadioGroup';
import { CampoAspectoEncendido } from './comportamiento/CampoAspectoEncendido';
import { useConfiguracionExistente } from './comportamiento/useConfiguracionExistente';
import type { ButtonAction, PageConfig, Sensor } from '../../types';
import type { NombreCatalogo } from '../../data/iconosDot/tipos';

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
  globalHotkey: string;
  setGlobalHotkey: (s: string) => void;
  inTrayMenu: boolean;
  setInTrayMenu: (v: boolean) => void;
  timerTriggerAt: string;
  setTimerTriggerAt: (s: string) => void;
  timerTriggerDias: number[];
  setTimerTriggerDias: (d: number[]) => void;
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
  currentButtonId?: string;
  pages?: PageConfig[];
  encendidoIcon?: string;
  setEncendidoIcon?: (s: string) => void;
  encendidoIconoPuntos?: { bits: string; origen: string };
  setEncendidoIconoPuntos?: (val?: { bits: string; origen: string }) => void;
  encendidoBgColor?: string;
  setEncendidoBgColor?: (s: string) => void;
  encendidoFgColor?: string;
  setEncendidoFgColor?: (s: string) => void;
  onAbrirCatalogoDot?: (catalogo: NombreCatalogo, destino?: 'principal' | 'encendido') => void;
  previewToggled?: boolean;
  setPreviewToggled?: (v: boolean) => void;
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
  globalHotkey,
  setGlobalHotkey,
  inTrayMenu,
  setInTrayMenu,
  timerTriggerAt,
  setTimerTriggerAt,
  timerTriggerDias,
  setTimerTriggerDias,
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
  currentButtonId,
  pages,
  encendidoIcon = '',
  setEncendidoIcon,
  encendidoIconoPuntos,
  setEncendidoIconoPuntos,
  encendidoBgColor = '',
  setEncendidoBgColor,
  encendidoFgColor = '',
  setEncendidoFgColor,
  onAbrirCatalogoDot,
  previewToggled = false,
  setPreviewToggled,
}: SeccionComportamientoProps) {
  const VD = useTheme();
  const t = useT();
  const tf = useFieldText();
  const { gruposRadio, hotkeysOcupadas } = useConfiguracionExistente(currentButtonId);

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
            <div style={{ marginLeft: 22, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <DotLabel size={9} color={VD.textMuted} spacing={2} style={{ display: 'block', marginBottom: 6 }}>
                  {tf('ACCIÓN AL DESACTIVAR (opcional — si vacío, repite la misma acción)')}
                </DotLabel>
                <ToggleOffActionPicker
                  action={actionToggleOff}
                  onChange={setActionToggleOff}
                  accent={accent}
                />
              </div>

              {/* Aspecto encendido (roadmap 79) */}
              <CampoAspectoEncendido
                accent={accent}
                encendidoIcon={encendidoIcon}
                setEncendidoIcon={setEncendidoIcon ?? (() => {})}
                encendidoIconoPuntos={encendidoIconoPuntos}
                setEncendidoIconoPuntos={setEncendidoIconoPuntos ?? (() => {})}
                encendidoBgColor={encendidoBgColor}
                setEncendidoBgColor={setEncendidoBgColor ?? (() => {})}
                encendidoFgColor={encendidoFgColor}
                setEncendidoFgColor={setEncendidoFgColor ?? (() => {})}
                onAbrirCatalogoDot={onAbrirCatalogoDot}
                previewToggled={previewToggled}
                setPreviewToggled={setPreviewToggled ?? (() => {})}
              />

              {/* Grupo Radio */}
              <div>
                <Field label={tf("GRUPO RADIO (toggles mutuamente exclusivos)")}>
                  <CampoRadioGroup
                    value={radioGroup}
                    onChange={setRadioGroup}
                    gruposExistentes={gruposRadio}
                    accent={accent}
                  />
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
          <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, marginTop: 4 }}>
            {tf('Permite definir dos acciones distintas para una pulsación corta o manteniendo presionado el botón.')}
          </div>
        </div>
      )}

      {/* 3. Persistencia en páginas (solo fijo, sin control de pinned) */}
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
      </div>

      {/* 4. Disparadores y condiciones externas */}
      {action.type !== 'none' && (
        <div style={{ borderTop: `1px solid ${VD.border}`, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <DotLabel size={9} color={VD.textMuted} spacing={2} style={{ display: 'block' }}>
            {t('ed.triggers')}
          </DotLabel>

          {/* Hotkey global */}
          <Field label={tf("HOTKEY GLOBAL DEL SO (ej. Ctrl+Alt+1)")}>
            <CampoGlobalHotkey
              value={globalHotkey}
              onChange={setGlobalHotkey}
              accent={accent}
              hotkeysOcupadas={hotkeysOcupadas}
              pages={pages}
            />
          </Field>

          {/* Menú bandeja */}
          <div>
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
            <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, marginTop: 4 }}>
              {tf('Añade un acceso directo a esta acción en el menú contextual del icono de la bandeja del sistema.')}
            </div>
          </div>

          {/* Visibilidad por app */}
          <Field label={tf("VISIBLE SOLO SI ESTA APP ESTÁ ACTIVA (opcional)")}>
            <CampoVisibleIfApp
              value={visibleIfApp}
              onChange={setVisibleIfApp}
              accent={accent}
            />
          </Field>

          {/* Disparo programado por hora */}
          <Field label={tf("DISPARAR AUTOMÁTICAMENTE A LA HORA (HH:MM)")}>
            <CampoTimerTrigger
              value={timerTriggerAt}
              onChange={setTimerTriggerAt}
              dias={timerTriggerDias}
              onDiasChange={setTimerTriggerDias}
              accent={accent}
            />
          </Field>

          {/* Visibilidad por sensor */}
          <Field label={tf("VISIBLE SOLO SI SENSOR (opcional)")}>
            <CampoSensorCondicion
              sensors={sensorList}
              sensorId={visibleIfSensorId}
              onSensorIdChange={setVisibleIfSensorId}
              op={visibleIfSensorOp}
              onOpChange={setVisibleIfSensorOp}
              val={visibleIfSensorVal}
              onValChange={setVisibleIfSensorVal}
              accent={accent}
              modo="visibilidad"
            />
          </Field>

          {/* Disparo cuando sensor */}
          <Field label={tf("DISPARAR CUANDO SENSOR (opcional)")}>
            <CampoSensorCondicion
              sensors={sensorList}
              sensorId={sensorTriggerId}
              onSensorIdChange={setSensorTriggerId}
              op={sensorTriggerOp}
              onOpChange={setSensorTriggerOp}
              val={sensorTriggerVal}
              onValChange={setSensorTriggerVal}
              cooldown={sensorTriggerCooldown}
              onCooldownChange={setSensorTriggerCooldown}
              accent={accent}
              modo="disparador"
            />
          </Field>
        </div>
      )}
    </div>
  );
}
