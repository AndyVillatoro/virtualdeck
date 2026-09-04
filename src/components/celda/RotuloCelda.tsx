import React from 'react';
import { useTheme } from '../../utils/theme';
import type { ButtonConfig } from '../../types';

/**
 * La franja con el nombre del botón, pegada abajo.
 *
 * Se dibuja **aunque haya un widget encima**: el nombre que le puso el usuario
 * es lo que le permite reconocer el botón de un vistazo, y un reloj o una
 * temperatura no lo sustituyen.
 *
 * Sobre una imagen o un icono de marca el texto va en blanco con sombra y un
 * degradado detrás; sin ellos, con el color del propio botón sobre un velo
 * plano. Es la misma condición tres veces y por eso se calcula una sola vez.
 */
export function RotuloCelda({
  texto, button, accent, toggled,
}: {
  texto: string;
  button: ButtonConfig;
  accent: string;
  toggled: boolean;
}) {
  const VD = useTheme();
  const sobreImagen = !!(button.imageData || button.brandIcon);
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0,
      padding: '3px 6px 4px',
      background: sobreImagen
        ? 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.75) 60%)'
        : 'rgba(0,0,0,0.35)',
      fontFamily: VD.mono,
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: 0.4,
      color: sobreImagen ? '#fff' : (button.fgColor || (toggled ? accent : VD.text)),
      textShadow: sobreImagen ? '0 1px 2px rgba(0,0,0,0.9)' : 'none',
      textTransform: 'uppercase',
      lineHeight: 1.2,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      textAlign: 'center',
      pointerEvents: 'none',
      zIndex: 1,
    }}>
      {texto}
    </div>
  );
}
