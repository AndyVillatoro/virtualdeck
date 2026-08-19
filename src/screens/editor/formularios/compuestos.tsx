import React from 'react';
import { useTheme } from '../../../utils/theme';
import { useFieldText } from '../../../utils/i18n';
import { DotLabel } from '../../../components/DotLabel';
import { FOLDER_PRESETS } from '../actionData';
import { MacroEditor } from '../MacroEditor';
import { Field, FolderButtonSlot } from '../comunes';
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
              BOTONES DE LA CARPETA ({folderButtons.length}/12)
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
