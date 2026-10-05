import React, { useMemo } from 'react';
import { useTheme } from '../../utils/theme';
import { Glyph57View } from '../Glyph57Editor';
import { DotGlyphIcon, resolveDotGlyph } from '../dot480/DotGlyphIcon';
import { IconoPuntos } from '../dot480/IconoPuntos';
import { botonEfectivo, matrizDeBoton } from '../dot480/animacionPuntos';
import { useAnimacionPuntos } from '../dot480/useAnimacionPuntos';
import type { ButtonConfig } from '../../types';
import type { DatosWidget } from './useDatosWidget';

/**
 * Lo que va en el centro de una celda: un widget en vivo, o el icono.
 *
 * Precedencia del centro, de más a menos específico: widget en vivo →
 * imagen de fondo o marca (con el icono encima si hay marca) → dibujo
 * propio 5×7 → icono del catálogo 16×16 (`iconoPuntos`) → glifo por nombre
 * o texto (`icon`) → glifo del tipo de acción. `iconoPuntos` es un tipo de
 * icono más y va donde va `icon`: por debajo del fondo y del 5×7, un
 * peldaño por encima del glifo por nombre. La tecla física (`pintarTecla`),
 * el SVG inyectado (`iconoSvg`) y el mando móvil (resuelto en el proceso
 * principal) reproducen este mismo orden.
 */

interface Props {
  button: ButtonConfig;
  isEmpty: boolean;
  iconColor: string;
  /** Glifo DOT 8×8 del tipo de acción, cuando no hay ninguno más específico. */
  actionGlyph: string;
  widgetData?: DatosWidget;
  /** El botón es `isToggle` y está encendido: se pinta su `aspectoEncendido`. */
  encendido?: boolean;
  /** Crece en cada pulsación (destello de `usePulsacionRaton`). */
  pulsoId?: number;
}

export function ContenidoCentral({ button, isEmpty, iconColor, actionGlyph, widgetData, encendido, pulsoId }: Props) {
  const VD = useTheme();
  // Tal como se pinta (con el aspecto de encendido si toca) y su matriz
  // animable. Los hooks van antes de las salidas: con widget no se anima.
  const boton = useMemo(() => botonEfectivo(button, encendido === true), [button, encendido]);
  const matriz = useMemo(
    () => (widgetData ? null : matrizDeBoton(boton, isEmpty)),
    [boton, isEmpty, widgetData],
  );
  const intensidades = useAnimacionPuntos({
    matriz,
    efecto: boton.animacion?.efecto,
    cuando: boton.animacion?.cuando,
    encendido,
    efectoPulsar: boton.efectoPulsar,
    pulsoId,
  });
  if (widgetData) return <Widget datos={widgetData} />;

  const tamano = isEmpty ? 20 : 24;
  const ocupadoPorFondo = !!boton.imageData || !!boton.brandIcon;

  if (ocupadoPorFondo) return <CentroSobreFondo button={boton} tamano={tamano} />;

  if (boton.customGlyph57?.length === 7) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Glyph57View rows={boton.customGlyph57} dotSize={4} gap={1} color={iconColor} />
      </div>
    );
  }

  // El icono del catálogo (16×16 copiado en el botón): por encima del glifo
  // por nombre y del tipo de acción, por debajo del fondo y del 5×7.
  if (boton.iconoPuntos?.bits) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <IconoPuntos
          bits={boton.iconoPuntos.bits}
          size={tamano}
          color={iconColor}
          dimColor={VD.dotIdle}
          intensidades={intensidades}
          showRecessed
        />
      </div>
    );
  }

  if (boton.icon) {
    const glyphName = resolveDotGlyph(boton.icon);
    if (glyphName) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <DotGlyphIcon
            glyph={glyphName}
            size={tamano}
            color={iconColor}
            dimColor={VD.dotIdle}
            intensidades={intensidades}
            showRecessed
          />
        </div>
      );
    }
    if (boton.icon.trim().length <= 3) {
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
            {boton.icon.trim()}
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
        {boton.icon}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <DotGlyphIcon
        glyph={actionGlyph}
        size={tamano}
        color={iconColor}
        dimColor={VD.dotIdle}
        intensidades={intensidades}
        showRecessed
      />
    </div>
  );
}

/**
 * El centro encima de una imagen o marca: solo hay sitio si hay marca, que
 * es la que deja hueco para el icono (la imagen llena la celda). Gana
 * `iconoPuntos` y si no hay, el glifo por nombre o el texto de `icon`.
 */
function CentroSobreFondo({ button, tamano }: { button: ButtonConfig; tamano: number }) {
  const VD = useTheme();
  if (!button.brandIcon || (!button.iconoPuntos?.bits && !button.icon)) return null;
  if (button.iconoPuntos?.bits) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', position: 'relative', zIndex: 3 /* sobre la trama de la imagen (2) */ }}>
        <IconoPuntos
          bits={button.iconoPuntos.bits}
          size={tamano}
          color="rgba(255,255,255,0.95)"
          showRecessed={false}
        />
      </div>
    );
  }
  const glyphName = resolveDotGlyph(button.icon);
  return (
    <div style={{ display: 'flex', justifyContent: 'center', position: 'relative', zIndex: 3 /* sobre la trama de la imagen (2) */ }}>
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
