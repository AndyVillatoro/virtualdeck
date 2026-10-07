import type { ButtonAction, ButtonConfig, FolderButton, SubButtonConfig } from '../../types';

/**
 * Arma el botón a guardar a partir de lo que hay en el formulario.
 *
 * Es una función pura y no un manejador dentro de `EditorB` porque **casi todo
 * lo que hacía el editor al guardar era esto**: sesenta líneas de decidir qué
 * campo se escribe y cuál se deja en `undefined`. Fuera del componente se puede
 * leer —y comprobar— sin montar la pantalla entera.
 *
 * El criterio que se repite: lo vacío se guarda como `undefined`, no como `''`
 * ni `false`. Así el JSON de configuración no se llena de campos sin valor, y
 * los `??` de quien lo lee hacen lo que se espera.
 */

export interface CamposDelEditor {
  is2x2Mode?: boolean;
  subButtons?: SubButtonConfig[];
  action: ButtonAction;
  extraActions: ButtonAction[];
  label: string;
  sublabel: string;
  icon: string;
  imageData: string;
  brandIcon: string;
  brandIconAlwaysAnimate: boolean;
  brandIconCustomBitmap: string[] | undefined;
  brandIconCustomColor: string | undefined;
  brandIconCustomPalette: Record<string, string> | undefined;
  iconoPuntos?: { bits: string; origen: string };
  bgColor: string;
  fgColor: string;
  folderButtons: FolderButton[];
  isToggle: boolean;
  actionToggleOff: ButtonAction;
  globalHotkey: string;
  inTrayMenu: boolean;
  customGlyph57: number[] | undefined;
  longPressAction: ButtonAction;
  radioGroup: string;
  widget: ButtonConfig['widget'];
  sensorWidgetId: string;
  sensorWidgetSuffix: string;
  sensorWidgetWarn: string;
  sensorWidgetCrit: string;
  varWidgetName: string;
  varWidgetPrefix: string;
  currencyWidget: ButtonConfig['currencyWidget'];
  sliderWidget: ButtonConfig['sliderWidget'];
  varWidgetSuffix: string;
  visibleIfApp: string;
  visibleIfSensorId: string;
  visibleIfSensorOp: '>' | '<' | '>=' | '<=' | '==';
  visibleIfSensorVal: string;
  timerTriggerAt: string;
  timerTriggerDias: number[];
  sensorTriggerId: string;
  sensorTriggerOp: '>' | '<' | '>=' | '<=' | '==';
  sensorTriggerVal: string;
  sensorTriggerCooldown: string;
  fijo?: boolean;
  animacion?: ButtonConfig['animacion'];
  efectoPulsar?: ButtonConfig['efectoPulsar'];
  aspectoEncendido?: ButtonConfig['aspectoEncendido'];
}

/** Un número escrito por el usuario, o `undefined` si no escribió uno válido. */
function numero(texto: string): number | undefined {
  const s = texto.trim();
  if (s === '') return undefined;
  const n = parseFloat(s);
  return isNaN(n) ? undefined : n;
}

function widgetDeSensor(c: CamposDelEditor): ButtonConfig['sensorWidget'] {
  if (c.widget !== 'sensor' || !c.sensorWidgetId) return undefined;
  return {
    sensorId: c.sensorWidgetId,
    suffix: c.sensorWidgetSuffix.trim() || undefined,
    warnAt: numero(c.sensorWidgetWarn),
    critAt: numero(c.sensorWidgetCrit),
  };
}

function widgetDeVariable(c: CamposDelEditor): ButtonConfig['varWidget'] {
  if (c.widget !== 'variable' || !c.varWidgetName.trim()) return undefined;
  return {
    varName: c.varWidgetName.trim(),
    prefix: c.varWidgetPrefix || undefined,
    suffix: c.varWidgetSuffix.trim() || undefined,
  };
}

function condicionDeVisibilidad(c: CamposDelEditor): ButtonConfig['visibleIf'] {
  const app = c.visibleIfApp.trim();
  const valor = numero(c.visibleIfSensorVal);
  const conSensor = !!c.visibleIfSensorId && valor !== undefined;
  if (!app && !conSensor) return undefined;
  return {
    app: app || undefined,
    sensor: conSensor ? { id: c.visibleIfSensorId, op: c.visibleIfSensorOp, value: valor! } : undefined,
  };
}

function disparadorDeSensor(c: CamposDelEditor): ButtonConfig['sensorTrigger'] {
  const valor = numero(c.sensorTriggerVal);
  if (!c.sensorTriggerId || valor === undefined) return undefined;
  const espera = numero(c.sensorTriggerCooldown);
  return {
    id: c.sensorTriggerId,
    op: c.sensorTriggerOp,
    value: valor,
    // El usuario lo escribe en segundos; se guarda en milisegundos.
    cooldownMs: espera === undefined ? undefined : espera * 1000,
  };
}

/**
 * Solo se guarda si el widget elegido es el de divisas y tiene las dos
 * monedas: media configuracion guardada saldria como un guion en la celda.
 */
function widgetDeDivisa(c: CamposDelEditor): ButtonConfig['currencyWidget'] {
  if (c.widget !== 'currency') return undefined;
  const de = (c.currencyWidget?.from ?? '').toUpperCase();
  const a = (c.currencyWidget?.to ?? '').toUpperCase();
  if (!/^[A-Z]{3}$/.test(de) || !/^[A-Z]{3}$/.test(a)) return undefined;
  const cuanto = c.currencyWidget?.amount;
  return { from: de, to: a, amount: cuanto && cuanto > 0 ? cuanto : 1 };
}

