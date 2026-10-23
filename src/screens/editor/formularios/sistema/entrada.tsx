import React from 'react';
import { useTheme } from '../../../../utils/theme';
import { useT, useFieldText } from '../../../../utils/i18n';
import { Field, Btn, estiloEntrada } from '../../campos/comunes';
import { DotGlyphIcon } from '../../../../components/dot480/DotGlyphIcon';
import type { PropsFormulario } from '../base';

/** Lo que se le mete al sistema: teclas, portapapeles, texto y procesos. */

export function FormHotkey(p: PropsFormulario) {
  const VD = useTheme();
  const tf = useFieldText();
  const inputStyle = estiloEntrada(VD);
  const { accent, action, setAction, capturing, setCapturing } = p;
  return (
    <>
          <Field label={tf("COMBINACIÓN DE TECLAS")}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={action.hotkey || ''}
                onChange={(e) => setAction((a) => ({ ...a, hotkey: e.target.value }))}
                placeholder={"Ctrl+Shift+F9"}
                readOnly={capturing}
                style={{ ...inputStyle, flex: 1, outline: capturing ? `2px solid ${accent}` : undefined }}
              />
              <Btn onClick={() => setCapturing(c => !c)} style={{ background: capturing ? VD.accentBg : undefined, borderColor: capturing ? accent : undefined, color: capturing ? accent : undefined, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {capturing && <DotGlyphIcon glyph="DOTS" size={6} color={accent} />}
                <span>{capturing ? 'ESPERANDO...' : 'CAPTURAR'}</span>
              </Btn>
            </div>
            {capturing && (
              <div style={{ fontFamily: VD.mono, fontSize: 9, color: accent, marginTop: 6 }}>
                {tf('Pulse la combinación deseada...')}
              </div>
            )}
            <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, marginTop: 6 }}>
              {tf('Ej: Ctrl+Alt+T · Ctrl+Shift+F9 · Ctrl+Z · V · Space')}
            </div>
          </Field>
    </>
  );
}

export function FormClipboard(p: PropsFormulario) {
  const VD = useTheme();
  const tf = useFieldText();
  const inputStyle = estiloEntrada(VD);
  const { action, setAction } = p;
  return (
    <>
          <Field label={tf("TEXTO A COPIAR AL PORTAPAPELES")}>
            <textarea
              value={action.clipboardText || ''}
              onChange={(e) => setAction((a) => ({ ...a, clipboardText: e.target.value }))}
              placeholder={tf("Texto, URL, código, etc.")}
              rows={4}
              style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }}
            />
          </Field>
    </>
  );
}

export function FormTypeText(p: PropsFormulario) {
  const VD = useTheme();
  const tf = useFieldText();
  const inputStyle = estiloEntrada(VD);
  const { action, setAction } = p;
  return (
    <>
          <>
            <Field label={tf("TEXTO A ESCRIBIR AUTOMÁTICAMENTE")}>
              <textarea
                value={action.typeText || ''}
                onChange={(e) => setAction((a) => ({ ...a, typeText: e.target.value }))}
                placeholder={tf("Texto que se escribirá con SendKeys...")}
                rows={4}
                style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }}
              />
            </Field>
            <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted }}>
              {tf('El texto se escribe en la ventana activa. Los caracteres especiales (+, ^, %, (, )) se escapan automáticamente.')}
            </div>
          </>
    </>
  );
}

export function FormKillProcess(p: PropsFormulario) {
  const VD = useTheme();
  const t = useT();
  const tf = useFieldText();
  const inputStyle = estiloEntrada(VD);
  const { action, setAction } = p;
  return (
    <>
          <>
            <Field label={tf("NOMBRE DEL PROCESO")}>
              <input
                value={action.processName || ''}
                onChange={(e) => setAction((a) => ({ ...a, processName: e.target.value }))}
                placeholder={"spotify.exe · chrome.exe · notepad.exe"}
                style={inputStyle}
              />
            </Field>
            <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted }}>
              {t('ed.killHint')}
            </div>
          </>
    </>
  );
}
