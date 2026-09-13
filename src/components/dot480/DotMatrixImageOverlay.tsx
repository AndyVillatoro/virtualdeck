import React, { memo } from 'react';

export interface DotMatrixImageOverlayProps {
  /**
   * Separación entre centros de puntos en píxeles.
   * 4px para celdas estándar y vistas ampliadas; 3px para miniaturas compactas.
   * @default 4
   */
  pitch?: 3 | 4;
  /**
   * Nivel de opacidad de la máscara de puntos.
   * @default 0.92
   */
  opacity?: number;
  /**
   * Mostrar un sutil bisel/viñeta interior de lente OLED.
   * @default true
   */
  showBezel?: boolean;
  style?: React.CSSProperties;
}

/**
 * Capa de filtro físico Dot Matrix / Retro OLED Pixel Art.
 *
 * Se superpone a imágenes o carátulas (`<img>` con `imageRendering: 'pixelated'`),
 * dejando que cada micro-apertura circular tome el color auténtico de la imagen
 * mientras el espacio inter-LED permanece en negro OLED (#070809) con bisel de fósforo.
 */
export const DotMatrixImageOverlay = memo(function DotMatrixImageOverlay({
  pitch = 4,
  opacity = 0.92,
  showBezel = true,
  style,
}: DotMatrixImageOverlayProps) {
  // Parámetros según el paso (pitch):
  // pitch 4: radio de apertura 1.4px, centro en 2px 2px.
  // pitch 3: radio de apertura 1.1px, centro en 1.5px 1.5px.
  const radius = pitch === 4 ? 1.4 : 1.1;
  const center = pitch === 4 ? 2 : 1.5;

  return (
    <div
      className="vd-dot-matrix-overlay"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 2,
        // Máscara de micro-aperturas circulares:
        // Centro transparente para revelar el color exacto de la imagen,
        // borde degradado a negro OLED puro (#070809) entre puntos.
        backgroundImage: `
          radial-gradient(circle ${radius}px at ${center}px ${center}px, transparent ${radius * 0.75}px, rgba(7, 8, 9, 0.72) ${radius}px, #070809 100%),
          linear-gradient(to right, rgba(0, 0, 0, 0.25) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(0, 0, 0, 0.25) 1px, transparent 1px)
        `,
        backgroundSize: `${pitch}px ${pitch}px, ${pitch}px ${pitch}px, ${pitch}px ${pitch}px`,
        opacity,
        boxShadow: showBezel ? 'inset 0 0 10px rgba(0, 0, 0, 0.75), inset 0 0 2px rgba(255, 255, 255, 0.08)' : undefined,
        borderRadius: 'inherit',
        ...style,
      }}
    />
  );
});

