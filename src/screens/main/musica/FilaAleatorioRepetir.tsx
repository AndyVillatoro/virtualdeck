import React from 'react';
import { useT } from '../../../utils/i18n';
import { useNowPlayingRefresh } from '../../../utils/nowPlaying';
import { BotonTransporte } from './BotonTransporte';
import type { ElectronAPI, NowPlaying } from '../../../types';

/**
 * Botón pequeño solo-icono de aleatorio o de repetir para la fila de transporte
 * (`[aleatorio] [anterior] [play] [siguiente] [repetir]`).
 *
 * Antes era `FilaAleatorioRepetir`: una fila grande con texto propio que casi no
 * se usaba. Se mantiene el nombre del archivo porque lo fija el encargo; la
 * lógica es la misma de antes: atenuado y deshabilitado cuando la fuente dice
 * que no lo admite (`controls`), con el motivo en el título; sin dato de la
 * fuente se enseña habilitado y sin resaltar, como antes.
 *
 * El estado activo (`isShuffleActive` / `autoRepeatMode`) resalta el botón con
 * el acento; la repetición de una sola pista lleva además una insignia «1» que
 * la distingue de la repetición de la lista.
 */
export function BotonAleatorioRepetir({ modo, puede, shuffleActive, repeatMode, api, accent, lado }: {
  modo: 'shuffle' | 'repeat';
  puede: NowPlaying['controls'];
  shuffleActive?: boolean;
  repeatMode?: 'none' | 'track' | 'list';
  api: ElectronAPI | undefined;
  accent: string;
  /** Lado del área pulsable en px. Más chico que anterior/siguiente. */
  lado: number;
}) {
  const t = useT();
  const refrescar = useNowPlayingRefresh();

  if (modo === 'shuffle') {
    const enabled = puede?.shuffle !== false;
    const activo = shuffleActive === true;
    const titulo = enabled
      ? t(activo ? 'media.shuffle.on' : 'media.shuffle.off')
      : t('media.unsupported', { que: t('media.shuffle') });
    return (
      <BotonTransporte
        glyph="SHUFFLE"
        titulo={titulo}
        lado={lado}
        principal={false}
        enabled={enabled}
        accent={accent}
        activo={activo}
        ariaPressed={activo}
        onPulsar={() => { void api?.media.shuffle().then(refrescar); }}
      />
    );
  }

  const repeatOne = repeatMode === 'track';
  const repeatAll = repeatMode === 'list';
  const enabled = puede?.repeat !== false;
  const activo = repeatOne || repeatAll;
  const titulo = enabled
    ? t(repeatOne ? 'media.repeat.one' : repeatAll ? 'media.repeat.all' : 'media.repeat.off')
    : t('media.unsupported', { que: t('media.repeat') });
  return (
    <BotonTransporte
      glyph="REPEAT"
      titulo={titulo}
      lado={lado}
      principal={false}
      enabled={enabled}
      accent={accent}
      activo={activo}
      insignia={repeatOne && enabled ? '1' : undefined}
      ariaPressed={activo}
      onPulsar={() => { void api?.media.repeat().then(refrescar); }}
    />
  );
}
