import React from 'react';
import type { useTheme } from '../../utils/theme';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';
import { IconoPuntos } from '../../components/dot480/IconoPuntos';
import { iconoFallback } from './textoPanelInspector';
import type { ButtonConfig } from '../../types';
import type { ControlSuperficie } from '../../types/superficies';

/** La vista previa del hueco: su icono y su rótulo, como los verá el aparato. */
export function MiniPreview({
  boton,
  glifo,
  nombreControl,
  controlTipo,
  vd,
  vacioTexto,
}: {
  boton?: ButtonConfig;
  glifo: string | null;
  nombreControl: string;
  controlTipo?: ControlSuperficie;
  vd: ReturnType<typeof useTheme>;
  vacioTexto: string;
}) {
  const bg = boton?.bgColor || vd.bg;
  const fg = boton?.fgColor || vd.text;
  const label = boton?.label || vacioTexto;

  return (
    <div
      style={{
        background: vd.elevated,
        border: `1px solid ${vd.border}`,
        borderRadius: vd.radius.md,
        padding: vd.space.md,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: vd.space.sm,
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          background: bg,
          border: `1.5px solid ${vd.accent}`,
          borderRadius: vd.radius.md,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          boxShadow: `0 0 10px ${vd.accentBg}`,
        }}
      >
        {glifo ? (
          <DotGlyphIcon glyph={glifo} size={18} color={fg} />
        ) : boton?.iconoPuntos ? (
          <IconoPuntos bits={boton.iconoPuntos.bits} size={18} color={fg} />
        ) : (
          <DotGlyphIcon glyph={iconoFallback(controlTipo)} size={18} color={vd.accent} />
        )}
        <span
          style={{
            fontSize: 7.5,
            color: fg,
            fontFamily: vd.mono,
            maxWidth: 48,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </span>
      </div>
      <span style={{ fontSize: 8, color: vd.textMuted, fontFamily: vd.mono }}>
        {nombreControl}
      </span>
    </div>
  );
}