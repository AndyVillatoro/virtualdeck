import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { IconNone } from '../components/VDIcon';
import { ACTION_TYPES, PRESETS, FOLDER_PRESETS, type ButtonPreset } from './editor/actionData';
import { PasoAccion } from './editor/PasoAccion';
import { PasoConfigurar } from './editor/PasoConfigurar';
import { useTheme } from '../utils/theme';
import { DotLabel } from '../components/DotLabel';
import { BrandIconDisplay } from '../components/BrandIconDisplay';
// 4.1 — picker y editor del catálogo de marcas se cargan a demanda. Evita
// arrastrar el bundle de marcas al árbol inicial cuando el usuario no abre el modal.
const BrandIconPicker = lazy(() => import('../components/BrandIconPicker').then(m => ({ default: m.BrandIconPicker })));
const BrandIconEditor = lazy(() => import('../components/BrandIconEditor').then(m => ({ default: m.BrandIconEditor })));
import { ButtonCell } from '../components/ButtonCell';
import { Glyph57Editor, Glyph57View as Glyph57Inline } from '../components/Glyph57Editor';
import { BRAND_ICONS_MAP } from '../data/brandIcons';
import { useT, useFieldText } from '../utils/i18n';
import { Field, Btn, SensorPicker, estiloEntrada } from './editor/comunes';
import type { AudioDevice, ButtonAction, ButtonConfig, FolderButton, RGBDeviceInfo, RGBProfile } from '../types';

interface EditorBProps {
  button: ButtonConfig;
  rgbProfiles?: RGBProfile[];
  /** Variables de estado actuales — para autocompletar el nombre en el widget 'variable'. */
  deckState?: Record<string, string>;
  onClose: () => void;
  onSave: (updated: ButtonConfig) => void;
}

// Claves i18n de los pasos (el texto se resuelve con t() en render).
const STEPS = ['ed.step.action', 'ed.step.config', 'ed.step.style'];


