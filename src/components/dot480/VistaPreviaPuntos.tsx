import React from 'react';
import { useTheme } from '../../utils/theme';
import type { MatrizPuntos } from './matricesPuntos';

interface VistaPreviaPuntosProps {
  matriz: MatrizPuntos;
  tamPunto?: number;
  hueco?: number;
}

/**
 * EditorPuntos — vista previa del dibujo con los mismos puntos que la celda:
 * rejilla de círculos sobre fondo OLED (`Glyph57View` pinta igual el glifo 5×7;
 * el icono de marca sale del mismo mapa de bits y paleta).
 */
export function VistaPreviaPuntos({ matriz, tamPunto = 5, hueco = 1 }: VistaPreviaPuntosProps) {
  const VD = useTheme();
  const filas = matriz.length;
  const columnas = matriz[0]?.length ?? 0;
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columnas}, ${tamPunto}px)`,
        gridTemplateRows: `repeat(${filas}, ${tamPunto}px)`,
        gap: hueco,
      }}
    >
      {matriz.flatMap((fila, r) =>
        fila.map((c, x) => (
          <div
            key={`${r}-${x}`}
            style={{
              width: tamPunto,
              height: tamPunto,
              borderRadius: '50%',
              background: c ? c : VD.dotIdle,
            }}
          />
        )),
      )}
    </div>
  );
}
