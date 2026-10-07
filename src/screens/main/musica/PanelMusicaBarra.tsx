import React from 'react';
import { useTheme } from '../../../utils/theme';
import { useT } from '../../../utils/i18n';
import { useNowPlayingRefresh } from '../../../utils/nowPlaying';
import { DotLabel } from '../../../components/DotLabel';
import { DotGlyphIcon } from '../../../components/dot480/DotGlyphIcon';
import { DotMatrixImageOverlay } from '../../../components/dot480/DotMatrixImageOverlay';
import { BotonTransporte } from './BotonTransporte';
import { DatosPista } from './DatosPista';
import { FilaAleatorioRepetir } from './FilaAleatorioRepetir';
import type { NowPlaying, ElectronAPI } from '../../../types';

/**
 * El panel de música en formato barra (alto <= 600, como 1280×480).
 *
 * En vertical la carátula cuadrada de 300 px se comía casi todo el alto y los
 * botones de control quedaban fuera de la pantalla. Aquí va en horizontal: la
 * carátula a la izquierda con el alto disponible (cuadrada, sin encogerse) y
 * el título, el estado y los controles a la derecha, en una columna que no se
 * desplaza — lo que suena y cómo pararlo se ve siempre, sin scroll.
 *
 * Sin `overflow` con scroll a propósito: si algo no cabe, es que la columna es
 * demasiado ancha, no que falte desplazar. La nota de «no admite saltar» del
 * panel vertical aquí no está: con este alto no cabe y los botones
 * deshabilitados ya lo dicen con su atenuado.
 */

/** Transporte algo menor que en vertical, pero sin bajar de 32 px. */
const LADO_PRINCIPAL_BARRA = 44;
const LADO_SECUNDARIO_BARRA = 36;

export function PanelMusicaBarra({
  nowPlaying, isPlaying, sourceName, accent, api, lado, onCerrar,
}: {
  nowPlaying: NowPlaying;
  isPlaying: boolean;
  sourceName: string;
  accent: string;
  api: ElectronAPI | undefined;
  lado: 'left' | 'right';
  onCerrar: () => void;
}) {
  const VD = useTheme();
  const t = useT();
  const refrescarMedios = useNowPlayingRefresh();

  const borde = lado === 'left'
    ? { borderRight: `1px solid ${VD.border}` }
    : { borderLeft: `1px solid ${VD.border}` };

  // Lo que la fuente dice que admite. Sin dato se enseña todo: mejor un botón
  // que quizá no haga nada que esconder uno que sí funciona.
  const puede = nowPlaying.controls;
  const tituloCon = (titulo: string, enabled: boolean) =>
    (enabled ? titulo : t('media.unsupported', { que: titulo }));

  return (
    <div style={{
      height: '100%', width: 440, flexShrink: 0, background: VD.surface, ...borde,
      display: 'flex', flexDirection: 'row', gap: 12,
      padding: 8, overflow: 'hidden', alignItems: 'stretch',
    }}>
      {/* Carátula fija de 176 px: al alto completo se comía media pantalla de barra. */}
      <div style={{
        width: 176, height: 176, alignSelf: 'center', borderRadius: VD.radius.lg,
        background: VD.overlay, border: `1px solid ${VD.border}`,
        overflow: 'hidden', position: 'relative', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ opacity: 0.22 }}>
          <DotGlyphIcon glyph="AUDIO_WAVE" size={40} color={VD.textMuted} showRecessed />
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
      </div>

      {/* Título, estado y controles: todo visible sin desplazar. */}
      <div style={{
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        gap: 8, minWidth: 0, flex: 1,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <DotLabel size={9} color={VD.textMuted} spacing={2}>{t('panel.music')}</DotLabel>
          <div style={{ flex: 1 }} />
          <button
            type="button"
            onClick={onCerrar}
            title={t('music.hide')}
            style={{
              background: 'none', border: 'none', color: VD.textMuted,
              cursor: 'pointer', padding: '0 2px', display: 'flex', alignItems: 'center',
            }}
          >
            <DotGlyphIcon glyph="CLOSE" size={10} color={VD.textMuted} />
          </button>
        </div>

        <DatosPista
          titulo={nowPlaying.title}
          artista={nowPlaying.artist}
          isPlaying={isPlaying}
          sourceName={sourceName}
          unaLinea
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BotonTransporte
            glyph="PREV"
            titulo={tituloCon(t('media.prev'), puede?.prev !== false)}
            lado={LADO_SECUNDARIO_BARRA}
            principal={false}
            enabled={puede?.prev !== false}
            accent={accent}
            onPulsar={() => { void api?.media.control('prev').then(refrescarMedios); }}
          />
          <BotonTransporte
            glyph={isPlaying ? 'PAUSE' : 'PLAY'}
            titulo={t('media.playPause')}
            lado={LADO_PRINCIPAL_BARRA}
            principal
            enabled
            accent={accent}
            onPulsar={() => { void api?.media.control('play-pause').then(refrescarMedios); }}
          />
          <BotonTransporte
            glyph="NEXT"
            titulo={tituloCon(t('media.next'), puede?.next !== false)}
            lado={LADO_SECUNDARIO_BARRA}
            principal={false}
            enabled={puede?.next !== false}
            accent={accent}
            onPulsar={() => { void api?.media.control('next').then(refrescarMedios); }}
          />
        </div>

        <FilaAleatorioRepetir
          puede={puede}
          shuffleActive={nowPlaying.isShuffleActive}
          repeatMode={nowPlaying.autoRepeatMode}
          api={api}
          altura={32}
        />
      </div>
    </div>
  );
}
