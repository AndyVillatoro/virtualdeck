import React from 'react';
import { useTheme } from '../../../utils/theme';
import { useT } from '../../../utils/i18n';
import { DotGlyphIcon } from '../../../components/dot480/DotGlyphIcon';

/**
 * Botones bajo el vídeo: cambiar de ventana, recortar y ver la ventana entera.
 * Con el recorte en marcha cambian a guardar / cancelar.
 */
export function BarraVideo({
  recortando, hayRecorte, puedeRecortar, accent,
  onSelector, onRecortar, onEntera, onGuardar, onCancelar,
}: {
  recortando: boolean;
  hayRecorte: boolean;
  /** Hay un cuadro en vivo que se puede congelar. */
  puedeRecortar: boolean;
  accent: string;
  onSelector: () => void;
  onRecortar: () => void;
  onEntera: () => void;
  onGuardar: () => void;
  onCancelar: () => void;
}) {
  const VD = useTheme();
  const t = useT();

  const boton = (glifo: string, titulo: string, onPulsar: () => void, activo = true, color = VD.textDim) => (
    <button
      type="button"
      title={titulo}
      aria-label={titulo}
      disabled={!activo}
      onClick={onPulsar}
      style={{
        width: 32, height: 32, flexShrink: 0,
        opacity: activo ? 1 : 0.35,
        cursor: activo ? 'pointer' : 'not-allowed',
        background: VD.elevated,
        border: `1px solid ${VD.border}`,
        borderRadius: VD.radius.md,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        userSelect: 'none', WebkitUserSelect: 'none',
      }}
    >
      <DotGlyphIcon glyph={glifo} size={16} color={color} showRecessed />
    </button>
  );

  if (recortando) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, flex: 1, lineHeight: 1.4 }}>
          {t('music.videoHint')}
        </span>
        {boton('CHECK', t('music.videoSave'), onGuardar, true, accent)}
        {boton('CLOSE', t('music.videoCancel'), onCancelar)}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      {boton('APP_WINDOW', t('music.videoWindow'), onSelector)}
      {boton('SCISSORS', t('music.videoCrop'), onRecortar, puedeRecortar)}
      {boton('FULLSCREEN', t('music.videoFull'), onEntera, hayRecorte)}
    </div>
  );
}
