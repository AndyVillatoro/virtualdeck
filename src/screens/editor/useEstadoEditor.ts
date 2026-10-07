import { useEffect, useState } from 'react';
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
import { usePegarImagen } from './usePegarImagen';
import { resolverIconoInicial, limpiarCamposIcono, type TipoIcono } from './tiposIcono';
import type { NombreCatalogo } from '../../data/iconosDot/tipos';
import { CAT_ACCIONES, CAT_MARCAS, PREFIJO_MARCAS } from './constantesCatalogo';
import type { IconoElegido, SeccionCatalogo } from './constantesCatalogo';
import type { ButtonConfig, SubButtonConfig, EfectoPuntos, EfectoPulsar } from '../../types';
import type { PresetDock } from '../../data/presetsDock';

export type SeccionId = 'presets' | 'action' | 'appearance' | 'behavior' | 'advanced';

/** A qué icono del editor va lo que se elija en el catálogo (roadmap 93). */
export type DestinoCatalogo = 'principal' | 'encendido' | { cuadrante: number };

interface UseEstadoEditorOptions {
  button: ButtonConfig;
  onSave: (updated: ButtonConfig) => void;
  dockGesto?: GestoHueco;
  /** La página editada es de un dock físico: la pestaña DOCK abre por defecto. */
  esDock?: boolean;
}

