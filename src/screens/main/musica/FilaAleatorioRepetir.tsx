import React from 'react';
import { useTheme } from '../../../utils/theme';
import { useT } from '../../../utils/i18n';
import { useNowPlayingRefresh } from '../../../utils/nowPlaying';
import type { ElectronAPI, NowPlaying } from '../../../types';

/**
 * Botones de aleatorio y repetición del panel de música.
 *
 * Compartida por el panel vertical y el horizontal: el mismo par de botones en
 * los dos, atenuados cuando la fuente dice que no los admite (`controls`) y
 * con el motivo en el título. Sin dato de la fuente se enseñan habilitados y
 * sin resaltar, como antes.
 *
 * El estado activo (`isShuffleActive` / `autoRepeatMode`) resalta el botón con
 * el acento; la repetición de una sola pista lleva además una insignia «1» que
 * la distingue de la repetición de la lista.
 */
export function FilaAleatorioRepetir({ puede, shuffleActive, repeatMode, api, altura }: {
  puede: NowPlaying['controls'];
  shuffleActive?: boolean;
  repeatMode?: 'none' | 'track' | 'list';
  api: ElectronAPI | undefined;
  altura: number;
}) {
  const VD = useTheme();
  const t = useT();
  const refrescar = useNowPlayingRefresh();

  const shuffleOn = shuffleActive === true;
  const repeatOne = repeatMode === 'track';
  const repeatAll = repeatMode === 'list';
  const shuffleOk = puede?.shuffle !== false;
  const repeatOk = puede?.repeat !== false;

  const tituloShuffle = shuffleOk
    ? t(shuffleOn ? 'media.shuffle.on' : 'media.shuffle.off')
    : t('media.unsupported', { que: t('media.shuffle') });
  const tituloRepeat = repeatOk
    ? t(repeatOne ? 'media.repeat.one' : repeatAll ? 'media.repeat.all' : 'media.repeat.off')
    : t('media.unsupported', { que: t('media.repeat') });

  const estilo = (activo: boolean, enabled: boolean): React.CSSProperties => ({
    flex: 1, height: altura,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    background: activo && enabled ? VD.accentBg : VD.elevated,
    border: `1px solid ${activo && enabled ? VD.accent : VD.border}`,
    borderRadius: VD.radius.md,
    color: activo && enabled ? VD.accent : VD.textMuted,
    fontFamily: VD.mono, fontSize: 9, letterSpacing: 1,
    opacity: enabled ? 1 : 0.35, cursor: enabled ? 'pointer' : 'not-allowed',
    touchAction: 'manipulation',
  });

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button
        type="button"
        disabled={!shuffleOk}
        title={tituloShuffle}
        aria-label={tituloShuffle}
        aria-pressed={shuffleOn}
        onClick={() => { if (shuffleOk) void api?.media.shuffle().then(refrescar); }}
        style={estilo(shuffleOn, shuffleOk)}
      >
        <span>{t('media.shuffle')}</span>
        {shuffleOn && shuffleOk && (
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: VD.accent, flexShrink: 0 }} />
        )}
      </button>
      <button
        type="button"
        disabled={!repeatOk}
        title={tituloRepeat}
        aria-label={tituloRepeat}
        aria-pressed={repeatOne || repeatAll}
        onClick={() => { if (repeatOk) void api?.media.repeat().then(refrescar); }}
        style={estilo(repeatOne || repeatAll, repeatOk)}
      >
        <span>{t('media.repeat')}</span>
        {repeatAll && repeatOk && (
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: VD.accent, flexShrink: 0 }} />
        )}
        {repeatOne && repeatOk && (
          <span style={{
            minWidth: 12, height: 12, borderRadius: 6, flexShrink: 0,
            border: `1px solid ${VD.accent}`, color: VD.accent,
            fontFamily: VD.mono, fontSize: 8, lineHeight: '10px', padding: '0 2px',
          }}>1</span>
        )}
      </button>
    </div>
  );
}
