import React from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';
import { estiloBotonTexto, estiloCampo } from '../../components/ui/estilos';

export function CabeceraTienda({
  url,
  accent,
  cargando,
  updates,
  onUrlChange,
  onCargar,
  onCargarOficial,
  onCerrar,
}: {
  url: string;
  accent: string;
  cargando: boolean;
  updates: number;
  onUrlChange: (v: string) => void;
  onCargar: () => void;
  onCargarOficial: () => void;
  onCerrar: () => void;
}) {
  const VD = useTheme();
  const t = useT();

  return (
    <div
      style={{
        background: VD.surface,
        border: `1px solid ${VD.border}`,
        borderRadius: VD.radius.md,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {/* Fila superior: identidad TIENDA, insignia de updates y botón cerrar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: VD.radius.sm,
            background: VD.elevated,
            backgroundImage: `radial-gradient(rgba(${VD.trama}, 0.08) 1px, transparent 0)`,
            backgroundSize: '4px 4px',
            border: `1px solid ${VD.borderStrong}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <DotGlyphIcon glyph="SPARKLE" size={16} color={accent} showRecessed />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                fontFamily: VD.mono,
                fontSize: VD.tipo.lg,
                fontWeight: 700,
                color: VD.text,
                letterSpacing: 2,
              }}
            >
              {t('tienda.title')}
            </span>
            {updates > 0 && (
              <span
                style={{
                  fontFamily: VD.mono,
                  fontSize: VD.tipo.xs,
                  fontWeight: 600,
                  color: VD.warning,
                  background: VD.elevated,
                  border: `1px solid ${VD.warning}`,
                  borderRadius: VD.radius.sm,
                  padding: '2px 8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <DotGlyphIcon glyph="ARROW_UP" size={8} color={VD.warning} />
                <span>{t('tienda.updates', { n: updates })}</span>
              </span>
            )}
          </div>
          <span style={{ fontFamily: VD.mono, fontSize: VD.tipo.xs, color: VD.textMuted, letterSpacing: 1 }}>
            {t('tienda.subtitle')}
          </span>
        </div>

        <div style={{ flex: 1 }} />

        <button
          type="button"
          onClick={onCargarOficial}
          style={{
            ...estiloBotonTexto(VD, false, accent),
            minHeight: 28,
            borderColor: accent,
            color: accent,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <DotGlyphIcon glyph="WEB" size={8} color={accent} />
          <span>{t('gal.official')}</span>
        </button>

        <button
          type="button"
          onClick={onCerrar}
          style={{
            ...estiloBotonTexto(VD, false),
            minHeight: 28,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <DotGlyphIcon glyph="CLOSE" size={8} color={VD.textDim} />
          <span>{t('tienda.close')}</span>
        </button>
      </div>

      {/* Barra de fuente de manifiesto */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <span
          style={{
            fontFamily: VD.mono,
            fontSize: VD.tipo.xs,
            color: VD.textMuted,
            letterSpacing: 1,
            padding: '0 4px',
          }}
        >
          {t('tienda.sourceLabel')}
        </span>
        <input
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onCargar(); }}
          placeholder="https://…/manifest.json"
          style={{
            ...estiloCampo(VD, 'compacto'),
            flex: '1 1 240px',
            minHeight: 28,
          }}
        />
        <button
          type="button"
          onClick={onCargar}
          disabled={cargando || !url.trim()}
          style={{
            ...estiloBotonTexto(VD, true, accent),
            minHeight: 28,
            opacity: cargando || !url.trim() ? 0.55 : 1,
          }}
        >
          {t(cargando ? 'gal.loading' : 'gal.load')}
        </button>
      </div>

      <div style={{ fontFamily: VD.mono, fontSize: VD.tipo.xs, color: VD.textMuted, lineHeight: 1.5 }}>
        {t('tienda.hint')}
      </div>
    </div>
  );
}

export function AvisosTienda({
  error,
  aviso,
  cargandoInicial,
  onReintentar,
}: {
  error: string | null;
  aviso: string | null;
  cargandoInicial: boolean;
  onReintentar: () => void;
}) {
  const VD = useTheme();
  const t = useT();

  return (
    <>
      {error && (
        <div
          style={{
            background: VD.elevated,
            border: `1px solid ${VD.danger}`,
            borderRadius: VD.radius.md,
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <DotGlyphIcon glyph="WARN" size={10} color={VD.danger} />
            <span style={{ fontFamily: VD.mono, fontSize: VD.tipo.sm, color: VD.danger }}>{error}</span>
          </div>
          <button type="button" onClick={onReintentar} style={estiloBotonTexto(VD, false)}>
            {t('tienda.retry')}
          </button>
        </div>
      )}

      {aviso && (
        <div
          style={{
            background: VD.surface,
            border: `1px solid ${VD.success}`,
            borderRadius: VD.radius.md,
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <DotGlyphIcon glyph="CHECK" size={10} color={VD.success} />
          <span style={{ fontFamily: VD.mono, fontSize: VD.tipo.sm, color: VD.text }}>{aviso}</span>
        </div>
      )}

      {cargandoInicial && (
        <div
          style={{
            background: VD.surface,
            border: `1px solid ${VD.border}`,
            borderRadius: VD.radius.md,
            padding: '32px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <DotGlyphIcon glyph="CLOCK" size={12} color={VD.accent} />
          <span style={{ fontFamily: VD.mono, fontSize: VD.tipo.sm, color: VD.textDim }}>
            {t('tienda.loadingCatalog')}
          </span>
        </div>
      )}
    </>
  );
}
