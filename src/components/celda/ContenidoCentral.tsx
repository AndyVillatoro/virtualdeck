import React from 'react';
import { useTheme } from '../../utils/theme';
import { Glyph57View } from '../Glyph57Editor';
import type { VDIconProps } from '../VDIcon';
import type { ButtonConfig } from '../../types';

/**
 * Lo que va en el centro de una celda: un widget en vivo, o el icono.
 *
 * Hay cuatro formas de icono y se pisan por prioridad — imagen de fondo, icono
 * de marca, glifo dibujado a mano, emoji, y el icono del tipo de acción como
 * último recurso. Esa cadena de condiciones vivía dentro del JSX de la celda,
 * mezclada con el resto de capas (barra de activo, anillo de ejecución,
 * insignias), y era imposible leer una sin tropezar con las otras.
 *
 * La etiqueta **no** entra aquí: va anclada abajo como su propia banda, para
 * que siga viéndose aunque el centro lo ocupe un widget.
 */

interface Props {
  button: ButtonConfig;
  isEmpty: boolean;
  iconColor: string;
  /** Icono del tipo de acción, cuando no hay ninguno más específico. */
  ActionIcon: React.ComponentType<VDIconProps>;
  widgetData?: { line1: string; line2?: string; tone?: 'warn' | 'crit' };
}

export function ContenidoCentral({ button, isEmpty, iconColor, ActionIcon, widgetData }: Props) {
  if (widgetData) return <Widget datos={widgetData} />;

  const tamano = isEmpty ? 20 : 24;
  // Una imagen o un icono de marca ocupan el fondo entero de la celda: el
  // centro se deja libre salvo que el usuario haya escrito además un emoji.
  const ocupadoPorFondo = !!button.imageData || !!button.brandIcon;

  if (ocupadoPorFondo) {
    if (!button.brandIcon || !button.icon) return null;
    return (
      <div style={{
        fontSize: tamano, lineHeight: 1,
        color: 'rgba(255,255,255,0.9)', textShadow: '0 1px 4px rgba(0,0,0,0.9)',
      }}>{button.icon}</div>
    );
  }

  if (button.customGlyph57?.length === 7) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Glyph57View rows={button.customGlyph57} dotSize={4} gap={1} color={iconColor} />
      </div>
    );
  }

  if (button.icon) {
    return <div style={{ fontSize: tamano, color: iconColor, lineHeight: 1 }}>{button.icon}</div>;
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <ActionIcon size={tamano} color={iconColor} />
    </div>
  );
}

function Widget({ datos }: { datos: NonNullable<Props['widgetData']> }) {
  const VD = useTheme();
  const color = datos.tone === 'crit' ? VD.danger : datos.tone === 'warn' ? VD.warning : VD.text;
  return (
    <>
      <div style={{
        fontFamily: VD.mono,
        // Ocho caracteres es donde un reloj deja de caber a tamaño grande.
        fontSize: datos.line1.length > 8 ? 9 : 14,
        color, lineHeight: 1.2,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 84,
      }}>{datos.line1}</div>
      {datos.line2 && (
        <div style={{
          fontFamily: VD.mono, fontSize: 7, color: VD.textMuted, marginTop: 3, letterSpacing: 0.5,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 84,
        }}>{datos.line2}</div>
      )}
    </>
  );
}
