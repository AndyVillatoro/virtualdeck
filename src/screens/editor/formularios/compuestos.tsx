import React from 'react';
import { useTheme } from '../../../utils/theme';
import { useFieldText } from '../../../utils/i18n';
import { DotLabel } from '../../../components/DotLabel';
import { FOLDER_PRESETS } from '../actionData';
import { MacroEditor } from '../MacroEditor';
import { Field, FolderButtonSlot, estiloEntrada } from '../comunes';
import { paginasNavegables } from '../../../utils/acciones/pageNav';
import type { ButtonAction } from '../../../types';
import type { PropsFormulario } from './base';

/** Los que contienen otras cosas: carpeta de botones y macro. */

export function FormFolder(p: PropsFormulario) {
  const VD = useTheme();
  const tf = useFieldText();
  const { accent, applyFolderPreset, folderButtons, setFolderButtons } = p;
  return (
    <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <DotLabel size={9} color={VD.textMuted} spacing={2}>{tf('CARGAR PRESET ADOBE')}</DotLabel>
              {Object.entries(FOLDER_PRESETS).map(([key, fp]) => (
                <button
                  key={key}
                  onClick={() => applyFolderPreset(key)}
                  style={{
                    padding: '5px 12px',
                    background: VD.elevated, border: `1px solid ${VD.border}`,
                    fontFamily: VD.mono, fontSize: 9, color: fp.fgColor, cursor: 'pointer', borderRadius: VD.radius.sm,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = fp.fgColor)}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = VD.border)}
                >
                  {fp.icon} {fp.label}
                </button>
              ))}
            </div>
            <DotLabel size={9} color={VD.textMuted} spacing={2} style={{ display: 'block' }}>
              {tf('BOTONES DE LA CARPETA')} ({folderButtons.length}/12)
            </DotLabel>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {Array.from({ length: 12 }, (_, i) => {
                const fb = folderButtons[i];
                return (
                  <FolderButtonSlot
                    key={i}
                    button={fb}
                    accent={accent}
                    onChange={(updated) => {
                      const next = [...folderButtons];
                      if (updated) {
                        next[i] = updated;
                      } else {
                        next.splice(i, 1);
                      }
                      setFolderButtons(next.filter(Boolean));
                    }}
                  />
                );
              })}
            </div>
          </div>
    </>
  );
}

export function FormMacro(p: PropsFormulario) {
  const tf = useFieldText();
  const { accent, action, setAction } = p;
  return (
    <>
          <Field label={tf("PASOS DE LA MACRO")}>
            <MacroEditor
              steps={action.macroSteps ?? []}
              repeat={action.macroRepeat ?? 1}
              accent={accent}
              onChange={(steps, repeat) => setAction((a) => ({ ...a, macroSteps: steps, macroRepeat: repeat }))}
            />
          </Field>
    </>
  );
}

/**
 * A dónde va un botón `page-nav`.
 *
 * La lista se filtra al mismo contexto que usa la ejecución: si el botón que
 * se edita está en la página de un dock, solo las páginas de ese dock; si no,
 * las del deck. Va por id, nunca por índice (ver `pageNav.ts`).
 */
export function FormPageNav(p: PropsFormulario) {
  const VD = useTheme();
  const tf = useFieldText();
  const inputStyle = estiloEntrada(VD);
  const { action, setAction, pages = [], indicePaginaBoton } = p;
  const modo = action.pageNav ?? 'next';
  const serial = indicePaginaBoton !== undefined
    ? pages[indicePaginaBoton]?.superficie?.serial ?? null
    : null;
  const candidatas = paginasNavegables(pages, serial);
  const fijarModo = (pageNav: ButtonAction['pageNav']) => setAction((a) => ({ ...a, pageNav }));
  return (
    <>
          <Field label={tf("MODO DE NAVEGACIÓN")}>
            <select
              value={modo}
              onChange={(e) => fijarModo(e.target.value as ButtonAction['pageNav'])}
              style={inputStyle}
            >
              <option value="next">{tf('SIGUIENTE')}</option>
              <option value="prev">{tf('ANTERIOR')}</option>
              <option value="first">{tf('PRIMERA')}</option>
              <option value="cycle">{tf('CAMBIAR PÁGINA')}</option>
              <option value="goto">{tf('IR A UNA PÁGINA')}</option>
            </select>
            <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, marginTop: 4, lineHeight: 1.4 }}>
              {tf('Anterior y siguiente se paran en los extremos; cambiar página da la vuelta. En un dock mueve entre sus páginas; en el deck, entre las del deck.')}
            </div>
          </Field>
          {modo === 'goto' && (
            <Field label={tf("PÁGINA DESTINO")}>
              <select
                value={action.pageNavTarget ?? ''}
                onChange={(e) => setAction((a) => ({ ...a, pageNavTarget: e.target.value || undefined }))}
                style={inputStyle}
              >
                <option value="">{tf('— elegir —')}</option>
                {candidatas.map((pg) => (
                  <option key={pg.id} value={pg.id}>{pg.name}</option>
                ))}
              </select>
            </Field>
          )}
    </>
  );
}
