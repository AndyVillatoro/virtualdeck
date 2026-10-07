import React from 'react';
import { useT } from '../../utils/i18n';
import { BotonIcono } from '../ui/BotonIcono';

export interface PadFlechasProps {
  /** Callback al pulsar una flecha, con el desplazamiento (dx, dy). */
  onMover: (dx: number, dy: number) => void;
  /** Lado de cada botón en px (por defecto 20). */
  tamano?: number;
  /** Lado del glifo en px (por defecto 8). */
  tamanoGlifo?: number;
  disabled?: boolean;
}

/**
 * Pad direccional de 4 flechas (3×3) con accesibilidad completa y glifos DOT.
 * Compartido por Glyph57Editor, PestanaGlifo y HerramientasMoverPuntos.
 */
export function PadFlechas({ onMover, tamano = 20, tamanoGlifo = 8, disabled }: PadFlechasProps) {
  const t = useT();

  return (
    <div
      role="group"
      aria-label={t('comun.moverPuntos')}
      style={{ display: 'grid', gridTemplateColumns: `repeat(3, ${tamano}px)`, gap: 2 }}
    >
      <div />
      <BotonIcono
        glifo="ARROW_UP"
        title={t('comun.moverArriba')}
        onClick={() => onMover(0, -1)}
        tamano={tamano}
        tamanoGlifo={tamanoGlifo}
        conMarco
        disabled={disabled}
      />
      <div />
      <BotonIcono
        glifo="ARROW_LEFT"
        title={t('comun.moverIzquierda')}
        onClick={() => onMover(-1, 0)}
        tamano={tamano}
        tamanoGlifo={tamanoGlifo}
        conMarco
        disabled={disabled}
      />
      <div />
      <BotonIcono
        glifo="ARROW_RIGHT"
        title={t('comun.moverDerecha')}
        onClick={() => onMover(1, 0)}
        tamano={tamano}
        tamanoGlifo={tamanoGlifo}
        conMarco
        disabled={disabled}
      />
      <div />
      <BotonIcono
        glifo="ARROW_DOWN"
        title={t('comun.moverAbajo')}
        onClick={() => onMover(0, 1)}
        tamano={tamano}
        tamanoGlifo={tamanoGlifo}
        conMarco
        disabled={disabled}
      />
      <div />
    </div>
  );
}
