import React, { useState, useMemo } from 'react';
import { useTheme } from '../utils/theme';
import { useT } from '../utils/i18n';
import { DotLabel } from './DotLabel';
import { useCatalogoMarcas } from '../utils/catalogoMarcas';
import type { BrandIcon } from '../data/brandIconTypes';
import { BrandIconDisplay } from './BrandIconDisplay';
import { DotGlyphIcon } from './dot480/DotGlyphIcon';

interface BrandIconPickerProps {
  current: string;
  onSelect: (key: string) => void;
  onClose: () => void;
  accent: string;
}

/**
 * Los rotulos en espanol que enseña este selector.
 *
 * Se indexan por **posicion** y por **clave del icono**, no por el texto
 * espanol: usar la cadena como llave habria dejado «Diseño y Produccion»
 * escrito aqui dentro, que es exactamente lo que el guardian de i18n busca, y
 * con razon — una lista de textos en espanol dentro de un componente es como
 * empezo el problema del widget de clima.
 *
 * `brandIcons.ts` esta en los datos sembrados del guardian porque su contenido
 * **se copia dentro del boton** del usuario. El titulo del grupo y estas dos
 * etiquetas no se copian, solo se enseñan, y por eso quedaban fuera de todo.
 */
const CLAVES_GRUPO = [
  'brand.g.all', 'brand.g.design', 'brand.g.streaming', 'brand.g.dev',
  'brand.g.productivity', 'brand.g.media', 'brand.g.system',
];
/** Las dos etiquetas que no son marcas, sino herramientas de Windows. */
const CLAVES_ICONO: Record<string, string> = {
  settings: 'brand.i.settings',
  controlpanel: 'brand.i.controlPanel',
};

