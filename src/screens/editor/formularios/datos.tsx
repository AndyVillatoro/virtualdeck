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
            <Field label={tf("DELTA (número entero — use negativo para restar)")}>
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

/**
 * Mandar sobre otro VirtualDeck.
 *
 * El token es **el del otro equipo** — sale de sus ajustes, no de los de aquí —,
 * y esa confusión es lo único que hace fallar esto en la practica, asi que lo
 * dice la etiqueta y no solo la documentacion.
 */
export function FormRemote(p: PropsFormulario) {
  const VD = useTheme();
  const tf = useFieldText();
  const inputStyle = estiloEntrada(VD);
  const { action, setAction } = p;
  return (
    <>
      <Field label={tf("EQUIPO (IP O NOMBRE, CON PUERTO SI NO ES 8787)")}>
        <input
          value={action.remoteHost ?? ''}
          onChange={(e) => setAction((a) => ({ ...a, remoteHost: e.target.value }))}
          placeholder="192.168.1.50"
          style={inputStyle}
        />
      </Field>
      <Field label={tf("TOKEN DEL OTRO EQUIPO (SUS AJUSTES → SERVIDOR LOCAL)")}>
        <input
          value={action.remoteToken ?? ''}
          onChange={(e) => setAction((a) => ({ ...a, remoteToken: e.target.value }))}
          placeholder={tf("Pegue aqui el token que muestra el otro VirtualDeck")}
          style={inputStyle}
        />
      </Field>
      <Field label={tf("BOTON ALLI (ID O ETIQUETA, ACEPTA {variables})")}>
        <input
          value={action.remoteButton ?? ''}
          onChange={(e) => setAction((a) => ({ ...a, remoteButton: e.target.value, remotePage: undefined }))}
          placeholder="Spotify"
          style={inputStyle}
        />
      </Field>
      <Field label={tf("O IR A LA PAGINA N (VACIO = PULSAR EL BOTON DE ARRIBA)")}>
        <input
          type="number"
          min={1}
          value={action.remotePage ?? ''}
          onChange={(e) => setAction((a) => ({
            ...a,
            remotePage: e.target.value === '' ? undefined : Math.max(1, parseInt(e.target.value, 10) || 1),
          }))}
          style={inputStyle}
        />
      </Field>
      <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, lineHeight: 1.6 }}>
        {tf("El otro equipo tiene que tener el servidor local encendido y permitir la red local. Va por HTTP sin cifrar: quien este en esa red y vea el trafico, ve el token.")}
      </div>
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

/** «1,5 s» hasta el minuto; «25 min» a partir de ahi. Un pomodoro en ms no se lee. */
function legibleMs(ms: number): string {
  if (ms < 60000) return `= ${(ms / 1000).toFixed(1)}s`;
  const min = Math.floor(ms / 60000);
  const seg = Math.round((ms % 60000) / 1000);
  return seg === 0 ? `= ${min} min` : `= ${min} min ${seg}s`;
}

export function FormCountdown(p: PropsFormulario) {
  const VD = useTheme();
  const tf = useFieldText();
  const inputStyle = estiloEntrada(VD);
  const { accent, action, setAction } = p;
  return (
    <>
          <>
            <Field label={tf("TIEMPO DE ESPERA (milisegundos)")}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input
                  type="number"
                  min={100} max={3600000} step={100}
                  value={action.timerDelay ?? 1000}
                  onChange={(e) => setAction((a) => ({ ...a, timerDelay: Math.min(3600000, Math.max(100, parseInt(e.target.value) || 1000)) }))}
                  style={inputStyle}
                />
                <span style={{ fontFamily: VD.mono, fontSize: 10, color: VD.textDim, flexShrink: 0 }}>
                  {legibleMs(action.timerDelay ?? 1000)}
                </span>
              </div>
              <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, marginTop: 4 }}>
                {tf('Espera este tiempo y después ejecuta la acción de abajo. El botón queda libre mientras tanto.')}
              </div>
            </Field>
            <Field label={tf("AL TERMINAR (qué hace cuando se cumple el tiempo)")}>
              {/*
                Esto **no existia**. El formulario solo ofrecia el retardo, y
                `timerActions` —lo unico que el temporizador ejecuta al acabar—
                no se podia rellenar desde ninguna pantalla. Un temporizador
                hecho aqui esperaba y no hacia nada, diciendo que habia ido
                bien. `scripts/check-campos.mjs` cruza ahora los campos que lee
                el ejecutor con los que alguna pantalla escribe.
              */}
              <BranchActionRow
                action={action.timerActions?.[0] ?? { type: 'none' }}
                onChange={(a) => setAction((prev) => ({ ...prev, timerActions: a.type !== 'none' ? [a] : [] }))}
                accent={accent}
              />
            </Field>
          </>
    </>
  );
}
