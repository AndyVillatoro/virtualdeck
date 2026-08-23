import React from 'react';
import { useTheme } from '../../../utils/theme';
import { useT, useFieldText } from '../../../utils/i18n';
import { Field, Btn, estiloEntrada } from '../comunes';
import type { PropsFormulario } from './base';

/** Lo que le habla al sistema: audio, teclas, portapapeles, procesos, pantalla. */

export function FormAudioDevice(p: PropsFormulario) {
  const VD = useTheme();
  const tf = useFieldText();
  const inputStyle = estiloEntrada(VD);
  const { accent, action, setAction, audioDevices, audioError, label, setLabel, loadAudioDevices, loadingDevices } = p;
  return (
    <>
          <Field label={tf("DISPOSITIVO DE AUDIO")}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              {action.deviceName && (
                <span style={{ fontFamily: VD.mono, fontSize: 10, color: accent, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                  ✓ {action.deviceName}
                </span>
              )}
              {!action.deviceName && <span />}
              <Btn onClick={loadAudioDevices}>{loadingDevices ? '...' : tf('⟳ RECARGAR')}</Btn>
            </div>
            {loadingDevices && <div style={{ fontFamily: VD.mono, fontSize: 11, color: VD.textDim, padding: '4px 0 8px' }}>{tf('Cargando dispositivos...')}</div>}
            {!loadingDevices && audioError && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontFamily: VD.mono, fontSize: 10, color: VD.danger, marginBottom: 6 }}>
                  ⚠ {audioError}
                </div>
                <Btn onClick={loadAudioDevices} style={{ marginBottom: 8 }}>{tf('⟳ REINTENTAR')}</Btn>
                <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, marginBottom: 6 }}>
                  {tf('O ingresa el nombre exacto del dispositivo (como aparece en Configuración → Sonido):')}
                </div>
                <input
                  value={action.deviceName || ''}
                  onChange={(e) => setAction((a) => ({ ...a, deviceId: undefined, deviceName: e.target.value }))}
                  placeholder={tf("Ej: Auriculares (Realtek HD Audio)")}
                  style={inputStyle}
                />
              </div>
            )}
            {!loadingDevices && !audioError && audioDevices.length === 0 && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontFamily: VD.mono, fontSize: 10, color: VD.danger, marginBottom: 8 }}>
                  {tf('No se detectaron dispositivos automáticamente.')}
                </div>
                <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, marginBottom: 6 }}>
                  {tf('Ingresa el nombre exacto del dispositivo (como aparece en Configuración → Sonido):')}
                </div>
                <input
                  value={action.deviceName || ''}
                  onChange={(e) => setAction((a) => ({ ...a, deviceId: undefined, deviceName: e.target.value }))}
                  placeholder={tf("Ej: Auriculares (Realtek HD Audio)")}
                  style={inputStyle}
                />
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {audioDevices.map((dev) => (
                <div
                  key={dev.id}
                  onClick={() => {
                    setAction((a) => ({ ...a, deviceId: dev.id, deviceName: dev.name }));
                    if (!label) setLabel(dev.name);
                  }}
                  style={{
                    background: action.deviceId === dev.id ? VD.accentBg : VD.elevated,
                    border: `1px solid ${action.deviceId === dev.id ? accent : VD.border}`,
                    borderRadius: VD.radius.md, padding: '10px 12px',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontFamily: VD.mono, fontSize: 11, color: VD.text }}>{dev.name}</span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {dev.isDefault && <span style={{ fontFamily: VD.mono, fontSize: 9, color: VD.success, letterSpacing: 1 }}>{tf('PREDETERMINADO')}</span>}
                    {action.deviceId === dev.id && <span style={{ fontFamily: VD.mono, fontSize: 9, color: accent, letterSpacing: 1 }}>{tf('✓ SELECCIONADO')}</span>}
                  </div>
                </div>
              ))}
            </div>
          </Field>
    </>
  );
}

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
              <Btn onClick={() => setCapturing(c => !c)} style={{ background: capturing ? VD.accentBg : undefined, borderColor: capturing ? accent : undefined, color: capturing ? accent : undefined }}>
                {capturing ? '● ESPERANDO...' : 'CAPTURAR'}
              </Btn>
            </div>
            {capturing && (
              <div style={{ fontFamily: VD.mono, fontSize: 9, color: accent, marginTop: 6 }}>
                {tf('Presiona la combinación deseada...')}
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
              {tf('El texto se escribe en la ventana activa. Caracteres especiales (+, ^, %, %, (, )) se escapan automáticamente.')}
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

export function FormVolumeSet(p: PropsFormulario) {
  const VD = useTheme();
  const t = useT();
  const tf = useFieldText();
  const { accent, action, setAction } = p;
  return (
    <>
          <Field label={tf("NIVEL DE VOLUMEN")}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input
                type="range" min={0} max={100} step={5}
                value={action.volumePercent ?? 50}
                onChange={(e) => setAction((a) => ({ ...a, volumePercent: parseInt(e.target.value) }))}
                style={{ flex: 1, accentColor: accent }}
              />
              <span style={{ fontFamily: VD.mono, fontSize: 14, color: VD.text, minWidth: 40, textAlign: 'right' }}>
                {action.volumePercent ?? 50}%
              </span>
            </div>
            <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, marginTop: 6 }}>
              {t('ed.volumeHint')}
            </div>
          </Field>
    </>
  );
}