export function BrandIconPicker({ current, onSelect, onClose, accent }: BrandIconPickerProps) {
  const t = useT();
  /** El grupo va por posicion; el icono, por su clave. Lo demas es marca. */
  const rotuloGrupo = (i: number, titulo: string) => (CLAVES_GRUPO[i] ? t(CLAVES_GRUPO[i]) : titulo);
  const rotuloIcono = (clave: string, etiqueta: string) => (CLAVES_ICONO[clave] ? t(CLAVES_ICONO[clave]) : etiqueta);
  const VD = useTheme();
  const [search, setSearch] = useState('');
  const [groupTitle, setGroupTitle] = useState('Todos');
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  // El catálogo (~42 KiB) llega diferido: sin él solo hay grupos vacíos.
  const catalogo = useCatalogoMarcas();
  const iconos = useMemo<BrandIcon[]>(
    () => catalogo?.BRAND_ICONS ?? [],
    [catalogo],
  );
  const grupos = catalogo?.BRAND_ICON_GROUPS ?? [];

  const displayed = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q) {
      return iconos.filter(
        (ic) => ic.label.toLowerCase().includes(q) || ic.key.toLowerCase().includes(q)
      );
    }
    if (groupTitle === 'Todos') return iconos;
    return iconos.filter((ic) => ic.group === groupTitle);
  }, [search, groupTitle, iconos]);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.85)',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(860px, 94vw)', height: 'min(580px, 90vh)',
          background: VD.surface, border: `1px solid ${VD.borderStrong}`,
          borderRadius: VD.radius.lg, display: 'flex', flexDirection: 'column',
          boxShadow: VD.shadow.modal,
        }}
      >
        {/* Header */}
        <div style={{
          height: 44, borderBottom: `1px solid ${VD.border}`,
          display: 'flex', alignItems: 'center', padding: '0 16px', gap: 10, flexShrink: 0,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: VD.radius.md, background: accent }} />
          <DotLabel size={10} color={VD.text} spacing={2}>{t('brand.title')}</DotLabel>
          <div style={{ flex: 1 }} />
          <input
            autoFocus
            value={search}
            onChange={(e) => { setSearch(e.target.value); setGroupTitle('Todos'); }}
            placeholder={t('brand.search')}
            style={{
              background: VD.elevated, border: `1px solid ${VD.border}`,
              padding: '4px 10px', color: VD.text, fontFamily: VD.mono, fontSize: 10,
              outline: 'none', borderRadius: VD.radius.sm, width: 160,
            }}
          />
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none',
            color: VD.textDim, cursor: 'pointer', padding: '0 4px', display: 'flex', alignItems: 'center',
          }}>
            <DotGlyphIcon glyph="CLOSE" size={10} color={VD.textDim} />
          </button>
        </div>

        {/* Category tabs */}
        {!search && (
          <div style={{
            display: 'flex', gap: 2, padding: '8px 12px',
            borderBottom: `1px solid ${VD.border}`, flexWrap: 'wrap', flexShrink: 0,
          }}>
            {['Todos', ...grupos.map((g) => g.title)].map((titulo, i) => (
              <button
                key={titulo}
                onClick={() => setGroupTitle(titulo)}
                style={{
                  padding: '4px 10px',
                  background: groupTitle === titulo ? VD.accentBg : 'transparent',
                  border: `1px solid ${groupTitle === titulo ? accent : VD.border}`,
                  color: groupTitle === titulo ? accent : VD.textMuted,
                  fontFamily: VD.mono, fontSize: 8, letterSpacing: 1,
                  cursor: 'pointer', borderRadius: VD.radius.sm,
                }}
              >
                {rotuloGrupo(i, titulo).toUpperCase()}
              </button>
            ))}
          </div>
        )}

        {/* Grid */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: 12,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))',
          gap: 8, alignContent: 'start',
        }}>
          {/* "Ninguno" tile */}
          <div
            onClick={() => { onSelect(''); onClose(); }}
            title={t('brand.none')}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 5, cursor: 'pointer',
              height: 88, borderRadius: VD.radius.lg,
              background: current === '' ? VD.accentBg : VD.elevated,
              border: `1px solid ${current === '' ? accent : VD.border}`,
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = accent; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = current === '' ? accent : VD.border; }}
          >
            <div style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DotGlyphIcon glyph="CLOSE" size={16} color={VD.textMuted} showRecessed />
            </div>
            <div style={{ fontFamily: VD.mono, fontSize: 7, color: VD.textMuted, letterSpacing: 0.5, textAlign: 'center' }}>{t('ui.none')}</div>
          </div>

          {!catalogo && (
            <div style={{
              gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'center',
              minHeight: 120, fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, letterSpacing: 1,
            }}>
              {t('brand.loading')}
            </div>
          )}
          {displayed.map((icon) => {
            const isSelected = current === icon.key;
            const isHovered = hoveredKey === icon.key;
            return (
              <div
                key={icon.key}
                onClick={() => { onSelect(icon.key); onClose(); }}
                onMouseEnter={() => setHoveredKey(icon.key)}
                onMouseLeave={() => setHoveredKey(null)}
                title={rotuloIcono(icon.key, icon.label)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', gap: 5, cursor: 'pointer',
                  height: 88, borderRadius: VD.radius.lg,
                  background: isSelected ? VD.accentBg : VD.elevated,
                  border: `1px solid ${(isSelected || isHovered) ? accent : VD.border}`,
                  position: 'relative',
                  transition: 'border-color 0.1s',
                }}
              >
                <BrandIconDisplay
                  iconKey={icon.key}
                  size={48}
                  animated={isHovered || isSelected}
                />
                <div style={{
                  fontFamily: VD.mono, fontSize: 7,
                  color: isSelected ? accent : VD.textMuted,
                  letterSpacing: 0.5, textAlign: 'center',
                  maxWidth: 66, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {rotuloIcono(icon.key, icon.label)}
                </div>
                {isSelected && (
                  <div style={{
                    position: 'absolute', top: 3, right: 3,
                    width: 6, height: 6, borderRadius: VD.radius.md, background: accent,
                  }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{
          height: 44, borderTop: `1px solid ${VD.border}`,
          display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8, flexShrink: 0,
        }}>
          <span style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted }}>
            {t('icons.count', { n: displayed.length })}
          </span>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{
            padding: '6px 14px', border: `1px solid ${VD.border}`,
            background: 'transparent', fontFamily: VD.mono, fontSize: 9,
            letterSpacing: 1, color: VD.textDim, cursor: 'pointer', borderRadius: VD.radius.sm,
          }}>{t('ui.cancel')}</button>
        </div>
      </div>
    </div>
  );
}
