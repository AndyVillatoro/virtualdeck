import React, { useMemo } from 'react';
import { useTheme } from '../../utils/theme';

export interface DotRotaryDialProps {
  step: number;
  lastDir?: 1 | -1;
  lastActiveTime?: number;
  accent: string;
  hovered?: boolean;
  delta?: number;
  children: React.ReactNode;
}

/**
 * Indicador gráfico circular rotativo de puntos LED estilo DOT / 480.
 * Responde visualmente al giro de la rueda del ratón y clics en celdas de ajuste.
 */
export function DotRotaryDial({
  step,
  lastDir = 1,
  lastActiveTime = 0,
  accent,
  hovered = false,
  delta = 5,
  children,
}: DotRotaryDialProps) {
  const VD = useTheme();
  const isActive = Date.now() - lastActiveTime < 1000;
  const dotCount = 16;
  const radius = 22;
  const size = 54;
  const cx = size / 2;
  const cy = size / 2;

  // Índice activo normalizado en [0..15]
  const activeIdx = ((step % dotCount) + dotCount) % dotCount;

  // Generación de los 16 puntos concéntricos
  const dots = useMemo(() => {
    const items = [];
    const angleStep = (2 * Math.PI) / dotCount;

    for (let i = 0; i < dotCount; i++) {
      // Inicia a las 12 en punto (-PI / 2)
      const angle = i * angleStep - Math.PI / 2;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);

      // Distancia angular más corta al punto activo
      const dist = Math.min(
        Math.abs(i - activeIdx),
        dotCount - Math.abs(i - activeIdx)
      );

      // Puntos cardinales principales (12, 3, 6, 9 en punto)
      const isCardinal = i % 4 === 0;
      const baseR = isCardinal ? 1.5 : 1.1;

      let fill = hovered ? `rgba(${VD.trama}, 0.24)` : `rgba(${VD.trama}, 0.08)`;

      let r = baseR;
      let opacity = 1;

      if (dist === 0) {
        // Punto activo principal
        fill = accent;
        r = isActive ? 2.4 : 1.8;
      } else if (dist === 1 && isActive) {
        // Estela brillante contigua
        fill = accent;
        opacity = 0.55;
        r = 1.6;
      } else if (dist === 2 && isActive) {
        // Estela suave
        fill = accent;
        opacity = 0.25;
        r = 1.3;
      }

      items.push(
        <circle
          key={i}
          cx={x}
          cy={y}
          r={r}
          fill={fill}
          opacity={opacity}
          style={{ transition: 'r 0.1s ease, fill 0.1s ease, opacity 0.1s ease' }}
        />
      );
    }
    return items;
  }, [activeIdx, isActive, hovered, accent, VD.trama, cx, cy, radius, dotCount]);

  const absDelta = Math.abs(delta);
  const deltaText = lastDir > 0 ? `+${absDelta}%` : `-${absDelta}%`;

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Anillo de puntos SVG concéntricos */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      >
        {dots}
      </svg>

      {/* Icono central de la acción */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </div>

      {/* Notificación flotante de delta durante el giro activo */}
      {isActive && (
        <div
          style={{
            position: 'absolute',
            top: -2,
            right: -4,
            background: `${accent}25`,
            border: `1px solid ${accent}`,
            borderRadius: 2,
            padding: '1px 3px',
            fontFamily: VD.mono,
            fontSize: 7,
            lineHeight: 1,
            color: accent,
            letterSpacing: 0.5,
            pointerEvents: 'none',
            zIndex: 3,
            boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
          }}
        >
          {deltaText}
        </div>
      )}
    </div>
  );
}
