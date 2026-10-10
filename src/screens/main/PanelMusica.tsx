import React, { useEffect, useState } from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { useNowPlayingRefresh } from '../../utils/nowPlaying';
import { useFormatoPantalla } from '../../utils/useFormatoPantalla';
import { BarraProgreso } from '../../components/BarraProgreso';
import { CabeceraPanelMusica } from './musica/CabeceraPanelMusica';
import { DatosPista } from './musica/DatosPista';
import { PanelMusicaBarra } from './musica/PanelMusicaBarra';
import { ManejadorRedimension } from './musica/ManejadorRedimension';
import { CuerpoVideo } from './musica/CuerpoVideo';
import { CuerpoCaratula } from './musica/CuerpoCaratula';
import type { AjustesVideo } from './musica/VideoVentana';
import type { NowPlaying, ElectronAPI } from '../../types';

export function PanelMusica({
  nowPlaying, isPlaying, sourceName, accent, api, lado, plegado, onPlegar, onCerrar, video, ancho, onAncho,
}: {
  nowPlaying: NowPlaying | null;
  isPlaying: boolean;
  sourceName: string;
  accent: string;
  api: ElectronAPI | undefined;
  lado: 'left' | 'right';
  /** Solo formato `barra`: el panel plegado a su lengüeta. */
  plegado: boolean;
  onPlegar: (plegado: boolean) => void;
  onCerrar: () => void;
  /** Solo formato `barra`: el vídeo de la ventana que suena. */
  video: AjustesVideo;
  ancho?: number;
  onAncho?: (ancho: number) => void;
}) {
  const VD = useTheme();
  const t = useT();
  const refrescarMedios = useNowPlayingRefresh();
  const { formato } = useFormatoPantalla();

  const [anchoLocal, setAnchoLocal] = useState<number>(ancho ?? 300);
  useEffect(() => {
    if (ancho !== undefined) setAnchoLocal(ancho);
  }, [ancho]);

  if (!nowPlaying) return null;

  if (formato === 'barra') {
    return (
      <PanelMusicaBarra
        nowPlaying={nowPlaying}
        isPlaying={isPlaying}
        sourceName={sourceName}
        accent={accent}
        api={api}
        lado={lado}
        plegado={plegado}
        onPlegar={onPlegar}
        onCerrar={onCerrar}
        video={video}
        ancho={ancho}
        onAncho={onAncho}
      />
    );
  }

  const borde = lado === 'left'
    ? { borderRight: `1px solid ${VD.border}` }
    : { borderLeft: `1px solid ${VD.border}` };

  const puede = nowPlaying.controls;
  const esAnchoAmplio = anchoLocal >= 440;
  const esVerticalEstrecho = anchoLocal < 240;

  const altoVideo = esAnchoAmplio
    ? Math.round((anchoLocal - 32) * (9 / 16))
    : (esVerticalEstrecho ? 140 : 180);

  const sinSalto = Boolean(puede && !puede.next && !puede.prev);

  return (
    <div style={{
      width: anchoLocal,
      position: 'relative',
      flexShrink: 0,
      background: VD.surface,
      ...borde,
      display: 'flex',
      flexDirection: 'column',
      gap: esVerticalEstrecho ? 8 : 14,
      padding: esVerticalEstrecho ? 10 : 16,
      overflowY: 'auto',
    }}>
      <div title={t('music.resize')} aria-label={t('music.resize')}>
        <ManejadorRedimension
          lado={lado}
          accent={accent}
          anchoActual={anchoLocal}
          onCambiarAncho={setAnchoLocal}
          onFinalizar={onAncho}
        />
      </div>

      <CabeceraPanelMusica video={video} accent={accent} onCerrar={onCerrar} />

      {video.activo ? (
        <CuerpoVideo
          video={video}
          altoVideo={altoVideo}
          api={api}
          nowPlaying={nowPlaying}
          accent={accent}
          isPlaying={isPlaying}
          esVerticalEstrecho={esVerticalEstrecho}
          amplio={esAnchoAmplio}
          alRefrescar={refrescarMedios}
        />
      ) : (
        <CuerpoCaratula
          nowPlaying={nowPlaying}
          accent={accent}
          api={api}
          isPlaying={isPlaying}
          esAnchoAmplio={esAnchoAmplio}
          esVerticalEstrecho={esVerticalEstrecho}
          alRefrescar={refrescarMedios}
        />
      )}

      <DatosPista
        titulo={nowPlaying.title}
        artista={nowPlaying.artist}
        isPlaying={isPlaying}
        sourceName={sourceName}
        unaLinea={false}
      />

      <BarraProgreso datos={nowPlaying} />

      {sinSalto && (
        <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, lineHeight: 1.5 }}>
          {t('media.noSkip', { fuente: sourceName || '?' })}
        </div>
      )}
    </div>
  );
}
