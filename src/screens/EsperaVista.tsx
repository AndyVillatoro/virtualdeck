import React from 'react';
import { useTheme } from '../utils/theme';

// Espera de las vistas en carga diferida: una línea de puntos en la estética
// DOT, estática para no parpadear. Compartida por App (editor, RGB,
// dispositivos, fondos, barra, tutorial) y TiendaB (contenido de la tienda).
// Vive en el trozo principal —el fallback tiene que estar disponible antes de
// que llegue el trozo diferido— y dentro de los proveedores, así que el color
// sale del tema como en el resto.
export function EsperaVista() {
  const VD = useTheme();
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <span key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: VD.textMuted }} />
      ))}
    </div>
  );
}
