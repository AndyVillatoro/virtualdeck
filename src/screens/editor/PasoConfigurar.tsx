import React from 'react';
import { useTheme } from '../../utils/theme';
import { useT, useFieldText } from '../../utils/i18n';
import { DotLabel } from '../../components/DotLabel';
import { IconNone } from '../../components/VDIcon';
import { FOLDER_PRESETS, type ButtonPreset } from './actionData';
import { MacroEditor } from './MacroEditor';
import {
  Field, Btn, SensorPicker, FolderButtonSlot, ToggleOffActionPicker, BranchActionRow, ExtraActionRow,
  estiloEntrada,
} from './comunes';
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
interface PropsPasoConfigurar {
  accent: string;
  action: ButtonAction;
  setAction: React.Dispatch<React.SetStateAction<ButtonAction>>;
  actionToggleOff: ButtonAction;
  setActionToggleOff: React.Dispatch<React.SetStateAction<ButtonAction>>;
  applyFolderPreset: (key: string) => void;
  audioDevices: AudioDevice[];
  audioError: string | null;
  capturing: boolean;
  setCapturing: React.Dispatch<React.SetStateAction<boolean>>;
  folderButtons: FolderButton[];
  setFolderButtons: React.Dispatch<React.SetStateAction<FolderButton[]>>;
  globalHotkey: string;
  setGlobalHotkey: (s: string) => void;
  inTrayMenu: boolean;
  setInTrayMenu: (v: boolean) => void;
  isToggle: boolean;
  setIsToggle: (v: boolean) => void;
  label: string;
  setLabel: (s: string) => void;
  loadAudioDevices: () => void;
  loadingDevices: boolean;
  longPressAction: ButtonAction;
  setLongPressAction: React.Dispatch<React.SetStateAction<ButtonAction>>;
  pickFile: () => void;
  pickShortcut: () => void;
  radioGroup: string;
  setRadioGroup: (s: string) => void;
  rgbConnected: boolean;
  rgbDevices: RGBDeviceInfo[];
  rgbProfiles: RGBProfile[];
  deckState: Record<string, string>;
}

