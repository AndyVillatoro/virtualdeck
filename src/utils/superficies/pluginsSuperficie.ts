import { useMemo } from 'react';
import { usePluginsVisiblesDock } from '../plugins/usePluginsVisibles';
import { paginaDe } from './paginasSuperficie';
import type { DeckConfig, ElectronAPI, InfoSuperficie } from '../../types';

/**
 * Los plugins instalados, avisados de las teclas de los docks.
 *
 * Cada dock enseña su página activa; sin su `willAppear` el gestor ni acepta
 * la pulsación (`press` exige contexto visible) ni les pinta nada. Es el mismo
 * aviso que el deck, con los índices de las páginas activas de cada serial
 * conectado (el contexto lleva el serial, así que no se pisan).
 */
export function usePluginsSuperficie({
  api, config, dispositivos, activas,
}: {
  api: ElectronAPI | undefined;
  config: DeckConfig;
  dispositivos: InfoSuperficie[];
  /** Página activa de cada serial, por id (la que enseña el aparato). */
  activas: Record<string, string>;
}) {
  const paginas = useMemo(() => {
    const indices: number[] = [];
    for (const dispositivo of dispositivos) {
      if (!dispositivo.conectado || !dispositivo.disposicion) continue;
      const pagina = paginaDe(config, dispositivo.serial, dispositivo.disposicion, activas[dispositivo.serial]);
      if (pagina) indices.push(pagina.indice);
    }
    return indices;
  }, [config, dispositivos, activas]);

  usePluginsVisiblesDock({ api, config, paginas, visible: paginas.length > 0 });
}
