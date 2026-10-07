import React from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { BotonIcono } from '../../components/ui/BotonIcono';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';
import { IconoPuntos } from '../../components/dot480/IconoPuntos';
import { indicesPaginasDeck } from '../../utils/paginasDeck';
import type { DeckConfig, PageConfig } from '../../types';

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
  compact?: boolean;
}

interface ContenidoPestanaProps {
  page: PageConfig;
  isActive: boolean;
  compact: boolean;
  accent: string;
  onPageChange: () => void;
  onStartRename: () => void;
  vd: ReturnType<typeof useTheme>;
  t: (k: string, p?: Record<string, string | number>) => string;
}

function ContenidoPestana({
  page,
  isActive,
  compact,
  accent,
  onPageChange,
  onStartRename,
  vd,
  t,
}: ContenidoPestanaProps) {
  const gs = page.gridSize ?? 4;
  const rows = page.gridRows ?? gs;
  return (
    <span
      onClick={onPageChange}
      onDoubleClick={onStartRename}
      title={page.targetApp ? `${t('page.tip')} · ${t('page.boundApp')}: ${page.targetApp}` : t('page.tip')}
      style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, minWidth: 0 }}
    >
      {page.iconoApp && (
        <IconoPuntos
          bits={page.iconoApp}
          size={compact ? 12 : 14}
          color={isActive ? vd.text : vd.textDim}
        />
      )}
      <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{page.name}</span>
      {page.targetApp && (
        <span
          title={`${t('page.boundApp')}: ${page.targetApp}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
            padding: '1px 4px',
            borderRadius: vd.radius.sm,
            background: `${accent}1c`,
            border: `1px solid ${accent}55`,
            color: accent,
            fontSize: 8,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
          }}
        >
          <DotGlyphIcon glyph="APP_WINDOW" size={6} color={accent} />
          <span style={{ maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{page.targetApp}</span>
        </span>
      )}
      {gs !== 4 && (
        <span style={{ fontSize: 8, marginLeft: 2, opacity: 0.5 }}>{gs}×{rows}</span>
      )}
    </span>
  );
}

export function PestanasPagina({ config, activePage, onPageChange, onPageAdd, onPageExport, onPageImport, onPageReorder, onMoveButtonToPage, renamingPageId, setRenamingPageId, renameValue, setRenameValue, setPageContextMenu, dragPageIdx, setDragPageIdx, dragOverPageIdx, setDragOverPageIdx, dragSourceId, setDragSourceId, showSidebar, setShowSidebar, showToast, confirmRename, compact = false }: Props) {
  const VD = useTheme();
  const t = useT();
  // Solo las páginas del deck: las de los docks se editan en `Dispositivos`
  // (ver `utils/paginasDeck`). Los índices que viajan son reales (posición en
  // `config.pages`), porque `activePage` y el arrastre los usan tal cual.
  const indicesDeck = indicesPaginasDeck(config.pages);

  return (
      <div style={{
        display: 'flex', padding: compact ? '4px 12px 0' : '12px 20px 0', gap: 4,
        borderBottom: `1px solid ${VD.border}`,
        background: VD.surface, flexShrink: 0, alignItems: 'flex-end', minWidth: 0,
      }}>
        {/* Las pestañas se desplazan en horizontal (rueda incluida) en vez de
            empujar fuera de la ventana los botones de la derecha. */}
        <div
          onWheel={(e) => { if (e.deltaY !== 0) e.currentTarget.scrollLeft += e.deltaY; }}
          style={{ display: 'flex', gap: 2, alignItems: 'flex-end', flex: 1, minWidth: 0, overflowX: 'auto', overflowY: 'hidden' }}
        >
        {indicesDeck.map((i) => {
          const p = config.pages[i];
          return (
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
              padding: compact ? '4px 10px' : '8px 16px',
              fontFamily: VD.mono, fontSize: compact ? 9 : 10, letterSpacing: compact ? 1 : 2,
              color: i === activePage ? VD.text : VD.textDim,
              borderBottom: i === activePage
                ? `2px solid ${config.accent}`
                : dragOverPageIdx === i
                ? `2px solid ${config.accent}66`
                : '2px solid transparent',
              position: 'relative', top: 1, cursor: 'grab', userSelect: 'none',
              display: 'flex', alignItems: 'center', flexShrink: 0,
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
                  fontFamily: VD.mono, fontSize: compact ? 9 : 10, letterSpacing: compact ? 1 : 2, color: VD.text,
                  width: Math.max(60, renameValue.length * 9), padding: '0 2px',
                }}
              />
            ) : (
              <ContenidoPestana
                page={p}
                isActive={i === activePage}
                compact={compact}
                accent={config.accent}
                onPageChange={() => onPageChange(i)}
                onStartRename={() => { setRenamingPageId(p.id); setRenameValue(p.name); }}
                vd={VD}
                t={t}
              />
            )}
          </div>
          );
        })}

        {config.pages.length < 8 && (
          <BotonIcono glifo="ADD" title={t('page.add')} onClick={onPageAdd} tamano={compact ? 24 : 32} tamanoGlifo={compact ? 9 : 11} color={VD.textMuted} />
        )}

        </div>
        <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0, paddingBottom: 2 }}>
          {onPageExport && (
            <BotonIcono glifo="EXPORT" title={t('page.export')} onClick={() => onPageExport(activePage)} tamano={compact ? 24 : 32} tamanoGlifo={compact ? 8 : 10} color={VD.textMuted} />
          )}
          {onPageImport && (
            <BotonIcono glifo="IMPORT" title={t('page.import')} onClick={onPageImport} tamano={compact ? 24 : 32} tamanoGlifo={compact ? 8 : 10} color={VD.textMuted} />
          )}
          <BotonIcono
            glifo={showSidebar ? 'ARROW_RIGHT' : 'ARROW_LEFT'}
            title={t(showSidebar ? 'sidebar.hide' : 'sidebar.show')}
            onClick={() => setShowSidebar((v) => !v)}
            tamano={compact ? 24 : 32}
            tamanoGlifo={compact ? 9 : 11}
            color={showSidebar ? VD.textDim : VD.textMuted}
          />
        </div>
      </div>
  );
}
