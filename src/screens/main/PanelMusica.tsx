import React from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { useNowPlayingRefresh } from '../../utils/nowPlaying';
import { DotLabel } from '../../components/DotLabel';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';
import { DotMatrixImageOverlay } from '../../components/dot480/DotMatrixImageOverlay';
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
  nowPlaying, isPlaying, sourceName, accent, api, lado, onCerrar,
}: {
  nowPlaying: NowPlaying | null;
  isPlaying: boolean;
  sourceName: string;
  accent: string;
  api: ElectronAPI | undefined;
  lado: 'left' | 'right';
  onCerrar: () => void;
}) {
  const VD = useTheme();
  const t = useT();
  // Antes del `return` de abajo: los hooks tienen que llamarse siempre en el
  // mismo orden, y este panel se desmonta en cuanto deja de sonar algo.
  const refrescarMedios = useNowPlayingRefresh();
  if (!nowPlaying) return null;

  const borde = lado === 'left'
    ? { borderRight: `1px solid ${VD.border}` }
    : { borderLeft: `1px solid ${VD.border}` };

  // Lo que la fuente dice que admite. Sin dato se enseña todo: mejor un boton
  // que quiza no haga nada que esconder uno que si funciona.
  const puede = nowPlaying.controls;

  const control = (
    key: 'prev' | 'play-pause' | 'next',
    glyph: string,
    titulo: string,
    lado_: number,
    principal: boolean,
    activo = true,
  ) => (
    <button
      key={key}
      title={activo ? titulo : t('media.unsupported', { que: titulo })}
      aria-label={titulo}
      disabled={!activo}
      onClick={() => { if (activo) api?.media.control(key).then(refrescarMedios); }}
      style={{
        width: lado_, height: lado_, flexShrink: 0,
        opacity: activo ? 1 : 0.35,
        cursor: activo ? 'pointer' : 'not-allowed',
        background: principal ? VD.accentBg : VD.elevated,
        border: `1px solid ${principal ? accent : VD.border}`,
        borderRadius: VD.radius.lg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        // Sin esto, mantener el dedo sobre el botón selecciona el icono y
        // Windows saca el menú de copiar en mitad de la canción.
        userSelect: 'none', WebkitUserSelect: 'none', touchAction: 'manipulation',
        transition: 'transform 0.08s, border-color 0.12s',
      }}
      onPointerDown={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.94)'; }}
      onPointerUp={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'none'; }}
      onPointerLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'none'; }}
    >
      <DotGlyphIcon
        glyph={glyph}
        size={principal ? 28 : 20}
        color={principal ? accent : VD.textDim}
        showRecessed
      />
    </button>
  );

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
            glifos dot-matrix en franja inferior. Es el mismo `control` de
            abajo, solo que vive sobre la imagen: un bloque solo, siempre
            visible, sin empujar título ni botones. */}
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          padding: '10px 0 12px',
          background: 'rgba(7,8,9,0.78)',
          borderTop: `1px solid ${VD.border}`,
        }}>
          {control('prev', 'PREV', t('media.prev'), LADO_SECUNDARIO, false, puede?.prev !== false)}
          {control('play-pause', isPlaying ? 'PAUSE' : 'PLAY', t('media.playPause'), LADO_PRINCIPAL, true)}
          {control('next', 'NEXT', t('media.next'), LADO_SECUNDARIO, false, puede?.next !== false)}
        </div>
      </div>

      <div>
        <div style={{
          fontFamily: VD.font, fontSize: 15, color: VD.text, fontWeight: 500,
          lineHeight: 1.3, wordBreak: 'break-word',
          // Dos líneas y elipsis: un título de YouTube puede ocupar cinco.
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {nowPlaying.title || '—'}
        </div>
        {nowPlaying.artist && (
          <div style={{
            fontFamily: VD.mono, fontSize: 11, color: VD.textDim, marginTop: 4,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {nowPlaying.artist}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
            background: isPlaying ? VD.success : VD.textMuted,
          }} />
          <span style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, letterSpacing: 0.5 }}>
            {t(isPlaying ? 'media.playing' : 'media.paused')}{sourceName ? ` · ${sourceName}` : ''}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {([
          { key: 'shuffle' as const, texto: t('media.shuffle'), activo: puede?.shuffle !== false },
          { key: 'repeat' as const, texto: t('media.repeat'), activo: puede?.repeat !== false },
        ]).map(({ key, texto, activo }) => (
          <button
            key={key}
            disabled={!activo}
            title={activo ? texto : t('media.unsupported', { que: texto })}
            onClick={() => { if (!activo) return; if (key === 'shuffle') api?.media.shuffle(); else api?.media.repeat(); }}
            style={{
              flex: 1, height: 40, background: VD.elevated,
              border: `1px solid ${VD.border}`, borderRadius: VD.radius.md,
              color: VD.textMuted, fontFamily: VD.mono, fontSize: 9, letterSpacing: 1,
              opacity: activo ? 1 : 0.35, cursor: activo ? 'pointer' : 'not-allowed',
              touchAction: 'manipulation',
            }}
          >{texto}</button>
        ))}
      </div>

      {puede && !puede.next && !puede.prev && (
        <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, lineHeight: 1.5 }}>
          {t('media.noSkip', { fuente: sourceName || '?' })}
        </div>
      )}
    </div>
  );
}
