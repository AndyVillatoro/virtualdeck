import React from 'react';
import { useTheme } from '../../utils/theme';
import { BrandIconDisplay } from '../BrandIconDisplay';
import type { ButtonConfig } from '../../types';

/**
 * Lo que se pinta detrás del contenido de la celda: el icono de marca a sangre
 * o la imagen del usuario.
 *
 * Son excluyentes —una imagen propia gana al icono de marca— y esa regla
 * estaba escrita como dos condiciones separadas dentro del render de
 * `ButtonCell`, donde había que leerlas juntas para verla.
 */
export function CapasDeFondo({ button, toggled }: { button: ButtonConfig; toggled: boolean }) {
  const VD = useTheme();
  if (button.imageData) {
    return (
      <img
        src={button.imageData}
        alt=""
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }}
        draggable={false}
      />
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
