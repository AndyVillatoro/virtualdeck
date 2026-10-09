import React from 'react';
import { useTheme } from '../../../utils/theme';
import { useT } from '../../../utils/i18n';
import { DotLabel } from '../../../components/DotLabel';
import { DotGlyphIcon } from '../../../components/dot480/DotGlyphIcon';
import type { AjustesVideo } from './VideoVentana';

/**
 * Cabecera del panel de música: título, interruptor del vídeo de la ventana
 * que suena y botón de ocultar. El interruptor enseña el acento en encendido.
 */
export function CabeceraPanelMusica({ video, accent, onCerrar }: {
  video: AjustesVideo;
  accent: string;
  onCerrar: () => void;
}) {
  const VD = useTheme();
  const t = useT();

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <DotLabel size={9} color={VD.textMuted} spacing={2}>{t('panel.music')}</DotLabel>
      <div style={{ flex: 1 }} />
      <button
        type="button"
        onClick={() => video.onActivo(!video.activo)}
        title={video.activo ? t('music.videoOff') : t('music.videoOn')}
        aria-label={video.activo ? t('music.videoOff') : t('music.videoOn')}
        aria-pressed={video.activo}
        style={{
          background: 'none', border: 'none', color: VD.textMuted,
          cursor: 'pointer', padding: '0 2px', display: 'flex', alignItems: 'center', gap: 4,
        }}
      >
        <DotGlyphIcon glyph="APP_WINDOW" size={10} color={video.activo ? accent : VD.textMuted} />
        <DotLabel size={8} color={video.activo ? accent : VD.textMuted} spacing={1}>{t('music.video')}</DotLabel>
      </button>
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
  );
}
