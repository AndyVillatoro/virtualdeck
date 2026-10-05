import React from 'react';
import { useTheme } from '../../utils/theme';
import { useT, useFieldText } from '../../utils/i18n';
import { DotLabel } from '../../components/DotLabel';
import { ButtonCell } from '../../components/ButtonCell';
import type { ButtonConfig, ButtonAction, SubButtonConfig, TipoWidget, SliderWidgetConfig } from '../../types';

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
}

function resolverIconoParaVista(isEncendido: boolean, campos: VistaCampos) {
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

function resolverColoresParaVista(isEncendido: boolean, campos: VistaCampos) {
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

function armarBotonParaVista({
  id,
  page,
  action,
  extraActions,
  isToggle,
  campos,
  subButtons,
  is2x2Mode,
  isEncendido,
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
}): ButtonConfig {
  const iconoRes = resolverIconoParaVista(isEncendido, campos);
  const coloresRes = resolverColoresParaVista(isEncendido, campos);
  const subBtnRes = is2x2Mode && subButtons && subButtons.length === 4 ? subButtons : undefined;

  return {
    id,
    page,
    label: campos.label,
    sublabel: campos.sublabel,
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
  };
}

function AlternadorToggle({
  isEncendido,
  onTogglePreview,
  accent,
  vdElevated,
  vdBorder,
  vdRadiusSm,
  vdTextDim,
  vdMono,
  labelApagado,
  labelEncendido,
  labelModo,
}: {
  isEncendido: boolean;
  onTogglePreview?: () => void;
  accent: string;
  vdElevated: string;
  vdBorder: string;
  vdRadiusSm: number | string;
  vdTextDim: string;
  vdMono: string;
  labelApagado: string;
  labelEncendido: string;
  labelModo: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ fontFamily: vdMono, fontSize: 9, color: accent, textAlign: 'center' }}>
        {labelModo}
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        <button
          type="button"
          onClick={() => {
            if (isEncendido && onTogglePreview) onTogglePreview();
          }}
          style={{
            height: 24,
            padding: '0 8px',
            background: !isEncendido ? `${accent}24` : vdElevated,
            border: `1px solid ${!isEncendido ? accent : vdBorder}`,
            borderRadius: vdRadiusSm,
            color: !isEncendido ? accent : vdTextDim,
            fontFamily: vdMono,
            fontSize: 8.5,
            fontWeight: !isEncendido ? 600 : 400,
            cursor: 'pointer',
          }}
        >
          {labelApagado}
        </button>
        <button
          type="button"
          onClick={() => {
            if (!isEncendido && onTogglePreview) onTogglePreview();
          }}
          style={{
            height: 24,
            padding: '0 8px',
            background: isEncendido ? `${accent}24` : vdElevated,
            border: `1px solid ${isEncendido ? accent : vdBorder}`,
            borderRadius: vdRadiusSm,
            color: isEncendido ? accent : vdTextDim,
            fontFamily: vdMono,
            fontSize: 8.5,
            fontWeight: isEncendido ? 600 : 400,
            cursor: 'pointer',
          }}
        >
          {labelEncendido}
        </button>
      </div>
    </div>
  );
}

export function VistaPrevia({
  id,
  page,
  accent,
  action,
  extraActions,
  isToggle,
  campos,
  subButtons,
  is2x2Mode,
  previewToggled = false,
  onTogglePreview,
}: {
  id: string;
  page: number;
  accent: string;
  action: ButtonAction;
  extraActions: ButtonAction[];
  isToggle: boolean;
  subButtons?: SubButtonConfig[];
  is2x2Mode?: boolean;
  previewToggled?: boolean;
  onTogglePreview?: () => void;
  campos: VistaCampos;
}) {
  const VD = useTheme();
  const t = useT();
  const tf = useFieldText();

  const isEncendido = Boolean(isToggle && previewToggled);
  const boton = armarBotonParaVista({
    id,
    page,
    action,
    extraActions,
    isToggle,
    campos,
    subButtons,
    is2x2Mode,
    isEncendido,
  });

  const textoAccionesExtra = extraActions.length > 1 ? tf('acciones adicionales') : tf('acción adicional');

  return (
    <div
      style={{
        width: 200,
        borderRight: `1px solid ${VD.border}`,
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: VD.bg,
        flexShrink: 0,
        gap: 14,
      }}
    >
      <DotLabel size={9} color={VD.textMuted} spacing={2}>
        {t('ed.preview')}
      </DotLabel>
      <div style={{ width: 120, height: 120, display: 'grid', userSelect: 'none' }}>
        <ButtonCell
          button={boton}
          accent={accent}
          toggled={isEncendido}
          soundEnabled={false}
          onEdit={() => {}}
          onExecute={() => {
            if (isToggle && onTogglePreview) {
              onTogglePreview();
            }
          }}
        />
      </div>

      {isToggle && (
        <AlternadorToggle
          isEncendido={isEncendido}
          onTogglePreview={onTogglePreview}
          accent={accent}
          vdElevated={VD.elevated}
          vdBorder={VD.border}
          vdRadiusSm={VD.radius.sm}
          vdTextDim={VD.textDim}
          vdMono={VD.mono}
          labelApagado={tf('APAGADO')}
          labelEncendido={tf('ENCENDIDO')}
          labelModo={t('ed.toggleMode')}
        />
      )}

      {extraActions.length > 0 && (
        <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, textAlign: 'center' }}>
          + {extraActions.length} {textoAccionesExtra}
        </div>
      )}

      <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, textAlign: 'center', lineHeight: 1.6 }}>
        {t('editor.previewHint')}<br />{t('editor.previewHint2')}
      </div>
    </div>
  );
}
