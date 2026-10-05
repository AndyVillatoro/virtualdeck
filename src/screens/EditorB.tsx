import React from 'react';
import { PRESETS, ACTION_TYPES } from './editor/actionData';
import { CabeceraEditorB } from './editor/CabeceraEditorB';
import { PieEditorB } from './editor/PieEditorB';
import { VistaPrevia } from './editor/VistaPrevia';
import { ModalesIconosEditor } from './editor/ModalesIconosEditor';
import { SeccionAjustes } from '../components/settings/SeccionAjustes';
import { SeccionPresets } from './editor/SeccionPresets';
import { SeccionAccion } from './editor/SeccionAccion';
import { SeccionApariencia } from './editor/SeccionApariencia';
import { SeccionComportamiento } from './editor/SeccionComportamiento';
import { SeccionAvanzado } from './editor/SeccionAvanzado';
import { useDockPresets } from './editor/useDockPresets';
import { limpiarCamposIcono } from './editor/tiposIcono';
import { useCatalogos } from './editor/useCatalogos';
import { useEstadoEditor } from './editor/useEstadoEditor';
import { useTheme } from '../utils/theme';
import { useT } from '../utils/i18n';
import type { ButtonConfig, PageConfig, RGBProfile } from '../types';

interface EditorBProps {
  button: ButtonConfig;
  rgbProfiles?: RGBProfile[];
  deckState?: Record<string, string>;
  pages?: PageConfig[];
  onClose: () => void;
  onSave: (updated: ButtonConfig) => void;
  onClear?: (id: string) => void;
}

