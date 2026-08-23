import type { ButtonAction, ButtonConfig } from '../../types';

/**
 * Los valores con los que arranca el editor, leídos del botón que se abre.
 *
 * Estaban inline en los cincuenta y tres `useState` de `EditorB`, cada uno con
 * su `?? ''` o su `|| ''`. Cada uno de esos operadores cuenta como una rama, y
 * entre todos eran la mayor parte de la complejidad ciclomática del componente:
 * 76 sobre un límite de 18. Aquí son lo que de verdad son — una traducción de
 * "botón guardado" a "campos del formulario" — y se leen de un vistazo.
 *
 * Van en tres funciones y no en una porque son tres cosas distintas: qué hace
 * el botón, cómo se ve, y cuándo aparece o se dispara.
 *
 * El camino de vuelta —de campos a botón— está en `guardar.ts`.
 */

export function accionInicial(button: ButtonConfig) {
  return {
    action: { ...button.action } as ButtonAction,
    extraActions: (button.actions ?? []).slice(1),
    isToggle: button.isToggle ?? false,
    actionToggleOff: (button.actionToggleOff ?? { type: 'none' }) as ButtonAction,
    longPressAction: (button.longPressAction ?? { type: 'none' }) as ButtonAction,
    radioGroup: button.radioGroup ?? '',
    folderButtons: button.action.type === 'folder' ? (button.action.folderButtons ?? []) : [],
  };
}

export function estiloInicial(button: ButtonConfig) {
  return {
    label: button.label || '',
    sublabel: button.sublabel || '',
    icon: button.icon || '',
    imageData: button.imageData || '',
    brandIcon: button.brandIcon || '',
    brandIconAlwaysAnimate: button.brandIconAlwaysAnimate ?? false,
    brandIconCustomBitmap: button.brandIconCustomBitmap,
    brandIconCustomColor: button.brandIconCustomColor,
    brandIconCustomPalette: button.brandIconCustomPalette,
    customGlyph57: button.customGlyph57,
    bgColor: button.bgColor || '',
    fgColor: button.fgColor || '',
    widget: button.widget,
  };
}

/** Lo que el widget muestra encima del botón: un sensor o una variable. */
export function widgetInicial(button: ButtonConfig) {
  return {
    // Los umbrales son texto en el formulario: mientras se escribe hay estados
    // que no son un número («-», «1.»), y guardarlos como número los perdería.
    sensorWidgetId: button.sensorWidget?.sensorId ?? '',
    sensorWidgetSuffix: button.sensorWidget?.suffix ?? '',
    sensorWidgetWarn: button.sensorWidget?.warnAt?.toString() ?? '',
    sensorWidgetCrit: button.sensorWidget?.critAt?.toString() ?? '',
    varWidgetName: button.varWidget?.varName ?? '',
    varWidgetPrefix: button.varWidget?.prefix ?? '',
    varWidgetSuffix: button.varWidget?.suffix ?? '',
    currencyWidget: button.currencyWidget,
  };
}

/** Cuándo se ve el botón: solo con tal aplicación delante, o según un sensor. */
export function visibilidadInicial(button: ButtonConfig) {
  return {
    visibleIfApp: button.visibleIf?.app ?? '',
    visibleIfSensorId: button.visibleIf?.sensor?.id ?? '',
    visibleIfSensorOp: (button.visibleIf?.sensor?.op ?? '>') as '>' | '<' | '>=' | '<=' | '==',
    visibleIfSensorVal: button.visibleIf?.sensor?.value?.toString() ?? '',
  };
}

/** Cuándo se dispara solo: atajo del sistema, a una hora, o por un sensor. */
export function disparadoresInicial(button: ButtonConfig) {
  return {
    globalHotkey: button.globalHotkey ?? '',
    inTrayMenu: button.inTrayMenu ?? false,
    timerTriggerAt: button.timerTriggerAt ?? '',
    sensorTriggerId: button.sensorTrigger?.id ?? '',
    sensorTriggerOp: (button.sensorTrigger?.op ?? '>') as '>' | '<' | '>=' | '<=' | '==',
    sensorTriggerVal: button.sensorTrigger?.value?.toString() ?? '',
    // El formulario pide segundos; la configuracion guarda milisegundos.
    sensorTriggerCooldown: button.sensorTrigger?.cooldownMs !== undefined
      ? String(Math.round(button.sensorTrigger.cooldownMs / 1000))
      : '',
  };
}
