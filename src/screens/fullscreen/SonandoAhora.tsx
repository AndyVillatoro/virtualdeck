import React from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { playSound } from '../../utils/sound';
import {
  IconMediaSkipBack, IconMediaPlay, IconMediaPause, IconMediaSkipForward,
} from '../../components/VDIcon';
import type { DeckConfig, SoundProfileId } from '../../types';

/**
 * La franja de "sonando ahora" de abajo, con caratula y transporte.
 *
 * Es lo unico de la pantalla completa que habla con el reproductor; el resto
 * es rejilla, reloj y sensores. Separarlo deja las dos cosas legibles.
 */

interface Props {
  nowPlaying: { title: string; artist: string; status: string; source: string; thumbnail?: string } | null;
  isPlaying: boolean;
  /** Nombre presentable del reproductor ("Spotify" en vez de su id interno). */
  sourceName: string;
  config: DeckConfig;
  soundOnPress: boolean;
  soundProfile: SoundProfileId;
}

export function SonandoAhora({ nowPlaying, isPlaying, sourceName, config, soundOnPress, soundProfile }: Props) {
  const VD = useTheme();
  const t = useT();

  return (
      <div style={{
        flex: 1, minWidth: 0, border: `1px solid ${VD.border}`,
        padding: '5px 8px', display: 'flex', gap: 8, alignItems: 'center', background: VD.elevated,
      }}>
        <div className="vd-fs-thumb" style={{
          width: 36, height: 36, background: VD.overlay, flexShrink: 0, borderRadius: VD.radius.md,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', border: `1px solid ${VD.border}`, position: 'relative',
        }}>
          <div style={{ opacity: 0.35 }}>
            {isPlaying
              ? <IconMediaPlay size={16} color={VD.textDim} />
              : <IconMediaPause size={16} color={VD.textDim} />
            }
          </div>
          {nowPlaying?.thumbnail && (
            <img
              src={nowPlaying.thumbnail}
              alt=""
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {nowPlaying ? (
            <>
              <div style={{ color: VD.text, fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500, lineHeight: 1.2 }}>
                {nowPlaying.title || '—'}
              </div>
              <div style={{ color: VD.textDim, fontSize: 9, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: VD.mono, lineHeight: 1.2 }}>
                {nowPlaying.artist}{sourceName ? ` · ${sourceName}` : ''}
              </div>
            </>
          ) : (
            <div style={{ color: VD.textMuted, fontSize: 10, fontFamily: VD.mono, letterSpacing: 1 }}>{t('full.noMedia')}</div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
          {([
            { key: 'prev',       Icon: IconMediaSkipBack,                          title: t('media.prev') },
            { key: 'play-pause', Icon: isPlaying ? IconMediaPause : IconMediaPlay, title: t('media.playPause') },
            { key: 'next',       Icon: IconMediaSkipForward,                       title: t('media.next') },
          ] as const).map(({ key, Icon, title }) => (
            <button
              key={key}
              title={title}
              onClick={() => {
                window.electronAPI?.media.control(key as 'play-pause' | 'next' | 'prev');
                if (soundOnPress) playSound(soundProfile);
              }}
              style={{
                width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: VD.overlay, border: `1px solid ${VD.border}`,
                cursor: 'pointer', borderRadius: VD.radius.sm, transition: 'border-color 0.1s',
                padding: 0,
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = config.accent; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = VD.border; }}
            >
              <Icon size={12} color={VD.textDim} />
            </button>
          ))}
        </div>
      </div>
  );
}
