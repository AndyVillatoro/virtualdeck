import React, { useEffect, useMemo, useRef, useState } from 'react';
import { VD } from '../design';
import { DotLabel } from './DotLabel';
import type { ButtonConfig, DeckConfig } from '../types';

interface SearchOverlayProps {
  config: DeckConfig;
  accent: string;
  onClose: () => void;
  onPick: (button: ButtonConfig) => void;
}

interface SearchHit {
  button: ButtonConfig;
  pageName: string;
  haystack: string;
}

function buildHaystack(b: ButtonConfig): string {
  return [
    b.label,
    b.sublabel,
    b.action.type,
    b.action.appPath,
    b.action.url,
    b.action.shortcutPath,
    b.action.hotkey,
    b.action.deviceName,
    b.action.processName,
    b.action.notifyTitle,
    b.action.notifyBody,
    b.action.clipboardText,
    b.action.typeText,
    ...(b.actions ?? []).map((a) => a.type),
  ].filter(Boolean).join(' ').toLowerCase();
}

export function SearchOverlay({ config, accent, onClose, onPick }: SearchOverlayProps) {
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const allHits: SearchHit[] = useMemo(() => {
    return config.buttons
      .filter((b) => b.action.type !== 'none' || b.label || b.icon || b.imageData || b.brandIcon)
      .map((b) => ({
        button: b,
        pageName: config.pages[b.page]?.name ?? `P${b.page + 1}`,
        haystack: buildHaystack(b),
      }));
  }, [config.buttons, config.pages]);

  const filtered: SearchHit[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allHits.slice(0, 60);
    return allHits.filter((h) => h.haystack.includes(q)).slice(0, 60);
  }, [allHits, query]);

  useEffect(() => { setActiveIdx(0); }, [query]);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIdx((i) => Math.min(filtered.length - 1, i + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIdx((i) => Math.max(0, i - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const hit = filtered[activeIdx];
        if (hit) onPick(hit.button);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, filtered, activeIdx, onPick]);

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${activeIdx}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 220,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '12vh',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(640px, 92vw)', maxHeight: '70vh',
          background: VD.surface, border: `1px solid ${VD.borderStrong}`,
          borderRadius: VD.radius.lg, boxShadow: VD.shadow.modal,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        {/* Header / input */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 14px', borderBottom: `1px solid ${VD.border}`,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: VD.radius.md, background: accent }} />
          <DotLabel size={10} color={VD.text} spacing={2}>BUSCAR BOTÓN</DotLabel>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Etiqueta, app, URL, atajo..."
            style={{
              flex: 1, background: 'transparent', border: 'none',
              outline: 'none', color: VD.text, fontFamily: VD.mono,
              fontSize: 13, letterSpacing: 0.5,
            }}
          />
          <span style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, letterSpacing: 1 }}>
            {filtered.length}/{allHits.length}
          </span>
        </div>

        {/* Results */}
        <div ref={listRef} style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            <div style={{
              padding: '40px 20px', textAlign: 'center',
              fontFamily: VD.mono, fontSize: 11, color: VD.textMuted,
            }}>
              {query ? 'Sin coincidencias' : 'No hay botones configurados'}
            </div>
          ) : filtered.map((hit, i) => {
            const active = i === activeIdx;
            const b = hit.button;
            return (
              <div
                key={b.id}
                data-idx={i}
                onMouseEnter={() => setActiveIdx(i)}
                onClick={() => onPick(b)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', cursor: 'pointer',
                  background: active ? VD.elevated : 'transparent',
                  borderLeft: `2px solid ${active ? accent : 'transparent'}`,
                  borderBottom: `1px solid ${VD.border}`,
                }}
              >
                {/* Mini swatch */}
                <div style={{
                  width: 28, height: 28, flexShrink: 0,
                  borderRadius: VD.radius.md,
                  background: b.bgColor || VD.elevated,
                  border: `1px solid ${VD.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, color: b.fgColor || VD.text,
                }}>
                  {b.icon || (b.brandIcon ? '◆' : '·')}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: VD.mono, fontSize: 11, color: VD.text,
                    letterSpacing: 0.5, textTransform: 'uppercase',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {b.label || `[${b.action.type}]`}
                  </div>
                  <div style={{
                    fontFamily: VD.mono, fontSize: 9, color: VD.textMuted,
                    marginTop: 2, letterSpacing: 0.5,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {hit.pageName} · {b.action.type}
                    {b.action.appPath && ` · ${b.action.appPath.split(/[\\/]/).pop()}`}
                    {b.action.url && ` · ${b.action.url}`}
                    {b.action.hotkey && ` · ${b.action.hotkey}`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer hint */}
        <div style={{
          padding: '8px 14px', borderTop: `1px solid ${VD.border}`,
          fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, letterSpacing: 1,
          display: 'flex', gap: 14,
        }}>
          <span>↑↓ NAVEGAR</span>
          <span>↵ EDITAR</span>
          <span>ESC SALIR</span>
        </div>
      </div>
    </div>
  );
}
