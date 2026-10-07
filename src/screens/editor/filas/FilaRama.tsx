import React from 'react';
import type { VDTokens } from '../../../design';
import { useTheme } from '../../../utils/theme';
import { estiloCampo, estiloDesplegable } from '../../../components/ui/estilos';
import { useT, useFieldText } from '../../../utils/i18n';
import { ACTION_TYPES } from '../actionData';
import type { ActionType, ButtonAction } from '../../../types';
import { RGB_PRESET_IDS, clavePreset } from '../../../data/rgbPresets';

export interface PropsFilaRama {
  action: ButtonAction;
  onChange: (a: ButtonAction) => void;
  accent: string;
}

interface PropsDetalleRama {
  action: ButtonAction;
  onChange: (a: ButtonAction) => void;
  accent: string;
}

function estiloEntrada(VD: VDTokens): React.CSSProperties {
  return estiloCampo(VD);
}

function estiloSelector(VD: VDTokens): React.CSSProperties {
  return estiloDesplegable(VD);
}

export function BranchActionRow({ action, onChange, accent }: PropsFilaRama) {
  const VD = useTheme();
  const selectStyle = estiloSelector(VD);
  const tr = useT();
  const simpleTypes: ActionType[] = ['none', 'set-var', 'incr-var', 'hotkey', 'script', 'notify', 'webhook', 'clipboard', 'type-text', 'volume-set', 'brightness', 'rgb-preset', 'window-snap'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <select value={action.type} onChange={(e) => onChange({ type: e.target.value as ActionType })} style={{ ...selectStyle }}>
        {simpleTypes.map(ty => (
          <option key={ty} value={ty}>{tr(ACTION_TYPES.find(at => at.type === ty)?.label ?? '') || ty}</option>
        ))}
      </select>
      <DetalleRama action={action} onChange={onChange} accent={accent} />
    </div>
  );
}

const DETALLE_RAMA: Record<string, React.ComponentType<PropsDetalleRama>> = {
  'set-var': DetalleFijarVariable,
  'incr-var': DetalleIncrementarVariable,
  hotkey: DetalleHotkey,
  script: DetalleScript,
  notify: DetalleAviso,
  webhook: DetalleWebhook,
  clipboard: DetallePortapapeles,
  'type-text': DetalleEscribirTexto,
  'volume-set': DetalleVolumen,
  brightness: DetalleBrillo,
  'rgb-preset': DetallePresetRgb,
  'window-snap': DetalleEncajarVentana,
};

function DetalleRama({ action, onChange, accent }: PropsDetalleRama) {
  const C = DETALLE_RAMA[action.type];
  if (!C) return null;
  return <C action={action} onChange={onChange} accent={accent} />;
}

