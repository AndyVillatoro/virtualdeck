import React from 'react';
import { useTheme } from '../../../../utils/theme';
import { useFieldText } from '../../../../utils/i18n';
import { Field, estiloEntrada } from '../../campos/comunes';
import type { PropsFormulario } from '../base';

/** Los avisos que la acción lanza: notificación y voz. */

export function FormNotify(p: PropsFormulario) {
  const VD = useTheme();
  const tf = useFieldText();
  const inputStyle = estiloEntrada(VD);
  const { action, setAction } = p;
  return (
    <>
          <>
            <Field label={tf("TÍTULO")}>
              <input
                value={action.notifyTitle ?? ''}
                onChange={(e) => setAction((a) => ({ ...a, notifyTitle: e.target.value }))}
                placeholder={"VirtualDeck"}
                style={inputStyle}
              />
            </Field>
            <Field label={tf("MENSAJE")}>
              <textarea
                value={action.notifyBody ?? ''}
                onChange={(e) => setAction((a) => ({ ...a, notifyBody: e.target.value }))}
                placeholder={tf("Texto de la notificación...")}
                rows={3}
                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
              />
            </Field>
          </>
    </>
  );
}

export function FormTts(p: PropsFormulario) {
  const VD = useTheme();
  const tf = useFieldText();
  const inputStyle = estiloEntrada(VD);
  const { action, setAction } = p;
  return (
    <>
          <Field label={tf("TEXTO A LEER (acepta {variables})")}>
            <textarea
              value={action.ttsText ?? ''}
              onChange={(e) => setAction((a) => ({ ...a, ttsText: e.target.value }))}
              placeholder={tf("Hola, son las {hora}")}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
            />
          </Field>
    </>
  );
}