function widgetDeSlider(c: CamposDelEditor): ButtonConfig['sliderWidget'] {
  if (c.widget !== 'slider') return undefined;
  const s = c.sliderWidget;
  if (!s) return { target: 'volume', orientation: 'horizontal', min: 0, max: 100, step: 5, showValue: true };
  const target = s.target;
  const isVar = target === 'variable';
  return {
    target,
    orientation: s.orientation === 'vertical' ? 'vertical' : 'horizontal',
    varName: isVar && s.varName ? s.varName.trim() : undefined,
    min: s.min ?? 0,
    max: s.max ?? 100,
    step: s.step ?? (isVar ? 1 : 5),
    showValue: s.showValue !== false,
    label: s.label ? s.label.trim() : undefined,
  };
}

function animacionDeBoton(c: CamposDelEditor): ButtonConfig['animacion'] {
  if (!c.animacion?.efecto) return undefined;
  return {
    efecto: c.animacion.efecto,
    cuando: c.isToggle || c.animacion.cuando !== 'encendido' ? c.animacion.cuando : 'siempre',
  };
}

function efectoPulsarDeBoton(c: CamposDelEditor): ButtonConfig['efectoPulsar'] {
  if (!c.efectoPulsar || c.efectoPulsar === 'destello') return undefined;
  return c.efectoPulsar;
}

function aspectoEncendidoDeBoton(c: CamposDelEditor): ButtonConfig['aspectoEncendido'] {
  if (!c.isToggle || !c.aspectoEncendido) return undefined;
  const a = c.aspectoEncendido;
  if (!a.icon && !a.iconoPuntos && !a.bgColor && !a.fgColor) return undefined;
  return {
    icon: a.icon || undefined,
    iconoPuntos: a.iconoPuntos,
    bgColor: a.bgColor || undefined,
    fgColor: a.fgColor || undefined,
  };
}

function brandIconPaletteDeBoton(c: CamposDelEditor) {
  if (c.brandIconCustomPalette && Object.keys(c.brandIconCustomPalette).length > 0) {
    return c.brandIconCustomPalette;
  }
  return undefined;
}

function accionDeBoton(c: CamposDelEditor) {
  if (c.action.type === 'folder') {
    return { ...c.action, folderButtons: c.folderButtons };
  }
  return c.action;
}

function subButtonsDeBoton(c: CamposDelEditor) {
  if (c.is2x2Mode && c.subButtons && c.subButtons.length === 4) {
    return c.subButtons;
  }
  return undefined;
}

/**
 * Los días marcados para el disparo por hora, ordenados y sin repetidos.
 * Sin ninguno, `undefined`: el disparo vale todos los días.
 */
function diasDeTimer(c: CamposDelEditor): number[] | undefined {
  if (c.timerTriggerDias.length === 0) return undefined;
  return [...new Set(c.timerTriggerDias)].sort((a, b) => a - b);
}

export function construirBoton(button: ButtonConfig, c: CamposDelEditor): ButtonConfig {
  return {
    ...button,
    label: c.label,
    sublabel: c.sublabel,
    icon: c.icon,
    imageData: c.imageData,
    brandIcon: c.brandIcon || undefined,
    brandIconAlwaysAnimate: c.brandIconAlwaysAnimate || undefined,
    brandIconCustomBitmap: c.brandIconCustomBitmap,
    brandIconCustomColor: c.brandIconCustomColor,
    brandIconCustomPalette: brandIconPaletteDeBoton(c),
    iconoPuntos: c.iconoPuntos,
    animacion: animacionDeBoton(c),
    efectoPulsar: efectoPulsarDeBoton(c),
    aspectoEncendido: aspectoEncendidoDeBoton(c),
    bgColor: c.bgColor || undefined,
    fgColor: c.fgColor || undefined,
    action: accionDeBoton(c),
    // Solo se guarda la lista cuando hay más de una: con una sola, `action`
    // ya la tiene y duplicarla haría que se ejecutase dos veces.
    actions: c.extraActions.length > 0 ? [c.action, ...c.extraActions] : undefined,
    isToggle: c.isToggle || undefined,
    actionToggleOff:
      c.isToggle && c.actionToggleOff.type !== 'none' ? c.actionToggleOff : undefined,
    globalHotkey: c.globalHotkey.trim() || undefined,
    inTrayMenu: c.inTrayMenu || undefined,
    customGlyph57: c.customGlyph57?.length === 7 ? c.customGlyph57 : undefined,
    longPressAction: c.longPressAction.type !== 'none' ? c.longPressAction : undefined,
    radioGroup: c.radioGroup.trim() || undefined,
    widget: c.widget || undefined,
    sensorWidget: widgetDeSensor(c),
    varWidget: widgetDeVariable(c),
    currencyWidget: widgetDeDivisa(c),
    sliderWidget: widgetDeSlider(c),
    visibleIf: condicionDeVisibilidad(c),
    timerTriggerAt: c.timerTriggerAt.trim() || undefined,
    timerTriggerDias: diasDeTimer(c),
    sensorTrigger: disparadorDeSensor(c),
    fijo: c.fijo || undefined,
    subButtons: subButtonsDeBoton(c),
  };
}
