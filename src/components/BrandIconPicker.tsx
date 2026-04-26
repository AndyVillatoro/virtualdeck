import React, { useState, useMemo } from 'react';
import { VD } from '../design';
import { DotLabel } from './DotLabel';
import { BRAND_ICON_GROUPS, BRAND_ICONS } from '../data/brandIcons';
import { BrandIconDisplay } from './BrandIconDisplay';

interface BrandIconPickerProps {
  current: string;
  onSelect: (key: string) => void;
  onClose: () => void;
  accent: string;
}

const ALL_GROUPS = [{ title: 'Todos', items: [] as [string, string, string][] }, ...BRAND_ICON_GROUPS];

export function BrandIconPicker({ current, onSelect, onClose, accent }: BrandIconPickerProps) {
  const [search, setSearch] = useState('');
  const [groupTitle, setGroupTitle] = useState('Todos');
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const displayed = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q) {
      return BRAND_ICONS.filter(
        (ic) => ic.label.toLowerCase().includes(q) || ic.key.toLowerCase().includes(q)
      );
    }
    if (groupTitle === 'Todos') return BRAND_ICONS;
    return BRAND_ICONS.filter((ic) => ic.group === groupTitle);
  }, [search, groupTitle]);

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
          <DotLabel size={10} color={VD.text} spacing={2}>ICONOS DE MARCA ANIMADOS</DotLabel>
          <div style={{ flex: 1 }} />
          <input
            autoFocus
            value={search}
            onChange={(e) => { setSearch(e.target.value); setGroupTitle('Todos'); }}
            placeholder="Buscar icono..."
            style={{
              background: VD.elevated, border: `1px solid ${VD.border}`,
              padding: '4px 10px', color: VD.text, fontFamily: VD.mono, fontSize: 10,
              outline: 'none', borderRadius: VD.radius.sm, width: 160,
            }}
          />
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none',
            color: VD.textDim, fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: '0 4px',
          }}>×</button>
        </div>

        {/* Category tabs */}
        {!search && (
          <div style={{
            display: 'flex', gap: 2, padding: '8px 12px',
            borderBottom: `1px solid ${VD.border}`, flexWrap: 'wrap', flexShrink: 0,
          }}>
            {ALL_GROUPS.map((g) => (
              <button
                key={g.title}
                onClick={() => setGroupTitle(g.title)}
                style={{
                  padding: '4px 10px',
                  background: groupTitle === g.title ? VD.accentBg : 'transparent',
                  border: `1px solid ${groupTitle === g.title ? accent : VD.border}`,
                  color: groupTitle === g.title ? accent : VD.textMuted,
                  fontFamily: VD.mono, fontSize: 8, letterSpacing: 1,
                  cursor: 'pointer', borderRadius: VD.radius.sm,
                }}
              >
                {g.title.toUpperCase()}
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
            title="Sin icono de marca"
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
            <div style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: VD.textMuted }}>○</div>
            <div style={{ fontFamily: VD.mono, fontSize: 7, color: VD.textMuted, letterSpacing: 0.5, textAlign: 'center' }}>NINGUNO</div>
          </div>

          {displayed.map((icon) => {
            const isSelected = current === icon.key;
            const isHovered = hoveredKey === icon.key;
            return (
              <div
                key={icon.key}
                onClick={() => { onSelect(icon.key); onClose(); }}
                onMouseEnter={() => setHoveredKey(icon.key)}
                onMouseLeave={() => setHoveredKey(null)}
                title={icon.label}
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
                  {icon.label}
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
            {displayed.length} icono{displayed.length !== 1 ? 's' : ''} · Dot-matrix 17×17 · Pasa el cursor para animar
          </span>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{
            padding: '6px 14px', border: `1px solid ${VD.border}`,
            background: 'transparent', fontFamily: VD.mono, fontSize: 9,
            letterSpacing: 1, color: VD.textDim, cursor: 'pointer', borderRadius: VD.radius.sm,
          }}>CANCELAR</button>
        </div>
      </div>
    </div>
  );
}
