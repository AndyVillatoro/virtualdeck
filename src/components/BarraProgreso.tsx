import React from 'react';
import { useTheme } from '../utils/theme';
import { formatearTiempo, useProgresoCancion, type EntradaProgreso } from '../utils/progresoCancion';

/**
 * La barra de progreso de la canción que suena: solo muestra, no busca.
 *
 * Pista fina de 8 px (malla de 4) con la trama apagada de la matriz y relleno
 * con el acento; a los lados, `m:ss` en mono. Sin `durationMs` no ocupa nada:
 * devuelve `null`. `conTiempos={false}` la deja en la pista sola, para los
 * sitios donde no caben los tiempos.
 */

const ALTO_FILA = 16;
const ALTO_PISTA = 8;
const ANCHO_TIEMPO = 32;

export function BarraProgreso({
  datos, conTiempos = true,
}: {
  datos: EntradaProgreso | null | undefined;
  conTiempos?: boolean;
}) {
  const VD = useTheme();
  const progreso = useProgresoCancion(datos);
  if (!progreso) return null;

  const { posicionMs, duracionMs } = progreso;
  const porcentaje = (posicionMs / duracionMs) * 100;
  const estiloTiempo = {
    fontFamily: VD.mono,
    fontSize: VD.tipo.xs,
    color: VD.textMuted,
    fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'nowrap',
    minWidth: ANCHO_TIEMPO,
  } as const;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: VD.space.sm, height: ALTO_FILA, width: '100%' }}>
      {conTiempos && (
        <span style={{ ...estiloTiempo, textAlign: 'left' }}>{formatearTiempo(posicionMs)}</span>
      )}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={Math.round(duracionMs)}
        aria-valuenow={Math.round(posicionMs)}
        style={{
          flex: 1, minWidth: 0, height: ALTO_PISTA, boxSizing: 'border-box',
          position: 'relative', overflow: 'hidden',
          background: VD.dotIdle, border: `1px solid ${VD.border}`, borderRadius: VD.radius.sm,
        }}
      >
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: `${porcentaje}%`, background: VD.accent,
        }} />
      </div>
      {conTiempos && (
        <span style={{ ...estiloTiempo, textAlign: 'right' }}>{formatearTiempo(duracionMs)}</span>
      )}
    </div>
  );
}
