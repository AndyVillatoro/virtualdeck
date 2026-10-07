import React from 'react';
import { PanelMusica } from './PanelMusica';
import type { DeckConfig } from '../../types';

type PropsMusica = Pick<
  React.ComponentProps<typeof PanelMusica>,
  'nowPlaying' | 'isPlaying' | 'sourceName' | 'api'
>;

interface PanelMusicaLateralProps extends PropsMusica {
  config: DeckConfig;
  panelMusica: NonNullable<DeckConfig['musicPanel']>;
  lado: 'left' | 'right';
  onConfigChange: (c: DeckConfig) => void;
}

/**
 * Panel de música a un lado de la rejilla. Va fuera de ella y no encima:
 * tapar botones para enseñar la canción sería cambiar una cosa por otra.
 * Hay dos instancias (una por lado) porque el orden en el flex importa:
 * la izquierda va antes de la rejilla y la derecha después del sidebar.
 */
export function PanelMusicaLateral({ config, panelMusica, lado, onConfigChange, ...musica }: PanelMusicaLateralProps) {
  if (!panelMusica.enabled || panelMusica.side !== lado) return null;
  return (
    <PanelMusica
      accent={config.accent}
      lado={lado}
      plegado={panelMusica.plegado === true}
      onPlegar={(plegado) => onConfigChange({ ...config, musicPanel: { ...panelMusica, plegado } })}
      onCerrar={() => onConfigChange({ ...config, musicPanel: { ...panelMusica, enabled: false } })}
      video={{
        activo: panelMusica.video === true,
        recortes: panelMusica.recortes ?? {},
        onActivo: (video) => onConfigChange({ ...config, musicPanel: { ...panelMusica, video } }),
        onRecortes: (recortes) => onConfigChange({ ...config, musicPanel: { ...panelMusica, recortes } }),
      }}
      {...musica}
    />
  );
}
