import React from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import type { DeckConfig } from '../../types';

/**
 * La fila de pestañas de pagina.
 *
 * Hace mas de lo que parece: cambiar de pagina, renombrar con doble clic,
 * reordenar arrastrando la pestaña, **y** recibir botones arrastrados desde la
 * grilla para moverlos a otra pagina (con Shift para copiar en vez de mover).
 * Esos cuatro gestos sobre el mismo elemento son la razon de que necesite tanto
 * estado de arrastre.
 */

interface Props {
  config: DeckConfig;
  activePage: number;
  onPageChange: (i: number) => void;
  onPageAdd: () => void;
  onPageExport: (i: number) => void;
  onPageImport: () => void;
  onPageReorder: (desde: number, hasta: number) => void;
  /** Devuelve false si la pagina de destino no tiene sitio. */
  onMoveButtonToPage: (buttonId: string, targetPage: number, copy: boolean) => boolean;
  renamingPageId: string | null;
  setRenamingPageId: (id: string | null) => void;
  renameValue: string;
  setRenameValue: (s: string) => void;
  setPageContextMenu: (m: { id: string; x: number; y: number } | null) => void;
  dragPageIdx: number | null;
  setDragPageIdx: (i: number | null) => void;
  dragOverPageIdx: number | null;
  setDragOverPageIdx: (i: number | null) => void;
  dragSourceId: string | null;
  setDragSourceId: (id: string | null) => void;
  showSidebar: boolean;
  setShowSidebar: React.Dispatch<React.SetStateAction<boolean>>;
  showToast: (s: string) => void;
  /** Confirmar el renombrado en curso. Vive en MainB porque es quien guarda. */
  confirmRename: (id: string) => void;
}

export function PestanasPagina({ config, activePage, onPageChange, onPageAdd, onPageExport, onPageImport, onPageReorder, onMoveButtonToPage, renamingPageId, setRenamingPageId, renameValue, setRenameValue, setPageContextMenu, dragPageIdx, setDragPageIdx, dragOverPageIdx, setDragOverPageIdx, dragSourceId, setDragSourceId, showSidebar, setShowSidebar, showToast, confirmRename }: Props) {
  const VD = useTheme();
  const t = useT();

  return (
      <div style={{
        display: 'flex', padding: '12px 20px 0', gap: 2,
        borderBottom: `1px solid ${VD.border}`,
        background: VD.surface, flexShrink: 0, alignItems: 'flex-end',
      }}>
        {config.pages.map((p, i) => (
          <div
            key={p.id}
            draggable
            onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; setDragPageIdx(i); }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = e.shiftKey && dragSourceId ? 'copy' : 'move';
              setDragOverPageIdx(i);
            }}
            onDragLeave={() => setDragOverPageIdx(null)}
            onDragEnd={() => { setDragPageIdx(null); setDragOverPageIdx(null); }}
            onDrop={(e) => {
              if (dragSourceId && i !== activePage) {
                // Drop de un botón sobre otra pestaña → mover (o copiar con Shift)
                const ok = onMoveButtonToPage(dragSourceId, i, e.shiftKey);
                if (!ok) showToast(t('page.noRoom', { pagina: p.name }));
                setDragSourceId(null);
              } else if (dragPageIdx !== null && dragPageIdx !== i) {
                onPageReorder(dragPageIdx, i);
              }
              setDragPageIdx(null); setDragOverPageIdx(null);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              setPageContextMenu({ id: p.id, x: e.clientX, y: e.clientY });
            }}
            style={{
              padding: '8px 16px',
              fontFamily: VD.mono, fontSize: 10, letterSpacing: 2,
              color: i === activePage ? VD.text : VD.textDim,
              borderBottom: i === activePage
                ? `2px solid ${config.accent}`
                : dragOverPageIdx === i
                ? `2px solid ${config.accent}66`
                : '2px solid transparent',
              position: 'relative', top: 1, cursor: 'grab', userSelect: 'none',
              display: 'flex', alignItems: 'center',
              opacity: dragPageIdx === i ? 0.4 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            {renamingPageId === p.id ? (
              <input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => confirmRename(p.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') confirmRename(p.id);
                  if (e.key === 'Escape') setRenamingPageId(null);
                  e.stopPropagation();
                }}
                style={{
                  background: 'transparent', border: 'none',
                  outline: `1px solid ${config.accent}`,
                  fontFamily: VD.mono, fontSize: 10, letterSpacing: 2, color: VD.text,
                  width: Math.max(60, renameValue.length * 9), padding: '0 2px',
                }}
              />
            ) : (
              <span
                onClick={() => onPageChange(i)}
                onDoubleClick={() => { setRenamingPageId(p.id); setRenameValue(p.name); }}
                title={t('page.tip')}
                style={{ cursor: 'pointer' }}
              >
                {p.name}
                {(p.gridSize ?? 4) !== 4 && (
                  <span style={{ fontSize: 7, marginLeft: 4, opacity: 0.5 }}>{p.gridSize ?? 4}×{p.gridRows ?? p.gridSize ?? 4}</span>
                )}
              </span>
            )}
          </div>
        ))}

        {config.pages.length < 8 && (
          <div
            onClick={onPageAdd}
            title={t('page.add')}
            style={{
              padding: '8px 10px', color: VD.textMuted, fontSize: 16,
              cursor: 'pointer', userSelect: 'none', position: 'relative', top: 1, lineHeight: 1,
            }}
          >+</div>
        )}

        <div style={{ flex: 1 }} />
        {onPageExport && (
          <div onClick={() => onPageExport(activePage)} title={t('page.export')} style={{ padding: '8px 10px', fontSize: 11, cursor: 'pointer', userSelect: 'none', color: VD.textMuted, fontFamily: VD.mono, letterSpacing: 0.5 }}>
            ↗
          </div>
        )}
        {onPageImport && (
          <div onClick={onPageImport} title={t('page.import')} style={{ padding: '8px 10px', fontSize: 11, cursor: 'pointer', userSelect: 'none', color: VD.textMuted, fontFamily: VD.mono, letterSpacing: 0.5 }}>
            ↙
          </div>
        )}
        <div
          onClick={() => setShowSidebar((v) => !v)}
          title={showSidebar ? 'Ocultar panel' : 'Mostrar panel'}
          style={{ padding: '8px 10px', fontSize: 12, cursor: 'pointer', userSelect: 'none', color: showSidebar ? VD.textDim : VD.textMuted, transition: 'color 0.15s' }}
        >
          {showSidebar ? '▶' : '◀'}
        </div>
      </div>
  );
}
