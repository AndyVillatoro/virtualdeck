import React from 'react';
import { useTheme } from '../../utils/theme';
import { BrandIconDisplay } from '../BrandIconDisplay';
import { DotMatrixImageOverlay } from '../dot480/DotMatrixImageOverlay';
import type { ButtonConfig } from '../../types';

/**
 * Lo que se pinta detrás del contenido de la celda: la imagen de un plugin, la
 * del usuario o el icono de marca.
 *
 * Son excluyentes —la imagen de un plugin gana al icono de marca, y la del
 * usuario al icono de marca— y esa regla estaba escrita como dos condiciones
 * separadas dentro del render de `ButtonCell`, donde había que leerlas juntas
 * para verla.
 *
 * La imagen del plugin **no** pasa por la trama de puntos (`DotMatrixImageOverlay`)
 * a propósito: es una decisión de producto del MVP de plugins (roadmap 83), no
 * un descuido. Lo que manda un plugin es un PNG o un SVG suyos, con colores y
 * degradados; convertirlo a puntos lo dejaría irreconocible, y el hardware de
 * verdad lo enseña tal cual. El resto del proyecto sigue siendo todo DOT: esto
 * es **una** capa, y solo mientras el botón sea de plugin.
 */
export function CapasDeFondo({
  button, toggled, plugin,
}: { button: ButtonConfig; toggled: boolean; plugin?: { imagen?: string } }) {
  const VD = useTheme();
  if (plugin?.imagen) {
    return (
      <img
        src={plugin.imagen}
        alt=""
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          imageRendering: 'auto',
          opacity: 0.92,
        }}
        draggable={false}
      />
    );
  }
  if (button.imageData) {
    return (
      <>
        <img
          src={button.imageData}
          alt=""
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            imageRendering: 'pixelated',
            opacity: 0.92,
          }}
          draggable={false}
        />
        <DotMatrixImageOverlay pitch={4} />
      </>
    );
  }
  if (!button.brandIcon) return null;
  return (
    <BrandIconDisplay
      iconKey={button.brandIcon}
      customBitmap={button.brandIconCustomBitmap}
      customColor={button.brandIconCustomColor}
      customPalette={button.brandIconCustomPalette}
      animated={toggled || (button.brandIconAlwaysAnimate ?? false)}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', borderRadius: VD.radius.md }}
    />
  );
}
