import React, { useState } from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import type { EntradaGaleria, TipoEntradaGaleria } from '../../types';
import type { EstadoEntrada } from './tiendaUtils';
import { IconoTienda } from './IconoTienda';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';

function estiloInsigniaBase(VD: ReturnType<typeof useTheme>): React.CSSProperties {
  return {
    fontFamily: VD.mono,
    fontSize: VD.tipo.xs,
    color: VD.textMuted,
    background: VD.surface,
    border: `1px solid ${VD.border}`,
    borderRadius: VD.radius.sm,
    padding: '2px 6px',
    letterSpacing: 0.5,
    whiteSpace: 'nowrap',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    lineHeight: 1.2,
  };
}

function InsigniaTipo({ kind }: { kind?: TipoEntradaGaleria }) {
  const VD = useTheme();
  const t = useT();
  const base = estiloInsigniaBase(VD);

  if (kind === 'plugin') {
    return (
      <span style={{ ...base, color: VD.text, borderColor: VD.borderStrong }}>
        <DotGlyphIcon glyph="USB_PLUG" size={8} color={VD.accent} />
        <span>{t('tienda.kindPlugin')}</span>
      </span>
    );
  }
  if (kind === 'page') {
    return (
      <span style={base}>
        <DotGlyphIcon glyph="APP_WINDOW" size={8} color={VD.textDim} />
        <span>{t('gal.kind.page')}</span>
      </span>
    );
  }
  return (
    <span style={base}>
      <DotGlyphIcon glyph="FOLDER" size={8} color={VD.textDim} />
      <span>{t('gal.kind.profile')}</span>
    </span>
  );
}

function InsigniaEstado({
  estado,
  kind,
  version,
  versionInstalada,
}: {
  estado: EstadoEntrada;
  kind?: TipoEntradaGaleria;
  version?: string;
  versionInstalada?: string;
}) {
  const VD = useTheme();
  const t = useT();
  const base = estiloInsigniaBase(VD);

  if (estado === 'update') {
    return (
      <span style={{ ...base, color: VD.warning, borderColor: VD.warning }}>
        <DotGlyphIcon glyph="ARROW_UP" size={8} color={VD.warning} />
        <span>{t('tienda.update', { version: version ?? '?' })}</span>
      </span>
    );
  }
  if (estado === 'instalado') {
    return (
      <span style={{ ...base, color: VD.success, borderColor: VD.success }}>
        <DotGlyphIcon glyph="CHECK" size={8} color={VD.success} />
        <span>
          {t('tienda.installed')}
          {versionInstalada ? ` v${versionInstalada}` : ''}
        </span>
      </span>
    );
  }
  return (
    <span style={{ ...base, color: VD.accent, borderColor: VD.accent, background: VD.accentBg }}>
      <span>{t(kind === 'plugin' ? 'tienda.available' : 'tienda.new')}</span>
    </span>
  );
}

