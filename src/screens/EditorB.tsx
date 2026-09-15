import React, { useEffect, useState } from 'react';
import { PRESETS, FOLDER_PRESETS, type ButtonPreset } from './editor/actionData';
import {
  accionInicial, estiloInicial, widgetInicial, visibilidadInicial, disparadoresInicial,
} from './editor/valoresIniciales';
import { construirBoton } from './editor/guardar';
import { botonConfigurado } from './editor/botonConfigurado';
import { CabeceraEditorB } from './editor/CabeceraEditorB';
import { FranjaPasosEditorB, STEPS } from './editor/FranjaPasosEditorB';
import { FormularioPasoEditorB } from './editor/FormularioPasoEditorB';
import { useTheme } from '../utils/theme';
import { PieEditorB } from './editor/PieEditorB';
import { ModalesIconosEditor } from './editor/ModalesIconosEditor';
import type { ButtonConfig, RGBProfile, SubButtonConfig } from '../types';

interface EditorBProps {
  button: ButtonConfig;
  rgbProfiles?: RGBProfile[];
  /** Variables de estado actuales — para autocompletar el nombre en el widget 'variable'. */
  deckState?: Record<string, string>;
  onClose: () => void;
  onSave: (updated: ButtonConfig) => void;
  /** 7.6: Vaciar botón con confirmación y soporte de deshacer */
  onClear?: (id: string) => void;
}

// Las claves i18n de los pasos viven en `FranjaPasosEditorB` (exporta STEPS).
import { VistaPrevia } from './editor/VistaPrevia';
import { useCatalogos } from './editor/useCatalogos';
import { useCapturaHotkey } from './editor/useCapturaHotkey';
import { usePegarImagen } from './editor/usePegarImagen';