export function EditorB({ button, rgbProfiles = [], deckState = {}, onClose, onSave }: EditorBProps) {
  const VD = useTheme();
  const inputStyle = estiloEntrada(VD);
  const t = useT();
  const tf = useFieldText();
  const api = window.electronAPI;
  const [step, setStep] = useState(0);
  const [action, setAction] = useState<ButtonAction>({ ...button.action });
  const [extraActions, setExtraActions] = useState<ButtonAction[]>(
    button.actions && button.actions.length > 1 ? button.actions.slice(1) : []
  );
  const [showExtraPicker, setShowExtraPicker] = useState(false);
  const [isToggle, setIsToggle] = useState(button.isToggle ?? false);
  const [actionToggleOff, setActionToggleOff] = useState<ButtonAction>(
    button.actionToggleOff ?? { type: 'none' }
  );
  const [label, setLabel] = useState(button.label || '');
  const [sublabel, setSublabel] = useState(button.sublabel || '');
  const [icon, setIcon] = useState(button.icon || '');
  const [imageData, setImageData] = useState(button.imageData || '');
  const [brandIcon, setBrandIcon] = useState(button.brandIcon || '');
  const [brandIconAlwaysAnimate, setBrandIconAlwaysAnimate] = useState(button.brandIconAlwaysAnimate ?? false);
  const [brandIconCustomBitmap, setBrandIconCustomBitmap] = useState<string[] | undefined>(button.brandIconCustomBitmap);
  const [brandIconCustomColor, setBrandIconCustomColor] = useState<string | undefined>(button.brandIconCustomColor);
  const [brandIconCustomPalette, setBrandIconCustomPalette] = useState<Record<string, string> | undefined>(button.brandIconCustomPalette);
  const [showBrandPicker, setShowBrandPicker] = useState(false);
  const [showBrandEditor, setShowBrandEditor] = useState(false);
  const [bgColor, setBgColor] = useState(button.bgColor || '');
  const [fgColor, setFgColor] = useState(button.fgColor || '');
  // 1.4 — Disparadores externos
  const [globalHotkey, setGlobalHotkey] = useState(button.globalHotkey ?? '');
  const [inTrayMenu, setInTrayMenu] = useState(button.inTrayMenu ?? false);
  // 3.x — Long press + radio group
  const [longPressAction, setLongPressAction] = useState<import('../types').ButtonAction>(
    button.longPressAction ?? { type: 'none' }
  );
  const [radioGroup, setRadioGroup] = useState(button.radioGroup ?? '');
  // Widget / Visibility / Scheduled trigger
  const [widget, setWidget] = useState<'clock' | 'weather' | 'now-playing' | 'sensor' | 'variable' | undefined>(button.widget);
  const [sensorWidgetId, setSensorWidgetId] = useState(button.sensorWidget?.sensorId ?? '');
  const [sensorWidgetSuffix, setSensorWidgetSuffix] = useState(button.sensorWidget?.suffix ?? '');
  const [sensorWidgetWarn, setSensorWidgetWarn] = useState(button.sensorWidget?.warnAt?.toString() ?? '');
  const [sensorWidgetCrit, setSensorWidgetCrit] = useState(button.sensorWidget?.critAt?.toString() ?? '');
  const [varWidgetName, setVarWidgetName] = useState(button.varWidget?.varName ?? '');
  const [varWidgetPrefix, setVarWidgetPrefix] = useState(button.varWidget?.prefix ?? '');
  const [varWidgetSuffix, setVarWidgetSuffix] = useState(button.varWidget?.suffix ?? '');
  const [visibleIfApp, setVisibleIfApp] = useState(button.visibleIf?.app ?? '');
  const [visibleIfSensorId, setVisibleIfSensorId] = useState(button.visibleIf?.sensor?.id ?? '');
  const [visibleIfSensorOp, setVisibleIfSensorOp] = useState<'>'|'<'|'>='|'<='|'=='>(button.visibleIf?.sensor?.op ?? '>');
  const [visibleIfSensorVal, setVisibleIfSensorVal] = useState(button.visibleIf?.sensor?.value?.toString() ?? '');
  const [timerTriggerAt, setTimerTriggerAt] = useState(button.timerTriggerAt ?? '');
  const [sensorTriggerId, setSensorTriggerId] = useState(button.sensorTrigger?.id ?? '');
  const [sensorTriggerOp, setSensorTriggerOp] = useState<'>'|'<'|'>='|'<='|'=='>(button.sensorTrigger?.op ?? '>');
  const [sensorTriggerVal, setSensorTriggerVal] = useState(button.sensorTrigger?.value?.toString() ?? '');
  const [sensorTriggerCooldown, setSensorTriggerCooldown] = useState(
    button.sensorTrigger?.cooldownMs !== undefined ? String(Math.round(button.sensorTrigger.cooldownMs / 1000)) : ''
  );
  // Sensor list shared by widget/visibility/trigger pickers.
  const [sensorList, setSensorList] = useState<import('../types').Sensor[]>([]);
  // 2.1 — Glifo 5×7 personalizado (7 enteros bitmask)
  const [customGlyph57, setCustomGlyph57] = useState<number[] | undefined>(button.customGlyph57);
  const [showGlyphEditor, setShowGlyphEditor] = useState(false);
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [rgbDevices, setRgbDevices] = useState<RGBDeviceInfo[]>([]);
  const [rgbConnected, setRgbConnected] = useState(false);
  const [presetCategory, setPresetCategory] = useState<ButtonPreset['category']>('APPS');
  const [presetSearch, setPresetSearch] = useState('');
  const [capturing, setCapturing] = useState(false);
  const [folderButtons, setFolderButtons] = useState<FolderButton[]>(
    button.action.folderButtons ?? []
  );
  const captureRef = useRef(false);

  const loadAudioDevices = () => {
    if (!api) return;
    setLoadingDevices(true);
    setAudioError(null);
    api.audio.list().then((devs) => {
      setAudioDevices(devs);
      setLoadingDevices(false);
    }).catch(() => {
      setAudioError(tf('No se pudo obtener la lista. Verifica que el audio esté activo o reinicia la aplicación.'));
      setLoadingDevices(false);
    });
  };

  useEffect(() => {
    if (action.type === 'audio-device' && audioDevices.length === 0 && api) {
      loadAudioDevices();
    }
    // Auto-clear conflicting widget so a previously-saved button doesn't keep
    // an incompatible widget after the user switches to Audio.
    if (action.type === 'audio-device' && widget === 'now-playing') {
      setWidget(undefined);
    }
  }, [action.type, step, widget]);

  // Cargar lista de devices RGB cuando el usuario configure una acción rgb-*.
  useEffect(() => {
    if (!api) return;
    if (action.type !== 'rgb-color' && action.type !== 'rgb-mode') return;
    api.rgb.status().then((s) => {
      setRgbConnected(s.connected);
      if (s.connected) api.rgb.listDevices().then((d) => setRgbDevices(d)).catch(() => {});
    }).catch(() => {});
  }, [action.type, step]);

  // Load LHM sensor catalog when the editor opens and refresh whenever the
  // user touches a sensor-driven control. Cheap (LHM cache in main is 1.5 s)
  // and ensures the picker is populated as soon as the user reaches step 2.
  useEffect(() => {
    if (!api?.sensors) return;
    api.sensors.list().then(setSensorList).catch(() => {});
  }, [widget, visibleIfSensorId, sensorTriggerId, step]);

  // Hotkey capture
  useEffect(() => {
    if (!capturing) return;
    captureRef.current = true;
    const onKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const parts: string[] = [];
      if (e.ctrlKey) parts.push('Ctrl');
      if (e.altKey) parts.push('Alt');
      if (e.shiftKey) parts.push('Shift');
      const main = e.key;
      if (!['Control', 'Alt', 'Shift', 'Meta'].includes(main)) {
        parts.push(main.length === 1 ? main.toUpperCase() : main);
      }
      if (parts.length > 0 && !['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
        setAction(a => ({ ...a, hotkey: parts.join('+') }));
        setCapturing(false);
        captureRef.current = false;
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [capturing]);

  // Sync folderButtons into action when they change
  useEffect(() => {
    if (action.type === 'folder') {
      setAction(a => ({ ...a, folderButtons }));
    }
  }, [folderButtons]);

  const handleSave = () => {
    const allActions = extraActions.length > 0 ? [action, ...extraActions] : undefined;
    const updated: ButtonConfig = {
      ...button,
      label,
      sublabel,
      icon,
      imageData,
      brandIcon: brandIcon || undefined,
      brandIconAlwaysAnimate: brandIconAlwaysAnimate || undefined,
      brandIconCustomBitmap: brandIconCustomBitmap,
      brandIconCustomColor: brandIconCustomColor,
      brandIconCustomPalette: brandIconCustomPalette && Object.keys(brandIconCustomPalette).length > 0 ? brandIconCustomPalette : undefined,
      bgColor: bgColor || undefined,
      fgColor: fgColor || undefined,
      action: action.type === 'folder' ? { ...action, folderButtons } : action,
      actions: allActions,
      isToggle: isToggle || undefined,
      actionToggleOff: isToggle && actionToggleOff.type !== 'none' ? actionToggleOff : undefined,
      globalHotkey: globalHotkey.trim() || undefined,
      inTrayMenu: inTrayMenu || undefined,
      customGlyph57: customGlyph57 && customGlyph57.length === 7 ? customGlyph57 : undefined,
      longPressAction: longPressAction.type !== 'none' ? longPressAction : undefined,
      radioGroup: radioGroup.trim() || undefined,
      widget: widget || undefined,
      sensorWidget: widget === 'sensor' && sensorWidgetId
        ? {
            sensorId: sensorWidgetId,
            suffix: sensorWidgetSuffix.trim() || undefined,
            warnAt: sensorWidgetWarn.trim() ? parseFloat(sensorWidgetWarn) : undefined,
            critAt: sensorWidgetCrit.trim() ? parseFloat(sensorWidgetCrit) : undefined,
          }
        : undefined,
      varWidget: widget === 'variable' && varWidgetName.trim()
        ? {
            varName: varWidgetName.trim(),
            prefix: varWidgetPrefix || undefined,
            suffix: varWidgetSuffix.trim() || undefined,
          }
        : undefined,
      visibleIf: (() => {
        const app = visibleIfApp.trim();
        const sensorVal = visibleIfSensorVal.trim();
        const hasSensor = !!visibleIfSensorId && sensorVal !== '' && !isNaN(parseFloat(sensorVal));
        if (!app && !hasSensor) return undefined;
        return {
          app: app || undefined,
          sensor: hasSensor
            ? { id: visibleIfSensorId, op: visibleIfSensorOp, value: parseFloat(sensorVal) }
            : undefined,
        };
      })(),
      timerTriggerAt: timerTriggerAt.trim() || undefined,
      sensorTrigger: (() => {
        const v = sensorTriggerVal.trim();
        if (!sensorTriggerId || v === '' || isNaN(parseFloat(v))) return undefined;
        const cd = sensorTriggerCooldown.trim();
        return {
          id: sensorTriggerId,
          op: sensorTriggerOp,
          value: parseFloat(v),
          cooldownMs: cd && !isNaN(parseFloat(cd)) ? parseFloat(cd) * 1000 : undefined,
        };
      })(),
    };
    onSave(updated);
  };

  const applyPreset = (preset: ButtonPreset) => {
    setAction(preset.action);
    setLabel(preset.label);
    setSublabel(preset.sublabel ?? '');
    setIcon(preset.icon ?? '');
    setBgColor(preset.bgColor ?? '');
    setFgColor(preset.fgColor ?? '');
    setStep(2);
  };

  const applyFolderPreset = (key: string) => {
    const fp = FOLDER_PRESETS[key];
    if (!fp) return;
    setFolderButtons(fp.buttons);
    setLabel(fp.label);
    setIcon(fp.icon);
    setBgColor(fp.bgColor);
    setFgColor(fp.fgColor);
  };

  const pickFile = async () => {
    if (!api) return;
    const path = await api.dialog.openFile({ properties: ['openFile'] });
    if (path) setAction((a) => ({ ...a, appPath: path }));
  };

  const pickShortcut = async () => {
    if (!api) return;
    const path = await api.dialog.openFile({ properties: ['openFile', 'openDirectory'] });
    if (path) setAction((a) => ({ ...a, shortcutPath: path }));
  };

  const pickImage = async () => {
    if (!api) return;
    const data = await api.dialog.openImage();
    if (data) setImageData(data);
  };

  // 2.4 — pegar imagen desde portapapeles. Listen at document level mientras el
  // editor está abierto. El handler ignora pastes en inputs de texto (editar
  // label/url) para no interferir con el paste textual.
  useEffect(() => {
    if (!api) return;
    const onPaste = async (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (it.type.startsWith('image/')) {
          e.preventDefault();
          const blob = it.getAsFile();
          if (!blob) return;
          const reader = new FileReader();
          reader.onload = async () => {
            const dataUrl = reader.result as string;
            const url = await api.dialog.saveClipboardImage(dataUrl);
            if (url) setImageData(url);
          };
          reader.readAsDataURL(blob);
          return;
        }
      }
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [api]);

  const accent = VD.accent;
  const currentActionMeta = ACTION_TYPES.find((a) => a.type === action.type);
  const PreviewIcon = currentActionMeta?.Icon ?? IconNone;

  const filteredPresets = PRESETS.filter((p) => {
    if (presetSearch.trim()) {
      const q = presetSearch.toLowerCase();
      return p.label.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
    }
    return p.category === presetCategory;
  });

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.75)',
    }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0 }} />

      <div onClick={(e) => e.stopPropagation()} style={{
        position: 'relative',
        width: 'min(960px, 96vw)', height: 'min(640px, 92vh)',
        background: VD.surface, border: `1px solid ${VD.borderStrong}`,
        display: 'flex', flexDirection: 'column',
        boxShadow: VD.shadow.modal,
        borderRadius: VD.radius.sm,
      }}>
        {/* Header */}
        <div style={{
          height: 44, borderBottom: `1px solid ${VD.border}`,
          display: 'flex', alignItems: 'center', padding: '0 16px', gap: 10, flexShrink: 0,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: VD.radius.md, background: accent }} />
          <DotLabel size={11} color={VD.text} spacing={2}>{t('ed.title')}</DotLabel>
          <span style={{ fontFamily: VD.mono, fontSize: 10, color: VD.textMuted }}>· {button.id.toUpperCase()}</span>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{ color: VD.textDim, fontSize: 18, background: 'transparent', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {/* Steps */}
        <div style={{ display: 'flex', padding: '16px 24px', gap: 4, borderBottom: `1px solid ${VD.border}`, flexShrink: 0 }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ flex: 1, cursor: 'pointer' }} onClick={() => setStep(i)}>
              <div style={{ height: 2, background: i <= step ? accent : VD.border, transition: 'background 0.2s' }} />
              <div style={{ marginTop: 8, fontFamily: VD.mono, fontSize: 10, letterSpacing: 2, color: i === step ? VD.text : i < step ? VD.textDim : VD.textMuted }}>
                {String(i + 1).padStart(2, '0')} · {t(s)}
              </div>
            </div>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          {/* Preview */}
          <div style={{
            width: 200, borderRight: `1px solid ${VD.border}`, padding: 24,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: VD.bg, flexShrink: 0, gap: 14,
          }}>
            <DotLabel size={9} color={VD.textMuted} spacing={2}>{t('ed.preview')}</DotLabel>
            {/* Celda viva — el mismo ButtonCell de la grilla, refleja cada cambio en tiempo real */}
            <div style={{
              width: 120, height: 120, display: 'grid',
              pointerEvents: 'none', userSelect: 'none',
            }}>
              <ButtonCell
                button={{
                  id: button.id, page: button.page,
                  label, sublabel, icon,
                  imageData: imageData || undefined,
                  brandIcon: brandIcon || undefined,
                  brandIconAlwaysAnimate,
                  brandIconCustomBitmap,
                  brandIconCustomColor,
                  brandIconCustomPalette,
                  customGlyph57,
                  bgColor: bgColor || undefined,
                  fgColor: fgColor || undefined,
                  action,
                  actions: extraActions.length > 0 ? [action, ...extraActions] : undefined,
                  isToggle,
                }}
                accent={accent}
                toggled={false}
                soundEnabled={false}
                onEdit={() => {}}
                onExecute={() => {}}
              />
            </div>
            {isToggle && (
              <div style={{ fontFamily: VD.mono, fontSize: 9, color: accent, textAlign: 'center' }}>
                {t('ed.toggleMode')}
              </div>
            )}
            {extraActions.length > 0 && (
              <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, textAlign: 'center' }}>
                + {extraActions.length} {extraActions.length > 1 ? tf('acciones adicionales') : tf('acción adicional')}
              </div>
            )}
            <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, textAlign: 'center', lineHeight: 1.6 }}>
              HOVER ✎ → EDITAR<br />CLIC → EJECUTAR
            </div>
          </div>

          {/* Form */}
          <div style={{ flex: 1, padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* STEP 0: Action type + presets */}
            {step === 0 && (
              <PasoAccion
                accent={accent}
                action={action}
                setAction={setAction}
                applyPreset={applyPreset}
                extraActions={extraActions}
                setExtraActions={setExtraActions}
                filteredPresets={filteredPresets}
                presetCategory={presetCategory}
                setPresetCategory={setPresetCategory}
                presetSearch={presetSearch}
                setPresetSearch={setPresetSearch}
                showExtraPicker={showExtraPicker}
                setShowExtraPicker={setShowExtraPicker}
              />
            )}

            {/* STEP 1: Configure action */}
            {step === 1 && (
              <PasoConfigurar
                accent={accent}
                action={action}
                setAction={setAction}
                actionToggleOff={actionToggleOff}
                setActionToggleOff={setActionToggleOff}
                applyFolderPreset={applyFolderPreset}
                audioDevices={audioDevices}
                audioError={audioError}
                capturing={capturing}
                setCapturing={setCapturing}
                folderButtons={folderButtons}
                setFolderButtons={setFolderButtons}
                globalHotkey={globalHotkey}
                setGlobalHotkey={setGlobalHotkey}
                inTrayMenu={inTrayMenu}
                setInTrayMenu={setInTrayMenu}
                isToggle={isToggle}
                setIsToggle={setIsToggle}
                label={label}
                setLabel={setLabel}
                loadAudioDevices={loadAudioDevices}
                loadingDevices={loadingDevices}
                longPressAction={longPressAction}
                setLongPressAction={setLongPressAction}
                pickFile={pickFile}
                pickShortcut={pickShortcut}
                radioGroup={radioGroup}
                setRadioGroup={setRadioGroup}
                rgbConnected={rgbConnected}
                rgbDevices={rgbDevices}
                rgbProfiles={rgbProfiles}
                deckState={deckState}
              />
            )}

            {/* STEP 2: Style */}
            {step === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Field label={tf("ETIQUETA DEL BOTÓN")}>
                  <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={tf("Mi Botón")} maxLength={20} style={inputStyle} />
                </Field>
                <Field label={tf("SUB-ETIQUETA (OPCIONAL)")}>
                  <input value={sublabel} onChange={(e) => setSublabel(e.target.value)} placeholder={tf("Descripción corta")} maxLength={30} style={inputStyle} />
                </Field>
                <Field label={tf("ICONO (EMOJI O SÍMBOLO — VACÍO = ÍCONO DEL TIPO)")}>
                  <input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder={"▶ ◉ 🎵 💻 🌐 ★"} maxLength={4} style={{ ...inputStyle, fontSize: 20 }} />
                </Field>
                <Field label={tf("IMAGEN PERSONALIZADA (PNG / JPG / GIF)")}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Btn onClick={pickImage}>{tf('Elegir imagen')}</Btn>
                    {imageData && (
                      <>
                        <img src={imageData} alt="" style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: VD.radius.md, border: `1px solid ${VD.border}` }} />
                        <Btn onClick={() => setImageData('')} style={{ color: VD.danger }}>{tf('Quitar')}</Btn>
                      </>
                    )}
                  </div>
                </Field>

                <Field label={tf("ICONO DE MARCA ANIMADO (DOT-MATRIX)")}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    {brandIcon ? (
                      <>
                        <div style={{ position: 'relative', width: 36, height: 36, borderRadius: VD.radius.lg, border: `1px solid ${VD.border}`, overflow: 'hidden', background: VD.elevated }}>
                          <BrandIconDisplay
                            iconKey={brandIcon}
                            customBitmap={brandIconCustomBitmap}
                            customColor={brandIconCustomColor}
                            customPalette={brandIconCustomPalette}
                            animated={false}
                            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
                          />
                        </div>
                        <span style={{ fontFamily: VD.mono, fontSize: 10, color: VD.text }}>
                          {BRAND_ICONS_MAP[brandIcon]?.label ?? brandIcon}
                          {brandIconCustomBitmap && <span style={{ color: accent, marginLeft: 6 }}>✎</span>}
                        </span>
                        <Btn onClick={() => setShowBrandPicker(true)}>{tf('Cambiar')}</Btn>
                        <Btn onClick={() => setShowBrandEditor(true)}>{tf('Editar puntos')}</Btn>
                        {brandIconCustomBitmap && (
                          <Btn onClick={() => { setBrandIconCustomBitmap(undefined); setBrandIconCustomColor(undefined); setBrandIconCustomPalette(undefined); }}>
                            {tf('Restaurar')}
                          </Btn>
                        )}
                        <Btn onClick={() => { setBrandIcon(''); setBrandIconCustomBitmap(undefined); setBrandIconCustomColor(undefined); setBrandIconCustomPalette(undefined); }} style={{ color: VD.danger }}>{tf('Quitar')}</Btn>
                      </>
                    ) : (
                      <Btn onClick={() => setShowBrandPicker(true)}>{tf('Elegir icono de marca')}</Btn>
                    )}
                  </div>
                  {brandIcon && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={brandIconAlwaysAnimate}
                        onChange={e => setBrandIconAlwaysAnimate(e.target.checked)}
                        style={{ accentColor: accent }}
                      />
                      <span style={{ fontFamily: VD.mono, fontSize: 9, letterSpacing: 1, color: VD.textDim }}>
                        {tf('ANIMACIÓN SIEMPRE ACTIVA — si está desactivado, anima solo cuando el botón está encendido (toggle ON)')}
                      </span>
                    </label>
                  )}
                  <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, marginTop: 6 }}>
                    {tf('68 iconos · Fondo transparente · Superpone al color de fondo del botón')}
                  </div>
                </Field>

                {/* 2.1 — Glifo 5×7 personal del usuario */}
                <Field label={tf("GLIFO PERSONAL 5×7 (DOT-MATRIX)")}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    {customGlyph57 && customGlyph57.length === 7 && customGlyph57.some((r) => r > 0) ? (
                      <>
                        <div style={{
                          width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          borderRadius: VD.radius.md, border: `1px solid ${VD.border}`, background: VD.elevated,
                        }}>
                          <Glyph57Inline rows={customGlyph57} color={fgColor || VD.text} />
                        </div>
                        <Btn onClick={() => setShowGlyphEditor(true)}>{tf('Editar')}</Btn>
                        <Btn onClick={() => setCustomGlyph57(undefined)} style={{ color: VD.danger }}>{tf('Quitar')}</Btn>
                      </>
                    ) : (
                      <Btn onClick={() => setShowGlyphEditor(true)}>{tf('Dibujar glifo')}</Btn>
                    )}
                  </div>
                  <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, marginTop: 6 }}>
                    {tf('5×7 puntos hechos a mano. Coherente con la firma del producto.')}
                  </div>
                </Field>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Field label={tf("COLOR DE FONDO")}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input type="color" value={bgColor || '#222222'} onChange={(e) => setBgColor(e.target.value)} style={{ width: 36, height: 28, border: `1px solid ${VD.border}`, background: 'none', cursor: 'pointer', padding: 2 }} />
                      <input value={bgColor} onChange={(e) => setBgColor(e.target.value)} placeholder={"#222222"} style={{ ...inputStyle, flex: 1 }} />
                      {bgColor && <Btn onClick={() => setBgColor('')}>✕</Btn>}
                    </div>
                  </Field>
                  <Field label={tf("COLOR DE TEXTO / ÍCONO")}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input type="color" value={fgColor || '#dcdcdc'} onChange={(e) => setFgColor(e.target.value)} style={{ width: 36, height: 28, border: `1px solid ${VD.border}`, background: 'none', cursor: 'pointer', padding: 2 }} />
                      <input value={fgColor} onChange={(e) => setFgColor(e.target.value)} placeholder={"#dcdcdc"} style={{ ...inputStyle, flex: 1 }} />
                      {fgColor && <Btn onClick={() => setFgColor('')}>✕</Btn>}
                    </div>
                  </Field>
                </div>

                <div style={{ height: 1, background: VD.border }} />

                {/* Widget — live data display on the button cell */}
                <Field label={tf("WIDGET (MUESTRA DATOS EN EL BOTÓN)")}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {([undefined, 'clock', 'weather', 'now-playing', 'sensor', 'variable'] as const).map((w) => {
                      // now-playing on an audio-device button hides the device
                      // name in favor of the playing track — useless combo, so
                      // we lock it out here instead of silently dropping the
                      // widget at render time (was the old behavior).
                      const conflicts = w === 'now-playing' && action.type === 'audio-device';
                      return (
                        <button
                          key={w ?? 'none'}
                          onClick={() => { if (!conflicts) setWidget(w); }}
                          disabled={conflicts}
                          title={conflicts ? tf('Incompatible con acción de Audio: el widget oculta el nombre del dispositivo.') : undefined}
                          style={{
                            flex: '1 1 60px', padding: '5px 0', cursor: conflicts ? 'not-allowed' : 'pointer', borderRadius: VD.radius.sm,
                            background: widget === w ? VD.accentBg : VD.elevated,
                            border: `1px solid ${widget === w ? accent : VD.border}`,
                            fontFamily: VD.mono, fontSize: 8, letterSpacing: 0.5,
                            color: widget === w ? accent : VD.textDim,
                            opacity: conflicts ? 0.4 : 1,
                          }}
                        >
                          {w === undefined ? tf('NINGUNO') : w === 'clock' ? tf('RELOJ') : w === 'weather' ? tf('CLIMA') : w === 'now-playing' ? tf('MÚSICA') : w === 'sensor' ? 'SENSOR' : 'VARIABLE'}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, marginTop: 4 }}>
                    {tf('Sustituye el ícono/etiqueta con datos en vivo. El botón sigue siendo ejecutable.')}
                  </div>
                  {widget === 'sensor' && (
                    <div style={{ marginTop: 8, padding: 10, background: VD.elevated, border: `1px solid ${VD.border}`, borderRadius: VD.radius.md, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <SensorPicker
                        sensors={sensorList}
                        value={sensorWidgetId}
                        onChange={setSensorWidgetId}
                        accent={accent}
                      />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          value={sensorWidgetSuffix}
                          onChange={(e) => setSensorWidgetSuffix(e.target.value)}
                          placeholder={tf("Etiqueta (ej. CPU)")}
                          style={{ ...inputStyle, flex: 1 }}
                        />
                        <input
                          value={sensorWidgetWarn}
                          onChange={(e) => setSensorWidgetWarn(e.target.value)}
                          placeholder={"Warn ≥"}
                          style={{ ...inputStyle, width: 80 }}
                        />
                        <input
                          value={sensorWidgetCrit}
                          onChange={(e) => setSensorWidgetCrit(e.target.value)}
                          placeholder={"Crit ≥"}
                          style={{ ...inputStyle, width: 80 }}
                        />
                      </div>
                      <div style={{ fontFamily: VD.mono, fontSize: 7, color: VD.textMuted }}>
                        {t('ed.thresholdHint')}
                      </div>
                    </div>
                  )}
                  {widget === 'variable' && (
                    <div style={{ marginTop: 8, padding: 10, background: VD.elevated, border: `1px solid ${VD.border}`, borderRadius: VD.radius.md, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <input
                        value={varWidgetName}
                        onChange={(e) => setVarWidgetName(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                        placeholder={tf("Nombre de variable (ej. tomas)")}
                        list="vd-known-vars"
                        style={{ ...inputStyle }}
                      />
                      <datalist id="vd-known-vars">
                        {Object.keys(deckState).map((k) => <option key={k} value={k} />)}
                      </datalist>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          value={varWidgetPrefix}
                          onChange={(e) => setVarWidgetPrefix(e.target.value)}
                          placeholder={tf("Prefijo (ej. 🎬 )")}
                          style={{ ...inputStyle, flex: 1 }}
                        />
                        <input
                          value={varWidgetSuffix}
                          onChange={(e) => setVarWidgetSuffix(e.target.value)}
                          placeholder={tf("Etiqueta debajo")}
                          style={{ ...inputStyle, flex: 1 }}
                        />
                      </div>
                      <div style={{ fontFamily: VD.mono, fontSize: 7, color: VD.textMuted }}>
                        {tf('Muestra el valor en vivo de una variable. Combínalo con acciones "Incrementar variable" / "Asignar variable" para hacer contadores. Las variables sin valor se muestran como 0.')}
                      </div>
                    </div>
                  )}
                </Field>

                {/* Visibility condition */}
                <Field label={tf("VISIBLE SOLO SI ESTA APP ESTÁ ACTIVA (opcional)")}>
                  <input
                    value={visibleIfApp}
                    onChange={(e) => setVisibleIfApp(e.target.value)}
                    placeholder={"spotify, chrome, obs64 ..."}
                    style={inputStyle}
                  />
                  <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, marginTop: 4 }}>
                    {tf('Nombre del proceso sin .exe. Vacío = siempre visible.')}
                  </div>
                </Field>

                {/* Scheduled trigger */}
                <Field label={tf("DISPARAR AUTOMÁTICAMENTE A LA HORA (HH:MM)")}>
                  <input
                    value={timerTriggerAt}
                    onChange={(e) => setTimerTriggerAt(e.target.value)}
                    placeholder={"08:00"}
                    maxLength={5}
                    style={inputStyle}
                  />
                  <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, marginTop: 4 }}>
                    {tf('Formato 24h. Solo se dispara cuando la página del botón está activa.')}
                  </div>
                </Field>

                {/* Visibility by sensor */}
                <Field label={tf("VISIBLE SOLO SI SENSOR (opcional)")}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <SensorPicker
                      sensors={sensorList}
                      value={visibleIfSensorId}
                      onChange={setVisibleIfSensorId}
                      accent={accent}
                      allowEmpty
                    />
                    {visibleIfSensorId && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <select
                          value={visibleIfSensorOp}
                          onChange={(e) => setVisibleIfSensorOp(e.target.value as any)}
                          style={{ ...inputStyle, width: 70 }}
                        >
                          <option value=">">{'>'}</option>
                          <option value="<">{'<'}</option>
                          <option value=">=">{'≥'}</option>
                          <option value="<=">{'≤'}</option>
                          <option value="==">{'='}</option>
                        </select>
                        <input
                          value={visibleIfSensorVal}
                          onChange={(e) => setVisibleIfSensorVal(e.target.value)}
                          placeholder={tf("Valor (ej. 80)")}
                          style={{ ...inputStyle, flex: 1 }}
                        />
                      </div>
                    )}
                  </div>
                  <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, marginTop: 4 }}>
                    {tf('Aparece cuando el sensor cumple la condición. Combinable con app de arriba.')}
                  </div>
                </Field>

                {/* Sensor-triggered automatic execution */}
                <Field label={tf("DISPARAR CUANDO SENSOR (opcional)")}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <SensorPicker
                      sensors={sensorList}
                      value={sensorTriggerId}
                      onChange={setSensorTriggerId}
                      accent={accent}
                      allowEmpty
                    />
                    {sensorTriggerId && (
                      <>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <select
                            value={sensorTriggerOp}
                            onChange={(e) => setSensorTriggerOp(e.target.value as any)}
                            style={{ ...inputStyle, width: 70 }}
                          >
                            <option value=">">{'>'}</option>
                            <option value="<">{'<'}</option>
                            <option value=">=">{'≥'}</option>
                            <option value="<=">{'≤'}</option>
                            <option value="==">{'='}</option>
                          </select>
                          <input
                            value={sensorTriggerVal}
                            onChange={(e) => setSensorTriggerVal(e.target.value)}
                            placeholder={tf("Valor (ej. 85)")}
                            style={{ ...inputStyle, flex: 1 }}
                          />
                          <input
                            value={sensorTriggerCooldown}
                            onChange={(e) => setSensorTriggerCooldown(e.target.value)}
                            placeholder={"Cooldown s"}
                            style={{ ...inputStyle, width: 100 }}
                          />
                        </div>
                      </>
                    )}
                  </div>
                  <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, marginTop: 4 }}>
                    {tf('Ejecuta la acción cuando se cumple la condición. Cooldown evita que se redispare cada poll (default 60s).')}
                  </div>
                </Field>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ height: 54, borderTop: `1px solid ${VD.border}`, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 10, flexShrink: 0 }}>
          <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} style={{ padding: '8px 14px', border: `1px solid ${VD.border}`, background: 'transparent', fontFamily: VD.mono, fontSize: 10, letterSpacing: 2, color: step === 0 ? VD.textMuted : VD.textDim, cursor: step === 0 ? 'default' : 'pointer' }}>
            {t('ed.back')}
          </button>
          <div style={{ flex: 1 }} />
          <span style={{ fontFamily: VD.mono, fontSize: 10, color: VD.textMuted, letterSpacing: 1 }}>{t('ed.stepN', { n: step + 1, total: STEPS.length })}</span>
          <button onClick={onClose} style={{ padding: '8px 14px', border: `1px solid ${VD.border}`, background: 'transparent', fontFamily: VD.mono, fontSize: 10, letterSpacing: 2, color: VD.textDim, cursor: 'pointer' }}>{t('ed.cancel')}</button>
          <button onClick={() => { if (step < STEPS.length - 1) setStep(step + 1); else handleSave(); }} style={{ padding: '8px 20px', background: accent, border: 'none', fontFamily: VD.mono, fontSize: 10, letterSpacing: 2, color: '#fff', cursor: 'pointer', borderRadius: VD.radius.sm }}>
            {step < STEPS.length - 1 ? t('ed.next') : t('ed.save')}
          </button>
        </div>
      </div>

      {/* Brand icon picker modal — lazy */}
      {showBrandPicker && (
        <Suspense fallback={null}>
          <BrandIconPicker
            current={brandIcon}
            accent={accent}
            onSelect={(key) => { setBrandIcon(key); setBrandIconCustomBitmap(undefined); setBrandIconCustomColor(undefined); setBrandIconCustomPalette(undefined); }}
            onClose={() => setShowBrandPicker(false)}
          />
        </Suspense>
      )}

      {/* 2.1 — Editor de glifo 5×7 */}
      {showGlyphEditor && (
        <Glyph57Editor
          initial={customGlyph57}
          accent={accent}
          onSave={(rows) => {
            // Si todo está vacío, limpiar el campo
            if (rows.every((r) => r === 0)) setCustomGlyph57(undefined);
            else setCustomGlyph57(rows);
          }}
          onClose={() => setShowGlyphEditor(false)}
        />
      )}

      {/* Brand icon dot editor modal — lazy */}
      {showBrandEditor && brandIcon && (
        <Suspense fallback={null}>
          <BrandIconEditor
            iconKey={brandIcon}
            customBitmap={brandIconCustomBitmap}
            customColor={brandIconCustomColor}
            customPalette={brandIconCustomPalette}
            accent={accent}
            onSave={(bmp, col, pal) => { setBrandIconCustomBitmap(bmp); setBrandIconCustomColor(col); setBrandIconCustomPalette(pal); }}
            onClose={() => setShowBrandEditor(false)}
          />
        </Suspense>
      )}
    </div>
  );
}

// Compact slot editor for folder sub-buttons
