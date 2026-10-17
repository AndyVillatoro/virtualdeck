import React from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { useFormatoPantalla } from '../../utils/useFormatoPantalla';
import type { EntradaGaleria, InstaladoTienda, PluginInfo } from '../../types';
import { estadoGeneralDeEntrada } from './tiendaUtils';
import { TarjetaTienda } from './TarjetaTienda';
import { IconoTienda } from './IconoTienda';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';
import { Chip } from '../../components/ui/Chip';

function CabeceraSeccion({
  glifo,
  titulo,
  colorGlifo,
  derecha,
}: {
  glifo: string;
  titulo: string;
  colorGlifo?: string;
  derecha?: React.ReactNode;
}) {
  const VD = useTheme();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <DotGlyphIcon glyph={glifo} size={8} color={colorGlifo ?? VD.accent} />
      <span
        style={{
          fontFamily: VD.mono,
          fontSize: VD.tipo.xs,
          fontWeight: 700,
          color: VD.textDim,
          letterSpacing: 1.5,
          whiteSpace: 'nowrap',
        }}
      >
        {titulo}
      </span>
      <div style={{ flex: 1, height: 1, background: VD.border }} />
      {derecha}
    </div>
  );
}

export interface ListaTiendaProps {
  lista: EntradaGaleria[];
  destacados?: EntradaGaleria[];
  instalados: InstaladoTienda[];
  pluginsInstalados?: PluginInfo[];
  manifestUrl: string;
  elegidoId: string | null;
  mostrarDestacados?: boolean;
  onMirar: (e: EntradaGaleria) => void;
  onLimpiarFiltros?: () => void;
}

/**
 * Vitrina de destacados arriba y rejilla de tarjetas de la tienda abajo.
 * Adapta columnas entre formato barra (1280×480) y escritorio amplio.
 */
export function ListaTienda({
  lista,
  destacados = [],
  instalados,
  pluginsInstalados = [],
  manifestUrl,
  elegidoId,
  mostrarDestacados = false,
  onMirar,
  onLimpiarFiltros,
}: ListaTiendaProps) {
  const VD = useTheme();
  const t = useT();
  const { formato } = useFormatoPantalla();
  const esBarra = formato === 'barra';

  if (lista.length === 0) {
    return (
      <div
        style={{
          background: VD.surface,
          border: `1px solid ${VD.border}`,
          borderRadius: VD.radius.md,
          padding: '32px 16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          gap: 12,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: VD.radius.md,
            background: VD.elevated,
            border: `1px solid ${VD.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <IconoTienda icono="search" size={20} color={VD.textMuted} showRecessed />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontFamily: VD.mono, fontSize: VD.tipo.md, fontWeight: 600, color: VD.text }}>
            {t('tienda.noResults')}
          </div>
          <div style={{ fontFamily: VD.mono, fontSize: VD.tipo.xs, color: VD.textMuted }}>
            {t('tienda.noResultsHint')}
          </div>
        </div>
        {onLimpiarFiltros && (
          <Chip activo={false} onClick={onLimpiarFiltros}>
            <DotGlyphIcon glyph="CLOSE" size={8} color={VD.accent} />
            <span>{t('tienda.clear')}</span>
          </Chip>
        )}
      </div>
    );
  }

  const verDestacados = mostrarDestacados && destacados.length > 0 && lista.length > 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {verDestacados && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <CabeceraSeccion glifo="SPARKLE" titulo={t('tienda.featured')} colorGlifo={VD.accent} />
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: destacados.length > 1
                ? 'repeat(auto-fit, minmax(320px, 1fr))'
                : '1fr',
              gap: 12,
            }}
          >
            {destacados.map((e) => {
              const { estado, versionInstalada } = estadoGeneralDeEntrada(
                e, instalados, pluginsInstalados, manifestUrl,
              );
              return (
                <TarjetaTienda
                  key={`dest-${e.id}`}
                  entrada={e}
                  estado={estado}
                  versionInstalada={versionInstalada}
                  destacada
                  onMirar={onMirar}
                />
              );
            })}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <CabeceraSeccion
          glifo="DOTS"
          titulo={t('tienda.catalogSection')}
          colorGlifo={VD.textDim}
          derecha={
            <span style={{ fontFamily: VD.mono, fontSize: VD.tipo.xs, color: VD.textMuted }}>
              {t('tienda.count', { n: lista.length })}
            </span>
          }
        />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: esBarra
              ? 'repeat(auto-fill, minmax(236px, 1fr))'
              : 'repeat(auto-fill, minmax(272px, 1fr))',
            gap: 12,
          }}
        >
          {lista.map((e) => {
            const { estado, versionInstalada } = estadoGeneralDeEntrada(
              e, instalados, pluginsInstalados, manifestUrl,
            );
            return (
              <div
                key={e.id}
                style={elegidoId === e.id ? { outline: `2px solid ${VD.accent}`, borderRadius: VD.radius.md } : undefined}
              >
                <TarjetaTienda
                  entrada={e}
                  estado={estado}
                  versionInstalada={versionInstalada}
                  onMirar={onMirar}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
