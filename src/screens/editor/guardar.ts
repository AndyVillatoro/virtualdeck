import type { ButtonAction, ButtonConfig, FolderButton } from '../../types';

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
  varWidgetSuffix: string;
  visibleIfApp: string;
  visibleIfSensorId: string;
  visibleIfSensorOp: '>' | '<' | '>=' | '<=' | '==';
  visibleIfSensorVal: string;
  timerTriggerAt: string;
  sensorTriggerId: string;
  sensorTriggerOp: '>' | '<' | '>=' | '<=' | '==';
  sensorTriggerVal: string;
  sensorTriggerCooldown: string;
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
    brandIconCustomPalette:
      c.brandIconCustomPalette && Object.keys(c.brandIconCustomPalette).length > 0
        ? c.brandIconCustomPalette
        : undefined,
    bgColor: c.bgColor || undefined,
    fgColor: c.fgColor || undefined,
    action: c.action.type === 'folder' ? { ...c.action, folderButtons: c.folderButtons } : c.action,
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
    visibleIf: condicionDeVisibilidad(c),
    timerTriggerAt: c.timerTriggerAt.trim() || undefined,
    sensorTrigger: disparadorDeSensor(c),
  };
}
