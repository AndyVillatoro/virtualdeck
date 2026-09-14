import React from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { PageCtxItem } from './OverlayCarpeta';
import type { PageConfig } from '../../types';

interface MenuContextualPaginaProps {
  contextMenu: { id: string; x: number; y: number } | null;
  pages: PageConfig[];
  accent: string;
  onStartRename: (page: PageConfig) => void;
  onOpenAppBinding: (pageId: string) => void;
  onSetGrid: (pageId: string, cols: 3 | 4 | 5 | 6, rows: number) => void;
  onDuplicatePage?: (pageId: string) => void;
  onDeletePage: (pageId: string) => void;
  onClose: () => void;
}

export function MenuContextualPagina({
  contextMenu,
  pages,
  accent,
  onStartRename,
  onOpenAppBinding,
  onSetGrid,
  onDuplicatePage,
  onDeletePage,
  onClose,
}: MenuContextualPaginaProps) {
  const VD = useTheme();
  const t = useT();

  if (!contextMenu) return null;

  const ctxPage = pages.find((pp) => pp.id === contextMenu.id);
  if (!ctxPage) return null;

  const ctxGs = ctxPage.gridSize ?? 4;
  const ctxRows = ctxPage.gridRows ?? ctxGs;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'fixed', left: contextMenu.x, top: contextMenu.y,
        zIndex: 9999, background: VD.surface, border: `1px solid ${VD.borderStrong}`,
        borderRadius: VD.radius.lg, overflow: 'hidden', boxShadow: VD.shadow.menu, minWidth: 160,
      }}
    >
      <PageCtxItem
        label={t('page.rename')}
        onClick={() => {
          onStartRename(ctxPage);
          onClose();
        }}
      />
      <PageCtxItem
        label={ctxPage.targetApp ? `${t('page.boundApp')}: ${ctxPage.targetApp.toUpperCase()}` : t('page.bindApp')}
        glyph="APP_WINDOW"
        onClick={() => {
          onOpenAppBinding(contextMenu.id);
          onClose();
        }}
      />

      {/* Grid — columnas y filas independientes */}
      <div style={{ padding: '8px 14px', borderBottom: `1px solid ${VD.border}` }}>
        <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, marginBottom: 6, letterSpacing: 1 }}>
          {t('page.grid')} · {ctxGs}×{ctxRows}
        </div>
        <div style={{ fontFamily: VD.mono, fontSize: 7, color: VD.textMuted, marginBottom: 4, letterSpacing: 1 }}>{t('ui.columns')}</div>
        <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
          {([3, 4, 5, 6] as const).map((cols) => (
            <button
              key={cols}
              onClick={() => { onSetGrid(contextMenu.id, cols, ctxRows); }}
              style={{
                flex: 1, padding: '4px 0', cursor: 'pointer', borderRadius: VD.radius.sm,
                background: ctxGs === cols ? VD.accentBg : VD.elevated,
                border: `1px solid ${ctxGs === cols ? accent : VD.border}`,
                fontFamily: VD.mono, fontSize: 9,
                color: ctxGs === cols ? accent : VD.textDim,
              }}
            >{cols}</button>
          ))}
        </div>
        <div style={{ fontFamily: VD.mono, fontSize: 7, color: VD.textMuted, marginBottom: 4, letterSpacing: 1 }}>{t('ui.rows')}</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {([2, 3, 4, 5, 6] as const).map((rows) => (
            <button
              key={rows}
              onClick={() => { onSetGrid(contextMenu.id, ctxGs as 3 | 4 | 5 | 6, rows); }}
              style={{
                flex: 1, padding: '4px 0', cursor: 'pointer', borderRadius: VD.radius.sm,
                background: ctxRows === rows ? VD.accentBg : VD.elevated,
                border: `1px solid ${ctxRows === rows ? accent : VD.border}`,
                fontFamily: VD.mono, fontSize: 9,
                color: ctxRows === rows ? accent : VD.textDim,
              }}
            >{rows}</button>
          ))}
        </div>
      </div>

      {pages.length < 8 && onDuplicatePage && (
        <PageCtxItem
          label={t('page.duplicate')}
          glyph="ADD"
          onClick={() => {
            onDuplicatePage(contextMenu.id);
            onClose();
          }}
        />
      )}

      {pages.length > 1 && (
        <PageCtxItem
          label={t('page.delete')}
          danger
          onClick={() => {
            onDeletePage(contextMenu.id);
            onClose();
          }}
        />
      )}
    </div>
  );
}

