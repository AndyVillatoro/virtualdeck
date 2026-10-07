import React from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import type { FiltrosTienda } from './tiendaUtils';
import { Chip } from '../../components/ui/Chip';

/**
 * Buscador y filtros de la tienda: texto libre, tipo (todo/perfil/página),
 * app destino y etiquetas. Estricto respeto a la grilla de 4 px y tokens DOT.
 */
export function BarraTienda({
  filtros,
  apps,
  tags,
  total,
  onFiltros,
  onLimpiar,
}: {
  filtros: FiltrosTienda;
  apps: string[];
  tags: string[];
  total: number;
  onFiltros: (f: FiltrosTienda) => void;
  onLimpiar: () => void;
}) {
  const VD = useTheme();
  const t = useT();

  const menudo: React.CSSProperties = {
    fontFamily: VD.mono,
    fontSize: 8,
    color: VD.textMuted,
  };

  const input: React.CSSProperties = {
    background: VD.surface,
    border: `1px solid ${VD.border}`,
    borderRadius: VD.radius.sm,
    color: VD.text,
    fontFamily: VD.mono,
    fontSize: 9,
    padding: '4px 8px',
    minHeight: 28,
    boxSizing: 'border-box',
    outline: 'none',
  };

  const hayFiltro = filtros.texto !== '' || filtros.kind !== 'all' || filtros.app !== '' || filtros.tag !== '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          value={filtros.texto}
          onChange={(e) => onFiltros({ ...filtros, texto: e.target.value })}
          placeholder={t('tienda.search')}
          style={{ ...input, flex: 1 }}
        />
        {(['all', 'profile', 'page'] as const).map((k) => (
          <Chip
            key={k}
            activo={filtros.kind === k}
            onClick={() => onFiltros({ ...filtros, kind: k })}
          >
            {k === 'all' ? t('tienda.kindAll') : t(k === 'page' ? 'gal.kind.page' : 'gal.kind.profile')}
          </Chip>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {apps.length > 0 && (
          <select
            value={filtros.app}
            onChange={(e) => onFiltros({ ...filtros, app: e.target.value })}
            style={{ ...input, cursor: 'pointer' }}
          >
            <option value="">{t('tienda.appAll')}</option>
            {apps.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        )}
        {tags.slice(0, 12).map((tag) => (
          <Chip
            key={tag}
            activo={filtros.tag === tag}
            onClick={() => onFiltros({ ...filtros, tag: filtros.tag === tag ? '' : tag })}
          >
            #{tag}
          </Chip>
        ))}
        <span style={menudo}>{t('tienda.count', { n: total })}</span>
        {hayFiltro && (
          <Chip activo={false} onClick={onLimpiar}>
            {t('tienda.clear')}
          </Chip>
        )}
      </div>
    </div>
  );
}
