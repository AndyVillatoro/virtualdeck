import React, { useState } from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import type { FiltrosTienda, TipoFiltroTienda } from './tiendaUtils';
import { Chip } from '../../components/ui/Chip';
import { BotonIcono } from '../../components/ui/BotonIcono';
import { estiloCampo, estiloDesplegable } from '../../components/ui/estilos';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';
import { IconoTienda } from './IconoTienda';

interface ConfigPestana {
  kind: TipoFiltroTienda;
  glifo: string;
  claveTexto: string;
}

const PESTANAS: readonly ConfigPestana[] = [
  { kind: 'all', glifo: 'DOTS', claveTexto: 'tienda.kindAll' },
  { kind: 'profile', glifo: 'FOLDER', claveTexto: 'tienda.kindProfiles' },
  { kind: 'page', glifo: 'APP_WINDOW', claveTexto: 'tienda.kindPages' },
  { kind: 'plugin', glifo: 'USB_PLUG', claveTexto: 'tienda.kindPlugins' },
];

function PestanaCategoria({
  activo,
  glifo,
  etiqueta,
  conteo,
  onClick,
}: {
  activo: boolean;
  glifo: string;
  etiqueta: string;
  conteo: number;
  onClick: () => void;
}) {
  const VD = useTheme();
  const [hover, setHover] = useState(false);
  const [foco, setFoco] = useState(false);

  return (
    <button
      type="button"
      role="tab"
      aria-selected={activo}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setFoco(true)}
      onBlur={() => setFoco(false)}
      style={{
        flex: '1 1 120px',
        minHeight: 36,
        padding: '8px 12px',
        background: activo ? VD.accentBg : hover ? VD.elevatedHover : VD.elevated,
        border: `1px solid ${activo ? VD.accent : foco ? VD.borderStrong : VD.border}`,
        borderRadius: VD.radius.sm,
        color: activo ? VD.accent : hover ? VD.text : VD.textDim,
        fontFamily: VD.mono,
        fontSize: VD.tipo.sm,
        fontWeight: activo ? 700 : 500,
        letterSpacing: 1,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        outline: 'none',
        boxShadow: foco ? `0 0 0 2px ${VD.accentBg}` : undefined,
        transition: 'border-color 0.12s, background 0.12s, color 0.12s',
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <DotGlyphIcon glyph={glifo} size={10} color={activo ? VD.accent : hover ? VD.text : VD.textDim} />
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {etiqueta}
        </span>
      </span>
      <span
        style={{
          fontFamily: VD.mono,
          fontSize: VD.tipo.xs,
          fontWeight: 600,
          padding: '1px 6px',
          borderRadius: VD.radius.sm,
          background: activo ? VD.accent : VD.surface,
          color: activo ? VD.onAccent : VD.textMuted,
          border: `1px solid ${activo ? VD.accent : VD.border}`,
          lineHeight: 1.4,
        }}
      >
        {conteo}
      </span>
    </button>
  );
}

export interface BarraTiendaProps {
  filtros: FiltrosTienda;
  conteos: Record<TipoFiltroTienda, number>;
  apps: string[];
  tags: string[];
  total: number;
  onFiltros: (f: FiltrosTienda) => void;
  onLimpiar: () => void;
}

/**
 * Navegación por categorías (TODO / PERFILES / PÁGINAS / PLUGINS), buscador
 * con icono DOT y filtros coherentes por aplicación destino y etiquetas.
 */
export function BarraTienda({
  filtros,
  conteos,
  apps,
  tags,
  total,
  onFiltros,
  onLimpiar,
}: BarraTiendaProps) {
  const VD = useTheme();
  const t = useT();
  const [focoBusqueda, setFocoBusqueda] = useState(false);

  const hayFiltro = filtros.texto !== '' || filtros.kind !== 'all' || filtros.app !== '' || filtros.tag !== '';

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
      {/* Rail de pestañas principales */}
      <div
        role="tablist"
        aria-label={t('tienda.title')}
        style={{
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        {PESTANAS.map((p) => (
          <PestanaCategoria
            key={p.kind}
            activo={filtros.kind === p.kind}
            glifo={p.glifo}
            etiqueta={t(p.claveTexto)}
            conteo={conteos[p.kind]}
            onClick={() => onFiltros({ ...filtros, kind: p.kind, tag: '', app: p.kind === 'plugin' ? '' : filtros.app })}
          />
        ))}
      </div>

      {/* Fila de buscador, selector de app y contador */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <div
          style={{
            flex: '1 1 220px',
            minWidth: 160,
            minHeight: 32,
            padding: '0 8px',
            background: VD.bg,
            border: `1px solid ${focoBusqueda ? VD.accent : VD.border}`,
            borderRadius: VD.radius.sm,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxSizing: 'border-box',
            transition: 'border-color 0.12s',
          }}
        >
          <IconoTienda icono="search" size={12} color={focoBusqueda ? VD.accent : VD.textMuted} />
          <input
            value={filtros.texto}
            onChange={(e) => onFiltros({ ...filtros, texto: e.target.value })}
            onFocus={() => setFocoBusqueda(true)}
            onBlur={() => setFocoBusqueda(false)}
            placeholder={t('tienda.search')}
            style={{
              ...estiloCampo(VD, 'compacto'),
              border: 'none',
              background: 'transparent',
              padding: '4px 0',
              minHeight: 28,
            }}
          />
          {filtros.texto !== '' && (
            <BotonIcono
              glifo="CLOSE"
              title={t('tienda.clear')}
              tamano={20}
              tamanoGlifo={8}
              onClick={() => onFiltros({ ...filtros, texto: '' })}
            />
          )}
        </div>

        {filtros.kind !== 'plugin' && apps.length > 0 && (
          <select
            value={filtros.app}
            onChange={(e) => onFiltros({ ...filtros, app: e.target.value })}
            style={{
              ...estiloDesplegable(VD, 'compacto'),
              width: 'auto',
              minWidth: 120,
              minHeight: 32,
            }}
          >
            <option value="">{t('tienda.appAll')}</option>
            {apps.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        )}

        <div
          style={{
            fontFamily: VD.mono,
            fontSize: VD.tipo.xs,
            color: VD.textMuted,
            padding: '4px 8px',
            background: VD.bg,
            border: `1px solid ${VD.border}`,
            borderRadius: VD.radius.sm,
            whiteSpace: 'nowrap',
          }}
        >
          {t('tienda.count', { n: total })}
        </div>

        {hayFiltro && (
          <Chip activo={false} onClick={onLimpiar}>
            <DotGlyphIcon glyph="CLOSE" size={8} color={VD.textDim} />
            <span>{t('tienda.clear')}</span>
          </Chip>
        )}
      </div>

      {/* Tira de etiquetas (#tags) coherente en todas las secciones */}
      {tags.length > 0 && (
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
          {tags.slice(0, 14).map((tag) => (
            <Chip
              key={tag}
              activo={filtros.tag === tag}
              onClick={() => onFiltros({ ...filtros, tag: filtros.tag === tag ? '' : tag })}
            >
              #{tag}
            </Chip>
          ))}
        </div>
      )}
    </div>
  );
}
