import React, { memo } from 'react';

export interface DotRadialSweepProps {
  /** Color de acento del botón para iluminar los puntos del barrido */
  accent: string;
  /** Modo compacto para sub-botones 2×2 */
  compact?: boolean;
}

// Ángulos en grados para la onda 1 (12 direcciones radiales a 30°)
const ANGLES_WAVE_1 = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
const ANGLES_WAVE_1_COMPACT = [0, 45, 90, 135, 180, 225, 270, 315];

// Ángulos intercalados para la onda 2 (8 direcciones a 45° con desfase de 15°)
const ANGLES_WAVE_2 = [15, 60, 105, 150, 195, 240, 285, 330];

/**
 * 5.3 — Animación táctil "Radial Dot Sweep" (DOT / 480 OLED Micro Interface).
 *
 * Emite una onda física de micro-puntos LED discretos y anillos concéntricos punteados
 * que brotan y se expanden radialmente desde el centro (50%, 50%) de la celda
 * hacia sus extremos en respuesta a la pulsación.
 */
export const DotRadialSweep = memo(function DotRadialSweep({
  accent,
  compact = false,
}: DotRadialSweepProps) {
  const w1Angles = compact ? ANGLES_WAVE_1_COMPACT : ANGLES_WAVE_1;

  return (
    <div className="vd-dot-sweep-overlay" aria-hidden="true">
      {/* 1. Resplandor radial suave que nace y se disipa desde el centro */}
      <div
        className="vd-wave-glow"
        style={{
          background: `radial-gradient(circle, ${accent}66 0%, ${accent}18 50%, transparent 75%)`,
        }}
      />

      {/* 2. Anillos concéntricos punteados que se expanden hacia afuera */}
      <div
        className="vd-wave-circle vd-wave-circle-1"
        style={{ borderColor: accent }}
      />
      {!compact && (
        <div
          className="vd-wave-circle vd-wave-circle-2"
          style={{ borderColor: accent }}
        />
      )}

      {/* 3. Chispa nuclear en el centro (punto de origen) */}
      <span
        className="vd-dot-origin"
        style={{ background: accent }}
      />

      {/* 4. Onda 1: Micro-puntos discretos que vuelan radialmente desde el centro */}
      {w1Angles.map((deg) => (
        <span
          key={`w1-${deg}`}
          className={`vd-radial-dot ${compact ? 'vd-dot-w1-compact' : 'vd-dot-w1'}`}
          style={{
            '--angle': `${deg}deg`,
            background: accent,
            boxShadow: `0 0 3px ${accent}`,
          } as React.CSSProperties}
        />
      ))}

      {/* 5. Onda 2: Segunda salva de micro-puntos con retardo escalonado */}
      {!compact &&
        ANGLES_WAVE_2.map((deg) => (
          <span
            key={`w2-${deg}`}
            className="vd-radial-dot vd-dot-w2"
            style={{
              '--angle': `${deg}deg`,
              background: accent,
              boxShadow: `0 0 2px ${accent}`,
            } as React.CSSProperties}
          />
        ))}
    </div>
  );
});