export function FormBrightness(p: PropsFormulario) {
  const VD = useTheme();
  const tf = useFieldText();
  const { accent, action, setAction } = p;
  return (
    <>
          <Field label={tf("NIVEL DE BRILLO")}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input type="range" min={0} max={100} step={5} value={action.brightnessLevel ?? 70} onChange={(e) => setAction((a) => ({ ...a, brightnessLevel: parseInt(e.target.value) }))} style={{ flex: 1, accentColor: accent }} />
              <span style={{ fontFamily: VD.mono, fontSize: 14, color: VD.text, minWidth: 40, textAlign: 'right' }}>{action.brightnessLevel ?? 70}%</span>
            </div>
            <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, marginTop: 6 }}>{tf('Controla el brillo del monitor principal via WMI.')}</div>
          </Field>
    </>
  );
}

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

export function FormRegionCapture() {
  const VD = useTheme();
  const tf = useFieldText();
  return (
    <>
          <div style={{ fontFamily: VD.mono, fontSize: 10, color: VD.textMuted, lineHeight: 1.6 }}>
            {tf('Abre la herramienta nativa de captura de región de Windows (Win+Shift+S). El recorte queda en el portapapeles.')}
          </div>
    </>
  );
}

export function FormMediaPlayPause() {
  const VD = useTheme();
  const tf = useFieldText();
  return (
    <>
          <div style={{ fontFamily: VD.mono, fontSize: 11, color: VD.textDim, padding: '8px 0' }}>
            {tf('Esta acción no necesita configuración adicional.')}
          </div>
    </>
  );
}

export function FormWindowSnap(p: PropsFormulario) {
  const VD = useTheme();
  const t = useT();
  const tf = useFieldText();
  const inputStyle = estiloEntrada(VD);
  const { accent, action, setAction } = p;
  return (
    <>
          <>
            <Field label={tf("POSICIÓN / TAMAÑO")}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {([
                  ['top-left','↖ ' + tf('Cuad. sup-izq')],['top-half','↑ ' + tf('Mitad superior')],['top-right','↗ ' + tf('Cuad. sup-der')],
                  ['left-half','← ' + tf('Mitad izq')],['center','⊞ ' + tf('Centro 50%')],['right-half','→ ' + tf('Mitad der')],
                  ['bottom-left','↙ ' + tf('Cuad. inf-izq')],['bottom-half','↓ ' + tf('Mitad inferior')],['bottom-right','↘ ' + tf('Cuad. inf-der')],
                  ['maximize','⛶ ' + tf('Maximizar')],['restore','⊡ ' + tf('Restaurar')],
                ] as [string, string][]).map(([val, lbl]) => (
                  <div
                    key={val}
                    onClick={() => setAction((a) => ({ ...a, snapPosition: val as any }))}
                    style={{
                      padding: '6px 8px', borderRadius: VD.radius.sm, cursor: 'pointer',
                      background: action.snapPosition === val ? VD.accentBg : VD.elevated,
                      border: `1px solid ${action.snapPosition === val ? accent : VD.border}`,
                      fontFamily: VD.mono, fontSize: 8, color: action.snapPosition === val ? accent : VD.textDim,
                      textAlign: 'center',
                    }}
                  >{lbl}</div>
                ))}
              </div>
            </Field>
            <Field label={tf("PROCESO A SNAPEAR (opcional — vacío = ventana activa)")}>
              <input
                value={action.snapProcessName ?? ''}
                onChange={(e) => setAction((a) => ({ ...a, snapProcessName: e.target.value || undefined }))}
                placeholder={"chrome, notepad, code..."}
                style={inputStyle}
              />
              <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, marginTop: 4 }}>
                {t('ed.snapHint')}{' '}{t('ed.snapHint2')}
              </div>
            </Field>
          </>
    </>
  );
}
