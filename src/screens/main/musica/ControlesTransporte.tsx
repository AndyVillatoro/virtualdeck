import React from 'react';
import { BotonTransporte } from './BotonTransporte';
import { BotonAleatorioRepetir } from './FilaAleatorioRepetir';
import type { ElectronAPI, NowPlaying } from '../../../types';

/**
 * Transporte de cinco en una fila:
 * `[aleatorio] [anterior] [play] [siguiente] [repetir]`.
 *
 * Lo usan los dos modos del panel vertical (sobre el vídeo y sobre la
 * carátula): un bloque solo, siempre igual. Cada sitio le pone su envoltorio
 * (fondo y relleno). El play sigue siendo el principal y el más grande; los
 * laterales de aleatorio/repetir son solo-icono y más chicos que
 * anterior/siguiente, sin bajar de 32 px.
 *
 * Tallas por modo (ancho total con gaps, `box-sizing: border-box`):
 * - vertical (panel estrecho < 240, relleno 10): 40/36/32, gap 4 = 192 px;
 *   cabe en paneles de 212 px en adelante.
 * - estándar (240–439, relleno 16): 48/36/32, gap 4 = 200 px; cabe desde 240.
 * - amplio (>= 440, relleno 16): 64/52/40, gap 10 = 288 px.
 */
export function ControlesTransporte({ puede, isPlaying, textos, accent, api, alRefrescar, vertical, amplio, shuffleActive, repeatMode }: {
  puede: NowPlaying['controls'];
  isPlaying: boolean;
  textos: { anterior: string; reproducir: string; siguiente: string };
  accent: string;
  api: ElectronAPI | undefined;
  alRefrescar: () => void;
  /** Panel estrecho: todo compacto en la misma fila. */
  vertical?: boolean;
  /** Panel ancho (>= 440): botones grandes. */
  amplio?: boolean;
  shuffleActive?: boolean;
  repeatMode?: 'none' | 'track' | 'list';
}) {
  const ladoPrinc = vertical ? 40 : amplio === true ? 64 : 48;
  const ladoSec = vertical ? 36 : amplio === true ? 52 : 36;
  const ladoMini = amplio === true ? 40 : 32;
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: amplio === true ? 10 : 4,
      flexShrink: 0,
    }}>
      <BotonAleatorioRepetir
        modo="shuffle"
        puede={puede}
        shuffleActive={shuffleActive}
        repeatMode={repeatMode}
        api={api}
        accent={accent}
        lado={ladoMini}
      />
      <BotonTransporte
        glyph="PREV"
        titulo={textos.anterior}
        lado={ladoSec}
        principal={false}
        enabled={puede?.prev !== false}
        accent={accent}
        onPulsar={() => { void api?.media.control('prev').then(alRefrescar); }}
      />
      <BotonTransporte
        glyph={isPlaying ? 'PAUSE' : 'PLAY'}
        titulo={textos.reproducir}
        lado={ladoPrinc}
        principal
        enabled
        accent={accent}
        onPulsar={() => { void api?.media.control('play-pause').then(alRefrescar); }}
      />
      <BotonTransporte
        glyph="NEXT"
        titulo={textos.siguiente}
        lado={ladoSec}
        principal={false}
        enabled={puede?.next !== false}
        accent={accent}
        onPulsar={() => { void api?.media.control('next').then(alRefrescar); }}
      />
      <BotonAleatorioRepetir
        modo="repeat"
        puede={puede}
        shuffleActive={shuffleActive}
        repeatMode={repeatMode}
        api={api}
        accent={accent}
        lado={ladoMini}
      />
    </div>
  );
}