export function PasoConfigurar({ accent, action, setAction, actionToggleOff, setActionToggleOff, applyFolderPreset, audioDevices, audioError, capturing, setCapturing, folderButtons, setFolderButtons, globalHotkey, setGlobalHotkey, inTrayMenu, setInTrayMenu, isToggle, setIsToggle, label, setLabel, loadAudioDevices, loadingDevices, longPressAction, setLongPressAction, pickFile, pickShortcut, radioGroup, setRadioGroup, rgbConnected, rgbDevices, rgbProfiles, deckState }: PropsPasoConfigurar) {
  const VD = useTheme();
  const t = useT();
  const tf = useFieldText();
  const inputStyle = estiloEntrada(VD);

  return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {action.type === 'none' && (
          <div style={{ color: VD.textMuted, fontFamily: VD.mono, fontSize: 11 }}>
            {tf('Sin acción configurada.')}
          </div>
        )}

        {action.type === 'app' && (
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
        )}

        {action.type === 'web' && (
          <Field label={tf("URL")}>
            <input value={action.url || ''} onChange={(e) => setAction((a) => ({ ...a, url: e.target.value }))} placeholder={tf("https://ejemplo.com")} style={inputStyle} />
          </Field>
        )}

        {action.type === 'shortcut' && (
          <Field label={tf("RUTA DEL ARCHIVO O CARPETA")}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={action.shortcutPath || ''} onChange={(e) => setAction((a) => ({ ...a, shortcutPath: e.target.value }))} placeholder={tf("C:\\Users\\...\\archivo.lnk")} style={inputStyle} />
              <Btn onClick={pickShortcut}>{tf('Buscar')}</Btn>
            </div>
          </Field>
        )}

        {action.type === 'script' && (
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
                El stdout se guarda en la variable y se puede usar como {'{resultado_cpu}'} en otros pasos.
              </div>
            </Field>
          </>
        )}

        {action.type === 'audio-device' && (
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
        )}

        {action.type === 'hotkey' && (
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
        )}

        {action.type === 'clipboard' && (
          <Field label={tf("TEXTO A COPIAR AL PORTAPAPELES")}>
            <textarea
              value={action.clipboardText || ''}
              onChange={(e) => setAction((a) => ({ ...a, clipboardText: e.target.value }))}
              placeholder={tf("Texto, URL, código, etc.")}
              rows={4}
              style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }}
            />
          </Field>
        )}

        {action.type === 'type-text' && (
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
        )}

        {action.type === 'kill-process' && (
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
        )}

        {action.type === 'volume-set' && (
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
        )}

        {action.type === 'brightness' && (
          <Field label={tf("NIVEL DE BRILLO")}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input type="range" min={0} max={100} step={5} value={action.brightnessLevel ?? 70} onChange={(e) => setAction((a) => ({ ...a, brightnessLevel: parseInt(e.target.value) }))} style={{ flex: 1, accentColor: accent }} />
              <span style={{ fontFamily: VD.mono, fontSize: 14, color: VD.text, minWidth: 40, textAlign: 'right' }}>{action.brightnessLevel ?? 70}%</span>
            </div>
            <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, marginTop: 6 }}>{tf('Controla el brillo del monitor principal via WMI.')}</div>
          </Field>
        )}

        {action.type === 'notify' && (
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
        )}

        {action.type === 'set-var' && (
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
        )}

        {action.type === 'incr-var' && (
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
        )}

        {action.type === 'webhook' && (
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
        )}

        {action.type === 'tts' && (
          <Field label={tf("TEXTO A LEER (acepta {variables})")}>
            <textarea
              value={action.ttsText ?? ''}
              onChange={(e) => setAction((a) => ({ ...a, ttsText: e.target.value }))}
              placeholder={tf("Hola, son las {hora}")}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
            />
          </Field>
        )}

        {action.type === 'region-capture' && (
          <div style={{ fontFamily: VD.mono, fontSize: 10, color: VD.textMuted, lineHeight: 1.6 }}>
            {tf('Abre la herramienta nativa de captura de región de Windows (Win+Shift+S). El recorte queda en el portapapeles.')}
          </div>
        )}

        {(action.type === 'rgb-color' || action.type === 'rgb-mode') && (
          <>
            {!rgbConnected && (
              <div style={{ fontFamily: VD.mono, fontSize: 10, color: VD.warning, padding: '6px 10px', background: 'rgba(212,162,52,0.08)', border: `1px solid ${VD.warning}`, borderRadius: VD.radius.sm }}>
                {tf('OpenRGB no conectado. Conecta desde la pantalla RGB para listar dispositivos. La acción seguirá funcionando si OpenRGB está activo cuando se ejecute el botón.')}
              </div>
            )}
            <Field label={tf("DISPOSITIVO RGB")}>
              <select
                value={action.rgbDeviceId ?? -1}
                onChange={(e) => setAction((a) => ({ ...a, rgbDeviceId: parseInt(e.target.value, 10) }))}
                style={inputStyle}
              >
                <option value={-1}>{tf('Todos los dispositivos')}</option>
                {rgbDevices.map((d) => (
                  <option key={d.id} value={d.id}>{d.name} ({d.typeLabel})</option>
                ))}
              </select>
            </Field>
          </>
        )}

        {action.type === 'rgb-color' && (
          <Field label={tf("COLOR (HEX)")}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="color"
                value={action.rgbColor ?? '#ffffff'}
                onChange={(e) => setAction((a) => ({ ...a, rgbColor: e.target.value }))}
                style={{ width: 36, height: 28, padding: 2, border: `1px solid ${VD.border}`, background: 'none', cursor: 'pointer', borderRadius: VD.radius.sm }}
              />
              <input
                value={(action.rgbColor ?? '#ffffff').toUpperCase()}
                onChange={(e) => {
                  const v = e.target.value.trim();
                  if (/^#?[0-9a-fA-F]{6}$/.test(v)) setAction((a) => ({ ...a, rgbColor: v.startsWith('#') ? v : `#${v}` }));
                }}
                style={{ ...inputStyle, flex: 1 }}
              />
            </div>
          </Field>
        )}

        {action.type === 'rgb-mode' && (
          <>
            <Field label={tf("MODO / EFECTO")}>
              <input
                value={action.rgbMode ?? ''}
                onChange={(e) => setAction((a) => ({ ...a, rgbMode: e.target.value }))}
                placeholder={"Direct, Static, Breathing, Rainbow, Spectrum Cycle..."}
                list="rgb-modes-list"
                style={inputStyle}
              />
              <datalist id="rgb-modes-list">
                {(() => {
                  const seen = new Set<string>();
                  return rgbDevices.flatMap((d) => d.modes).filter((m) => {
                    if (seen.has(m.name.toLowerCase())) return false;
                    seen.add(m.name.toLowerCase()); return true;
                  }).map((m) => <option key={m.name} value={m.name} />);
                })()}
              </datalist>
            </Field>
            <Field label={tf("COLOR (OPCIONAL — SOLO PARA MODOS QUE LO USAN)")}>
              <input
                type="color"
                value={action.rgbColor ?? '#ffffff'}
                onChange={(e) => setAction((a) => ({ ...a, rgbColor: e.target.value }))}
                style={{ width: 60, height: 28, padding: 2, border: `1px solid ${VD.border}`, background: 'none', cursor: 'pointer', borderRadius: VD.radius.sm }}
              />
            </Field>
            <Field label={tf("BRILLO 0-100 (OPCIONAL)")}>
              <input
                type="number"
                min={0} max={100}
                value={action.rgbBrightness ?? ''}
                onChange={(e) => setAction((a) => ({ ...a, rgbBrightness: e.target.value === '' ? undefined : parseInt(e.target.value, 10) }))}
                style={inputStyle}
              />
            </Field>
          </>
        )}

        {action.type === 'rgb-profile' && (
          <Field label={tf("PERFIL RGB")}>
            {rgbProfiles.length === 0 ? (
              <div style={{ fontFamily: VD.mono, fontSize: 10, color: VD.warning, lineHeight: 1.6 }}>
                {t('ed.noRgbProfiles')}
              </div>
            ) : (
              <select
                value={action.rgbProfileName ?? ''}
                onChange={(e) => setAction((a) => ({ ...a, rgbProfileName: e.target.value }))}
                style={inputStyle}
              >
                <option value="">— Selecciona un perfil —</option>
                {rgbProfiles.map((p) => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            )}
          </Field>
        )}

        {action.type === 'folder' && (
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
        )}

        {['media-play-pause', 'media-next', 'media-prev', 'volume-up', 'volume-down', 'mute'].includes(action.type) && (
          <div style={{ fontFamily: VD.mono, fontSize: 11, color: VD.textDim, padding: '8px 0' }}>
            {tf('Esta acción no necesita configuración adicional.')}
          </div>
        )}

        {action.type === 'window-snap' && (
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
                {t('ed.snapHint')}
                Funciona mejor con hotkeys globales (sin pasar por VirtualDeck).
              </div>
            </Field>
          </>
        )}

        {action.type === 'branch' && (
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
        )}

        {action.type === 'countdown' && (
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
        )}

        {action.type === 'macro' && (
          <Field label={tf("PASOS DE LA MACRO")}>
            <MacroEditor
              steps={action.macroSteps ?? []}
              repeat={action.macroRepeat ?? 1}
              accent={accent}
              onChange={(steps, repeat) => setAction((a) => ({ ...a, macroSteps: steps, macroRepeat: repeat }))}
            />
          </Field>
        )}

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