export function EditorB({ button, rgbProfiles = [], deckState = {}, onClose, onSave, onClear }: EditorBProps) {
  const VD = useTheme();
  const api = window.electronAPI;
  const isConfigured = botonConfigurado(button);
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

  const [is2x2Mode, setIs2x2Mode] = useState<boolean>(() => !!(button.subButtons && button.subButtons.length === 4));
  const [subButtons, setSubButtons] = useState<SubButtonConfig[]>(() => {
    if (button.subButtons && button.subButtons.length === 4) return button.subButtons;
    return Array.from({ length: 4 }, (_, i) => ({
      id: `${button.id}-q${i}`,
      label: '',
      action: { type: 'none' as const },
    }));
  });

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
  const [pinned, setPinned] = useState(est.pinned);
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
  const [currencyWidget, setCurrencyWidget] = useState(wid.currencyWidget);
  const [sliderWidget, setSliderWidget] = useState(wid.sliderWidget);
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
  // 2.1 — Glifo 5×7 personalizado (7 enteros bitmask)
  const [customGlyph57, setCustomGlyph57] = useState(est.customGlyph57);
  const [showGlyphEditor, setShowGlyphEditor] = useState(false);
  const [presetCategory, setPresetCategory] = useState<ButtonPreset['category']>('APPS');
  const [presetSearch, setPresetSearch] = useState('');
  const [capturing, setCapturing] = useState(false);
  const [folderButtons, setFolderButtons] = useState(ini.folderButtons);

  const {
    audioDevices, loadingDevices, audioError, loadAudioDevices, rgbDevices, rgbConnected, sensorList,
  } = useCatalogos(action.type, step, `${widget}|${visibleIfSensorId}|${sensorTriggerId}`);

  // Lo unico que quedaba en aquel efecto y no era cargar una lista: un boton
  // de audio no puede llevar el widget de reproduccion, y al cambiar el tipo
  // sobre un boton ya guardado se quedaba puesto.
  useEffect(() => {
    if (action.type === 'audio-device' && widget === 'now-playing') setWidget(undefined);
  }, [action.type, widget]);

  useCapturaHotkey(
    capturing,
    (combo) => setAction((a) => ({ ...a, hotkey: combo })),
    () => setCapturing(false),
  );

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
      is2x2Mode,
      subButtons,
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
      currencyWidget,
      sliderWidget,
      visibleIfApp,
      visibleIfSensorId,
      visibleIfSensorOp,
      visibleIfSensorVal,
      timerTriggerAt,
      sensorTriggerId,
      sensorTriggerOp,
      sensorTriggerVal,
      sensorTriggerCooldown,
      pinned,
    }));
  };

  const applyPreset = (preset: ButtonPreset) => {
    setAction(preset.action);
    setLabel(preset.label);
    setSublabel(preset.sublabel ?? '');
    setIcon(preset.icon ?? '');
    setBgColor(preset.bgColor ?? '');
    setFgColor(preset.fgColor ?? '');
    if (preset.widget) {
      setWidget(preset.widget);
      if (preset.sliderWidget) setSliderWidget(preset.sliderWidget);
    }
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

  usePegarImagen(setImageData);

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
        <CabeceraEditorB
          buttonId={button.id}
          is2x2Mode={is2x2Mode}
          onCambiarModo={setIs2x2Mode}
          onClose={onClose}
        />

        {/* Steps */}
        <FranjaPasosEditorB is2x2Mode={is2x2Mode} step={step} onPaso={setStep} />

        {/* Body */}
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          <VistaPrevia
            id={button.id}
            page={button.page}
            accent={accent}
            action={action}
            extraActions={extraActions}
            isToggle={isToggle}
            subButtons={subButtons}
            is2x2Mode={is2x2Mode}
            campos={{
              label, sublabel, icon, imageData, brandIcon,
              brandIconAlwaysAnimate, brandIconCustomBitmap,
              brandIconCustomColor, brandIconCustomPalette,
              customGlyph57, bgColor, fgColor, pinned,
              widget, sliderWidget,
            }}
          />

          {/* Form */}
          {/* `key={step}` fuerza a React a crear un contenedor nuevo en cada
              paso, y uno nuevo nace arriba del todo. Sin esto se reutilizaba
              el mismo elemento y **conservaba el desplazamiento del paso
              anterior**: al pasar a Configurar aparecia ya bajado, tapando los
              campos de arriba, que son los que dicen que hace el boton. */}
          <div key={is2x2Mode ? 'subdivision-2x2' : step} className="vd-scroll" style={{ flex: 1, padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

            <FormularioPasoEditorB
              parentId={button.id}
              is2x2Mode={is2x2Mode}
              step={step}
              subButtons={subButtons}
              onSubButtonsChange={setSubButtons}
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
              widget={widget}
              setWidget={setWidget}
              sliderWidget={sliderWidget}
              setSliderWidget={setSliderWidget}
              setStep={setStep}
              bgColor={bgColor}
              brandIcon={brandIcon}
              brandIconAlwaysAnimate={brandIconAlwaysAnimate}
              brandIconCustomBitmap={brandIconCustomBitmap}
              brandIconCustomColor={brandIconCustomColor}
              brandIconCustomPalette={brandIconCustomPalette}
              setBrandIconCustomPalette={setBrandIconCustomPalette}
              customGlyph57={customGlyph57}
              fgColor={fgColor}
              icon={icon}
              imageData={imageData}
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
              currencyWidget={currencyWidget}
              setCurrencyWidget={setCurrencyWidget}
              pinned={pinned}
              setPinned={setPinned}
            />
          </div>
        </div>

        {/* Footer */}
        <PieEditorB
          step={step}
          totalSteps={STEPS.length}
          is2x2Mode={is2x2Mode}
          accent={accent}
          isConfigured={isConfigured}
          buttonId={button.id}
          onBack={() => setStep(Math.max(0, step - 1))}
          onNext={() => setStep(step + 1)}
          onSave={handleSave}
          onClose={onClose}
          onClear={onClear}
        />
      </div>
      {/* Icon Pickers & Editors Modals */}
      <ModalesIconosEditor
        showBrandPicker={showBrandPicker}
        onCloseBrandPicker={() => setShowBrandPicker(false)}
        brandIcon={brandIcon}
        accent={accent}
        onSelectBrandIcon={(key) => {
          setBrandIcon(key);
          setBrandIconCustomBitmap(undefined);
          setBrandIconCustomColor(undefined);
          setBrandIconCustomPalette(undefined);
        }}
        showGlyphEditor={showGlyphEditor}
        onCloseGlyphEditor={() => setShowGlyphEditor(false)}
        customGlyph57={customGlyph57}
        onSaveGlyph57={setCustomGlyph57}
        showBrandEditor={showBrandEditor}
        onCloseBrandEditor={() => setShowBrandEditor(false)}
        brandIconCustomBitmap={brandIconCustomBitmap}
        brandIconCustomColor={brandIconCustomColor}
        brandIconCustomPalette={brandIconCustomPalette}
        onSaveBrandEditor={(bmp, col, pal) => {
          setBrandIconCustomBitmap(bmp);
          setBrandIconCustomColor(col);
          setBrandIconCustomPalette(pal);
        }}
      />
    </div>
  );
}

// Compact slot editor for folder sub-buttons
