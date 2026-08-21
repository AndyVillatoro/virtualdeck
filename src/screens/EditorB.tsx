import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { PRESETS, FOLDER_PRESETS, type ButtonPreset } from './editor/actionData';
import {
  accionInicial, estiloInicial, widgetInicial, visibilidadInicial, disparadoresInicial,
} from './editor/valoresIniciales';
import { PasoAccion } from './editor/PasoAccion';
import { PasoConfigurar } from './editor/PasoConfigurar';
import { PasoEstilo } from './editor/PasoEstilo';
import { construirBoton } from './editor/guardar';
import { useTheme } from '../utils/theme';
import { DotLabel } from '../components/DotLabel';
// 4.1 — picker y editor del catálogo de marcas se cargan a demanda. Evita
// arrastrar el bundle de marcas al árbol inicial cuando el usuario no abre el modal.
const BrandIconPicker = lazy(() => import('../components/BrandIconPicker').then(m => ({ default: m.BrandIconPicker })));
const BrandIconEditor = lazy(() => import('../components/BrandIconEditor').then(m => ({ default: m.BrandIconEditor })));
import { ButtonCell } from '../components/ButtonCell';
import { Glyph57Editor } from '../components/Glyph57Editor';
import { useT, useFieldText } from '../utils/i18n';
import type { AudioDevice, ButtonConfig, RGBDeviceInfo, RGBProfile } from '../types';

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
  const t = useT();
  const tf = useFieldText();
  const api = window.electronAPI;
  // Los valores de partida salen de `valoresIniciales`: alli estan todos los
  // `?? ''` que antes vivian aqui dentro, uno por campo.
  //
  // Se calculan una vez y se pasan como valor inicial. No hace falta `useState`
  // con funcion perezosa: son tres objetos planos, construirlos es gratis.
  const ini = accionInicial(button);
  const est = estiloInicial(button);
  const wid = widgetInicial(button);
  const vis = visibilidadInicial(button);
  const dis = disparadoresInicial(button);

  const [step, setStep] = useState(0);
  const [action, setAction] = useState(ini.action);
  const [extraActions, setExtraActions] = useState(ini.extraActions);
  const [showExtraPicker, setShowExtraPicker] = useState(false);
  const [isToggle, setIsToggle] = useState(ini.isToggle);
  const [actionToggleOff, setActionToggleOff] = useState(ini.actionToggleOff);
  const [label, setLabel] = useState(est.label);
  const [sublabel, setSublabel] = useState(est.sublabel);
  const [icon, setIcon] = useState(est.icon);
  const [imageData, setImageData] = useState(est.imageData);
  const [brandIcon, setBrandIcon] = useState(est.brandIcon);
  const [brandIconAlwaysAnimate, setBrandIconAlwaysAnimate] = useState(est.brandIconAlwaysAnimate);
  const [brandIconCustomBitmap, setBrandIconCustomBitmap] = useState(est.brandIconCustomBitmap);
  const [brandIconCustomColor, setBrandIconCustomColor] = useState(est.brandIconCustomColor);
  const [brandIconCustomPalette, setBrandIconCustomPalette] = useState(est.brandIconCustomPalette);
  const [showBrandPicker, setShowBrandPicker] = useState(false);
  const [showBrandEditor, setShowBrandEditor] = useState(false);
  const [bgColor, setBgColor] = useState(est.bgColor);
  const [fgColor, setFgColor] = useState(est.fgColor);
  // 1.4 — Disparadores externos
  const [globalHotkey, setGlobalHotkey] = useState(dis.globalHotkey);
  const [inTrayMenu, setInTrayMenu] = useState(dis.inTrayMenu);
  // 3.x — Long press + radio group
  const [longPressAction, setLongPressAction] = useState(ini.longPressAction);
  const [radioGroup, setRadioGroup] = useState(ini.radioGroup);
  // Widget / Visibility / Scheduled trigger
  const [widget, setWidget] = useState(est.widget);
  const [sensorWidgetId, setSensorWidgetId] = useState(wid.sensorWidgetId);
  const [sensorWidgetSuffix, setSensorWidgetSuffix] = useState(wid.sensorWidgetSuffix);
  const [sensorWidgetWarn, setSensorWidgetWarn] = useState(wid.sensorWidgetWarn);
  const [sensorWidgetCrit, setSensorWidgetCrit] = useState(wid.sensorWidgetCrit);
  const [varWidgetName, setVarWidgetName] = useState(wid.varWidgetName);
  const [varWidgetPrefix, setVarWidgetPrefix] = useState(wid.varWidgetPrefix);
  const [varWidgetSuffix, setVarWidgetSuffix] = useState(wid.varWidgetSuffix);
  const [visibleIfApp, setVisibleIfApp] = useState(vis.visibleIfApp);
  const [visibleIfSensorId, setVisibleIfSensorId] = useState(vis.visibleIfSensorId);
  const [visibleIfSensorOp, setVisibleIfSensorOp] = useState(vis.visibleIfSensorOp);
  const [visibleIfSensorVal, setVisibleIfSensorVal] = useState(vis.visibleIfSensorVal);
  const [timerTriggerAt, setTimerTriggerAt] = useState(dis.timerTriggerAt);
  const [sensorTriggerId, setSensorTriggerId] = useState(dis.sensorTriggerId);
  const [sensorTriggerOp, setSensorTriggerOp] = useState(dis.sensorTriggerOp);
  const [sensorTriggerVal, setSensorTriggerVal] = useState(dis.sensorTriggerVal);
  const [sensorTriggerCooldown, setSensorTriggerCooldown] = useState(dis.sensorTriggerCooldown);
  // Sensor list shared by widget/visibility/trigger pickers.
  const [sensorList, setSensorList] = useState<import('../types').Sensor[]>([]);
  // 2.1 — Glifo 5×7 personalizado (7 enteros bitmask)
  const [customGlyph57, setCustomGlyph57] = useState(est.customGlyph57);
  const [showGlyphEditor, setShowGlyphEditor] = useState(false);
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [rgbDevices, setRgbDevices] = useState<RGBDeviceInfo[]>([]);
  const [rgbConnected, setRgbConnected] = useState(false);
  const [presetCategory, setPresetCategory] = useState<ButtonPreset['category']>('APPS');
  const [presetSearch, setPresetSearch] = useState('');
  const [capturing, setCapturing] = useState(false);
  const [folderButtons, setFolderButtons] = useState(ini.folderButtons);
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
  //
  // Tambien cuando cambia el tipo: si se elige "carpeta" despues de haber
  // preparado los botones, el efecto no corria y la accion se quedaba sin
  // ellos. No hay bucle — dentro solo se entra si el tipo ya es 'folder'.
  useEffect(() => {
    if (action.type === 'folder') {
      setAction(a => ({ ...a, folderButtons }));
    }
  }, [folderButtons, action.type]);

  const handleSave = () => {
    onSave(construirBoton(button, {
      action,
      extraActions,
      label,
      sublabel,
      icon,
      imageData,
      brandIcon,
      brandIconAlwaysAnimate,
      brandIconCustomBitmap,
      brandIconCustomColor,
      brandIconCustomPalette,
      bgColor,
      fgColor,
      folderButtons,
      isToggle,
      actionToggleOff,
      globalHotkey,
      inTrayMenu,
      customGlyph57,
      longPressAction,
      radioGroup,
      widget,
      sensorWidgetId,
      sensorWidgetSuffix,
      sensorWidgetWarn,
      sensorWidgetCrit,
      varWidgetName,
      varWidgetPrefix,
      varWidgetSuffix,
      visibleIfApp,
      visibleIfSensorId,
      visibleIfSensorOp,
      visibleIfSensorVal,
      timerTriggerAt,
      sensorTriggerId,
      sensorTriggerOp,
      sensorTriggerVal,
      sensorTriggerCooldown,
    }));
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
              {t('editor.previewHint')}<br />{t('editor.previewHint2')}
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
              <PasoEstilo
                accent={accent}
                action={action}
                bgColor={bgColor}
                brandIcon={brandIcon}
                brandIconAlwaysAnimate={brandIconAlwaysAnimate}
                brandIconCustomBitmap={brandIconCustomBitmap}
                brandIconCustomColor={brandIconCustomColor}
                brandIconCustomPalette={brandIconCustomPalette}
                setBrandIconCustomPalette={setBrandIconCustomPalette}
                button={button}
                customGlyph57={customGlyph57}
                deckState={deckState}
                fgColor={fgColor}
                icon={icon}
                imageData={imageData}
                label={label}
                pickImage={pickImage}
                sensorList={sensorList}
                sensorTriggerCooldown={sensorTriggerCooldown}
                sensorTriggerId={sensorTriggerId}
                sensorTriggerOp={sensorTriggerOp}
                setSensorTriggerOp={setSensorTriggerOp}
                sensorTriggerVal={sensorTriggerVal}
                sensorWidgetCrit={sensorWidgetCrit}
                sensorWidgetId={sensorWidgetId}
                sensorWidgetSuffix={sensorWidgetSuffix}
                sensorWidgetWarn={sensorWidgetWarn}
                setBgColor={setBgColor}
                setBrandIcon={setBrandIcon}
                setBrandIconAlwaysAnimate={setBrandIconAlwaysAnimate}
                setBrandIconCustomBitmap={setBrandIconCustomBitmap}
                setBrandIconCustomColor={setBrandIconCustomColor}
                setCustomGlyph57={setCustomGlyph57}
                setFgColor={setFgColor}
                setIcon={setIcon}
                setImageData={setImageData}
                setLabel={setLabel}
                setSensorTriggerCooldown={setSensorTriggerCooldown}
                setSensorTriggerId={setSensorTriggerId}
                setSensorTriggerVal={setSensorTriggerVal}
                setSensorWidgetCrit={setSensorWidgetCrit}
                setSensorWidgetId={setSensorWidgetId}
                setSensorWidgetSuffix={setSensorWidgetSuffix}
                setSensorWidgetWarn={setSensorWidgetWarn}
                setShowBrandEditor={setShowBrandEditor}
                setShowBrandPicker={setShowBrandPicker}
                setShowGlyphEditor={setShowGlyphEditor}
                setSublabel={setSublabel}
                setTimerTriggerAt={setTimerTriggerAt}
                setVarWidgetName={setVarWidgetName}
                setVarWidgetPrefix={setVarWidgetPrefix}
                setVarWidgetSuffix={setVarWidgetSuffix}
                setVisibleIfApp={setVisibleIfApp}
                setVisibleIfSensorId={setVisibleIfSensorId}
                setVisibleIfSensorVal={setVisibleIfSensorVal}
                setWidget={setWidget}
                sublabel={sublabel}
                timerTriggerAt={timerTriggerAt}
                varWidgetName={varWidgetName}
                varWidgetPrefix={varWidgetPrefix}
                varWidgetSuffix={varWidgetSuffix}
                visibleIfApp={visibleIfApp}
                visibleIfSensorId={visibleIfSensorId}
                visibleIfSensorOp={visibleIfSensorOp}
                setVisibleIfSensorOp={setVisibleIfSensorOp}
                visibleIfSensorVal={visibleIfSensorVal}
                widget={widget}
              />
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
