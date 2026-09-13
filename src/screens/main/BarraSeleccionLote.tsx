import React, { useState } from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';
import type { PageConfig } from '../../types';

interface BarraSeleccionLoteProps {
  selectedIds: Set<string>;
  pages: PageConfig[];
  activePage: number;
  accent: string;
  onMoveButtonsToPage: (ids: string[], targetPage: number, copy: boolean) => number;
  onClearButtons: (ids: string[]) => void;
  onClearSelection: () => void;
  showToast: (msg: string) => void;
}

export function BarraSeleccionLote({
  selectedIds,
  pages,
  activePage,
  accent,
  onMoveButtonsToPage,
  onClearButtons,
  onClearSelection,
  showToast,
}: BarraSeleccionLoteProps) {
  const VD = useTheme();
  const t = useT();
  const [bulkMoveTarget, setBulkMoveTarget] = useState<number | null>(null);

  if (selectedIds.size === 0) return null;

  return (
    <div style={{
      position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
      zIndex: 50, display: 'flex', alignItems: 'center', gap: 8,
      background: VD.surface, border: `1px solid ${VD.borderStrong}`,
      borderRadius: VD.radius.lg, padding: '8px 14px',
      boxShadow: VD.shadow.menu, fontFamily: VD.mono,
    }}>
      <span style={{ fontSize: 9, color: VD.textDim, letterSpacing: 1, marginRight: 4 }}>
        {selectedIds.size === 1 ? t('bulk.selectedOne') : t('bulk.selected', { n: selectedIds.size })}
      </span>

      {/* Move-to-page picker */}
      <select
        value={bulkMoveTarget ?? ''}
        onChange={(e) => setBulkMoveTarget(e.target.value === '' ? null : parseInt(e.target.value, 10))}
        style={{
          background: VD.elevated, border: `1px solid ${VD.border}`, color: VD.text,
          fontFamily: VD.mono, fontSize: 8, padding: '3px 6px', borderRadius: VD.radius.sm,
          outline: 'none',
        }}
      >
        <option value="">{t('ui.moveTo')}</option>
        {pages.map((p, i) => i !== activePage && (
          <option key={p.id} value={i}>{p.name}</option>
        ))}
      </select>

      {bulkMoveTarget !== null && (
        <button
          onClick={() => {
            const ids = Array.from(selectedIds);
            const movidos = onMoveButtonsToPage(ids, bulkMoveTarget, false);
            if (movidos < ids.length) {
              showToast(t('bulk.partial', { n: movidos, total: ids.length }));
            }
            onClearSelection();
            setBulkMoveTarget(null);
          }}
          style={{ padding: '4px 10px', background: VD.accentBg, border: `1px solid ${accent}`, color: accent, fontFamily: VD.mono, fontSize: 8, cursor: 'pointer', borderRadius: VD.radius.sm, letterSpacing: 1, display: 'inline-flex', alignItems: 'center', gap: 5 }}
        >
          <DotGlyphIcon glyph="EXPORT" size={7} color={accent} />
          <span>{t('bulk.move')}</span>
        </button>
      )}
      {bulkMoveTarget !== null && (
        <button
          onClick={() => {
            const ids = Array.from(selectedIds);
            const movidos = onMoveButtonsToPage(ids, bulkMoveTarget, true);
            if (movidos < ids.length) {
              showToast(t('bulk.partial', { n: movidos, total: ids.length }));
            }
            onClearSelection();
            setBulkMoveTarget(null);
          }}
          style={{ padding: '4px 10px', background: VD.accentBg, border: `1px solid ${accent}`, color: accent, fontFamily: VD.mono, fontSize: 8, cursor: 'pointer', borderRadius: VD.radius.sm, letterSpacing: 1, display: 'inline-flex', alignItems: 'center', gap: 5 }}
        >
          <DotGlyphIcon glyph="CODE" size={7} color={accent} />
          <span>{t('bulk.copy')}</span>
        </button>
      )}

      <button
        onClick={() => {
          onClearButtons(Array.from(selectedIds));
          onClearSelection();
        }}
        style={{ padding: '4px 10px', background: 'none', border: `1px solid ${VD.danger}`, color: VD.danger, fontFamily: VD.mono, fontSize: 8, cursor: 'pointer', borderRadius: VD.radius.sm, letterSpacing: 1, display: 'inline-flex', alignItems: 'center', gap: 5 }}
      >
        <DotGlyphIcon glyph="CLOSE" size={7} color={VD.danger} />
        <span>{t('bulk.clear')}</span>
      </button>

      <button
        onClick={() => { onClearSelection(); setBulkMoveTarget(null); }}
        style={{ padding: '4px 8px', background: 'none', border: `1px solid ${VD.border}`, color: VD.textMuted, cursor: 'pointer', borderRadius: VD.radius.sm, display: 'flex', alignItems: 'center' }}
      >
        <DotGlyphIcon glyph="CLOSE" size={7} color={VD.textMuted} />
      </button>
    </div>
  );
}

