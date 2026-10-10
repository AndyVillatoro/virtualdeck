import React from 'react';
import { useT } from '../../../utils/i18n';
import { VideoVentana, type AjustesVideo } from './VideoVentana';
import { ControlesTransporte } from './ControlesTransporte';
import type { NowPlaying, ElectronAPI } from '../../../types';

export function CuerpoVideo({
  video,
  altoVideo,
  api,
  nowPlaying,
  accent,
  isPlaying,
  esVerticalEstrecho,
  amplio,
  alRefrescar,
}: {
  video: AjustesVideo;
  altoVideo: number;
  api: ElectronAPI | undefined;
  nowPlaying: NowPlaying;
  accent: string;
  isPlaying: boolean;
  esVerticalEstrecho: boolean;
  /** Panel ancho (>= 440): transporte grande. */
  amplio?: boolean;
  alRefrescar: () => void;
}) {
  const t = useT();
  const puede = nowPlaying.controls;
  const tituloCon = (titulo: string, activo: boolean) =>
    (activo ? titulo : t('media.unsupported', { que: titulo }));

  return (
    <>
      <div style={{
        width: '100%',
        height: altoVideo,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
      }}>
        <VideoVentana
          api={api}
          pista={{ titulo: nowPlaying.title, fuente: nowPlaying.source }}
          accent={accent}
          ajustes={video}
        />
      </div>
      <div style={{ padding: '4px 0', flexShrink: 0 }}>
        <ControlesTransporte
          puede={puede}
          isPlaying={isPlaying}
          textos={{
            anterior: tituloCon(t('media.prev'), puede?.prev !== false),
            reproducir: t('media.playPause'),
            siguiente: tituloCon(t('media.next'), puede?.next !== false),
          }}
          accent={accent}
          api={api}
          alRefrescar={alRefrescar}
          vertical={esVerticalEstrecho}
          amplio={amplio}
          shuffleActive={nowPlaying.isShuffleActive}
          repeatMode={nowPlaying.autoRepeatMode}
        />
      </div>
    </>
  );
}
