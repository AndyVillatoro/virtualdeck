import { useState } from 'react';
import { FOLDER_PRESETS, type ButtonPreset } from './actionData';
import {
  accionInicial,
  estiloInicial,
  widgetInicial,
  visibilidadInicial,
  disparadoresInicial,
} from './valoresIniciales';
import { construirBoton } from './guardar';
import { botonConfigurado } from './botonConfigurado';
import { obtenerHuecoDePreset, type GestoHueco } from './useDockPresets';
import { useCapturaHotkey } from './useCapturaHotkey';
import { limpiarCamposIcono } from './tiposIcono';
import { subButtonsIniciales } from './subButtonsIniciales';
import { useEstadoIcono } from './useEstadoIcono';
import { useEstadoAccion } from './useEstadoAccion';
import { useEstadoApariencia } from './useEstadoApariencia';
import { useEstadoWidget } from './useEstadoWidget';
import { useEstadoVisibilidad } from './useEstadoVisibilidad';
import { useEstadoDisparadores } from './useEstadoDisparadores';
import type { ButtonConfig, EfectoPuntos, SubButtonConfig } from '../../types';
import type { PresetDock } from '../../data/presetsDock';

export type SeccionId = 'presets' | 'action' | 'appearance' | 'behavior' | 'advanced';

interface UseEstadoEditorOptions {
  button: ButtonConfig;
  onSave: (updated: ButtonConfig) => void;
  dockGesto?: GestoHueco;
  /** La página editada es de un dock físico: la pestaña DOCK abre por defecto. */
  esDock?: boolean;
}

function calcularAnimacion(
  efecto: EfectoPuntos | undefined,
  cuando: 'siempre' | 'al-pulsar' | 'encendido',
  isToggle: boolean,
): ButtonConfig['animacion'] {
  if (!efecto) return undefined;
  return {
    efecto,
    cuando: (isToggle || cuando !== 'encendido') ? cuando : 'siempre',
  };
}

function calcularAspectoEncendido(
  isToggle: boolean,
  icon: string,
  iconoPuntos: { bits: string; origen: string } | undefined,
  bgColor: string,
  fgColor: string,
): ButtonConfig['aspectoEncendido'] {
  if (!isToggle) return undefined;
  if (!icon && !iconoPuntos && !bgColor && !fgColor) return undefined;
  return {
    icon: icon || undefined,
    iconoPuntos,
    bgColor: bgColor || undefined,
    fgColor: fgColor || undefined,
  };
}

/**
 * El estado del formulario de edición de un botón.
 *
 * Antes eran cincuenta y tres `useState` en un solo archivo; cada bloque de la
 * interfaz —icono, acción, apariencia, widget, visibilidad y disparadores— es
 * ahora un hook con un tema, y aquí solo queda el cableado: los modos 2×2, los
 * presets, el acordeón de secciones y el guardado. Todos se llaman sin
 * condiciones y en el mismo orden en cada render, como exige React.
 */
