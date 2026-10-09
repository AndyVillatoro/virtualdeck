import React from 'react';
import { BotonTransporte } from './BotonTransporte';
import type { ElectronAPI, NowPlaying } from '../../../types';

/** Botón principal sobre la carátula. Los otros dos son algo menores. */
const LADO_PRINCIPAL = 64;
const LADO_SECUNDARIO = 52;

/**
 * Anterior / reproducir / siguiente, en una fila centrada. Lo usan los dos
 * modos del panel vertical (sobre el vídeo y sobre la carátula): un bloque
 * solo, siempre igual. Cada sitio le pone su envoltorio (fondo y relleno).
 */
export function ControlesTransporte({ puede, isPlaying, textos, accent, api, alRefrescar }: {
  puede: NowPlaying['controls'];
  isPlaying: boolean;
  textos: { anterior: string; reproducir: string; siguiente: string };
  accent: string;
  api: ElectronAPI | undefined;
  alRefrescar: () => void;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      flexShrink: 0,
    }}>
      <BotonTransporte
        glyph="PREV"
        titulo={textos.anterior}
        lado={LADO_SECUNDARIO}
        principal={false}
        enabled={puede?.prev !== false}
        accent={accent}
        onPulsar={() => { void api?.media.control('prev').then(alRefrescar); }}
      />
      <BotonTransporte
        glyph={isPlaying ? 'PAUSE' : 'PLAY'}
        titulo={textos.reproducir}
        lado={LADO_PRINCIPAL}
        principal
        enabled
        accent={accent}
        onPulsar={() => { void api?.media.control('play-pause').then(alRefrescar); }}
      />
      <BotonTransporte
        glyph="NEXT"
        titulo={textos.siguiente}
        lado={LADO_SECUNDARIO}
        principal={false}
        enabled={puede?.next !== false}
        accent={accent}
        onPulsar={() => { void api?.media.control('next').then(alRefrescar); }}
      />
    </div>
  );
}