export function EditorB({
  button,
  rgbProfiles = [],
  deckState = {},
  pages = [],
  onClose,
  onSave,
  onClear,
}: EditorBProps) {
  const VD = useTheme();
  const t = useT();
  const accent = VD.accent;

  // Detección de control físico y presets de dock
  const dockInfo = useDockPresets(button, pages);

  const e = useEstadoEditor({ button, onSave, dockGesto: dockInfo.gesto });

  const {
    audioDevices, loadingDevices, audioError, loadAudioDevices, rgbDevices, rgbConnected, sensorList,
  } = useCatalogos(e.action.type, undefined, `${e.widget}|${e.visibleIfSensorId}|${e.sensorTriggerId}`);

  const filteredPresets = PRESETS.filter((p) => {
    if (e.presetSearch.trim()) {
      const q = e.presetSearch.toLowerCase();
      return p.label.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
    }
    return p.category === e.presetCategory;
  });

  // Insignias informativas para las cabeceras acordeón
  const actionTypeObj = ACTION_TYPES.find((at) => at.type === e.action.type);
  const actionBadge = e.action.type !== 'none' && actionTypeObj ? t(actionTypeObj.label) : undefined;
  const dockBadge = dockInfo.esDock && dockInfo.controlMeta
    ? `${dockInfo.controlMeta.control.toUpperCase()}${dockInfo.controlMeta.gesto ? ` · ${dockInfo.controlMeta.gesto.toUpperCase()}` : ''}`
    : undefined;
  const appearanceBadge = e.label || (e.icon ? e.icon : undefined);
  const behaviorBadge = e.isToggle ? 'TOGGLE' : (e.fijo ? 'FIJO' : undefined);
  const advancedBadge = e.is2x2Mode ? '2×2' : (e.extraActions.length > 0 ? `+${e.extraActions.length}` : undefined);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.75)',
      }}
    >
      <div onClick={onClose} style={{ position: 'absolute', inset: 0 }} />

      <div
        onClick={(ev) => ev.stopPropagation()}
        style={{
          position: 'relative',
          width: 'min(960px, 96vw)',
          height: 'min(660px, 94vh)',
          background: VD.surface,
          border: `1px solid ${VD.borderStrong}`,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: VD.shadow.modal,
          borderRadius: VD.radius.sm,
        }}
      >
        {/* Cabecera */}
        <CabeceraEditorB
          buttonId={button.id}
          is2x2Mode={e.is2x2Mode}
          onCambiarModo={(m) => {
            e.setIs2x2Mode(m);
            if (m) e.setSeccionesAbiertas((prev) => ({ ...prev, advanced: true }));
          }}
          onClose={onClose}
        />

        {/* Cuerpo: Vista previa sticky a la izquierda + Acordeón de 5 secciones a la derecha */}
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          <VistaPrevia
            id={button.id}
            page={button.page}
            accent={accent}
            action={e.action}
            extraActions={e.extraActions}
            isToggle={e.isToggle}
            subButtons={e.subButtons}
            is2x2Mode={e.is2x2Mode}
            campos={{
              label: e.label,
              sublabel: e.sublabel,
              ...limpiarCamposIcono(e.tipoIcono, {
                icon: e.tipoIcono === 'glifo' ? e.icon : e.glifoEncima,
                imageData: e.imageData,
                brandIcon: e.brandIcon,
                brandIconAlwaysAnimate: e.brandIconAlwaysAnimate,
                brandIconCustomBitmap: e.brandIconCustomBitmap,
                brandIconCustomColor: e.brandIconCustomColor,
                brandIconCustomPalette: e.brandIconCustomPalette,
                customGlyph57: e.customGlyph57,
                glifoEncima: e.glifoEncima,
              }),
              bgColor: e.bgColor,
              fgColor: e.fgColor,
              fijo: e.fijo,
              widget: e.widget,
              sliderWidget: e.sliderWidget,
            }}
          />

          <div
            className="vd-scroll"
            style={{
              flex: 1,
              padding: 12,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {/* 1. PRESETS */}
            <SeccionAjustes
              titulo={t('ed.sec.presets')}
              glyph="SPARKLE"
              accent={accent}
              abierto={e.seccionesAbiertas.presets}
              onToggle={() => e.toggleSeccion('presets')}
              badge={dockBadge}
            >
              <SeccionPresets
                accent={accent}
                filteredPresets={filteredPresets}
                dockPresets={dockInfo.presets}
                esDock={dockInfo.esDock}
                dockGesto={dockInfo.gesto}
                presetCategory={e.presetCategory}
                setPresetCategory={e.setPresetCategory}
                presetSearch={e.presetSearch}
                setPresetSearch={e.setPresetSearch}
                onApplyPreset={e.applyPreset}
                onApplyDockPreset={e.applyDockPreset}
              />
            </SeccionAjustes>

            {/* 2. ACCIÓN */}
            <SeccionAjustes
              titulo={t('ed.sec.action')}
              glyph="BOLT"
              accent={accent}
              abierto={e.seccionesAbiertas.action}
              onToggle={() => e.toggleSeccion('action')}
              badge={actionBadge}
            >
              <SeccionAccion
                accent={accent}
                action={e.action}
                setAction={e.setAction}
                actionToggleOff={e.actionToggleOff}
                setActionToggleOff={e.setActionToggleOff}
                applyFolderPreset={e.applyFolderPreset}
                audioDevices={audioDevices}
                audioError={audioError}
                capturing={e.capturing}
                setCapturing={e.setCapturing}
                folderButtons={e.folderButtons}
                setFolderButtons={e.setFolderButtons}
                globalHotkey={e.globalHotkey}
                setGlobalHotkey={e.setGlobalHotkey}
                inTrayMenu={e.inTrayMenu}
                setInTrayMenu={e.setInTrayMenu}
                isToggle={e.isToggle}
                setIsToggle={e.setIsToggle}
                label={e.label}
                setLabel={e.setLabel}
                loadAudioDevices={loadAudioDevices}
                loadingDevices={loadingDevices}
                longPressAction={e.longPressAction}
                setLongPressAction={e.setLongPressAction}
                pickFile={e.pickFile}
                pickShortcut={e.pickShortcut}
                radioGroup={e.radioGroup}
                setRadioGroup={e.setRadioGroup}
                rgbConnected={rgbConnected}
                rgbDevices={rgbDevices}
                rgbProfiles={rgbProfiles}
                deckState={deckState}
                pages={pages}
                indicePaginaBoton={button.page}
                fijo={e.fijo}
                setFijo={e.setFijo}
                widget={e.widget}
                setWidget={e.setWidget}
                sliderWidget={e.sliderWidget}
                setSliderWidget={e.setSliderWidget}
              />
            </SeccionAjustes>

            {/* 3. APARIENCIA */}
            <SeccionAjustes
              titulo={t('ed.sec.appearance')}
              glyph="SLIDERS"
              accent={accent}
              abierto={e.seccionesAbiertas.appearance}
              onToggle={() => e.toggleSeccion('appearance')}
              badge={appearanceBadge}
            >
              <SeccionApariencia
                accent={accent}
                action={e.action}
                bgColor={e.bgColor}
                brandIcon={e.brandIcon}
                brandIconAlwaysAnimate={e.brandIconAlwaysAnimate}
                brandIconCustomBitmap={e.brandIconCustomBitmap}
                brandIconCustomColor={e.brandIconCustomColor}
                brandIconCustomPalette={e.brandIconCustomPalette}
                setBrandIconCustomPalette={e.setBrandIconCustomPalette}
                customGlyph57={e.customGlyph57}
                deckState={deckState}
                fgColor={e.fgColor}
                icon={e.icon}
                imageData={e.imageData}
                label={e.label}
                pickImage={e.pickImage}
                sensorList={sensorList}
                sensorWidgetCrit={e.sensorWidgetCrit}
                sensorWidgetId={e.sensorWidgetId}
                sensorWidgetSuffix={e.sensorWidgetSuffix}
                sensorWidgetWarn={e.sensorWidgetWarn}
                setBgColor={e.setBgColor}
                setBrandIcon={e.setBrandIcon}
                setBrandIconAlwaysAnimate={e.setBrandIconAlwaysAnimate}
                setBrandIconCustomBitmap={e.setBrandIconCustomBitmap}
                setBrandIconCustomColor={e.setBrandIconCustomColor}
                setCustomGlyph57={e.setCustomGlyph57}
                setFgColor={e.setFgColor}
                setIcon={e.setIcon}
                setImageData={e.setImageData}
                setLabel={e.setLabel}
                setSensorWidgetCrit={e.setSensorWidgetCrit}
                setSensorWidgetId={e.setSensorWidgetId}
                setSensorWidgetSuffix={e.setSensorWidgetSuffix}
                setSensorWidgetWarn={e.setSensorWidgetWarn}
                setShowBrandEditor={e.setShowBrandEditor}
                setShowBrandPicker={e.setShowBrandPicker}
                setShowGlyphEditor={e.setShowGlyphEditor}
                setSublabel={e.setSublabel}
                setVarWidgetName={e.setVarWidgetName}
                setVarWidgetPrefix={e.setVarWidgetPrefix}
                setVarWidgetSuffix={e.setVarWidgetSuffix}
                setWidget={e.setWidget}
                sublabel={e.sublabel}
                varWidgetName={e.varWidgetName}
                varWidgetPrefix={e.varWidgetPrefix}
                varWidgetSuffix={e.varWidgetSuffix}
                widget={e.widget}
                currencyWidget={e.currencyWidget}
                setCurrencyWidget={e.setCurrencyWidget}
                sliderWidget={e.sliderWidget}
                setSliderWidget={e.setSliderWidget}
                tipoIcono={e.tipoIcono}
                setTipoIcono={e.setTipoIcono}
                habiaVariosCamposIcono={e.habiaVariosCamposIcono}
                glifoEncima={e.glifoEncima}
                setGlifoEncima={e.setGlifoEncima}
              />
            </SeccionAjustes>

            {/* 4. COMPORTAMIENTO */}
            <SeccionAjustes
              titulo={t('ed.sec.behavior')}
              glyph="GEAR"
              accent={accent}
              abierto={e.seccionesAbiertas.behavior}
              onToggle={() => e.toggleSeccion('behavior')}
              badge={behaviorBadge}
            >
              <SeccionComportamiento
                accent={accent}
                action={e.action}
                actionToggleOff={e.actionToggleOff}
                setActionToggleOff={e.setActionToggleOff}
                fijo={e.fijo}
                setFijo={e.setFijo}
                globalHotkey={e.globalHotkey}
                setGlobalHotkey={e.setGlobalHotkey}
                inTrayMenu={e.inTrayMenu}
                setInTrayMenu={e.setInTrayMenu}
                isToggle={e.isToggle}
                setIsToggle={e.setIsToggle}
                longPressAction={e.longPressAction}
                setLongPressAction={e.setLongPressAction}
                radioGroup={e.radioGroup}
                setRadioGroup={e.setRadioGroup}
                sensorList={sensorList}
                sensorTriggerCooldown={e.sensorTriggerCooldown}
                setSensorTriggerCooldown={e.setSensorTriggerCooldown}
                sensorTriggerId={e.sensorTriggerId}
                setSensorTriggerId={e.setSensorTriggerId}
                sensorTriggerOp={e.sensorTriggerOp}
                setSensorTriggerOp={e.setSensorTriggerOp}
                sensorTriggerVal={e.sensorTriggerVal}
                setSensorTriggerVal={e.setSensorTriggerVal}
                timerTriggerAt={e.timerTriggerAt}
                setTimerTriggerAt={e.setTimerTriggerAt}
                visibleIfApp={e.visibleIfApp}
                setVisibleIfApp={e.setVisibleIfApp}
                visibleIfSensorId={e.visibleIfSensorId}
                setVisibleIfSensorId={e.setVisibleIfSensorId}
                visibleIfSensorOp={e.visibleIfSensorOp}
                setVisibleIfSensorOp={e.setVisibleIfSensorOp}
                visibleIfSensorVal={e.visibleIfSensorVal}
                setVisibleIfSensorVal={e.setVisibleIfSensorVal}
                currentButtonId={button.id}
                pages={pages}
              />
            </SeccionAjustes>

            {/* 5. AVANZADO */}
            <SeccionAjustes
              titulo={t('ed.sec.advanced')}
              glyph="TERMINAL"
              accent={accent}
              abierto={e.seccionesAbiertas.advanced}
              onToggle={() => e.toggleSeccion('advanced')}
              badge={advancedBadge}
            >
              <SeccionAvanzado
                parentId={button.id}
                is2x2Mode={e.is2x2Mode}
                setIs2x2Mode={e.setIs2x2Mode}
                subButtons={e.subButtons}
                setSubButtons={e.setSubButtons}
                action={e.action}
                extraActions={e.extraActions}
                setExtraActions={e.setExtraActions}
                showExtraPicker={e.showExtraPicker}
                setShowExtraPicker={e.setShowExtraPicker}
                accent={accent}
              />
            </SeccionAjustes>
          </div>
        </div>

        {/* Pie con acciones directas */}
        <PieEditorB
          buttonId={button.id}
          isConfigured={e.isConfigured}
          accent={accent}
          onSave={e.handleSave}
          onClear={onClear}
          onClose={onClose}
        />
      </div>

      {/* Modales de iconos y marcas */}
      <ModalesIconosEditor
        showBrandPicker={e.showBrandPicker}
        showBrandEditor={e.showBrandEditor}
        showGlyphEditor={e.showGlyphEditor}
        brandIcon={e.brandIcon}
        brandIconCustomBitmap={e.brandIconCustomBitmap}
        brandIconCustomColor={e.brandIconCustomColor}
        brandIconCustomPalette={e.brandIconCustomPalette}
        customGlyph57={e.customGlyph57}
        accent={accent}
        onCloseBrandPicker={() => e.setShowBrandPicker(false)}
        onCloseBrandEditor={() => e.setShowBrandEditor(false)}
        onCloseGlyphEditor={() => e.setShowGlyphEditor(false)}
        onSelectBrandIcon={(key) => {
          e.setBrandIcon(key);
          e.setTipoIcono('marca');
          e.setShowBrandPicker(false);
        }}
        onSaveBrandEditor={(bmp, col, pal) => {
          if (!e.brandIcon) e.setBrandIcon('blender');
          e.setBrandIconCustomBitmap(bmp);
          e.setBrandIconCustomColor(col);
          e.setBrandIconCustomPalette(pal);
          e.setShowBrandEditor(false);
        }}
        onSaveGlyph57={(rows) => {
          e.setCustomGlyph57(rows);
          if (rows && rows.some((r) => r > 0)) {
            e.setTipoIcono('dibujo');
          }
          e.setShowGlyphEditor(false);
        }}
      />
    </div>
  );
}