function subButtonsIniciales(button: ButtonConfig): SubButtonConfig[] {
  if (button.subButtons && button.subButtons.length === 4) return button.subButtons;
  return Array.from({ length: 4 }, (_, i) => ({
    id: `${button.id}-q${i}`,
    label: '',
    action: { type: 'none' as const },
  }));
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

export function useEstadoEditor({ button, onSave, dockGesto, esDock }: UseEstadoEditorOptions) {
  const api = window.electronAPI;
  const isConfigured = botonConfigurado(button);

  const ini = accionInicial(button);
  const est = estiloInicial(button);
  const wid = widgetInicial(button);
  const vis = visibilidadInicial(button);
  const dis = disparadoresInicial(button);

  const [is2x2Mode, setIs2x2Mode] = useState<boolean>(() => !!(button.subButtons && button.subButtons.length === 4));
  const [subButtons, setSubButtons] = useState<SubButtonConfig[]>(() => subButtonsIniciales(button));

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
  const [iconoPuntos, setIconoPuntos] = useState(est.iconoPuntos);
  const [animacionEfecto, setAnimacionEfecto] = useState<EfectoPuntos | undefined>(
    est.animacion?.efecto
  );
  const [animacionCuando, setAnimacionCuando] = useState<'siempre' | 'al-pulsar' | 'encendido'>(
    est.animacion?.cuando ?? 'siempre'
  );
  const [efectoPulsar, setEfectoPulsar] = useState<EfectoPulsar>(
    est.efectoPulsar ?? 'destello'
  );
  const [encendidoIcon, setEncendidoIcon] = useState<string>(est.aspectoEncendido?.icon ?? '');
  const [encendidoIconoPuntos, setEncendidoIconoPuntos] = useState<{ bits: string; origen: string } | undefined>(
    est.aspectoEncendido?.iconoPuntos
  );
  const [encendidoBgColor, setEncendidoBgColor] = useState<string>(est.aspectoEncendido?.bgColor ?? '');
  const [encendidoFgColor, setEncendidoFgColor] = useState<string>(est.aspectoEncendido?.fgColor ?? '');
  const [previewToggled, setPreviewToggled] = useState(false);
  const [destinoCatalogo, setDestinoCatalogo] = useState<DestinoCatalogo>('principal');
  const [catalogoDotAbierto, setCatalogoDotAbierto] = useState<SeccionCatalogo | null>(null);
  const [showBrandPicker, setShowBrandPicker] = useState(false);
  const [showBrandEditor, setShowBrandEditor] = useState(false);
  const [bgColor, setBgColor] = useState(est.bgColor);
  const [fgColor, setFgColor] = useState(est.fgColor);
  const [fijo, setFijo] = useState(est.fijo);
  const [globalHotkey, setGlobalHotkey] = useState(dis.globalHotkey);
  const [inTrayMenu, setInTrayMenu] = useState(dis.inTrayMenu);
  const [longPressAction, setLongPressAction] = useState(ini.longPressAction);
  const [radioGroup, setRadioGroup] = useState(ini.radioGroup);
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
  const [timerTriggerDias, setTimerTriggerDias] = useState(dis.timerTriggerDias);
  const [sensorTriggerId, setSensorTriggerId] = useState(dis.sensorTriggerId);
  const [sensorTriggerOp, setSensorTriggerOp] = useState(dis.sensorTriggerOp);
  const [sensorTriggerVal, setSensorTriggerVal] = useState(dis.sensorTriggerVal);
  const [sensorTriggerCooldown, setSensorTriggerCooldown] = useState(dis.sensorTriggerCooldown);
  const [customGlyph57, setCustomGlyph57] = useState(est.customGlyph57);
  const [showGlyphEditor, setShowGlyphEditor] = useState(false);
  const [infoIconoIni] = useState(() => resolverIconoInicial(button));
  const [tipoIcono, setTipoIcono] = useState<TipoIcono>(infoIconoIni.tipo);
  const [glifoEncima, setGlifoEncima] = useState<string>(infoIconoIni.glifoEncima);
  const [habiaVariosCamposIcono] = useState<boolean>(infoIconoIni.habiaVarios);
  const [presetCategory, setPresetCategory] = useState<string>(esDock ? 'DOCK' : 'APPS');
  const [presetSearch, setPresetSearch] = useState('');
  const [capturing, setCapturing] = useState(false);
  const [folderButtons, setFolderButtons] = useState(ini.folderButtons);

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

  useEffect(() => {
    if (action.type === 'audio-device' && widget === 'now-playing') setWidget(undefined);
  }, [action.type, widget]);

  useCapturaHotkey(
    capturing,
    (combo) => setAction((a) => ({ ...a, hotkey: combo })),
    () => setCapturing(false),
  );

  useEffect(() => {
    if (action.type === 'folder') {
      setAction((a) => ({ ...a, folderButtons }));
    }
  }, [folderButtons, action.type]);

  usePegarImagen((data) => {
    setImageData(data);
    setTipoIcono('imagen');
  });

  const handleSave = () => {
    const camposIcono = limpiarCamposIcono(tipoIcono, {
      icon: tipoIcono === 'glifo' ? icon : glifoEncima,
      imageData,
      brandIcon,
      brandIconAlwaysAnimate,
      brandIconCustomBitmap,
      brandIconCustomColor,
      brandIconCustomPalette,
      customGlyph57,
      glifoEncima,
      iconoPuntos,
    });

    const animacion = calcularAnimacion(animacionEfecto, animacionCuando, isToggle);
    const aspectoEncendido = calcularAspectoEncendido(
      isToggle,
      encendidoIcon,
      encendidoIconoPuntos,
      encendidoBgColor,
      encendidoFgColor,
    );

    onSave(construirBoton(button, {
      is2x2Mode,
      subButtons,
      action,
      extraActions,
      label,
      sublabel,
      ...camposIcono,
      bgColor,
      fgColor,
      animacion,
      efectoPulsar,
      aspectoEncendido,
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
      timerTriggerDias,
      sensorTriggerId,
      sensorTriggerOp,
      sensorTriggerVal,
      sensorTriggerCooldown,
      fijo,
    }));
  };

  const abrirCatalogoDot = (cat: NombreCatalogo, destino: DestinoCatalogo = 'principal') => {
    setDestinoCatalogo(destino);
    // Con un glifo 8×8 elegido, el catálogo abre en su grupo, no en Tabler.
    const glifoElegido = destino === 'principal' && tipoIcono === 'glifo';
    setCatalogoDotAbierto(glifoElegido && cat === CAT_ACCIONES ? 'glifos' : cat);
  };
  const cerrarCatalogoDot = () => setCatalogoDotAbierto(null);

  /** El catálogo de un cuadrante abre donde tenga sentido según su icono actual. */
  const abrirCatalogoCuadrante = (idx: number) => {
    const origen = subButtons[idx]?.iconoPuntos?.origen;
    const cat = origen?.startsWith(PREFIJO_MARCAS) ? CAT_MARCAS : CAT_ACCIONES;
    abrirCatalogoDot(cat, { cuadrante: idx });
  };

  /** Elegir en el catálogo con un cuadrante de destino (roadmap 93). */
  const seleccionarIconoCuadrante = (idx: number, icono: IconoElegido) => {
    setSubButtons((prev) => {
      const actuales = prev.length === 4 ? prev : subButtonsIniciales(button);
      const patch: Partial<SubButtonConfig> = icono.tipo === 'glifo'
        ? { dotGlyph: icono.icon, icon: icono.icon, iconoPuntos: undefined }
        : { iconoPuntos: { bits: icono.bits, origen: icono.origen }, dotGlyph: undefined, icon: undefined };
      const next = [...actuales];
      next[idx] = { ...actuales[idx], ...patch };
      return next;
    });
    setCatalogoDotAbierto(null);
  };

  const seleccionarIconoCatalogo = (icono: IconoElegido) => {
    if (typeof destinoCatalogo === 'object') {
      seleccionarIconoCuadrante(destinoCatalogo.cuadrante, icono);
      return;
    }
    if (destinoCatalogo === 'encendido') {
      if (icono.tipo === 'puntos') {
        setEncendidoIconoPuntos(icono);
        setEncendidoIcon('');
      } else {
        setEncendidoIcon(icono.icon);
        setEncendidoIconoPuntos(undefined);
      }
      setCatalogoDotAbierto(null);
      return;
    }
    if (icono.tipo === 'glifo') {
      // El glifo 8×8 del catálogo es el mismo que el de la fila rápida.
      setIcon(icono.icon);
      setIconoPuntos(undefined);
      setTipoIcono('glifo');
      setImageData('');
      setBrandIcon('');
      setBrandIconCustomBitmap(undefined);
      setBrandIconCustomColor(undefined);
      setBrandIconCustomPalette(undefined);
      setCustomGlyph57(undefined);
      setCatalogoDotAbierto(null);
      return;
    }
    setIconoPuntos(icono);
    if (icono.origen.startsWith(PREFIJO_MARCAS)) {
      setTipoIcono('marca');
      setBrandIcon('');
      setBrandIconCustomBitmap(undefined);
      setBrandIconCustomColor(undefined);
      setBrandIconCustomPalette(undefined);
      setImageData('');
      setCustomGlyph57(undefined);
    } else {
      setTipoIcono('glifo');
      setIcon('');
      setImageData('');
      setBrandIcon('');
      setBrandIconCustomBitmap(undefined);
      setBrandIconCustomColor(undefined);
      setBrandIconCustomPalette(undefined);
      setCustomGlyph57(undefined);
    }
    setCatalogoDotAbierto(null);
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
    if (preset.icon) {
      setTipoIcono('glifo');
      setGlifoEncima('');
    } else {
      setTipoIcono('auto');
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
    if (hueco.icon) {
      setTipoIcono('glifo');
      setGlifoEncima('');
    } else {
      setTipoIcono('auto');
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
    if (data) {
      setImageData(data);
      setTipoIcono('imagen');
    }
  };

  return {
    isConfigured,
    is2x2Mode,
    setIs2x2Mode,
    subButtons,
    setSubButtons,
    action,
    setAction,
    extraActions,
    setExtraActions,
    showExtraPicker,
    setShowExtraPicker,
    isToggle,
    setIsToggle,
    actionToggleOff,
    setActionToggleOff,
    label,
    setLabel,
    sublabel,
    setSublabel,
    icon,
    setIcon,
    imageData,
    setImageData,
    brandIcon,
    setBrandIcon,
    brandIconAlwaysAnimate,
    setBrandIconAlwaysAnimate,
    brandIconCustomBitmap,
    setBrandIconCustomBitmap,
    brandIconCustomColor,
    setBrandIconCustomColor,
    brandIconCustomPalette,
    setBrandIconCustomPalette,
    showBrandPicker,
    setShowBrandPicker,
    showBrandEditor,
    setShowBrandEditor,
    bgColor,
    setBgColor,
    fgColor,
    setFgColor,
    fijo,
    setFijo,
    globalHotkey,
    setGlobalHotkey,
    inTrayMenu,
    setInTrayMenu,
    longPressAction,
    setLongPressAction,
    radioGroup,
    setRadioGroup,
    widget,
    setWidget,
    sensorWidgetId,
    setSensorWidgetId,
    sensorWidgetSuffix,
    setSensorWidgetSuffix,
    sensorWidgetWarn,
    setSensorWidgetWarn,
    sensorWidgetCrit,
    setSensorWidgetCrit,
    varWidgetName,
    setVarWidgetName,
    varWidgetPrefix,
    setVarWidgetPrefix,
    varWidgetSuffix,
    setVarWidgetSuffix,
    currencyWidget,
    setCurrencyWidget,
    sliderWidget,
    setSliderWidget,
    visibleIfApp,
    setVisibleIfApp,
    visibleIfSensorId,
    setVisibleIfSensorId,
    visibleIfSensorOp,
    setVisibleIfSensorOp,
    visibleIfSensorVal,
    setVisibleIfSensorVal,
    timerTriggerAt,
    setTimerTriggerAt,
    timerTriggerDias,
    setTimerTriggerDias,
    sensorTriggerId,
    setSensorTriggerId,
    sensorTriggerOp,
    setSensorTriggerOp,
    sensorTriggerVal,
    setSensorTriggerVal,
    sensorTriggerCooldown,
    setSensorTriggerCooldown,
    customGlyph57,
    setCustomGlyph57,
    showGlyphEditor,
    setShowGlyphEditor,
    presetCategory,
    setPresetCategory,
    presetSearch,
    setPresetSearch,
    capturing,
    setCapturing,
    folderButtons,
    setFolderButtons,
    seccionesAbiertas,
    setSeccionesAbiertas,
    toggleSeccion,
    abrirSeccion,
    handleSave,
    applyPreset,
    applyDockPreset,
    applyFolderPreset,
    pickFile,
    pickShortcut,
    pickImage,
    tipoIcono,
    setTipoIcono,
    glifoEncima,
    setGlifoEncima,
    habiaVariosCamposIcono,
    iconoPuntos,
    setIconoPuntos,
    animacionEfecto,
    setAnimacionEfecto,
    animacionCuando,
    setAnimacionCuando,
    efectoPulsar,
    setEfectoPulsar,
    encendidoIcon,
    setEncendidoIcon,
    encendidoIconoPuntos,
    setEncendidoIconoPuntos,
    encendidoBgColor,
    setEncendidoBgColor,
    encendidoFgColor,
    setEncendidoFgColor,
    animacion: calcularAnimacion(animacionEfecto, animacionCuando, isToggle),
    aspectoEncendido: calcularAspectoEncendido(
      isToggle,
      encendidoIcon,
      encendidoIconoPuntos,
      encendidoBgColor,
      encendidoFgColor,
    ),
    previewToggled,
    setPreviewToggled,
    destinoCatalogo,
    catalogoDotAbierto,
    setCatalogoDotAbierto,
    abrirCatalogoDot,
    abrirCatalogoCuadrante,
    cerrarCatalogoDot,
    seleccionarIconoCatalogo,
  };
}
