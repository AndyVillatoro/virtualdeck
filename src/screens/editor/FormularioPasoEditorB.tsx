import React from 'react';
import { PasoAccion } from './PasoAccion';
import { PasoConfigurar } from './PasoConfigurar';
import { PasoEstilo } from './PasoEstilo';
import { EditorSubdivision2x2 } from './EditorSubdivision2x2';
import type { SubButtonConfig } from '../../types';

type PropsAccion = React.ComponentProps<typeof PasoAccion>;
type PropsConfigurar = React.ComponentProps<typeof PasoConfigurar>;
type PropsEstilo = React.ComponentProps<typeof PasoEstilo>;

type FormularioPasoEditorBProps = PropsAccion & PropsConfigurar & PropsEstilo & {
  parentId: string;
  is2x2Mode: boolean;
  step: number;
  subButtons: SubButtonConfig[];
  onSubButtonsChange: React.Dispatch<React.SetStateAction<SubButtonConfig[]>>;
};

/**
 * Cuerpo del formulario del editor: cuadrantes 2×2 o el paso 0/1/2.
 * Era el bloque condicional grande del JSX de `EditorB`.
 */
export function FormularioPasoEditorB(props: FormularioPasoEditorBProps) {
  const {
    parentId, is2x2Mode, step, subButtons, onSubButtonsChange,
    accent, action, setAction, applyPreset, extraActions, setExtraActions,
    filteredPresets, presetCategory, setPresetCategory, presetSearch, setPresetSearch,
    showExtraPicker, setShowExtraPicker, actionToggleOff, setActionToggleOff,
    applyFolderPreset, audioDevices, audioError, capturing, setCapturing,
    folderButtons, setFolderButtons, globalHotkey, setGlobalHotkey,
    inTrayMenu, setInTrayMenu, isToggle, setIsToggle, label, setLabel,
    loadAudioDevices, loadingDevices, longPressAction, setLongPressAction,
    pickFile, pickShortcut, radioGroup, setRadioGroup, rgbConnected, rgbDevices,
    rgbProfiles, deckState, widget, setWidget, sliderWidget, setSliderWidget, setStep,
    bgColor, brandIcon, brandIconAlwaysAnimate, brandIconCustomBitmap,
    brandIconCustomColor, brandIconCustomPalette, setBrandIconCustomPalette,
    customGlyph57, fgColor, icon, imageData, pickImage, sensorList,
    sensorTriggerCooldown, sensorTriggerId, sensorTriggerOp, setSensorTriggerOp,
    sensorTriggerVal, sensorWidgetCrit, sensorWidgetId, sensorWidgetSuffix,
    sensorWidgetWarn, setBgColor, setBrandIcon, setBrandIconAlwaysAnimate,
    setBrandIconCustomBitmap, setBrandIconCustomColor, setCustomGlyph57,
    setFgColor, setIcon, setImageData, setSensorTriggerCooldown,
    setSensorTriggerId, setSensorTriggerVal, setSensorWidgetCrit,
    setSensorWidgetId, setSensorWidgetSuffix, setSensorWidgetWarn,
    setShowBrandEditor, setShowBrandPicker, setShowGlyphEditor, setSublabel,
    setTimerTriggerAt, setVarWidgetName, setVarWidgetPrefix, setVarWidgetSuffix,
    setVisibleIfApp, setVisibleIfSensorId, setVisibleIfSensorVal, sublabel,
    timerTriggerAt, varWidgetName, varWidgetPrefix, varWidgetSuffix,
    visibleIfApp, visibleIfSensorId, visibleIfSensorOp, setVisibleIfSensorOp,
    visibleIfSensorVal, currencyWidget, setCurrencyWidget, pinned, setPinned,
  } = props;

  if (is2x2Mode) {
    return (
      <EditorSubdivision2x2
        parentId={parentId}
        subButtons={subButtons}
        onChange={onSubButtonsChange}
        accent={accent}
      />
    );
  }

  return (
    <>
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
          widget={widget}
          setWidget={setWidget}
          sliderWidget={sliderWidget}
          setSliderWidget={setSliderWidget}
          setStep={setStep}
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
          currencyWidget={currencyWidget}
          setCurrencyWidget={setCurrencyWidget}
          sliderWidget={sliderWidget}
          setSliderWidget={setSliderWidget}
          pinned={pinned}
          setPinned={setPinned}
        />
      )}
    </>
  );
}
