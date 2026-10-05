import React, { memo, useMemo } from 'react';
import { LADO_PUNTOS16, matrizDePuntos16 } from './puntos16';

export interface IconoPuntosProps {
  /** 32 bytes en base64 (ver `puntos16.ts`). */
  bits: string;
  size?: number;
  color?: string;
  /** Puntos apagados en relieve, como `DotGlyphIcon`. */
  showRecessed?: boolean;
  dimColor?: string;
  /** Intensidad 0-1 por punto [y][x] (motor `efectosPuntos`); ausente = todo encendido. */
  intensidades?: readonly (readonly number[])[] | null;
  style?: React.CSSProperties;
}

/**
 * Un icono del catálogo grande (16×16) dibujado en puntos, con la misma
 * estética que `DotGlyphIcon` (que dibuja los glifos 8×8 por nombre).
 */
export const IconoPuntos = memo(function IconoPuntos({
  bits, size = 24, color = '#e6e8eb', showRecessed = false,
  dimColor = 'rgba(255, 255, 255, 0.04)', intensidades, style,
}: IconoPuntosProps) {
  const matriz = useMemo(() => matrizDePuntos16(bits), [bits]);
  if (!matriz) return null;
  return (
    <svg
      viewBox={`0 0 ${LADO_PUNTOS16} ${LADO_PUNTOS16}`}
      width={size}
      height={size}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    >
      {matriz.flatMap((fila, y) => fila.map((encendido, x) => (encendido || showRecessed ? (
        <circle key={x + LADO_PUNTOS16 * y} cx={x + 0.5} cy={y + 0.5} r={0.42} fill={encendido ? color : dimColor} fillOpacity={encendido ? (intensidades?.[y]?.[x] ?? 1) : 1} />
      ) : null)))}
    </svg>
  );
});
