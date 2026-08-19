import React from 'react';
import { useTheme } from '../../../utils/theme';
import { useFieldText } from '../../../utils/i18n';
import { Field, BranchActionRow, estiloEntrada } from '../comunes';
import type { PropsFormulario } from './base';

/** Variables, HTTP y control de flujo. */

export function FormSetVar(p: PropsFormulario) {
  const VD = useTheme();
  const tf = useFieldText();
  const inputStyle = estiloEntrada(VD);
  const { action, setAction } = p;
  return (
    <>
          <>
            <Field label={tf("NOMBRE DE VARIABLE")}>
              <input
                value={action.varName ?? ''}
                onChange={(e) => setAction((a) => ({ ...a, varName: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') }))}
                placeholder={tf("contador, lastApp, etc.")}
                style={inputStyle}
              />
            </Field>
            <Field label={tf("VALOR (acepta {otraVariable})")}>
              <input
                value={action.varValue ?? ''}
                onChange={(e) => setAction((a) => ({ ...a, varValue: e.target.value }))}
                placeholder={"0, true, {lastApp}"}
                style={inputStyle}
              />
            </Field>
          </>
    </>
  );
}

export function FormIncrVar(p: PropsFormulario) {
  const VD = useTheme();
  const tf = useFieldText();
  const inputStyle = estiloEntrada(VD);
  const { action, setAction } = p;
  return (
    <>
          <>
            <Field label={tf("NOMBRE DE VARIABLE")}>
              <input
                value={action.varName ?? ''}
                onChange={(e) => setAction((a) => ({ ...a, varName: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') }))}
                placeholder={tf("contador")}
                style={inputStyle}
              />
            </Field>
            <Field label={tf("DELTA (entero — usa negativo para restar)")}>
              <input
                type="number"
                value={action.varDelta ?? 1}
                onChange={(e) => setAction((a) => ({ ...a, varDelta: parseInt(e.target.value) || 0 }))}
                style={inputStyle}
              />
            </Field>
          </>
    </>
  );
}

export function FormWebhook(p: PropsFormulario) {
  const VD = useTheme();
  const tf = useFieldText();
  const inputStyle = estiloEntrada(VD);
  const { action, setAction } = p;
  return (
    <>
          <>
            <Field label={tf("URL")}>
              <input
                value={action.webhookUrl ?? ''}
                onChange={(e) => setAction((a) => ({ ...a, webhookUrl: e.target.value }))}
                placeholder={"https://..."}
                style={inputStyle}
              />
            </Field>
            <Field label={tf("MÉTODO")}>
              <select
                value={action.webhookMethod ?? 'POST'}
                onChange={(e) => setAction((a) => ({ ...a, webhookMethod: e.target.value as 'GET' | 'POST' | 'PUT' | 'DELETE' }))}
                style={inputStyle}
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
            </Field>
            <Field label={tf("HEADERS (JSON, opcional)")}>
              <textarea
                value={action.webhookHeaders ?? ''}
                onChange={(e) => setAction((a) => ({ ...a, webhookHeaders: e.target.value }))}
                placeholder='{"Authorization": "Bearer ..."}'
                rows={2}
                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
              />
            </Field>
            <Field label={tf("BODY (acepta {variables})")}>
              <textarea
                value={action.webhookBody ?? ''}
                onChange={(e) => setAction((a) => ({ ...a, webhookBody: e.target.value }))}
                placeholder='{"event": "press", "count": "{counter}"}'
                rows={3}
                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
              />
            </Field>
          </>
    </>
  );
}

export function FormBranch(p: PropsFormulario) {
  const VD = useTheme();
  const tf = useFieldText();
  const inputStyle = estiloEntrada(VD);
  const { accent, action, setAction } = p;
  return (
    <>
          <>
            <Field label={tf("CONDICIÓN: SI {variable}")}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  value={action.branchVar ?? ''}
                  onChange={(e) => setAction((a) => ({ ...a, branchVar: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') }))}
                  placeholder={tf("nombre_variable")}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <select
                  value={action.branchOp ?? '=='}
                  onChange={(e) => setAction((a) => ({ ...a, branchOp: e.target.value as any }))}
                  style={{ ...inputStyle, width: 120 }}
                >
                  <option value="==">== igual a</option>
                  <option value="!=">!= distinto de</option>
                  <option value=">">{'>'} mayor que</option>
                  <option value="<">{'<'} menor que</option>
                  <option value=">=">{'>='} {tf('mayor o igual')}</option>
                  <option value="<=">{'<='} {tf('menor o igual')}</option>
                  <option value="contains">{tf('contiene')}</option>
                  <option value="empty">{tf('está vacío')}</option>
                  <option value="not-empty">{tf('no está vacío')}</option>
                </select>
                {!['empty','not-empty'].includes(action.branchOp ?? '==') && (
                  <input
                    value={action.branchValue ?? ''}
                    onChange={(e) => setAction((a) => ({ ...a, branchValue: e.target.value }))}
                    placeholder={tf("valor o {variable}")}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                )}
              </div>
            </Field>
            <Field label={tf("ENTONCES (acción si VERDADERO)")}>
              <BranchActionRow
                action={action.branchThen?.[0] ?? { type: 'none' }}
                onChange={(a) => setAction((prev) => ({ ...prev, branchThen: a.type !== 'none' ? [a] : [] }))}
                accent={accent}
              />
            </Field>
            <Field label={tf("SI NO (acción si FALSO — opcional)")}>
              <BranchActionRow
                action={action.branchElse?.[0] ?? { type: 'none' }}
                onChange={(a) => setAction((prev) => ({ ...prev, branchElse: a.type !== 'none' ? [a] : [] }))}
                accent={accent}
              />
            </Field>
          </>
    </>
  );
}

export function FormCountdown(p: PropsFormulario) {
  const VD = useTheme();
  const tf = useFieldText();
  const inputStyle = estiloEntrada(VD);
  const { action, setAction } = p;
  return (
    <>
          <>
            <Field label={tf("TIEMPO DE ESPERA (milisegundos)")}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input
                  type="number"
                  min={100} max={60000} step={100}
                  value={action.timerDelay ?? 1000}
                  onChange={(e) => setAction((a) => ({ ...a, timerDelay: Math.max(100, parseInt(e.target.value) || 1000) }))}
                  style={inputStyle}
                />
                <span style={{ fontFamily: VD.mono, fontSize: 10, color: VD.textDim, flexShrink: 0 }}>
                  = {((action.timerDelay ?? 1000) / 1000).toFixed(1)}s
                </span>
              </div>
              <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, marginTop: 4 }}>
                {tf('Pausa la secuencia este tiempo antes de continuar con la siguiente acción.')}
              </div>
            </Field>
          </>
    </>
  );
}
