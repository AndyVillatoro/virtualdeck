import React from 'react';
import { useTheme } from '../../../utils/theme';
import { useFieldText, useT } from '../../../utils/i18n';
import { Field, Btn, estiloEntrada } from '../comunes';
import type { PropsFormulario } from './base';

/** Lo que abre algo: nada, programa, enlace, acceso directo, script. */

export function FormNone() {
  const VD = useTheme();
  const tf = useFieldText();
  return (
    <>
          <div style={{ color: VD.textMuted, fontFamily: VD.mono, fontSize: 11 }}>
            {tf('Sin acción configurada.')}
          </div>
    </>
  );
}

export function FormApp(p: PropsFormulario) {
  const VD = useTheme();
  const tf = useFieldText();
  const inputStyle = estiloEntrada(VD);
  const { action, setAction, pickFile } = p;
  return (
    <>
          <>
            <Field label={tf("RUTA DE LA APLICACIÓN")}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={action.appPath || ''} onChange={(e) => setAction((a) => ({ ...a, appPath: e.target.value }))} placeholder={"C:\\Program Files\\App\\app.exe"} style={inputStyle} />
                <Btn onClick={pickFile}>{tf('Buscar')}</Btn>
              </div>
            </Field>
            <Field label={tf("ARGUMENTOS (OPCIONAL)")}>
              <input value={action.appArgs || ''} onChange={(e) => setAction((a) => ({ ...a, appArgs: e.target.value }))} placeholder={tf("--flag valor")} style={inputStyle} />
            </Field>
          </>
    </>
  );
}

const WEB_SHORTCUTS = [
  { label: 'Gemini', url: 'https://gemini.google.com' },
  { label: 'ChatGPT', url: 'https://chatgpt.com' },
  { label: 'Claude', url: 'https://claude.ai' },
  { label: 'GitHub', url: 'https://github.com' },
  { label: 'YouTube', url: 'https://youtube.com' },
  { label: 'Twitch', url: 'https://twitch.tv' },
  { label: 'Discord', url: 'https://discord.com/app' },
  { label: 'WhatsApp', url: 'https://web.whatsapp.com' },
  { label: 'Notion', url: 'https://notion.so' },
  { label: 'Reddit', url: 'https://reddit.com' },
  { label: 'Spotify', url: 'https://open.spotify.com' },
] as const;

export function FormWeb(p: PropsFormulario) {
  const VD = useTheme();
  const tf = useFieldText();
  const inputStyle = estiloEntrada(VD);
  const { action, setAction } = p;
  return (
    <>
      <Field label={tf("URL")}>
        <input value={action.url || ''} onChange={(e) => setAction((a) => ({ ...a, url: e.target.value }))} placeholder={tf("https://ejemplo.com")} style={inputStyle} />
      </Field>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
        {WEB_SHORTCUTS.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => setAction((a) => ({ ...a, url: s.url }))}
            style={{
              padding: '3px 6px',
              fontFamily: VD.mono,
              fontSize: 8,
              letterSpacing: 0.5,
              background: action.url === s.url ? VD.accentBg : VD.elevated,
              border: `1px solid ${action.url === s.url ? VD.accent : VD.border}`,
              color: action.url === s.url ? VD.accent : VD.textMuted,
              borderRadius: VD.radius.sm,
              cursor: 'pointer',
            }}
          >
            {s.label}
          </button>
        ))}
      </div>
    </>
  );
}

export function FormShortcut(p: PropsFormulario) {
  const VD = useTheme();
  const tf = useFieldText();
  const inputStyle = estiloEntrada(VD);
  const { action, setAction, pickShortcut } = p;
  return (
    <>
          <Field label={tf("RUTA DEL ARCHIVO O CARPETA")}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={action.shortcutPath || ''} onChange={(e) => setAction((a) => ({ ...a, shortcutPath: e.target.value }))} placeholder={tf("C:\\Users\\...\\archivo.lnk")} style={inputStyle} />
              <Btn onClick={pickShortcut}>{tf('Buscar')}</Btn>
            </div>
          </Field>
    </>
  );
}

export function FormScript(p: PropsFormulario) {
  const VD = useTheme();
  const tf = useFieldText();
  const t = useT();
  const inputStyle = estiloEntrada(VD);
  const { accent, action, setAction } = p;
  return (
    <>
          <>
            <Field label={tf("INTÉRPRETE")}>
              <select value={action.scriptShell || 'powershell'} onChange={(e) => setAction((a) => ({ ...a, scriptShell: e.target.value as any }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="powershell">PowerShell</option>
                <option value="cmd">{tf('CMD (Símbolo del sistema)')}</option>
              </select>
            </Field>
            <Field label={tf("SCRIPT")}>
              <textarea value={action.script || ''} onChange={(e) => setAction((a) => ({ ...a, script: e.target.value }))} placeholder={"Get-Process | Sort CPU -Descending"} rows={5} style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }} />
            </Field>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={action.showOutput ?? false}
                onChange={(e) => setAction(a => ({ ...a, showOutput: e.target.checked }))}
                style={{ accentColor: accent }}
              />
              <span style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textDim }}>{tf('MOSTRAR SALIDA DEL SCRIPT EN PANTALLA')}</span>
            </label>
            <Field label={tf("GUARDAR SALIDA EN VARIABLE (opcional)")}>
              <input
                value={action.captureToVar ?? ''}
                onChange={(e) => setAction(a => ({ ...a, captureToVar: e.target.value || undefined }))}
                placeholder={tf("ej: resultado_cpu")}
                style={inputStyle}
              />
              <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, marginTop: 4 }}>
                {t('editor.stdoutToVar', { ejemplo: '{resultado_cpu}' })}
              </div>
            </Field>
          </>
    </>
  );
}