export function useEstadoEditor({ button, onSave, dockGesto, esDock }: UseEstadoEditorOptions) {
  const isConfigured = botonConfigurado(button);

  const ini = accionInicial(button);
  const est = estiloInicial(button);
  const wid = widgetInicial(button);
  const vis = visibilidadInicial(button);
  const dis = disparadoresInicial(button);

  const [is2x2Mode, setIs2x2Mode] = useState<boolean>(() => !!(button.subButtons && button.subButtons.length === 4));
  const [subButtons, setSubButtons] = useState<SubButtonConfig[]>(() => subButtonsIniciales(button));

  const apar = useEstadoApariencia(est);
  const accion = useEstadoAccion(ini);
  const icono = useEstadoIcono({
    button,
    est,
    subButtons,
    setSubButtons,
    setEncendidoIcon: apar.setEncendidoIcon,
    setEncendidoIconoPuntos: apar.setEncendidoIconoPuntos,
  });
  const widHook = useEstadoWidget({ est, wid, tipoAccion: accion.action.type });
  const visibilidad = useEstadoVisibilidad(vis);
  const disparadores = useEstadoDisparadores(dis);

  const { setAction, setIsToggle, setActionToggleOff, setFolderButtons } = accion;
  const { setWidget, setSliderWidget } = widHook;
  const { setIcon, setTipoIcono, setGlifoEncima } = icono;
  const { aplicarIconoCatalogo, resetIconoPreset, ...iconoResto } = icono;
  const {
    setLabel, setSublabel, setBgColor, setFgColor, setFijo,
  } = apar;

  const [presetCategory, setPresetCategory] = useState<string>(esDock ? 'DOCK' : 'APPS');
  const [presetSearch, setPresetSearch] = useState('');
  const [capturing, setCapturing] = useState(false);

  // Inicialización de secciones acordeón:
  // Al abrir un botón vacío se abre PRESETS y ACCIÓN; al abrir uno configurado, ACCIÓN y APARIENCIA.
  const [seccionesAbiertas, setSeccionesAbiertas] = useState<Record<SeccionId, boolean>>(() => {
    if (isConfigured) {
      return {
        presets: false,
        action: true,
        appearance: true,
        behavior: false,
        advanced: is2x2Mode,
      };
    }
    return {
      presets: true,
      action: true,
      appearance: false,
      behavior: false,
      advanced: is2x2Mode,
    };
  });

  const toggleSeccion = (id: SeccionId) => {
    setSeccionesAbiertas((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  /** Abre una sección sin cerrarla si ya lo estaba (atajos del estado vacío). */
  const abrirSeccion = (id: SeccionId) => {
    setSeccionesAbiertas((prev) => (prev[id] ? prev : { ...prev, [id]: true }));
  };

  useCapturaHotkey(
    capturing,
    (combo) => setAction((a) => ({ ...a, hotkey: combo })),
    () => setCapturing(false),
  );

  const handleSave = () => {
    const camposIcono = limpiarCamposIcono(icono.tipoIcono, {
      icon: icono.tipoIcono === 'glifo' ? icono.icon : icono.glifoEncima,
      imageData: icono.imageData,
      brandIcon: icono.brandIcon,
      brandIconAlwaysAnimate: icono.brandIconAlwaysAnimate,
      brandIconCustomBitmap: icono.brandIconCustomBitmap,
      brandIconCustomColor: icono.brandIconCustomColor,
      brandIconCustomPalette: icono.brandIconCustomPalette,
      customGlyph57: icono.customGlyph57,
      glifoEncima: icono.glifoEncima,
      iconoPuntos: icono.iconoPuntos,
    });

    const animacion = calcularAnimacion(apar.animacionEfecto, apar.animacionCuando, accion.isToggle);
    const aspectoEncendido = calcularAspectoEncendido(
      accion.isToggle,
      apar.encendidoIcon,
      apar.encendidoIconoPuntos,
      apar.encendidoBgColor,
      apar.encendidoFgColor,
    );

    onSave(construirBoton(button, {
      is2x2Mode,
      subButtons,
      action: accion.action,
      extraActions: accion.extraActions,
      label: apar.label,
      sublabel: apar.sublabel,
      ...camposIcono,
      bgColor: apar.bgColor,
      fgColor: apar.fgColor,
      animacion,
      efectoPulsar: apar.efectoPulsar,
      aspectoEncendido,
      folderButtons: accion.folderButtons,
      isToggle: accion.isToggle,
      actionToggleOff: accion.actionToggleOff,
      globalHotkey: disparadores.globalHotkey,
      inTrayMenu: disparadores.inTrayMenu,
      customGlyph57: icono.customGlyph57,
      longPressAction: accion.longPressAction,
      radioGroup: accion.radioGroup,
      widget: widHook.widget,
      sensorWidgetId: widHook.sensorWidgetId,
      sensorWidgetSuffix: widHook.sensorWidgetSuffix,
      sensorWidgetWarn: widHook.sensorWidgetWarn,
      sensorWidgetCrit: widHook.sensorWidgetCrit,
      varWidgetName: widHook.varWidgetName,
      varWidgetPrefix: widHook.varWidgetPrefix,
      varWidgetSuffix: widHook.varWidgetSuffix,
      currencyWidget: widHook.currencyWidget,
      sliderWidget: widHook.sliderWidget,
      visibleIfApp: visibilidad.visibleIfApp,
      visibleIfSensorId: visibilidad.visibleIfSensorId,
      visibleIfSensorOp: visibilidad.visibleIfSensorOp,
      visibleIfSensorVal: visibilidad.visibleIfSensorVal,
      timerTriggerAt: disparadores.timerTriggerAt,
      timerTriggerDias: disparadores.timerTriggerDias,
      sensorTriggerId: disparadores.sensorTriggerId,
      sensorTriggerOp: disparadores.sensorTriggerOp,
      sensorTriggerVal: disparadores.sensorTriggerVal,
      sensorTriggerCooldown: disparadores.sensorTriggerCooldown,
      fijo: apar.fijo,
    }));
  };

  const applyPreset = (preset: ButtonPreset) => {
    setAction(preset.action);
    setLabel(preset.label);
    setSublabel(preset.sublabel ?? '');
    setIcon(preset.icon ?? '');
    setBgColor(preset.bgColor ?? '');
    setFgColor(preset.fgColor ?? '');
    setIsToggle(preset.isToggle ?? false);
    setActionToggleOff(preset.actionToggleOff ?? { type: 'none' });
    if (preset.fijo) setFijo(true);
    if (preset.widget) {
      setWidget(preset.widget);
      if (preset.sliderWidget) setSliderWidget(preset.sliderWidget);
    }
    resetIconoPreset(preset.icon ?? '');
    if (preset.iconoCatalogo) {
      aplicarIconoCatalogo(preset.iconoCatalogo, preset.icon ?? '');
    }
    setSeccionesAbiertas((prev) => ({ ...prev, action: true, appearance: true }));
  };

  const applyDockPreset = (preset: PresetDock) => {
    const hueco = obtenerHuecoDePreset(preset, dockGesto);
    setAction(hueco.action);
    setLabel(hueco.label);
    setSublabel('');
    setIcon(hueco.icon ?? '');
    setBgColor(hueco.bgColor ?? '');
    setFgColor(hueco.fgColor ?? '');
    setIsToggle(hueco.isToggle ?? false);
    setActionToggleOff(hueco.actionToggleOff ?? { type: 'none' });
    if (hueco.fijo) setFijo(true);
    resetIconoPreset(hueco.icon ?? '');
    if (hueco.iconoCatalogo) {
      aplicarIconoCatalogo(hueco.iconoCatalogo, hueco.icon ?? '');
    }
    setSeccionesAbiertas((prev) => ({ ...prev, action: true, appearance: true }));
  };

  const applyFolderPreset = (key: string) => {
    const fp = FOLDER_PRESETS[key];
    if (!fp) return;
    setFolderButtons(fp.buttons);
    setLabel(fp.label);
    setIcon(fp.icon);
    setBgColor(fp.bgColor);
    setFgColor(fp.fgColor);
    if (fp.icon) {
      setTipoIcono('glifo');
      setGlifoEncima('');
    }
  };

  const sobrescribirConPlugin = (nombreAccion?: string) => {
    if (nombreAccion !== undefined) {
      setLabel(nombreAccion);
    }
    setSublabel('');
    setIcon('');
    icono.setIconoPuntos(undefined);
    icono.setImageData('');
    icono.setBrandIcon('');
    icono.setCustomGlyph57(undefined);
    setGlifoEncima('');
    setTipoIcono('glifo');
    setBgColor('');
    setFgColor('');
    setWidget(undefined);
    setSliderWidget(undefined);
    apar.setAnimacionEfecto(undefined);
  };

  return {
    isConfigured,
    is2x2Mode,
    setIs2x2Mode,
    subButtons,
    sobrescribirConPlugin,
    setSubButtons,
    ...accion,
    ...apar,
    ...iconoResto,
    ...widHook,
    ...visibilidad,
    ...disparadores,
    presetCategory,
    setPresetCategory,
    presetSearch,
    setPresetSearch,
    capturing,
    setCapturing,
    seccionesAbiertas,
    setSeccionesAbiertas,
    toggleSeccion,
    abrirSeccion,
    handleSave,
    applyPreset,
    applyDockPreset,
    applyFolderPreset,
    animacion: calcularAnimacion(apar.animacionEfecto, apar.animacionCuando, accion.isToggle),
    aspectoEncendido: calcularAspectoEncendido(
      accion.isToggle,
      apar.encendidoIcon,
      apar.encendidoIconoPuntos,
      apar.encendidoBgColor,
      apar.encendidoFgColor,
    ),
  };
}