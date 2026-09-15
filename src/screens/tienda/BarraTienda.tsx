import React from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import type { FiltrosTienda } from './tiendaUtils';

/**
 * Buscador y filtros de la tienda: texto libre, tipo (todo/perfil/página),
 * app destino y una etiqueta. Todo vive en el estado de la tienda; aquí solo
 * se pinta y se avisa.
 */
export function BarraTienda({ filtros, apps, tags, total, onFiltros, onLimpiar }: {
  filtros: FiltrosTienda;
  apps: string[];
  tags: string[];
  total: number;
  onFiltros: (f: FiltrosTienda) => void;
  onLimpiar: () => void;
}) {
  const VD = useTheme();
  const t = useT();
  const menudo: React.CSSProperties = { fontFamily: VD.mono, fontSize: 8, color: VD.textMuted };
  const input: React.CSSProperties = {
    background: VD.surface, border: `1px solid ${VD.border}`, borderRadius: VD.radius.sm,
    color: VD.text, fontFamily: VD.mono, fontSize: 9, padding: '5px 8px', outline: 'none',
  };
  const chip = (activo: boolean): React.CSSProperties => ({
    fontFamily: VD.mono, fontSize: 8, letterSpacing: 0.5, cursor: 'pointer',
    border: `1px solid ${activo ? VD.accent : VD.border}`, borderRadius: VD.radius.sm,
    padding: '2px 7px', background: activo ? VD.elevated : 'transparent',
    color: activo ? VD.accent : VD.textMuted,
  });
  const hayFiltro = filtros.texto !== '' || filtros.kind !== 'all' || filtros.app !== '' || filtros.tag !== '';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          value={filtros.texto}
          onChange={(e) => onFiltros({ ...filtros, texto: e.target.value })}
          placeholder={t('tienda.search')}
          style={{ ...input, flex: 1 }}
        />
        {(['all', 'profile', 'page'] as const).map((k) => (
          <button
            key={k}
            onClick={() => onFiltros({ ...filtros, kind: k })}
            style={chip(filtros.kind === k)}
          >
            {k === 'all' ? t('tienda.kindAll') : t(k === 'page' ? 'gal.kind.page' : 'gal.kind.profile')}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        {apps.length > 0 && (
          <select
            value={filtros.app}
            onChange={(e) => onFiltros({ ...filtros, app: e.target.value })}
            style={input}
          >
            <option value="">{t('tienda.appAll')}</option>
            {apps.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        )}
        {tags.slice(0, 12).map((tag) => (
          <button
            key={tag}
            onClick={() => onFiltros({ ...filtros, tag: filtros.tag === tag ? '' : tag })}
            style={chip(filtros.tag === tag)}
          >
            #{tag}
          </button>
        ))}
        <span style={menudo}>{t('tienda.count', { n: total })}</span>
        {hayFiltro && (
          <button onClick={onLimpiar} style={chip(false)}>
            {t('tienda.clear')}
          </button>
        )}
      </div>
    </div>
  );
}
