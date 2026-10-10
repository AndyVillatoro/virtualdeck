import React from 'react';
import { useTheme } from '../../../utils/theme';
import { useT } from '../../../utils/i18n';
import { DotGlyphIcon } from '../../../components/dot480/DotGlyphIcon';
import { DotMatrixImageOverlay } from '../../../components/dot480/DotMatrixImageOverlay';
import { ControlesTransporte } from './ControlesTransporte';
import type { NowPlaying, ElectronAPI } from '../../../types';

export function CuerpoCaratula({
  nowPlaying,
  accent,
  api,
  isPlaying,
  esAnchoAmplio,
  esVerticalEstrecho,
  alRefrescar,
}: {
  nowPlaying: NowPlaying;
  accent: string;
  api: ElectronAPI | undefined;
  isPlaying: boolean;
  esAnchoAmplio: boolean;
  esVerticalEstrecho: boolean;
  alRefrescar: () => void;
}) {
  const VD = useTheme();
  const t = useT();
  const puede = nowPlaying.controls;
  const tituloCon = (titulo: string, activo: boolean) =>
    (activo ? titulo : t('media.unsupported', { que: titulo }));

  const textos = {
    anterior: tituloCon(t('media.prev'), puede?.prev !== false),
    reproducir: t('media.playPause'),
    siguiente: tituloCon(t('media.next'), puede?.next !== false),
  };

  return (
    <>
      <div style={{
        width: '100%',
        aspectRatio: esAnchoAmplio ? '16 / 9' : '1',
        borderRadius: VD.radius.lg,
        background: VD.overlay,
        border: `1px solid ${VD.border}`,
        overflow: 'hidden',
        position: 'relative',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ opacity: 0.22 }}>
          <DotGlyphIcon glyph="AUDIO_WAVE" size={48} color={VD.textMuted} showRecessed />
        </div>
        {nowPlaying.thumbnail && (
          <>
            <img
              src={nowPlaying.thumbnail}
              alt=""
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                imageRendering: 'pixelated',
              }}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
            <DotMatrixImageOverlay pitch={4} />
          </>
        )}
        {!esVerticalEstrecho && (
          <div style={{
            position: 'absolute', left: 0, right: 0, bottom: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            padding: '10px 0 12px',
            background: 'rgba(7,8,9,0.78)',
            borderTop: `1px solid ${VD.border}`,
          }}>
            <ControlesTransporte
              puede={puede}
              isPlaying={isPlaying}
              textos={textos}
              accent={accent}
              api={api}
              alRefrescar={alRefrescar}
              amplio={esAnchoAmplio}
              shuffleActive={nowPlaying.isShuffleActive}
              repeatMode={nowPlaying.autoRepeatMode}
            />
          </div>
        )}
      </div>

      {esVerticalEstrecho && (
        <div style={{ padding: '4px 0', flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
          <ControlesTransporte
            puede={puede}
            isPlaying={isPlaying}
            textos={textos}
            accent={accent}
            api={api}
            alRefrescar={alRefrescar}
            vertical
            shuffleActive={nowPlaying.isShuffleActive}
            repeatMode={nowPlaying.autoRepeatMode}
          />
        </div>
      )}
    </>
  );
}
