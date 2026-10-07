import React from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { PadFlechas } from './PadFlechas';

interface HerramientasMoverPuntosProps {
  alDesplazar: (dx: number, dy: number) => void;
  alInvertir: () => void;
  alEspejoH: () => void;
  alEspejoV: () => void;
}

/**
 * EditorPuntos — pad de desplazamiento e inversiones, compartido por las dos
 * pestañas (el pad venía del editor 5×7; en la 17×17 es nuevo).
 */
export function HerramientasMoverPuntos({
  alDesplazar,
  alInvertir,
  alEspejoH,
  alEspejoV,
}: HerramientasMoverPuntosProps) {
  const VD = useTheme();
  const t = useT();
  const btn: React.CSSProperties = {
    padding: '4px 7px',
    background: 'transparent',
    border: `1px solid ${VD.border}`,
    fontFamily: VD.mono,
    fontSize: 8,
    color: VD.textDim,
    cursor: 'pointer',
    borderRadius: VD.radius.sm,
    letterSpacing: 0.5,
  };
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <PadFlechas onMover={(dx, dy) => alDesplazar(dx, dy)} />
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button type="button" onClick={alInvertir} style={btn}>
          {t('puntos.invertir')}
        </button>
        <button type="button" onClick={alEspejoH} style={btn}>
          {t('puntos.espejoH')}
        </button>
        <button type="button" onClick={alEspejoV} style={btn}>
          {t('puntos.espejoV')}
        </button>
      </div>
    </div>
  );
}