function DetalleFijarVariable({ action, onChange }: PropsDetalleRama) {
  const VD = useTheme();
  const inputStyle = estiloEntrada(VD);
  const tf = useFieldText();
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <input value={action.varName ?? ''} onChange={e => onChange({ ...action, varName: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') })}
        placeholder={tf("variable")} style={{ ...inputStyle, flex: 1 }} />
      <input value={action.varValue ?? ''} onChange={e => onChange({ ...action, varValue: e.target.value })}
        placeholder={tf("valor")} style={{ ...inputStyle, flex: 1 }} />
    </div>
  );
}

function DetalleIncrementarVariable({ action, onChange }: PropsDetalleRama) {
  const VD = useTheme();
  const inputStyle = estiloEntrada(VD);
  const tf = useFieldText();
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <input value={action.varName ?? ''} onChange={e => onChange({ ...action, varName: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') })}
        placeholder={tf("variable")} style={{ ...inputStyle, flex: 1 }} />
      <input type="number" value={action.varDelta ?? 1} onChange={e => onChange({ ...action, varDelta: parseInt(e.target.value) || 0 })}
        style={{ ...inputStyle, width: 80 }} />
    </div>
  );
}

function DetalleHotkey({ action, onChange }: PropsDetalleRama) {
  const VD = useTheme();
  const inputStyle = estiloEntrada(VD);
  return (
    <input value={action.hotkey || ''} onChange={e => onChange({ ...action, hotkey: e.target.value })}
      placeholder={"Ctrl+Shift+F9"} style={{ ...inputStyle, fontSize: 11 }} />
  );
}

function DetalleScript({ action, onChange }: PropsDetalleRama) {
  const VD = useTheme();
  const inputStyle = estiloEntrada(VD);
  const tf = useFieldText();
  return (
    <textarea value={action.script || ''} onChange={e => onChange({ ...action, script: e.target.value })}
      placeholder={tf("Script...")} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
  );
}

function DetalleAviso({ action, onChange }: PropsDetalleRama) {
  const VD = useTheme();
  const inputStyle = estiloEntrada(VD);
  const tf = useFieldText();
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <input value={action.notifyTitle ?? ''} onChange={e => onChange({ ...action, notifyTitle: e.target.value })}
        placeholder={tf("Título")} style={{ ...inputStyle, flex: 1 }} />
      <input value={action.notifyBody ?? ''} onChange={e => onChange({ ...action, notifyBody: e.target.value })}
        placeholder={tf("Mensaje")} style={{ ...inputStyle, flex: 2 }} />
    </div>
  );
}

function DetalleWebhook({ action, onChange }: PropsDetalleRama) {
  const VD = useTheme();
  const inputStyle = estiloEntrada(VD);
  return (
    <input value={action.webhookUrl ?? ''} onChange={e => onChange({ ...action, webhookUrl: e.target.value, webhookMethod: action.webhookMethod ?? 'POST' })}
      placeholder={"https://..."} style={inputStyle} />
  );
}

function DetallePortapapeles({ action, onChange }: PropsDetalleRama) {
  const VD = useTheme();
  const inputStyle = estiloEntrada(VD);
  const tf = useFieldText();
  return (
    <input value={action.clipboardText || ''} onChange={e => onChange({ ...action, clipboardText: e.target.value })}
      placeholder={tf("Texto al portapapeles")} style={inputStyle} />
  );
}

function DetalleEscribirTexto({ action, onChange }: PropsDetalleRama) {
  const VD = useTheme();
  const inputStyle = estiloEntrada(VD);
  const tf = useFieldText();
  return (
    <input value={action.typeText || ''} onChange={e => onChange({ ...action, typeText: e.target.value })}
      placeholder={tf("Texto a escribir")} style={inputStyle} />
  );
}

function DetalleVolumen({ action, onChange, accent }: PropsDetalleRama) {
  const VD = useTheme();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <input type="range" min={0} max={100} step={5} value={action.volumePercent ?? 50}
        onChange={e => onChange({ ...action, volumePercent: parseInt(e.target.value) })} style={{ flex: 1, accentColor: accent }} />
      <span style={{ fontFamily: VD.mono, fontSize: 11, color: VD.text, minWidth: 36 }}>{action.volumePercent ?? 50}%</span>
    </div>
  );
}

function DetalleBrillo({ action, onChange, accent }: PropsDetalleRama) {
  const VD = useTheme();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <input type="range" min={0} max={100} step={5} value={action.brightnessLevel ?? 70}
        onChange={e => onChange({ ...action, brightnessLevel: parseInt(e.target.value) })} style={{ flex: 1, accentColor: accent }} />
      <span style={{ fontFamily: VD.mono, fontSize: 11, color: VD.text, minWidth: 36 }}>{action.brightnessLevel ?? 70}%</span>
    </div>
  );
}

function DetallePresetRgb({ action, onChange }: PropsDetalleRama) {
  const VD = useTheme();
  const selectStyle = estiloSelector(VD);
  const tr = useT();
  return (
    <select value={action.rgbPresetId ?? ''} onChange={e => onChange({ ...action, rgbPresetId: e.target.value })} style={{ ...selectStyle }}>
      {RGB_PRESET_IDS.map(p => (
        <option key={p} value={p}>{tr(clavePreset(p))}</option>
      ))}
    </select>
  );
}

function DetalleEncajarVentana({ action, onChange }: PropsDetalleRama) {
  const VD = useTheme();
  const selectStyle = estiloSelector(VD);
  return (
    <select value={action.snapPosition ?? 'left-half'} onChange={e => onChange({ ...action, snapPosition: e.target.value as any })} style={{ ...selectStyle }}>
      {['left-half','right-half','top-half','bottom-half','top-left','top-right','bottom-left','bottom-right','maximize','center','restore'].map(p => (
        <option key={p} value={p}>{p}</option>
      ))}
    </select>
  );
}
