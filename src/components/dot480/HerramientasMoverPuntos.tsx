import React from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';

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
  const pad: React.CSSProperties = {
    width: 20,
    height: 20,
    background: VD.elevated,
    border: `1px solid ${VD.border}`,
    fontFamily: VD.mono,
    fontSize: 8,
    color: VD.textDim,
    cursor: 'pointer',
    borderRadius: VD.radius.sm,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  };
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 20px)', gap: 2 }}>
        <div />
        <button type="button" onClick={() => alDesplazar(0, -1)} style={pad}>
          ▲
        </button>
        <div />
        <button type="button" onClick={() => alDesplazar(-1, 0)} style={pad}>
          ◀
        </button>
        <div />
        <button type="button" onClick={() => alDesplazar(1, 0)} style={pad}>
          ▶
        </button>
        <div />
        <button type="button" onClick={() => alDesplazar(0, 1)} style={pad}>
          ▼
        </button>
        <div />
      </div>
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
