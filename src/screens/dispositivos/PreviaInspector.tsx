import React, { useEffect, useState } from 'react';
import type { useTheme } from '../../utils/theme';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';
import { IconoPuntos } from '../../components/dot480/IconoPuntos';
import { resolverIconoCatalogo } from '../../data/iconosDot';
import { iconoFallback } from './textoPanelInspector';
import { useVisualPlugin } from '../../utils/plugins/visual';
import { contextoDeBoton } from '../../utils/plugins/ref';
import type { BotonConCatalogo } from './TeclaLcdHardware';
import type { ControlSuperficie } from '../../types/superficies';

function useBitsMiniPreview(boton?: BotonConCatalogo): string | null {
  const [bitsCatalogo, setBitsCatalogo] = useState<string | null>(null);
  const origenCatalogo = boton?.iconoCatalogo ?? boton?.iconoPuntos?.origen;
  const bitsDirectos = boton?.iconoPuntos?.bits;

  useEffect(() => {
    if (bitsDirectos) {
      setBitsCatalogo(bitsDirectos);
      return;
    }
    if (!origenCatalogo) {
      setBitsCatalogo(null);
      return;
    }
    let vivo = true;
    resolverIconoCatalogo(origenCatalogo)
      .then((r) => { if (vivo) setBitsCatalogo(r ? r.bits : null); })
      .catch(() => { if (vivo) setBitsCatalogo(null); });
    return () => { vivo = false; };
  }, [origenCatalogo, bitsDirectos]);

  return bitsDirectos ?? bitsCatalogo;
}

function IconoMiniPreview({
  bits,
  glifo,
  controlTipo,
  fg,
  accent,
}: {
  bits: string | null;
  glifo: string | null;
  controlTipo?: ControlSuperficie;
  fg: string;
  accent: string;
}) {
  if (bits) return <IconoPuntos bits={bits} size={18} color={fg} />;
  if (glifo) return <DotGlyphIcon glyph={glifo} size={18} color={fg} />;
  return <DotGlyphIcon glyph={iconoFallback(controlTipo)} size={18} color={accent} />;
}

/** La vista previa del hueco: su icono y su rótulo, como los verá el aparato. */
export function MiniPreview({
  boton,
  glifo,
  nombreControl,
  controlTipo,
  vd,
  vacioTexto,
  contexto,
}: {
  boton?: BotonConCatalogo;
  glifo: string | null;
  nombreControl: string;
  controlTipo?: ControlSuperficie;
  vd: ReturnType<typeof useTheme>;
  vacioTexto: string;
  contexto?: string | null;
}) {
  const visual = useVisualPlugin(contexto ?? (boton ? contextoDeBoton(boton.id) : null));
  const bitsEfectivos = useBitsMiniPreview(boton);
  const bg = boton?.bgColor || vd.bg;
  const fg = boton?.fgColor || vd.text;
  const label = visual?.titulo || boton?.label || vacioTexto;

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
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: visual?.imagen ? 'flex-end' : 'center',
          gap: 2,
          boxShadow: `0 0 10px ${vd.accentBg}`,
        }}
      >
        {visual?.imagen ? (
          <>
            <img
              src={visual.imagen}
              alt=""
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                opacity: 0.92,
              }}
              draggable={false}
            />
            <span
              style={{
                position: 'relative',
                zIndex: 2,
                fontSize: 7.5,
                color: vd.onAccent,
                textShadow: '0 1px 3px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.9)',
                fontFamily: vd.mono,
                maxWidth: 48,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                paddingBottom: 2,
              }}
            >
              {label}
            </span>
          </>
        ) : (
          <>
            <IconoMiniPreview
              bits={bitsEfectivos}
              glifo={glifo}
              controlTipo={controlTipo}
              fg={fg}
              accent={vd.accent}
            />
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
          </>
        )}
      </div>
      <span style={{ fontSize: 8, color: vd.textMuted, fontFamily: vd.mono }}>
        {nombreControl}
      </span>
    </div>
  );
}

/** Aviso para controles físicos que no disponen de pantalla LCD propia. */
export function AvisoControlSinLcd({
  vd,
  texto,
}: {
  vd: ReturnType<typeof useTheme>;
  texto: string;
}) {
  return (
    <div
      style={{
        background: vd.surface,
        border: `1px solid ${vd.border}`,
        borderLeft: `2px solid ${vd.accent}`,
        borderRadius: vd.radius.sm,
        padding: `${vd.space.sm}px ${vd.space.md}px`,
        display: 'flex',
        alignItems: 'center',
        gap: vd.space.sm,
        fontFamily: vd.mono,
        fontSize: 8.5,
        lineHeight: 1.6,
        color: vd.textDim,
      }}
    >
      <DotGlyphIcon glyph="LOCK" size={10} color={vd.accent} />
      <span>{texto}</span>
    </div>
  );
}
