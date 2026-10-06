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
/** Texto claro sobre la franja oscura de una imagen; gris OLED, no `#ffffff`. */
const TEXTO_SOBRE_IMAGEN = '#e6e8eb';
/** Subetiqueta atenuada sobre franja oscura; gris neutro, no `#ffffff`. */
const SUBLABEL_SOBRE_IMAGEN = '#9da2a8';

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
  const sublabel = button.sublabel?.trim();

  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0,
      padding: sublabel ? '2px 4px 3px' : '3px 6px 4px',
      boxSizing: 'border-box',
      // Sobre imagen, franja OLED más opaca: la trama de puntos deja pasar el
      // color de la imagen entre los puntos y con 0.75 el texto se perdía.
      background: sobreImagen
        ? 'linear-gradient(180deg, rgba(7,8,9,0) 0%, rgba(7,8,9,0.88) 45%)'
        : 'rgba(0,0,0,0.35)',
      fontFamily: VD.mono,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      pointerEvents: 'none',
      // Encima de la trama de puntos (`DotMatrixImageOverlay`, zIndex 2): debajo
      // de ella el título quedaba tapado por la máscara y no se leía.
      zIndex: 3,
      overflow: 'hidden',
    }}>
      <span style={{
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: 0.4,
        // Sobre la franja oscura va claro en los dos temas, pero nunca blanco puro
        // (regla del proyecto): el mismo gris claro del texto OLED.
        color: sobreImagen ? TEXTO_SOBRE_IMAGEN : (button.fgColor || (toggled ? accent : VD.text)),
        textShadow: sobreImagen ? '0 1px 2px rgba(0,0,0,0.9)' : 'none',
        textTransform: 'uppercase',
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        textAlign: 'center',
      }}>
        {texto}
      </span>
      {sublabel ? (
        <span style={{
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
          fontSize: 7.5,
          fontWeight: 500,
          letterSpacing: 0.4,
          color: sobreImagen ? SUBLABEL_SOBRE_IMAGEN : (toggled ? `${accent}cc` : VD.textDim),
          textShadow: sobreImagen ? '0 1px 2px rgba(0,0,0,0.9)' : 'none',
          textTransform: 'uppercase',
          lineHeight: 1.1,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          textAlign: 'center',
          marginTop: 1,
        }}>
          {sublabel}
        </span>
      ) : null}
    </div>
  );
}