function PortadaTarjeta({
  portada,
  portadaRota,
  destacada,
  onErrorPortada,
}: {
  portada?: string;
  portadaRota: boolean;
  destacada: boolean;
  onErrorPortada: () => void;
}) {
  const VD = useTheme();
  const t = useT();

  if (portada && !portadaRota) {
    return (
      <div
        style={{
          height: destacada ? 96 : 72,
          width: '100%',
          overflow: 'hidden',
          borderBottom: `1px solid ${VD.border}`,
          position: 'relative',
          background: VD.surface,
        }}
      >
        <img
          src={portada}
          alt=""
          onError={onErrorPortada}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </div>
    );
  }

  if (!destacada) return null;

  return (
    <div
      style={{
        height: 28,
        padding: '0 12px',
        borderBottom: `1px solid ${VD.border}`,
        background: VD.surface,
        backgroundImage: `radial-gradient(rgba(${VD.trama}, 0.1) 1px, transparent 0)`,
        backgroundSize: '4px 4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <span
        style={{
          fontFamily: VD.mono,
          fontSize: VD.tipo.xs,
          fontWeight: 700,
          color: VD.accent,
          letterSpacing: 1,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        <DotGlyphIcon glyph="SPARKLE" size={8} color={VD.accent} />
        <span>{t('tienda.featuredBadge')}</span>
      </span>
      <span style={{ fontFamily: VD.mono, fontSize: VD.tipo.xs, color: VD.textMuted, letterSpacing: 0.5 }}>
        {t('tienda.viewDetails')}
      </span>
    </div>
  );
}

function PieTarjeta({
  entrada,
  estado,
  versionInstalada,
  destacada,
  activo,
}: {
  entrada: EntradaGaleria;
  estado: EstadoEntrada;
  versionInstalada?: string;
  destacada: boolean;
  activo: boolean;
}) {
  const VD = useTheme();
  const t = useT();
  const baseInsignia = estiloInsigniaBase(VD);
  const maxTags = destacada ? 3 : 1;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        paddingTop: 8,
        borderTop: `1px solid ${VD.border}`,
      }}
    >
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center', minWidth: 0 }}>
        <InsigniaTipo kind={entrada.kind} />
        <InsigniaEstado
          estado={estado}
          kind={entrada.kind}
          version={entrada.version}
          versionInstalada={versionInstalada}
        />
        {entrada.kind === 'plugin' && (
          <span style={{ ...baseInsignia, color: VD.warning, borderColor: VD.warning }}>
            <DotGlyphIcon glyph="CODE" size={8} color={VD.warning} />
            <span>{t('tienda.badgeCodeRisk')}</span>
          </span>
        )}
        {entrada.targetApp && (
          <span style={baseInsignia}>{entrada.targetApp}</span>
        )}
        {(entrada.tags ?? []).slice(0, maxTags).map((tag) => (
          <span key={tag} style={baseInsignia}>#{tag}</span>
        ))}
      </div>

      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: VD.radius.sm,
          background: activo ? VD.accentBg : VD.surface,
          border: `1px solid ${activo ? VD.accent : VD.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <DotGlyphIcon glyph="ARROW_RIGHT" size={8} color={activo ? VD.accent : VD.textMuted} />
      </div>
    </div>
  );
}

function colorBordeTarjeta(
  VD: ReturnType<typeof useTheme>,
  activo: boolean,
  destacada: boolean,
): string {
  if (activo) return VD.accent;
  if (destacada) return VD.borderStrong;
  return VD.border;
}

export interface TarjetaTiendaProps {
  entrada: EntradaGaleria;
  estado: EstadoEntrada;
  versionInstalada?: string;
  destacada?: boolean;
  onMirar: (e: EntradaGaleria) => void;
}

/**
 * Tarjeta de la tienda con estética DOT / 480 OLED: icono grande en matriz
 * de puntos, portada opcional, jerarquía tipográfica clara, insignias de tipo,
 * estado, versión y riesgo, y foco de teclado visible.
 */
export function TarjetaTienda({
  entrada,
  estado,
  versionInstalada,
  destacada = false,
  onMirar,
}: TarjetaTiendaProps) {
  const VD = useTheme();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [portadaRota, setPortadaRota] = useState(false);

  const activo = hovered || focused;
  const ladoCajaIcono = destacada ? 48 : 44;
  const ladoIcono = destacada ? 32 : 28;
  const subtituloAutor = `${entrada.author ?? 'VirtualDeck'}${entrada.license ? ` · ${entrada.license}` : ''}`;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onMirar(entrada)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onMirar(entrada);
        }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        background: hovered ? VD.elevatedHover : VD.elevated,
        border: `1px solid ${colorBordeTarjeta(VD, activo, destacada)}`,
        borderRadius: VD.radius.md,
        overflow: 'hidden',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        boxSizing: 'border-box',
        outline: 'none',
        boxShadow: focused ? `0 0 0 2px ${VD.accentBg}` : undefined,
        transition: 'border-color 0.12s, background 0.12s, transform 0.12s, box-shadow 0.12s',
        transform: hovered ? 'translateY(-2px)' : 'none',
      }}
    >
      <PortadaTarjeta
        portada={entrada.portada}
        portadaRota={portadaRota}
        destacada={destacada}
        onErrorPortada={() => setPortadaRota(true)}
      />

      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', flex: 1, gap: 10 }}>
        {/* Cabecera: icono DOT grande + título + versión */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, minWidth: 0 }}>
          <div
            style={{
              width: ladoCajaIcono,
              height: ladoCajaIcono,
              borderRadius: VD.radius.md,
              background: VD.surface,
              backgroundImage: `radial-gradient(rgba(${VD.trama}, 0.08) 1px, transparent 0)`,
              backgroundSize: '4px 4px',
              border: `1px solid ${activo ? VD.accent : VD.borderStrong}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'border-color 0.12s',
            }}
          >
            <IconoTienda icono={entrada.icono} kind={entrada.kind} size={ladoIcono} color={VD.accent} showRecessed />
          </div>

          <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div
                style={{
                  fontFamily: VD.mono,
                  fontSize: destacada ? VD.tipo.lg : VD.tipo.md,
                  fontWeight: 700,
                  color: VD.text,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {entrada.label}
              </div>
              {entrada.version && (
                <span
                  style={{
                    fontFamily: VD.mono,
                    fontSize: VD.tipo.xs,
                    color: VD.textDim,
                    background: VD.surface,
                    border: `1px solid ${VD.border}`,
                    borderRadius: VD.radius.sm,
                    padding: '1px 6px',
                    flexShrink: 0,
                  }}
                >
                  v{entrada.version}
                </span>
              )}
            </div>

            <div
              style={{
                fontFamily: VD.mono,
                fontSize: VD.tipo.xs,
                color: VD.textMuted,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {subtituloAutor}
            </div>
          </div>
        </div>

        {/* Descripción a 2 líneas */}
        {entrada.description && (
          <div
            style={{
              fontFamily: VD.mono,
              fontSize: VD.tipo.sm,
              color: VD.textDim,
              lineHeight: 1.45,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              minHeight: 26,
            }}
          >
            {entrada.description}
          </div>
        )}

        <div style={{ flex: 1 }} />

        <PieTarjeta
          entrada={entrada}
          estado={estado}
          versionInstalada={versionInstalada}
          destacada={destacada}
          activo={activo}
        />
      </div>
    </div>
  );
}
