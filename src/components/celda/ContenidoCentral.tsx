import React from 'react';
import { useTheme } from '../../utils/theme';
import { Glyph57View } from '../Glyph57Editor';
import { DotGlyphIcon, resolveDotGlyph } from '../dot480/DotGlyphIcon';
import type { VDIconProps } from '../VDIcon';
import type { ButtonConfig } from '../../types';
import type { DatosWidget } from './useDatosWidget';

/**
 * Lo que va en el centro de una celda: un widget en vivo, o el icono.
 *
 * Hay cuatro formas de icono y se pisan por prioridad — imagen de fondo, icono
 * de marca, glifo dibujado a mano, glifo dot-matrix o texto, y el icono del tipo de acción como
 * último recurso.
 */

interface Props {
  button: ButtonConfig;
  isEmpty: boolean;
  iconColor: string;
  /** Icono del tipo de acción, cuando no hay ninguno más específico. */
  ActionIcon: React.ComponentType<VDIconProps>;
  widgetData?: DatosWidget;
}

export function ContenidoCentral({ button, isEmpty, iconColor, ActionIcon, widgetData }: Props) {
  const VD = useTheme();
  if (widgetData) return <Widget datos={widgetData} />;

  const tamano = isEmpty ? 20 : 24;
  const ocupadoPorFondo = !!button.imageData || !!button.brandIcon;

  if (ocupadoPorFondo) {
    if (!button.brandIcon || !button.icon) return null;
    const glyphName = resolveDotGlyph(button.icon);
    return (
      <div style={{ display: 'flex', justifyContent: 'center', zIndex: 1 }}>
        {glyphName ? (
          <DotGlyphIcon
            glyph={glyphName}
            size={tamano}
            color="rgba(255,255,255,0.95)"
            showRecessed={false}
          />
        ) : (
          <div style={{
            fontSize: tamano * 0.7,
            lineHeight: 1,
            color: 'rgba(255,255,255,0.9)',
            textShadow: '0 1px 4px rgba(0,0,0,0.9)',
            fontFamily: VD.mono,
          }}>
            {button.icon}
          </div>
        )}
      </div>
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
    const glyphName = resolveDotGlyph(button.icon);
    if (glyphName) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <DotGlyphIcon
            glyph={glyphName}
            size={tamano}
            color={iconColor}
            dimColor={VD.dotIdle}
            showRecessed={!ocupadoPorFondo}
          />
        </div>
      );
    }
    if (button.icon.trim().length <= 3) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <span
            style={{
              fontFamily: VD.dots,
              fontSize: tamano,
              color: iconColor,
              lineHeight: 1,
              letterSpacing: 1,
            }}
          >
            {button.icon.trim()}
          </span>
        </div>
      );
    }
    return (
      <div style={{
        fontSize: tamano * 0.7,
        color: iconColor,
        lineHeight: 1,
        fontFamily: VD.mono,
        textAlign: 'center',
      }}>
        {button.icon}
      </div>
    );
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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      {datos.glyph && (
        <div style={{ marginBottom: 2 }}>
          <DotGlyphIcon
            glyph={datos.glyph}
            size={10}
            color={color}
            dimColor={VD.dotIdle}
            showRecessed
          />
        </div>
      )}
      <div style={{
        fontFamily: VD.mono,
        // Ocho caracteres es donde un reloj deja de caber a tamaño grande.
        fontSize: datos.line1.length > 8 ? 9 : 13,
        color, lineHeight: 1.2,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 84,
      }}>{datos.line1}</div>
      {datos.line2 && (
        <div style={{
          fontFamily: VD.mono, fontSize: 7, color: VD.textMuted, marginTop: 2, letterSpacing: 0.5,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 84,
        }}>{datos.line2}</div>
      )}
    </div>
  );
}
