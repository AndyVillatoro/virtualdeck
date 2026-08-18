import React, { CSSProperties } from 'react';
import { GLYPHS_5x7, VD } from '../design';

interface DotTextProps {
  text: string | number;
  dotSize?: number;
  gap?: number;
  color?: string;
  density?: number;
  /**
   * Ancho disponible en píxeles. Si el texto no cabe, los puntos se encogen
   * hasta que quepa en vez de desbordarse.
   */
  maxWidth?: number;
  style?: CSSProperties;
}

/** Punto más pequeño que sigue leyéndose. */
const DOT_MINIMO = 2;

/**
 * Quita las tildes para poder dibujar la letra base.
 *
 * La fuente dot-matrix es de 5×7 y solo tiene A-Z, dígitos y algo de
 * puntuación. Sin esto, cada `Á`, `Ó` o `Ñ` se dibujaba como un **hueco**: los
 * títulos en español aparecían con letras ausentes ("CONFIGURACIN").
 *
 * Se prefiere perder la tilde a perder la letra. La `Ñ` cae a `N` por el mismo
 * motivo: es mejor "ESPANOL" que "ESPA OL".
 */
function sinTildes(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Ancho total que ocuparía el texto con ese tamaño de punto. */
function anchoDe(cuantos: number, dotSize: number, gap: number): number {
  if (cuantos === 0) return 0;
  const anchoChar = 5 * dotSize + 4 * gap;
  const separacion = dotSize + gap * 2;
  return cuantos * anchoChar + (cuantos - 1) * separacion;
}

export function DotText({
  text, dotSize = 6, gap = 2, color = VD.text, density = 1, maxWidth, style = {},
}: DotTextProps) {
  const chars = sinTildes(String(text)).toUpperCase().split('');

  // Se reduce el tamaño del punto hasta que el texto quepa. La tarjeta que lo
  // contiene recorta lo que sobresale, así que sin esto un título largo se lee
  // a medias y no hay forma de saber qué decía.
  let tamano = dotSize;
  if (maxWidth && maxWidth > 0) {
    while (tamano > DOT_MINIMO && anchoDe(chars.length, tamano, gap) > maxWidth) {
      tamano -= 0.5;
    }
  }

  // Los puntos apagados son la trama de fondo de la matriz. Antes eran blancos
  // fijos, que sobre un fondo claro no se ven — y en modo claro el título
  // perdía su rejilla. `VD.border` sigue al tema.
  const apagado = density > 0 ? VD.border : 'transparent';

  return (
    <div style={{ display: 'inline-flex', gap: tamano + gap * 2, alignItems: 'center', ...style }}>
      {chars.map((ch, i) => {
        const g = GLYPHS_5x7[ch] || GLYPHS_5x7[' '];
        return (
          <div
            key={i}
            style={{
              display: 'grid',
              gridTemplateRows: `repeat(7, ${tamano}px)`,
              gridTemplateColumns: `repeat(5, ${tamano}px)`,
              gap,
            }}
          >
            {g.map((row, r) =>
              [4, 3, 2, 1, 0].map((col) => {
                const on = (row >> col) & 1;
                return (
                  <div
                    key={`${r}-${col}`}
                    style={{
                      width: tamano,
                      height: tamano,
                      borderRadius: '50%',
                      background: on ? color : apagado,
                    }}
                  />
                );
              })
            )}
          </div>
        );
      })}
    </div>
  );
}
