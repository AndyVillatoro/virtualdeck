import React from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { useNowPlayingRefresh } from '../../utils/nowPlaying';
import { useFormatoPantalla } from '../../utils/useFormatoPantalla';
import { DotLabel } from '../../components/DotLabel';
import { BarraProgreso } from '../../components/BarraProgreso';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';
import { DotMatrixImageOverlay } from '../../components/dot480/DotMatrixImageOverlay';
import { BotonTransporte } from './musica/BotonTransporte';
import { DatosPista } from './musica/DatosPista';
import { FilaAleatorioRepetir } from './musica/FilaAleatorioRepetir';
import { PanelMusicaBarra } from './musica/PanelMusicaBarra';
import type { NowPlaying, ElectronAPI } from '../../types';

/**
 * El panel de música: la pista que suena, en grande y con botones de dedo.
 *
 * La franja de la barra lateral cabe en cualquier sitio pero **no se puede
 * pulsar con el dedo**: la carátula mide 44 px y los tres botones reparten el
 * ancho de la barra, con lo que cada uno queda en unos 25 px de alto. En una
 * tableta —que es donde este deck tiene más sentido— eso es fallar el botón la
 * mitad de las veces.
 *
 * El transporte va **dentro de la carátula**, en una franja inferior con
 * glifos dot-matrix: viaja con la imagen y no empuja el resto. En formatos
 * alargados, donde el alto manda, la carátula con sus botones es un solo
 * bloque que no se esconde al desplazar — lo primero que se ve es lo que
 * suena y cómo pararlo.
 *
 * Aparece **solo cuando hay algo sonando**: un panel fijo de 300 px vacío se
 * come un tercio de la rejilla a cambio de nada.
 *
 * Lo que **no** hace, y conviene decirlo en vez de fingirlo: no incrusta
 * Spotify ni YouTube dentro. Esas aplicaciones no se dejan empotrar en otra
 * ventana, y una copia de su interfaz sería una imitación que envejece mal.
 * Lo que sí hace es traer la aplicación al frente, que es lo que uno quiere
 * cuando busca algo concreto.
 */

/** Botón principal sobre la carátula. Los otros dos son algo menores. */
const LADO_PRINCIPAL = 64;
const LADO_SECUNDARIO = 52;

export function PanelMusica({
  nowPlaying, isPlaying, sourceName, accent, api, lado, plegado, onPlegar, onCerrar,
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
}) {
  const VD = useTheme();
  const t = useT();
  // Antes del `return` de abajo: los hooks tienen que llamarse siempre en el
  // mismo orden, y este panel se desmonta en cuanto deja de sonar algo.
  const refrescarMedios = useNowPlayingRefresh();
  const { formato } = useFormatoPantalla();
  if (!nowPlaying) return null;

  // En una ventana baja y ancha (1280×480) la carátula cuadrada ocupaba casi
  // todo el alto y los controles quedaban fuera: va en horizontal.
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
      />
    );
  }

  const borde = lado === 'left'
    ? { borderRight: `1px solid ${VD.border}` }
    : { borderLeft: `1px solid ${VD.border}` };

  // Lo que la fuente dice que admite. Sin dato se enseña todo: mejor un boton
  // que quiza no haga nada que esconder uno que si funciona.
  const puede = nowPlaying.controls;
  const tituloCon = (titulo: string, activo: boolean) =>
    (activo ? titulo : t('media.unsupported', { que: titulo }));

  return (
    <div style={{
      width: 300, flexShrink: 0, background: VD.surface, ...borde,
      display: 'flex', flexDirection: 'column', gap: 14,
      padding: 16, overflowY: 'auto',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <DotLabel size={9} color={VD.textMuted} spacing={2}>{t('panel.music')}</DotLabel>
        <div style={{ flex: 1 }} />
        <button
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

      {/* Carátula. El hueco es cuadrado y del ancho del panel; cuando no hay
          imagen se queda el icono de reproducción en vez de un vacío gris.
          No se encoge (`flexShrink: 0`): en una ventana baja el panel
          desplaza, pero la carátula mantiene su tamaño. */}
      <div style={{
        width: '100%', aspectRatio: '1', borderRadius: VD.radius.lg,
        background: VD.overlay, border: `1px solid ${VD.border}`,
        overflow: 'hidden', position: 'relative', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {/* Un icono neutro, no play/pausa: el estado lo dicen el punto y el
            texto de abajo, que no se prestan a confusion. El transporte vive
            en la franja inferior de la carátula. */}
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
        {/* Transporte sobre la carátula: anterior / reproducir / siguiente con
            glifos dot-matrix en franja inferior. Es el mismo `BotonTransporte`
            compartido, solo que vive sobre la imagen: un bloque solo, siempre
            visible, sin empujar título ni botones. */}
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          padding: '10px 0 12px',
          background: 'rgba(7,8,9,0.78)',
          borderTop: `1px solid ${VD.border}`,
        }}>
          <BotonTransporte
            glyph="PREV"
            titulo={tituloCon(t('media.prev'), puede?.prev !== false)}
            lado={LADO_SECUNDARIO}
            principal={false}
            enabled={puede?.prev !== false}
            accent={accent}
            onPulsar={() => { void api?.media.control('prev').then(refrescarMedios); }}
          />
          <BotonTransporte
            glyph={isPlaying ? 'PAUSE' : 'PLAY'}
            titulo={t('media.playPause')}
            lado={LADO_PRINCIPAL}
            principal
            enabled
            accent={accent}
            onPulsar={() => { void api?.media.control('play-pause').then(refrescarMedios); }}
          />
          <BotonTransporte
            glyph="NEXT"
            titulo={tituloCon(t('media.next'), puede?.next !== false)}
            lado={LADO_SECUNDARIO}
            principal={false}
            enabled={puede?.next !== false}
            accent={accent}
            onPulsar={() => { void api?.media.control('next').then(refrescarMedios); }}
          />
        </div>
      </div>

      <DatosPista
        titulo={nowPlaying.title}
        artista={nowPlaying.artist}
        isPlaying={isPlaying}
        sourceName={sourceName}
        unaLinea={false}
      />

      <BarraProgreso datos={nowPlaying} />

      <FilaAleatorioRepetir
        puede={puede}
        shuffleActive={nowPlaying.isShuffleActive}
        repeatMode={nowPlaying.autoRepeatMode}
        api={api}
        altura={40}
      />

      {puede && !puede.next && !puede.prev && (
        <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, lineHeight: 1.5 }}>
          {t('media.noSkip', { fuente: sourceName || '?' })}
        </div>
      )}
    </div>
  );
}
