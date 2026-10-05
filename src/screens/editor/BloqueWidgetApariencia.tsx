import React from 'react';
import { useTheme } from '../../utils/theme';
import { useT, useFieldText } from '../../utils/i18n';
import { Field, SensorPicker, estiloEntrada } from './comunes';
import { CamposDivisa } from './CamposDivisa';
import { CamposSlider } from './CamposSlider';
import type { ButtonConfig, Sensor, TipoWidget, SliderWidgetConfig } from '../../types';

export interface BloqueWidgetProps {
  widget: TipoWidget | undefined;
  setWidget: React.Dispatch<React.SetStateAction<TipoWidget | undefined>>;
  actionType: string;
  accent: string;
  currencyWidget: ButtonConfig['currencyWidget'];
  setCurrencyWidget: React.Dispatch<React.SetStateAction<ButtonConfig['currencyWidget']>>;
  sliderWidget: SliderWidgetConfig | undefined;
  setSliderWidget: React.Dispatch<React.SetStateAction<SliderWidgetConfig | undefined>>;
  deckState: Record<string, string>;
  sensorList: Sensor[];
  sensorWidgetId: string;
  setSensorWidgetId: React.Dispatch<React.SetStateAction<string>>;
  sensorWidgetSuffix: string;
  setSensorWidgetSuffix: React.Dispatch<React.SetStateAction<string>>;
  sensorWidgetWarn: string;
  setSensorWidgetWarn: React.Dispatch<React.SetStateAction<string>>;
  sensorWidgetCrit: string;
  setSensorWidgetCrit: React.Dispatch<React.SetStateAction<string>>;
  varWidgetName: string;
  setVarWidgetName: React.Dispatch<React.SetStateAction<string>>;
  varWidgetPrefix: string;
  setVarWidgetPrefix: React.Dispatch<React.SetStateAction<string>>;
  varWidgetSuffix: string;
  setVarWidgetSuffix: React.Dispatch<React.SetStateAction<string>>;
}

export function BloqueWidgetApariencia({
  widget,
  setWidget,
  actionType,
  accent,
  currencyWidget,
  setCurrencyWidget,
  sliderWidget,
  setSliderWidget,
  deckState,
  sensorList,
  sensorWidgetId,
  setSensorWidgetId,
  sensorWidgetSuffix,
  setSensorWidgetSuffix,
  sensorWidgetWarn,
  setSensorWidgetWarn,
  sensorWidgetCrit,
  setSensorWidgetCrit,
  varWidgetName,
  setVarWidgetName,
  varWidgetPrefix,
  setVarWidgetPrefix,
  varWidgetSuffix,
  setVarWidgetSuffix,
}: BloqueWidgetProps) {
  const VD = useTheme();
  const t = useT();
  const tf = useFieldText();
  const inputStyle = estiloEntrada(VD);

  return (
    <Field label={tf("WIDGET (MUESTRA DATOS EN EL BOTÓN)")}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {([undefined, 'clock', 'weather', 'now-playing', 'sensor', 'variable', 'currency', 'slider'] as const).map((w) => {
          const conflicts = w === 'now-playing' && actionType === 'audio-device';
          const isSel = widget === w;
          return (
            <button
              key={w ?? 'none'}
              type="button"
              onClick={() => { if (!conflicts) setWidget(w); }}
              disabled={conflicts}
              title={conflicts ? tf('Incompatible con acción de Audio: el widget oculta el nombre del dispositivo.') : undefined}
              style={{
                flex: '1 1 60px',
                padding: '5px 0',
                cursor: conflicts ? 'not-allowed' : 'pointer',
                borderRadius: VD.radius.sm,
                background: isSel ? VD.accentBg : VD.elevated,
                border: `1px solid ${isSel ? accent : VD.border}`,
                fontFamily: VD.mono,
                fontSize: 8,
                letterSpacing: 0.5,
                color: isSel ? accent : VD.textDim,
                opacity: conflicts ? 0.4 : 1,
              }}
            >
              {w === undefined ? tf('NINGUNO') : w === 'clock' ? tf('RELOJ') : w === 'weather' ? tf('CLIMA') : w === 'now-playing' ? tf('MÚSICA') : w === 'sensor' ? 'SENSOR' : w === 'currency' ? tf('DIVISA') : w === 'slider' ? tf('SLIDER') : 'VARIABLE'}
            </button>
          );
        })}
      </div>

      {widget === 'currency' && (
        <CamposDivisa accent={accent} valor={currencyWidget} onChange={setCurrencyWidget} />
      )}
      {widget === 'slider' && (
        <CamposSlider accent={accent} valor={sliderWidget} onChange={setSliderWidget} deckState={deckState} />
      )}
      {widget === 'sensor' && (
        <div style={{ marginTop: 8, padding: 10, background: VD.elevated, border: `1px solid ${VD.border}`, borderRadius: VD.radius.md, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SensorPicker sensors={sensorList} value={sensorWidgetId} onChange={setSensorWidgetId} accent={accent} />
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
            style={inputStyle}
          />
          <datalist id="vd-known-vars">
            {Object.keys(deckState).map((k) => <option key={k} value={k} />)}
          </datalist>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={varWidgetPrefix}
              onChange={(e) => setVarWidgetPrefix(e.target.value)}
              placeholder={tf("Prefijo (ej. REC: )")}
              style={{ ...inputStyle, flex: 1 }}
            />
            <input
              value={varWidgetSuffix}
              onChange={(e) => setVarWidgetSuffix(e.target.value)}
              placeholder={tf("Etiqueta debajo")}
              style={{ ...inputStyle, flex: 1 }}
            />
          </div>
        </div>
      )}
    </Field>
  );
}
