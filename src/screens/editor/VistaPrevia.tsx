import React from 'react';
import { useTheme } from '../../utils/theme';
import { useT, useFieldText } from '../../utils/i18n';
import { DotLabel } from '../../components/DotLabel';
import { ButtonCell } from '../../components/ButtonCell';
import type { ButtonConfig, ButtonAction } from '../../types';

/**
 * La columna izquierda del editor: el boton tal y como va a quedar.
 *
 * Es el **mismo** `ButtonCell` de la rejilla, no un dibujo parecido: cualquier
 * cambio de color, icono o insignia se ve aqui igual que se vera en la
 * pantalla principal, y nada puede divergir entre las dos.
 *
 * Los `|| undefined` viven aqui y no en `EditorB` a proposito: los campos del
 * formulario son cadenas vacias mientras no se rellenan, y `ButtonConfig`
 * espera ausencia, no vacio.
 */
export function VistaPrevia({
  id, page, accent, action, extraActions, isToggle, campos,
}: {
  id: string;
  page: number;
  accent: string;
  action: ButtonAction;
  extraActions: ButtonAction[];
  isToggle: boolean;
  campos: {
    label: string; sublabel: string; icon: string;
    imageData: string; brandIcon: string;
    brandIconAlwaysAnimate?: boolean;
    brandIconCustomBitmap?: string[];
    brandIconCustomColor?: string;
    brandIconCustomPalette?: Record<string, string>;
    customGlyph57?: number[];
    bgColor: string; fgColor: string;
  };
}) {
  const VD = useTheme();
  const t = useT();
  const tf = useFieldText();

  const boton: ButtonConfig = {
    id, page,
    label: campos.label,
    sublabel: campos.sublabel,
    icon: campos.icon,
    imageData: campos.imageData || undefined,
    brandIcon: campos.brandIcon || undefined,
    brandIconAlwaysAnimate: campos.brandIconAlwaysAnimate,
    brandIconCustomBitmap: campos.brandIconCustomBitmap,
    brandIconCustomColor: campos.brandIconCustomColor,
    brandIconCustomPalette: campos.brandIconCustomPalette,
    customGlyph57: campos.customGlyph57,
    bgColor: campos.bgColor || undefined,
    fgColor: campos.fgColor || undefined,
    action,
    actions: extraActions.length > 0 ? [action, ...extraActions] : undefined,
    isToggle,
  };

  return (
    <div style={{
      width: 200, borderRight: `1px solid ${VD.border}`, padding: 24,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: VD.bg, flexShrink: 0, gap: 14,
    }}>
      <DotLabel size={9} color={VD.textMuted} spacing={2}>{t('ed.preview')}</DotLabel>
      <div style={{ width: 120, height: 120, display: 'grid', pointerEvents: 'none', userSelect: 'none' }}>
        <ButtonCell
          button={boton}
          accent={accent}
          toggled={false}
          soundEnabled={false}
          onEdit={() => {}}
          onExecute={() => {}}
        />
      </div>
      {isToggle && (
        <div style={{ fontFamily: VD.mono, fontSize: 9, color: accent, textAlign: 'center' }}>
          {t('ed.toggleMode')}
        </div>
      )}
      {extraActions.length > 0 && (
        <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, textAlign: 'center' }}>
          + {extraActions.length} {extraActions.length > 1 ? tf('acciones adicionales') : tf('acción adicional')}
        </div>
      )}
      <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, textAlign: 'center', lineHeight: 1.6 }}>
        {t('editor.previewHint')}<br />{t('editor.previewHint2')}
      </div>
    </div>
  );
}
