import React, { memo } from 'react';

/** Qué se pulsó: `destello` (brillo de confirmación) u `onda` (anillos). */
export type EfectoSweep = 'destello' | 'onda';

export interface DotRadialSweepProps {
  /** Color de acento del botón para iluminar los puntos del barrido */
  accent: string;
  /** Modo compacto para sub-botones 2×2 */
  compact?: boolean;
  /** Efecto elegido en el botón. Por defecto, `destello`. */
  kind?: EfectoSweep;
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
 *
 * Dos variantes, la misma capa:
 *
 * - `destello` (~420 ms): un velo de brillo (`backdrop-filter`) hace que lo de
 *   debajo —el icono, la imagen, la marca— suba **por encima de su color** y
 *   vuelva con ease-out, más el resplandor y una salva corta de puntos. Es la
 *   confirmación: dura lo que el destello del motor DOT.
 * - `onda` (~620 ms, el barrido completo): anillos de 3 px y dos salvas de
 *   puntos más grandes; sin velo. El icono no sube, el anillo viaja.
 *
 * La duración la manda `--vd-sweep` en `index.css`, y con «reducir movimiento»
 * se quitan las partículas (`.vd-radial-dot`) y se acortan las animaciones,
 * pero el velo de confirmación se queda.
 */
export const DotRadialSweep = memo(function DotRadialSweep({
  accent,
  compact = false,
  kind = 'destello',
}: DotRadialSweepProps) {
  const w1Angles = compact ? ANGLES_WAVE_1_COMPACT : ANGLES_WAVE_1;
  const onda = kind === 'onda';

  return (
    <div
      className={`vd-dot-sweep-overlay vd-sweep-${onda ? 'onda' : 'destello'}`}
      aria-hidden="true"
    >
      {/* 0. Velo de brillo del destello: lo de debajo sube sobre su propio color */}
      {!onda && <div className="vd-sweep-brillo" />}

      {/* 1. Resplandor radial suave que nace y se disipa desde el centro */}
      <div
        className="vd-wave-glow"
        style={{
          background: `radial-gradient(circle, ${accent}99 0%, ${accent}33 55%, transparent 78%)`,
        }}
      />

      {/* 2. Anillos concéntricos punteados que se expanden hacia afuera */}
      <div
        className="vd-wave-circle vd-wave-circle-1"
        style={{ borderColor: accent }}
      />
      {!compact && onda && (
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
            boxShadow: `0 0 4px ${accent}`,
          } as React.CSSProperties}
        />
      ))}

      {/* 5. Onda 2: Segunda salva de micro-puntos con retardo escalonado (solo la onda) */}
      {!compact &&
        onda &&
        ANGLES_WAVE_2.map((deg) => (
          <span
            key={`w2-${deg}`}
            className="vd-radial-dot vd-dot-w2"
            style={{
              '--angle': `${deg}deg`,
              background: accent,
              boxShadow: `0 0 3px ${accent}`,
            } as React.CSSProperties}
          />
        ))}
    </div>
  );
});
