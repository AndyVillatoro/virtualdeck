import React from 'react';
import { useTheme } from '../../../../utils/theme';
import { useFieldText } from '../../../../utils/i18n';

/** Las que no se configuran: captura de región y reproducción de medios. */

export function FormRegionCapture() {
  const VD = useTheme();
  const tf = useFieldText();
  return (
    <>
          <div style={{ fontFamily: VD.mono, fontSize: 10, color: VD.textMuted, lineHeight: 1.6 }}>
            {tf('Abre la herramienta nativa de captura de región de Windows (Win+Shift+S). El recorte queda en el portapapeles.')}
          </div>
    </>
  );
}

export function FormMediaPlayPause() {
  const VD = useTheme();
  const tf = useFieldText();
  return (
    <>
          <div style={{ fontFamily: VD.mono, fontSize: 11, color: VD.textDim, padding: '8px 0' }}>
            {tf('Esta acción no necesita ninguna configuración adicional.')}
          </div>
    </>
  );
}
