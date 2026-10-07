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
import type { ActionType, ButtonConfig, PageConfig, RGBProfile } from '../types';

interface EditorBProps {
  button: ButtonConfig;
  rgbProfiles?: RGBProfile[];
  deckState?: Record<string, string>;
  pages?: PageConfig[];
  onClose: () => void;
  onSave: (updated: ButtonConfig) => void;
  onClear?: (id: string) => void;
}

/** La acción `folder` abre su overlay: un control de dock no tiene pantalla. */
const EXCLUIR_EN_DOCK: ActionType[] = ['folder'];

function filtrarPresets(presetSearch: string, presetCategory: string, esDock: boolean) {
  const base = presetSearch.trim()
    ? PRESETS.filter((p) => p.label.toLowerCase().includes(presetSearch.toLowerCase()) || p.category.toLowerCase().includes(presetSearch.toLowerCase()))
    : PRESETS.filter((p) => p.category === presetCategory);
  if (!esDock) return base;
  // El LCD de una tecla no pinta deslizadores, y la carpeta necesita pantalla.
  return base.filter((p) => p.widget !== 'slider' && p.action.type !== 'folder');
}

function calcularInsignias(
  e: ReturnType<typeof useEstadoEditor>,
  dockInfo: ReturnType<typeof useDockPresets>,
  t: (k: string) => string,
) {
  const actionTypeObj = ACTION_TYPES.find((at) => at.type === e.action.type);
  const actionBadge = e.action.type !== 'none' && actionTypeObj ? t(actionTypeObj.label) : undefined;
  const dockBadge = dockInfo.esDock && dockInfo.controlMeta
    ? `${dockInfo.controlMeta.control.toUpperCase()}${dockInfo.controlMeta.gesto ? ` · ${dockInfo.controlMeta.gesto.toUpperCase()}` : ''}`
    : undefined;
  const appearanceBadge = e.label || (e.icon ? e.icon : undefined);
  const behaviorBadge = e.isToggle ? t('ed.badge.toggle') : (e.fijo ? t('ed.badge.fijo') : undefined);
  const advancedBadge = e.is2x2Mode ? '2×2' : (e.extraActions.length > 0 ? `+${e.extraActions.length}` : undefined);
  return { actionBadge, dockBadge, appearanceBadge, behaviorBadge, advancedBadge };
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

  const e = useEstadoEditor({ button, onSave, dockGesto: dockInfo.gesto, esDock: dockInfo.esDock });

  const {
    audioDevices, loadingDevices, audioError, loadAudioDevices, rgbDevices, rgbConnected, sensorList,
  } = useCatalogos(e.action.type, undefined, `${e.widget}|${e.visibleIfSensorId}|${e.sensorTriggerId}`);

  const filteredPresets = filtrarPresets(e.presetSearch, e.presetCategory, dockInfo.esDock);
  const { actionBadge, dockBadge, appearanceBadge, behaviorBadge, advancedBadge } = calcularInsignias(e, dockInfo, t);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: VD.backdrop,
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
          esDock={dockInfo.esDock}
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
            previewToggled={e.previewToggled}
            onTogglePreview={() => e.setPreviewToggled(!e.previewToggled)}
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
                iconoPuntos: e.iconoPuntos,
              }),
              bgColor: e.bgColor,
              fgColor: e.fgColor,
              fijo: e.fijo,
              widget: e.widget,
              sliderWidget: e.sliderWidget,
              animacion: e.animacion,
              efectoPulsar: e.efectoPulsar,
              aspectoEncendido: e.aspectoEncendido,
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
                excluir={dockInfo.esDock ? EXCLUIR_EN_DOCK : undefined}
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
                contextoDock={dockInfo.contexto}
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
                iconoPuntos={e.iconoPuntos}
                setIconoPuntos={e.setIconoPuntos}
                onAbrirCatalogoDot={e.abrirCatalogoDot}
                isToggle={e.isToggle}
                animacionEfecto={e.animacionEfecto}
                setAnimacionEfecto={e.setAnimacionEfecto}
                animacionCuando={e.animacionCuando}
                setAnimacionCuando={e.setAnimacionCuando}
                efectoPulsar={e.efectoPulsar}
                setEfectoPulsar={e.setEfectoPulsar}
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
                contextoDock={dockInfo.contexto}
                is2x2Mode={e.is2x2Mode}
                modosPerillaCount={button.modosPerilla?.length ?? 0}
                onAbrirSeccion={e.abrirSeccion}
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
                timerTriggerDias={e.timerTriggerDias}
                setTimerTriggerDias={e.setTimerTriggerDias}
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
                encendidoIcon={e.encendidoIcon}
                setEncendidoIcon={e.setEncendidoIcon}
                encendidoIconoPuntos={e.encendidoIconoPuntos}
                setEncendidoIconoPuntos={e.setEncendidoIconoPuntos}
                encendidoBgColor={e.encendidoBgColor}
                setEncendidoBgColor={e.setEncendidoBgColor}
                encendidoFgColor={e.encendidoFgColor}
                setEncendidoFgColor={e.setEncendidoFgColor}
                onAbrirCatalogoDot={e.abrirCatalogoDot}
                previewToggled={e.previewToggled}
                setPreviewToggled={e.setPreviewToggled}
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
                esDock={dockInfo.esDock}
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
        catalogoDotAbierto={e.catalogoDotAbierto}
        onCloseCatalogoDot={e.cerrarCatalogoDot}
        onSelectIconoDot={e.seleccionarIconoCatalogo}
        currentOrigen={e.destinoCatalogo === 'encendido' ? e.encendidoIconoPuntos?.origen : e.iconoPuntos?.origen}
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
