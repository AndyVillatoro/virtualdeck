import React from 'react';
import { useTheme } from '../../utils/theme';
import { useT, useFieldText } from '../../utils/i18n';
import { DotLabel } from '../../components/DotLabel';
import { IconNone } from '../../components/VDIcon';
import { type ButtonPreset } from './actionData';
import { MacroEditor } from './MacroEditor';
import { Field, ToggleOffActionPicker, estiloEntrada } from './comunes';
import { FORMULARIOS, type PropsFormulario } from './formularios';
import { FormMediaPlayPause } from './formularios/sistema';
import type {
  ActionType, AudioDevice, ButtonAction, FolderButton, RGBDeviceInfo, RGBProfile,
} from '../../types';

/**
 * Paso 2 de 3: los campos de la accion elegida.
 *
 * Es un formulario por tipo de accion. Recibe mucho estado por props a
 * proposito: el editor es quien lo posee y quien lo guarda, aqui solo se
 * dibuja y se avisa de los cambios.
 */
/** El paso recibe el mismo bag que los formularios y se lo reenvia entero. */
type PropsPasoConfigurar = PropsFormulario;

export function PasoConfigurar(p: PropsPasoConfigurar) {
  const { accent, action, isToggle, setIsToggle, actionToggleOff, setActionToggleOff,
          longPressAction, setLongPressAction, radioGroup, setRadioGroup,
          globalHotkey, setGlobalHotkey, inTrayMenu, setInTrayMenu } = p;
  const VD = useTheme();
  const t = useT();
  const tf = useFieldText();
  const inputStyle = estiloEntrada(VD);

  return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {(() => {
          // Un formulario por tipo. El que no lo necesita (media, volumen…)
          // usa `FormMediaPlayPause`, que es el aviso de "no necesita
          // configuracion".
          //
          // El respaldo es ese mismo aviso y no `null`: devolviendo null, un
          // tipo que se olvidara aqui dejaba el paso 2 vacio, sin nada que
          // delatara el olvido. Le paso a media-shuffle, a media-repeat y a
          // rgb-preset. `scripts/check-acciones.mjs` ya lo comprueba, pero si
          // vuelve a pasar que al menos se vea.
          const Formulario = FORMULARIOS[action.type] ?? FormMediaPlayPause;
          return <Formulario {...p} />;
        })()}

        {/* Toggle mode — for non-folder actions */}
        {action.type !== 'none' && action.type !== 'folder' && (
          <div style={{ borderTop: `1px solid ${VD.border}`, paddingTop: 14 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: isToggle ? 12 : 0 }}>
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
              <div style={{ marginLeft: 24 }}>
                <DotLabel size={9} color={VD.textMuted} spacing={2} style={{ display: 'block', marginBottom: 8 }}>
                  {tf('ACCIÓN AL DESACTIVAR (opcional — si vacío, repite la misma acción)')}
                </DotLabel>
                <ToggleOffActionPicker
                  action={actionToggleOff}
                  onChange={setActionToggleOff}
                  accent={accent}
                />
              </div>
            )}
          </div>
        )}

        {/* 3.x — Long press action */}
        {action.type !== 'none' && action.type !== 'folder' && (
          <div style={{ borderTop: `1px solid ${VD.border}`, paddingTop: 14 }}>
            <DotLabel size={9} color={VD.textMuted} spacing={2} style={{ display: 'block', marginBottom: 8 }}>
              {tf('ACCIÓN AL MANTENER PRESIONADO (~500 MS)')}
            </DotLabel>
            <ToggleOffActionPicker
              action={longPressAction}
              onChange={setLongPressAction}
              accent={accent}
            />
          </div>
        )}

        {/* 3.x — Radio group */}
        {action.type !== 'none' && action.type !== 'folder' && isToggle && (
          <div style={{ borderTop: `1px solid ${VD.border}`, paddingTop: 14 }}>
            <Field label={tf("GRUPO RADIO (toggles mutuamente exclusivos)")}>
              <input
                value={radioGroup}
                onChange={(e) => setRadioGroup(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                placeholder={tf("ej: modo_audio, perfil_rgb...")}
                style={inputStyle}
              />
              <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, marginTop: 4 }}>
                {t('ed.radioHint')}
              </div>
            </Field>
          </div>
        )}

        {/* 1.4 — Disparadores externos */}
        {action.type !== 'none' && action.type !== 'folder' && (
          <div style={{ borderTop: `1px solid ${VD.border}`, paddingTop: 14 }}>
            <DotLabel size={9} color={VD.textMuted} spacing={2} style={{ display: 'block', marginBottom: 10 }}>
              {t('ed.triggers')}
            </DotLabel>
            <Field label={tf("HOTKEY GLOBAL DEL SO (ej. Ctrl+Alt+1)")}>
              <input
                value={globalHotkey}
                onChange={(e) => setGlobalHotkey(e.target.value)}
                placeholder={tf("vacío = sin atajo global")}
                style={inputStyle}
              />
            </Field>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 10 }}>
              <input
                type="checkbox"
                checked={inTrayMenu}
                onChange={(e) => setInTrayMenu(e.target.checked)}
                style={{ accentColor: accent }}
              />
              <span style={{ fontFamily: VD.mono, fontSize: 9, letterSpacing: 1, color: VD.textDim }}>
                {tf('MOSTRAR EN MENÚ DEL TRAY (acción rápida)')}
              </span>
            </label>
          </div>
        )}
      </div>
  );
}
