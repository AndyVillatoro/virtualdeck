import React from 'react';
import { useTheme } from '../../../utils/theme';
import { useT } from '../../../utils/i18n';

/**
 * Título, artista y estado de lo que suena.
 *
 * Compartido por el panel vertical y el horizontal: el mismo punto de estado
 * y el mismo texto en los dos. En horizontal (`unaLinea`) el título va en una
 * sola línea con elipsis — con el alto mandando no hay sitio para dos.
 */
export function DatosPista({ titulo, artista, isPlaying, sourceName, unaLinea }: {
  titulo: string;
  artista: string;
  isPlaying: boolean;
  sourceName: string;
  unaLinea: boolean;
}) {
  const VD = useTheme();
  const t = useT();
  return (
    <div style={{ minWidth: 0 }}>
      <div style={unaLinea ? {
        fontFamily: VD.font, fontSize: 14, color: VD.text, fontWeight: 500,
        lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      } : {
        fontFamily: VD.font, fontSize: 15, color: VD.text, fontWeight: 500,
        lineHeight: 1.3, wordBreak: 'break-word',
        // Dos líneas y elipsis: un título de YouTube puede ocupar cinco.
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {titulo || '—'}
      </div>
      {artista && (
        <div style={{
          fontFamily: VD.mono, fontSize: 11, color: VD.textDim, marginTop: 4,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {artista}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: unaLinea ? 4 : 8 }}>
        <div style={{
          width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
          background: isPlaying ? VD.success : VD.textMuted,
        }} />
        <span style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, letterSpacing: 0.5 }}>
          {t(isPlaying ? 'media.playing' : 'media.paused')}{sourceName ? ` · ${sourceName}` : ''}
        </span>
      </div>
    </div>
  );
}
