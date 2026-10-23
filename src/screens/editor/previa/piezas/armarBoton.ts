/**
 * Construcción del `ButtonConfig` que la vista previa pinta (roadmap 121b).
 *
 * Todo salió tal cual de `previa/VistaPreviaPiezas.tsx`; este módulo es lógica
 * pura (sin React): resuelve aspecto encendido/apagado, colores y widgets.
 */
import { interpolate } from '../../../../comun/interpolar';
import type {
  ButtonConfig,
  ButtonAction,
  SubButtonConfig,
  TipoWidget,
  SliderWidgetConfig,
} from '../../../../types';

export interface VistaCampos {
  label: string;
  sublabel: string;
  icon: string;
  imageData: string;
  brandIcon: string;
  brandIconAlwaysAnimate?: boolean;
  brandIconCustomBitmap?: string[];
  brandIconCustomColor?: string;
  brandIconCustomPalette?: Record<string, string>;
  customGlyph57?: number[];
  bgColor: string;
  fgColor: string;
  fijo?: boolean;
  widget?: TipoWidget;
  sliderWidget?: SliderWidgetConfig;
  iconoPuntos?: { bits: string; origen: string };
  animacion?: ButtonConfig['animacion'];
  efectoPulsar?: ButtonConfig['efectoPulsar'];
  aspectoEncendido?: ButtonConfig['aspectoEncendido'];
  varWidget?: ButtonConfig['varWidget'];
  sensorWidget?: ButtonConfig['sensorWidget'];
  currencyWidget?: ButtonConfig['currencyWidget'];
}

function resolverIcono(isEncendido: boolean, campos: VistaCampos) {
  if (isEncendido && campos.aspectoEncendido) {
    const enc = campos.aspectoEncendido;
    if (enc.icon || enc.iconoPuntos) {
      return {
        icon: enc.icon || (enc.iconoPuntos ? '' : campos.icon),
        iconoPuntos: enc.iconoPuntos || (enc.icon ? undefined : campos.iconoPuntos),
      };
    }
  }
  return { icon: campos.icon, iconoPuntos: campos.iconoPuntos };
}

function resolverColores(isEncendido: boolean, campos: VistaCampos) {
  if (isEncendido && campos.aspectoEncendido) {
    const enc = campos.aspectoEncendido;
    return {
      bgColor: enc.bgColor || campos.bgColor || undefined,
      fgColor: enc.fgColor || campos.fgColor || undefined,
    };
  }
  return {
    bgColor: campos.bgColor || undefined,
    fgColor: campos.fgColor || undefined,
  };
}

export function armarBotonParaVista({
  id,
  page,
  action,
  extraActions,
  isToggle,
  campos,
  subButtons,
  is2x2Mode,
  isEncendido,
  deckState,
  botonOriginal,
}: {
  id: string;
  page: number;
  action: ButtonAction;
  extraActions: ButtonAction[];
  isToggle: boolean;
  campos: VistaCampos;
  subButtons?: SubButtonConfig[];
  is2x2Mode?: boolean;
  isEncendido: boolean;
  deckState?: Record<string, string>;
  botonOriginal?: ButtonConfig;
}): ButtonConfig {
  const iconoRes = resolverIcono(isEncendido, campos);
  const coloresRes = resolverColores(isEncendido, campos);

  // En modo 2×2, si los cuadrantes no tienen texto ni icono (recién activado o vacíos),
  // se muestran 'Q1', 'Q2', 'Q3', 'Q4' como placeholder para que la vista previa
  // sea observable y se distingan claramente los 4 cuadrantes.
  const subBtnRes = is2x2Mode && subButtons && subButtons.length === 4
    ? subButtons.map((sb, i) => ({
        ...sb,
        label: sb.label || (sb.icon || sb.dotGlyph ? '' : `Q${i + 1}`),
      }))
    : undefined;

  const varWidget = campos.varWidget ?? botonOriginal?.varWidget;
  const sensorWidget = campos.sensorWidget ?? botonOriginal?.sensorWidget;
  const currencyWidget = campos.currencyWidget ?? botonOriginal?.currencyWidget;

  return {
    id,
    page,
    label: campos.label,
    sublabel: interpolate(campos.sublabel, deckState) || undefined,
    icon: iconoRes.icon,
    iconoPuntos: iconoRes.iconoPuntos,
    imageData: campos.imageData || undefined,
    brandIcon: campos.brandIcon || undefined,
    brandIconAlwaysAnimate: campos.brandIconAlwaysAnimate,
    brandIconCustomBitmap: campos.brandIconCustomBitmap,
    brandIconCustomColor: campos.brandIconCustomColor,
    brandIconCustomPalette: campos.brandIconCustomPalette,
    customGlyph57: campos.customGlyph57,
    bgColor: coloresRes.bgColor,
    fgColor: coloresRes.fgColor,
    action,
    actions: extraActions.length > 0 ? [action, ...extraActions] : undefined,
    isToggle,
    fijo: campos.fijo || undefined,
    widget: campos.widget,
    sliderWidget: campos.sliderWidget,
    subButtons: subBtnRes,
    animacion: campos.animacion,
    efectoPulsar: campos.efectoPulsar,
    aspectoEncendido: campos.aspectoEncendido,
    varWidget,
    sensorWidget,
    currencyWidget,
  };
}
