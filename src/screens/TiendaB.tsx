import React, { useEffect, useState } from 'react';
import { ThemeProvider } from '../utils/theme';
import { LanguageProvider } from '../utils/i18n';
import type { DeckConfig } from '../types';
import { ContenidoTienda } from './tienda/ContenidoTienda';
import { instaladosDeConfig } from './tienda/tiendaUtils';

/**
 * La tienda en ventana propia (`index.html#tienda`).
 *
 * Lee la configuración como la barra (carga al abrir + aviso en cada
 * guardado) y de ahí saca lo instalado para los avisos de update. Instalar
 * lo pide a la principal por `tienda:importar`: esta ventana no escribe.
 */
export function TiendaB() {
  const api = window.electronAPI;
  const [config, setConfig] = useState<DeckConfig | null>(null);

  useEffect(() => {
    if (!api) return;
    api.config.load().then((c) => setConfig(c as DeckConfig)).catch(() => {});
    // Cada guardado de la principal reavisa: así lo recién instalado cambia
    // su insignia sin reabrir la ventana.
    return api.tienda.onConfigChanged((data) => setConfig(data as DeckConfig));
  }, [api]);

  if (!config) return null;

  return (
    <LanguageProvider pref={config.language}>
      <ThemeProvider theme={config.theme ?? 'dark'} accent={config.accent}>
        <ContenidoTienda instalados={instaladosDeConfig(config)} accent={config.accent} />
      </ThemeProvider>
    </LanguageProvider>
  );
}
